import { z } from 'zod'

const uuid = z.string().uuid('ID non valido')

// ---- Quiz ----

export const QuizOptionSchema = z.object({
  text: z.string().min(1, 'Il testo dell\'opzione non può essere vuoto').max(500),
  isCorrect: z.boolean(),
})

export const QuizQuestionSchema = z.object({
  text: z.string().min(3, 'Il testo della domanda è troppo corto').max(2000),
  points: z.number().int().min(1).max(10).default(1),
  options: z
    .array(QuizOptionSchema)
    .min(2, 'Ogni domanda deve avere almeno 2 opzioni')
    .max(6, 'Ogni domanda può avere al massimo 6 opzioni')
    .refine(opts => opts.some(o => o.isCorrect), 'Almeno un\'opzione deve essere corretta'),
})

export const CreateQuizSchema = z.object({
  courseId: uuid,
  groupId: uuid.nullable().optional(),
  title: z.string().min(3, 'Il titolo deve avere almeno 3 caratteri').max(200),
  description: z.string().max(1000).nullable().optional(),
  passingScore: z.number().min(0).max(1000).default(18),
  timerMinutes: z.number().int().min(1).max(360).default(30),
  questions: z
    .array(QuizQuestionSchema)
    .min(1, 'Il quiz deve avere almeno 1 domanda')
    .max(200, 'Il quiz può avere al massimo 200 domande'),
  category: z.string().max(100).nullable().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  shuffleQuestions: z.boolean().default(false),
  availableFrom: z.string().datetime().nullable().optional(),
  availableUntil: z.string().datetime().nullable().optional(),
  autoCloseOnTimer: z.boolean().default(true),
  penaltyWrong: z.boolean().default(false),
  questionsPerStudent: z.number().int().min(1).nullable().optional(),
})

// ---- Messaggi ----

export const CreaMessaggioSchema = z.object({
  otherUserId: uuid,
  content: z
    .string()
    .min(1, 'Il messaggio non può essere vuoto')
    .max(5000, 'Il messaggio è troppo lungo (max 5000 caratteri)')
    .transform(s => s.trim()),
})

export const InviaMessaggioSchema = z.object({
  conversationId: uuid,
  content: z.string().max(5000).optional(),
  type: z.enum(['text', 'image', 'file']).default('text'),
  file_url: z.string().url().optional(),
  file_name: z.string().max(255).optional(),
  file_size: z.number().int().min(0).optional(),
  file_mime: z.string().max(100).optional(),
})

// ---- Notifiche ----

export const InviaNotificaSchema = z.object({
  title: z.string().min(1, 'Il titolo è obbligatorio').max(200).transform(s => s.trim()),
  message: z.string().min(1, 'Il messaggio è obbligatorio').max(1000).transform(s => s.trim()),
  target: z.string().min(1, 'Il destinatario è obbligatorio'),
  courseId: uuid.optional(),
})

// ---- Utility ----

/** Restituisce la prima stringa di errore Zod trovata, formattata per l'utente */
export function zodError(err: z.ZodError): string {
  const first = err.errors[0]
  return first?.message ?? 'Dati non validi'
}
