#!/usr/bin/env python3
"""
Streaming reader for the mysqldump.

The dump is 194 MB of extended INSERT statements, so nothing is loaded whole: each
`INSERT INTO `t` VALUES (..),(..);` line is tokenised into tuples with correct handling of
quoted strings, doubled quotes and backslash escapes. A naive `split('),(')` corrupts every
row whose free text contains a bracket — and this dump has plenty, including HTML fragments
and multi-line kitchen orders.
"""
import io
import re

# Column order per table, parsed from the CREATE TABLE statements rather than assumed.
_COL = re.compile(r"^\s+`([^`]+)`\s")
_SKIP = re.compile(r"^\s+(PRIMARY|KEY|UNIQUE|CONSTRAINT|FULLTEXT|SPATIAL)\b")
_CREATE = re.compile(r"^CREATE TABLE `([^`]+)`")
_INSERT = re.compile(r"^INSERT INTO `([^`]+)` VALUES ")


def columns(path):
    """{table: [column, ...]} in declaration order."""
    out, cur = {}, None
    with io.open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            m = _CREATE.match(line)
            if m:
                cur = m.group(1)
                out[cur] = []
                continue
            if cur is None:
                continue
            if line.startswith(") ENGINE"):
                cur = None
                continue
            m = _COL.match(line)
            if m and not _SKIP.match(line):
                out[cur].append(m.group(1))
    return out


def _tuples(buf):
    """Split a VALUES payload into rows of raw (still-escaped) field strings."""
    rows, cur, field = [], [], []
    i, n, depth, in_str = 0, len(buf), 0, False
    while i < n:
        c = buf[i]
        if in_str:
            if c == "\\":
                field.append(buf[i : i + 2])
                i += 2
                continue
            if c == "'":
                if i + 1 < n and buf[i + 1] == "'":
                    field.append("''")
                    i += 2
                    continue
                in_str = False
                i += 1
                continue
            field.append(c)
            i += 1
            continue
        if c == "'":
            in_str = True
            i += 1
            continue
        if c == "(":
            depth += 1
            if depth == 1:
                cur, field = [], []
                i += 1
                continue
        if c == ")":
            depth -= 1
            if depth == 0:
                cur.append("".join(field))
                field = []
                rows.append(cur)
                cur = []
                i += 1
                continue
        if c == "," and depth == 1:
            cur.append("".join(field))
            field = []
            i += 1
            continue
        field.append(c)
        i += 1
    return rows


def _unescape(v):
    if v == "NULL":
        return None
    v = v.replace("\\'", "'").replace("''", "'").replace('\\"', '"')
    v = v.replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t")
    return v.replace("\\0", "").replace("\\\\", "\\")


def rows(path, tables=None):
    """Yield (table, [decoded field, ...]) for every INSERT row, optionally filtered."""
    with io.open(path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            if not line.startswith("INSERT INTO "):
                continue
            m = _INSERT.match(line)
            if not m:
                continue
            table = m.group(1)
            if tables and table not in tables:
                continue
            for r in _tuples(line[m.end() :]):
                yield table, [_unescape(x.strip()) for x in r]
