/**
 * Calcola le date reali del corso a partire dalla data di inizio.
 * Skippa sempre la domenica (dayOfWeek = 0).
 * Skippa il sabato (dayOfWeek = 6) se skipSabato = true.
 *
 * @param startDate  Data di inizio nel formato "YYYY-MM-DD"
 * @param nGiorni    Numero di giorni didattici da generare
 * @param options    { skipSabato?: boolean }
 * @returns          Array di Date (una per ogni giorno didattico)
 */
export function calcolaDateCorso(
  startDate: string,
  nGiorni: number,
  options: { skipSabato?: boolean } = {}
): Date[] {
  const { skipSabato = false } = options
  const dates: Date[] = []
  // Parse senza timezone: usa T12:00:00 per evitare shift da UTC
  const current = new Date(startDate + 'T12:00:00')

  while (dates.length < nGiorni) {
    const dow = current.getDay() // 0=dom, 6=sab
    const skip = dow === 0 || (skipSabato && dow === 6)
    if (!skip) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/** Formatta Date → "YYYY-MM-DD" per Supabase */
export function toSupabaseDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Formatta Date → "Lun 12 giu" per UI preview */
export function formatGiornoPreview(d: Date): string {
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
}
