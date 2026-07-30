import { ArrowLeftRight, ClipboardCheck, HeartHandshake, ListChecks, TriangleAlert, Users } from 'lucide-react'
import type { DetailPageData } from '../model'

const MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const LAST6 = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul']
const DAYS = ['17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30']

export const transfers: DetailPageData = {
  slug: 'transfers',
  title: 'Transfers',
  accent: '#2563eb',
  icon: ArrowLeftRight,
  hero: {
    value: 28,
    label: 'Transfers',
    sub: 'This month · July 2026',
    status: '98% completion rate',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Movement Trend',
      unit: 'transfers',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [19, 22, 17, 24, 20, 26, 23, 27, 21, 25, 24, 28],
      xLabels: MONTHS,
      note: 'Movement volume peaks in July every year, tracking the post-monsoon rehousing window.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Incoming', value: '12', note: '4 institutions' },
        { label: 'Outgoing', value: '9', note: '3 institutions' },
        { label: 'Internal', value: '7', note: 'Between zones' },
        { label: 'External', value: '21', note: 'Incoming + outgoing' },
      ],
    },
    {
      kind: 'share',
      title: 'Transfer Status',
      note: 'Of 28 transfers',
      items: [
        { label: 'Completed', value: 25 },
        { label: 'In transit', value: 2 },
        { label: 'Pending', value: 1 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Species Wise',
      items: [
        { label: 'Mammals', value: 9 },
        { label: 'Birds', value: 8 },
        { label: 'Reptiles', value: 5 },
        { label: 'Fish', value: 4 },
        { label: 'Amphibians', value: 2 },
      ],
    },
    {
      kind: 'tabs',
      title: 'Site Wise',
      tabs: [
        {
          label: 'Origin',
          items: [
            { label: 'Jamnagar Core', value: 11 },
            { label: 'Aviary Complex', value: 7 },
            { label: 'Wetland Reserve', value: 5 },
            { label: 'External institutions', value: 5 },
          ],
        },
        {
          label: 'Destination',
          items: [
            { label: 'Wetland Reserve', value: 9 },
            { label: 'Jamnagar Core', value: 8 },
            { label: 'External institutions', value: 6 },
            { label: 'Quarantine & Rescue', value: 5 },
          ],
        },
      ],
    },
    {
      kind: 'stat',
      title: 'Transport Status',
      value: '2',
      unit: 'in transit',
      note: 'Both vehicles on schedule · next arrival 16:40 at Wetland Reserve',
      tone: 'good',
    },
    {
      kind: 'gauges',
      title: 'Performance',
      items: [
        { label: 'Completion rate', percent: 98, note: '25 of 28 closed, 0 failed' },
        { label: 'On-time arrival', percent: 92, note: '+7 pts vs June' },
      ],
    },
    {
      kind: 'rows',
      title: 'Recent Transfers',
      meta: 'Last 7 days',
      items: [
        { label: 'TRF-1184 · 6 Indian Peafowl', sub: 'Aviary Complex → Open Aviary 7', value: 'Completed', tone: 'good' },
        { label: 'TRF-1183 · 3 Star Tortoise', sub: 'Sasan Rescue → Quarantine', value: 'Completed', tone: 'good' },
        { label: 'TRF-1182 · 4 Blackbuck', sub: 'Jamnagar Core → Wetland Reserve', value: 'In transit', tone: 'warn' },
        { label: 'TRF-1181 · 12 Zebra Finch', sub: 'Jamnagar Core → Junagadh Zoo', value: 'Completed', tone: 'good' },
        { label: 'TRF-1180 · 2 Bengal Fox', sub: 'Awaiting CZA clearance', value: 'Pending', tone: 'warn' },
      ],
    },
    {
      kind: 'timeline',
      title: 'Transfer Timeline',
      items: [
        { time: '12:05', tag: 'Completed', text: '6 Indian Peafowl settled into Open Aviary 7', tone: 'good' },
        { time: '10:30', tag: 'Departed', text: '4 Blackbuck left Jamnagar Core for Wetland Reserve', tone: 'warn' },
        { time: '08:04', tag: 'Received', text: '3 Star Tortoise received from Sasan Rescue Centre', tone: 'good' },
        { time: 'Yesterday', tag: 'Cleared', text: 'Quarantine cleared for 12 Zebra Finch outbound batch', tone: 'good' },
        { time: '27 Jul', tag: 'Pending', text: 'CZA clearance requested for 2 Bengal Fox', tone: 'warn' },
      ],
    },
  ],
}

export const welfare: DetailPageData = {
  slug: 'welfare',
  title: 'Animal Welfare',
  accent: '#db2777',
  icon: HeartHandshake,
  hero: {
    value: 92,
    label: 'Assessments',
    sub: 'Completed this month',
    status: 'Welfare score 4.6 / 5',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Assessment Trend',
      unit: 'welfare score',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [4.1, 4.15, 4.2, 4.25, 4.3, 4.35, 4.4, 4.45, 4.5, 4.5, 4.55, 4.6],
      xLabels: MONTHS,
      note: 'Twelve straight months of improvement — a 9% lift from 4.1 to 4.6.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Welfare Score', value: '4.6', note: 'Above benchmark', tone: 'good' },
        { label: 'Enclosures Audited', value: '84', note: 'Of 96' },
        { label: 'Open Issues', value: '7', note: '2 high priority', tone: 'warn' },
        { label: 'Overdue Audits', value: '3', note: 'Due this week', tone: 'warn' },
      ],
    },
    {
      kind: 'share',
      title: 'Assessment Outcomes',
      note: 'Of 92 assessments',
      items: [
        { label: 'Excellent', value: 38 },
        { label: 'Good', value: 34 },
        { label: 'Average', value: 14 },
        { label: 'Needs Attention', value: 5 },
        { label: 'Critical', value: 1 },
      ],
    },
    {
      kind: 'gauges',
      title: 'Welfare Score',
      items: [
        { label: 'Overall score', percent: 92, note: '4.6 of 5 · benchmark 4.2' },
        { label: 'Enrichment delivered', percent: 88, note: '84 of 96 enclosures' },
      ],
    },
    {
      kind: 'tabs',
      title: 'Assessment Coverage',
      tabs: [
        {
          label: 'Species Wise',
          items: [
            { label: 'Mammals', value: 28, sub: '4.7 avg' },
            { label: 'Birds', value: 24, sub: '4.6 avg' },
            { label: 'Reptiles', value: 16, sub: '4.5 avg' },
            { label: 'Fish', value: 14, sub: '4.4 avg' },
            { label: 'Amphibians', value: 6, sub: '4.6 avg' },
            { label: 'Invertebrates', value: 4, sub: '4.5 avg' },
          ],
        },
        {
          label: 'Enclosure Wise',
          items: [
            { label: 'Savanna Paddocks', value: 22, sub: '4.8 avg' },
            { label: 'Open Aviaries', value: 20, sub: '4.6 avg' },
            { label: 'Aquatic Halls', value: 18, sub: '4.4 avg' },
            { label: 'Herpetarium', value: 16, sub: '4.5 avg' },
            { label: 'Insectarium', value: 10, sub: '4.5 avg' },
            { label: 'Quarantine', value: 6, sub: '4.2 avg' },
          ],
        },
      ],
    },
    {
      kind: 'rows',
      title: 'Recent Assessments',
      meta: 'Last 7 days',
      items: [
        { label: 'Savanna Paddock 1', sub: 'Excellent · 4.9 · Dr. Iyer', value: 'Today', tone: 'good' },
        { label: 'Open Aviary 4', sub: 'Good · 4.5 · enrichment noted', value: 'Today', tone: 'good' },
        { label: 'Aquatic Hall 2', sub: 'Average · 3.9 · water clarity', value: 'Yesterday', tone: 'warn' },
        { label: 'Herpetarium 3', sub: 'Good · 4.4 · basking upgrade done', value: '28 Jul', tone: 'good' },
        { label: 'Quarantine Ward B', sub: 'Needs attention · 3.4 · space', value: '27 Jul', tone: 'bad' },
      ],
    },
    {
      kind: 'rows',
      title: 'Open Issues',
      meta: '7 open',
      items: [
        { label: 'Quarantine Ward B — space per animal', sub: 'High priority · raised 27 Jul', value: '3 days', tone: 'bad' },
        { label: 'Aquatic Hall 2 — water clarity', sub: 'High priority · raised 29 Jul', value: '1 day', tone: 'warn' },
        { label: 'Open Aviary 7 — perch variety', sub: 'Medium · raised 24 Jul', value: '6 days', tone: 'warn' },
        { label: 'Insectarium — humidity drift', sub: 'Medium · raised 22 Jul', value: '8 days', tone: 'warn' },
        { label: 'Savanna Paddock 6 — shade cover', sub: 'Low · raised 18 Jul', value: '12 days', tone: 'neutral' },
      ],
    },
    {
      kind: 'rows',
      title: 'Recommendations',
      items: [
        { label: 'Add second filtration cycle, Aquatic Hall 2', sub: 'Projected +0.4 welfare score', value: 'By 02 Aug', tone: 'warn' },
        { label: 'Redistribute Quarantine Ward B intake', sub: 'Resolves the only critical rating', value: 'By 01 Aug', tone: 'bad' },
        { label: 'Extend enrichment rota to 96 enclosures', sub: 'Closes the 12-enclosure gap', value: 'By 10 Aug', tone: 'neutral' },
      ],
    },
  ],
}

export const approvals: DetailPageData = {
  slug: 'approvals',
  title: 'Approvals',
  accent: '#7c3aed',
  icon: ClipboardCheck,
  hero: {
    value: 14,
    label: 'Pending Approvals',
    sub: 'Across 4 departments',
    status: 'Avg 1.4 days to decision',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Approval Volume',
      unit: 'requests',
      ranges: [{ label: '1Y', points: 12 }, { label: '6M', points: 6 }, { label: '3M', points: 3 }],
      values: [96, 104, 92, 112, 98, 118, 108, 124, 114, 130, 122, 128],
      xLabels: MONTHS,
      note: '128 requests raised this month; 114 already closed.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Approved Today', value: '9', note: '1 rejected', tone: 'good' },
        { label: 'Avg Approval Time', value: '1.4 d', note: 'Was 1.9 d', tone: 'good' },
        { label: 'Overdue', value: '3', note: 'Past 3-day SLA', tone: 'warn' },
        { label: 'Raised This Month', value: '128', note: '114 closed' },
      ],
    },
    {
      kind: 'share',
      title: 'Department Wise',
      note: 'Of 14 pending',
      items: [
        { label: 'Finance', value: 5 },
        { label: 'Veterinary', value: 4 },
        { label: 'HR', value: 3 },
        { label: 'Administration', value: 2 },
      ],
    },
    {
      kind: 'gauges',
      title: 'Performance',
      items: [
        { label: 'Closed within SLA', percent: 88, note: '3-day decision window' },
        { label: 'First-pass approval', percent: 91, note: '9 of 128 sent back' },
      ],
    },
    {
      kind: 'rows',
      title: 'Overdue Requests',
      meta: '3 requests',
      items: [
        { label: 'APR-4412 · Feed contract renewal', sub: 'Finance · ₹18.4L · with CFO', value: '5 days', tone: 'bad' },
        { label: 'APR-4408 · Locum vet engagement', sub: 'HR · 2 positions · with HR head', value: '4 days', tone: 'warn' },
        { label: 'APR-4401 · Herpetarium retrofit', sub: 'Administration · ₹6.2L', value: '4 days', tone: 'warn' },
      ],
    },
    {
      kind: 'timeline',
      title: 'Approval Timeline',
      items: [
        { time: '13:10', tag: 'Approved', text: 'APR-4431 vaccine procurement cleared by Dr. Mehta', tone: 'good' },
        { time: '11:35', tag: 'Raised', text: 'APR-4433 incubator spare parts — ₹1.2L, Finance queue' },
        { time: '10:20', tag: 'Rejected', text: 'APR-4425 off-site enrichment trip — insufficient cover', tone: 'bad' },
        { time: '09:05', tag: 'Escalated', text: 'APR-4412 feed contract escalated to the CFO', tone: 'warn' },
        { time: 'Yesterday', tag: 'Approved', text: '6 routine requests auto-cleared under delegated limits', tone: 'good' },
      ],
    },
    {
      kind: 'rows',
      title: 'Recent Requests',
      meta: 'Last 48 h',
      items: [
        { label: 'APR-4433 · Incubator spare parts', sub: 'Finance · ₹1.2L · raised 11:35', value: 'Pending', tone: 'warn' },
        { label: 'APR-4431 · Vaccine procurement', sub: 'Veterinary · ₹3.8L', value: 'Approved', tone: 'good' },
        { label: 'APR-4429 · Night-shift roster change', sub: 'HR · 12 staff', value: 'Approved', tone: 'good' },
        { label: 'APR-4425 · Off-site enrichment trip', sub: 'Administration · 2 keepers', value: 'Rejected', tone: 'bad' },
        { label: 'APR-4422 · Lab reagent restock', sub: 'Veterinary · ₹0.9L', value: 'Approved', tone: 'good' },
      ],
    },
  ],
}

export const tasks: DetailPageData = {
  slug: 'tasks',
  title: 'Tasks',
  accent: '#ea580c',
  icon: ListChecks,
  hero: {
    value: 18,
    label: 'Pending Tasks',
    sub: 'Week of 27 Jul – 02 Aug',
    status: '87% completed on time',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Completion Trend',
      unit: 'tasks closed',
      ranges: [{ label: '2W', points: 14 }, { label: '1W', points: 7 }, { label: '5D', points: 5 }],
      values: [5, 7, 4, 2, 6, 8, 5, 6, 4, 3, 8, 7, 6, 7],
      xLabels: DAYS,
      xSuffix: 'Jul',
      note: '41 of 76 tasks closed this week — mid-week is consistently the most productive stretch.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Completed', value: '41', note: 'This week', tone: 'good' },
        { label: 'In Progress', value: '12', note: '5 due today' },
        { label: 'Overdue', value: '5', note: '2 high priority', tone: 'warn' },
        { label: "Today's Tasks", value: '14', note: '9 closed', tone: 'good' },
      ],
    },
    {
      kind: 'share',
      title: 'Status',
      note: 'Of 76 tasks this week',
      items: [
        { label: 'Completed', value: 41 },
        { label: 'Pending', value: 18 },
        { label: 'In Progress', value: 12 },
        { label: 'Overdue', value: 5 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Department Wise',
      items: [
        { label: 'Veterinary', value: 24, sub: '18 closed' },
        { label: 'Animal Keeping', value: 21, sub: '14 closed' },
        { label: 'Maintenance', value: 15, sub: '6 closed' },
        { label: 'Lab', value: 9, sub: '2 closed' },
        { label: 'Administration', value: 7, sub: '1 closed' },
      ],
    },
    {
      kind: 'share',
      title: 'Priority Wise',
      note: 'Of 18 pending',
      items: [
        { label: 'Medium', value: 8 },
        { label: 'High', value: 6 },
        { label: 'Low', value: 4 },
      ],
    },
    {
      kind: 'rows',
      title: 'Recent Tasks',
      meta: 'Last 24 h',
      items: [
        { label: 'Zone A perimeter fence inspection', sub: 'Maintenance · High · Ramesh K.', value: 'In progress', tone: 'warn' },
        { label: 'Tank 9 filtration service', sub: 'Maintenance · High · overdue 1 day', value: 'Overdue', tone: 'bad' },
        { label: 'Morning vet round — Ward B', sub: 'Veterinary · Dr. Rao', value: 'Completed', tone: 'good' },
        { label: 'Enrichment rota update', sub: 'Animal Keeping · Priya S.', value: 'Completed', tone: 'good' },
        { label: 'Reagent stock count', sub: 'Lab · Medium · Dr. Shah', value: 'Pending', tone: 'neutral' },
      ],
    },
    {
      kind: 'calendar',
      title: 'Upcoming Deadlines',
      items: [
        { date: '31', month: 'JUL', label: 'Tank 9 filtration service', sub: 'Maintenance · High · Ramesh K.' },
        { date: '01', month: 'AUG', label: 'Monthly census reconciliation', sub: 'Administration · 6 sites' },
        { date: '02', month: 'AUG', label: 'Quarantine Ward B intake review', sub: 'Veterinary · welfare-linked' },
        { date: '05', month: 'AUG', label: 'Incubator calibration', sub: 'Lab · all 8 units' },
      ],
    },
  ],
}

export const attendance: DetailPageData = {
  slug: 'attendance',
  title: 'Staff Attendance',
  accent: '#4f46e5',
  icon: Users,
  hero: {
    value: 243,
    display: '243 / 312',
    label: 'Present',
    sub: 'Shift A · 30 July 2026',
    status: '78% attendance',
    tone: 'good',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Weekly Trend',
      unit: '% present',
      ranges: [{ label: '2W', points: 14 }, { label: '1W', points: 7 }, { label: '5D', points: 5 }],
      values: [72, 70, 68, 76, 75, 77, 76, 74, 71, 69, 79, 77, 80, 78],
      xLabels: DAYS,
      xSuffix: 'Jul',
      note: 'Weekend dips are structural; weekday attendance has held above 77% all week.',
    },
    {
      kind: 'summary',
      items: [
        { label: 'Present', value: '243', note: '78% of roster', tone: 'good' },
        { label: 'Absent', value: '41', note: '13% of roster', tone: 'warn' },
        { label: 'Late', value: '18', note: 'Within present' },
        { label: 'On Leave', value: '28', note: '9% of roster' },
      ],
    },
    {
      kind: 'share',
      title: 'Roster Split',
      note: 'Of 312 staff',
      items: [
        { label: 'Present', value: 243 },
        { label: 'Absent', value: 41 },
        { label: 'On Leave', value: 28 },
      ],
    },
    {
      kind: 'stat',
      title: 'Attendance %',
      value: '78%',
      percent: 78,
      note: '243 of 312 staff on campus · target 82%',
      tone: 'good',
    },
    {
      kind: 'tabs',
      title: 'Distribution',
      tabs: [
        {
          label: 'Department Wise',
          items: [
            { label: 'Animal Keeping', value: 96, sub: '84% present' },
            { label: 'Veterinary', value: 42, sub: '91% present' },
            { label: 'Maintenance', value: 38, sub: '72% present' },
            { label: 'Security', value: 34, sub: '89% present' },
            { label: 'Administration', value: 21, sub: '76% present' },
            { label: 'Lab', value: 12, sub: '92% present' },
          ],
        },
        {
          label: 'Shift Wise',
          items: [
            { label: 'Shift A · 06–14', value: 118, sub: '86% present' },
            { label: 'Shift B · 14–22', value: 84, sub: '76% present' },
            { label: 'Shift C · 22–06', value: 41, sub: '68% present' },
          ],
        },
      ],
    },
    {
      kind: 'columns',
      title: 'Monthly Trend',
      note: 'Avg %',
      values: [71, 73, 72, 75, 76, 78],
      xLabels: LAST6,
      highlight: 5,
    },
    {
      kind: 'rows',
      title: 'Recent Check-ins',
      meta: 'Last 60 min',
      items: [
        { label: 'Ramesh Kumar', sub: 'Maintenance · Shift B · Gate 2', value: '13:58', tone: 'good' },
        { label: 'Priya Sharma', sub: 'Animal Keeping · Shift B · Gate 1', value: '13:52', tone: 'good' },
        { label: 'Dr. Anil Rao', sub: 'Veterinary · Shift B · Gate 1', value: '13:47', tone: 'good' },
        { label: 'Kiran Patel', sub: 'Security · Shift B · Gate 3', value: '13:41', tone: 'good' },
        { label: 'Meena Joshi', sub: 'Administration · late by 22 min', value: '13:22', tone: 'warn' },
      ],
    },
  ],
}

export const alerts: DetailPageData = {
  slug: 'alerts',
  title: 'Alerts',
  accent: '#dc2626',
  icon: TriangleAlert,
  hero: {
    value: 6,
    label: 'Critical Alerts',
    sub: 'Open now · 36 alerts in total',
    status: 'Needs review',
    tone: 'warn',
  },
  sections: [
    {
      kind: 'trend',
      title: 'Alert Volume',
      unit: 'alerts raised',
      ranges: [{ label: '2W', points: 14 }, { label: '1W', points: 7 }, { label: '5D', points: 5 }],
      values: [19, 17, 20, 16, 15, 18, 16, 14, 11, 9, 17, 13, 10, 8],
      xLabels: DAYS,
      xSuffix: 'Jul',
      note: 'Daily volume has halved since Monday as the IoT sensor calibration completed.',
    },
    {
      kind: 'summary',
      title: 'Severity',
      items: [
        { label: 'Critical', value: '6', note: 'Immediate action', tone: 'bad' },
        { label: 'High', value: '9', note: 'Within 4 h', tone: 'warn' },
        { label: 'Medium', value: '14', note: 'Within 24 h' },
        { label: 'Low', value: '7', note: 'Backlog' },
      ],
    },
    {
      kind: 'share',
      title: 'Severity Split',
      note: 'Of 36 open alerts',
      items: [
        { label: 'Medium', value: 14 },
        { label: 'High', value: 9 },
        { label: 'Low', value: 7 },
        { label: 'Critical', value: 6 },
      ],
    },
    {
      kind: 'breakdown',
      title: 'Alert Source',
      items: [
        { label: 'Medical Alerts', value: 11, sub: '2 critical' },
        { label: 'IoT Alerts', value: 9, sub: '1 critical' },
        { label: 'Infrastructure', value: 9, sub: '2 critical' },
        { label: 'Weather Alerts', value: 5, sub: '1 critical' },
        { label: 'Animal Escapes', value: 2, sub: 'Both contained' },
      ],
    },
    {
      kind: 'summary',
      title: 'Resolution',
      items: [
        { label: 'Open', value: '36', note: '6 critical', tone: 'warn' },
        { label: 'Resolved', value: '128', note: 'This month', tone: 'good' },
        { label: 'Avg Response', value: '12 min', note: 'Critical alerts', tone: 'good' },
      ],
    },
    {
      kind: 'gauges',
      title: 'Performance',
      items: [
        { label: 'Resolved within SLA', percent: 96, note: '123 of 128 this month' },
        { label: 'Auto-resolved', percent: 41, note: 'IoT self-clearing alerts' },
      ],
    },
    {
      kind: 'timeline',
      title: 'Alert Timeline',
      items: [
        { time: '13:48', tag: 'Critical', text: 'Tank 9 ammonia above threshold — filtration service raised', tone: 'bad' },
        { time: '12:30', tag: 'Resolved', text: 'Aviary 4 humidity sensor back within range', tone: 'good' },
        { time: '11:12', tag: 'High', text: 'Zone A perimeter gate left unsecured for 6 minutes', tone: 'warn' },
        { time: '09:40', tag: 'Critical', text: 'ANM-40218 vitals escalated — 4-hourly checks started', tone: 'bad' },
        { time: '07:05', tag: 'Weather', text: 'Heavy rain warning issued for the Jamnagar district', tone: 'warn' },
      ],
    },
    {
      kind: 'rows',
      title: 'Recent Alerts',
      meta: '36 open',
      items: [
        { label: 'ALT-9241 · Tank 9 ammonia', sub: 'IoT · critical · Aquatic Hall 2', value: '12 min', tone: 'bad' },
        { label: 'ALT-9238 · ANM-40218 vitals', sub: 'Medical · critical · Isolation 2', value: '4 h', tone: 'bad' },
        { label: 'ALT-9235 · Gate 4 unsecured', sub: 'Infrastructure · high · Zone A', value: '3 h', tone: 'warn' },
        { label: 'ALT-9231 · Heavy rain warning', sub: 'Weather · high · campus-wide', value: '7 h', tone: 'warn' },
        { label: 'ALT-9228 · Aviary 7 door sensor', sub: 'IoT · medium · intermittent', value: '1 day', tone: 'neutral' },
      ],
    },
  ],
}
