/**
 * The reporting period every module page is cut against.
 *
 * One place, because the period is the report's only global fact: the sheet
 * eyebrow, the closing stamp and every "vs prior month" delta on every page all
 * have to agree, and they drifted when each page carried its own month.
 */
export const report = {
  /** Shown in the sheet eyebrow above the module title. */
  period: 'July 2025',
  /** Shown in the closing `Stamp`. */
  asOf: '01 Aug 2025',
  source: 'Jamnagar Zoo · 6 sites',
} as const
