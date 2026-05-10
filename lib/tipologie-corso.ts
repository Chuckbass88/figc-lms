/**
 * Lista canonica delle tipologie corso CoachLab.
 * Usata nell'archivio generale (tag file) e nei template corsi.
 */
export const TIPOLOGIE_CORSO = [
  'UEFA Pro',
  'UEFA A',
  'UEFA C',
  'Licenza D',
  'UEFA Fitness A',
  'UEFA Fitness B',
  'UEFA GK A',
  'UEFA GK B',
  'FIGC GK C',
  'UEFA Futsal B',
  'Segretario sportivo',
  'Direttore Sportivo',
  'Direttore Sportivo Sett. Giov.',
  'Match Analyst',
] as const

export type TipologiaCorso = typeof TIPOLOGIE_CORSO[number]
