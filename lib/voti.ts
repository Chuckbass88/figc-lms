// Motore calcolo voto ponderato corso (Fase C — spec quiz/esami 2026-05-14)
//
// Regole:
//  - Tutti i voti sono normalizzati su scala /30 per la media.
//  - Task: media grade_decimal (/10) × 3 → /30
//  - Pratiche: media practical_evaluations.final_score + course_evaluations.voto (/10) × 3 → /30
//  - Esame finale: quiz_attempts dei quiz is_esame_finale=true; score già su grading_scale del quiz
//    (10 o 30) → normalizzato /30
//  - Quiz intermedi: inclusi nel bucket task SOLO se courses.quiz_intermedi_in_media=true (opz. B);
//    altrimenti esclusi dalla media (opz. A, default)
//  - Media finale = somma(bucket30 × peso) / somma(peso dei bucket con dati); pesi da courses
//  - Esame superato: score esame finale ≥ 18 su /30 (≥ soglia equivalente se scala 10)

import type { SupabaseClient } from '@supabase/supabase-js'

export interface VotoStudente {
  studentId: string
  fullName: string
  taskMedia10: number | null      // media task su /10 (null = nessuna task valutata)
  praticheMedia10: number | null  // media pratiche su /10
  esameScore30: number | null     // voto esame finale su /30
  esameErrori: number | null
  esameCorrette: number | null
  esameTotale: number | null
  esameSuperato: boolean | null   // ≥18/30
  mediaFinale30: number | null    // media ponderata finale su /30
}

export interface VotiCorso {
  pesoTask: number
  pesoPratiche: number
  pesoEsame: number
  quizIntermediInMedia: boolean
  studenti: VotoStudente[]
}

function avg(nums: number[]): number | null {
  const valid = nums.filter(n => typeof n === 'number' && !Number.isNaN(n))
  if (valid.length === 0) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export async function calcolaVotiCorso(
  supabase: SupabaseClient,
  courseId: string,
): Promise<VotiCorso> {
  const [
    { data: course },
    { data: enrollments },
    { data: courseTasks },
    { data: practical },
    { data: openEval },
    { data: quizzes },
  ] = await Promise.all([
    supabase.from('courses')
      .select('id, peso_task, peso_pratiche, peso_esame, quiz_intermedi_in_media')
      .eq('id', courseId).single(),
    supabase.from('course_enrollments')
      .select('student_id, status, profiles!course_enrollments_student_id_fkey(id, full_name)')
      .eq('course_id', courseId).eq('status', 'active'),
    supabase.from('course_tasks').select('id').eq('course_id', courseId),
    supabase.from('practical_evaluations')
      .select('student_id, final_score').eq('course_id', courseId),
    supabase.from('course_evaluations')
      .select('student_id, voto').eq('course_id', courseId),
    supabase.from('course_quizzes')
      .select('id, is_esame_finale, grading_scale, passing_score')
      .eq('course_id', courseId),
  ])

  const c = (course ?? {}) as {
    peso_task?: number; peso_pratiche?: number; peso_esame?: number; quiz_intermedi_in_media?: boolean
  }
  const pesoTask = c.peso_task ?? 40
  const pesoPratiche = c.peso_pratiche ?? 30
  const pesoEsame = c.peso_esame ?? 30
  const quizIntermediInMedia = c.quiz_intermedi_in_media ?? false

  const students = (enrollments ?? [])
    .map(r => (r as unknown as { profiles: { id: string; full_name: string } | null }).profiles)
    .filter(Boolean) as { id: string; full_name: string }[]

  const taskIds = (courseTasks ?? []).map(t => (t as { id: string }).id)
  const quizList = (quizzes ?? []) as { id: string; is_esame_finale: boolean; grading_scale: number; passing_score: number | null }[]
  const esameQuizIds = quizList.filter(q => q.is_esame_finale).map(q => q.id)
  const intermedioQuiz = quizList.filter(q => !q.is_esame_finale)

  // Task submissions valutate (grade_decimal /10) per i task del corso
  const { data: subs } = taskIds.length > 0
    ? await supabase.from('task_submissions')
        .select('student_id, grade_decimal').in('task_id', taskIds)
    : { data: [] }

  // Tentativi quiz (esame finale + eventuali intermedi)
  const allQuizIds = quizList.map(q => q.id)
  const { data: attempts } = allQuizIds.length > 0
    ? await supabase.from('quiz_attempts')
        .select('student_id, quiz_id, score, total, passed').in('quiz_id', allQuizIds)
    : { data: [] }

  const quizById = new Map(quizList.map(q => [q.id, q]))

  const studenti: VotoStudente[] = students.map(s => {
    // ── Task /10 ──
    const taskScores = (subs ?? [])
      .filter(x => (x as { student_id: string }).student_id === s.id)
      .map(x => (x as { grade_decimal: number | null }).grade_decimal)
      .filter((g): g is number => g != null)

    // Quiz intermedi nel bucket task (opzione B) → normalizzati /10
    const intermediScores10: number[] = []
    if (quizIntermediInMedia) {
      for (const q of intermedioQuiz) {
        const att = (attempts ?? []).find(a =>
          (a as { student_id: string; quiz_id: string }).student_id === s.id &&
          (a as { quiz_id: string }).quiz_id === q.id)
        if (att) {
          const sc = (att as { score: number }).score
          const scale = q.grading_scale ?? 30
          intermediScores10.push(scale === 30 ? sc / 3 : sc)
        }
      }
    }
    const taskMedia10 = avg([...taskScores, ...intermediScores10])

    // ── Pratiche /10 (practical_evaluations + course_evaluations) ──
    const pracScores = (practical ?? [])
      .filter(x => (x as { student_id: string }).student_id === s.id)
      .map(x => (x as { final_score: number | null }).final_score)
      .filter((g): g is number => g != null)
    const openScores = (openEval ?? [])
      .filter(x => (x as { student_id: string }).student_id === s.id)
      .map(x => (x as { voto: number | null }).voto)
      .filter((g): g is number => g != null)
    const praticheMedia10 = avg([...pracScores, ...openScores])

    // ── Esame finale /30 (ultimo tentativo se più d'uno) ──
    let esameScore30: number | null = null
    let esameErrori: number | null = null
    let esameCorrette: number | null = null
    let esameTotale: number | null = null
    let esameSuperato: boolean | null = null
    for (const qid of esameQuizIds) {
      const att = (attempts ?? []).find(a =>
        (a as { student_id: string; quiz_id: string }).student_id === s.id &&
        (a as { quiz_id: string }).quiz_id === qid)
      if (att) {
        const q = quizById.get(qid)!
        const sc = (att as { score: number }).score
        const tot = (att as { total: number | null }).total ?? null
        const scale = q.grading_scale ?? 30
        esameScore30 = scale === 30 ? sc : round1(sc * 3)
        esameTotale = tot
        esameCorrette = tot != null ? Math.max(0, sc) : null
        esameErrori = tot != null && esameCorrette != null ? Math.max(0, tot - esameCorrette) : null
        esameSuperato = esameScore30 >= 18
        break
      }
    }

    // ── Media ponderata finale /30 ──
    const buckets: { v30: number; peso: number }[] = []
    if (taskMedia10 != null) buckets.push({ v30: taskMedia10 * 3, peso: pesoTask })
    if (praticheMedia10 != null) buckets.push({ v30: praticheMedia10 * 3, peso: pesoPratiche })
    if (esameScore30 != null) buckets.push({ v30: esameScore30, peso: pesoEsame })
    const pesoTot = buckets.reduce((a, b) => a + b.peso, 0)
    const mediaFinale30 = pesoTot > 0
      ? round1(buckets.reduce((a, b) => a + b.v30 * b.peso, 0) / pesoTot)
      : null

    return {
      studentId: s.id,
      fullName: s.full_name,
      taskMedia10: taskMedia10 != null ? round1(taskMedia10) : null,
      praticheMedia10: praticheMedia10 != null ? round1(praticheMedia10) : null,
      esameScore30,
      esameErrori,
      esameCorrette,
      esameTotale,
      esameSuperato,
      mediaFinale30,
    }
  })

  return { pesoTask, pesoPratiche, pesoEsame, quizIntermediInMedia, studenti }
}
