/**
 * Demo snapshot of the Command Centre. In production this is the payload of a
 * single lightweight "home" endpoint — detailed analytics load in drill-downs.
 */
export interface SexSplit {
  male: number
  female: number
  unknown: number
}

export interface CommandCentreSnapshot {
  user: { name: string }
  site: { name: string }
  weather: { tempC: number; summary: string }
  population: {
    /** In lakh (design shows "2.1L") */
    totalLakh: number
    split: SexSplit
  }
  natality: { value: number; trend: number[] }
  mortality: { value: number; trend: number[] }
  medical: { sick: number; hospitalised: number }
  eggs: { collected: number; incubating: number }
  approvals: {
    pendingTasks: number
    totalTasks: number
    reviewers: Array<{ initials: string; photo?: boolean; color?: string }>
    more: number
  }
}

export const snapshot: CommandCentreSnapshot = {
  user: { name: 'Subhash' },
  site: { name: 'Jamnagar' },
  weather: { tempC: 24, summary: 'Partly cloudy' },
  population: {
    totalLakh: 2.1,
    split: { male: 67, female: 58, unknown: 18 },
  },
  natality: { value: 45, trend: [28, 15, 15, 18, 23, 18, 15] },
  mortality: { value: 23, trend: [23, 15, 15, 18, 23, 18, 15] },
  medical: { sick: 123, hospitalised: 45 },
  eggs: { collected: 45, incubating: 21 },
  approvals: {
    pendingTasks: 7,
    totalTasks: 10,
    reviewers: [
      { initials: 'RS', photo: true },
      { initials: 'TK', color: '#37bd69' },
      { initials: 'AM', photo: true },
      { initials: 'TK', color: '#00d6c9' },
    ],
    more: 7,
  },
}
