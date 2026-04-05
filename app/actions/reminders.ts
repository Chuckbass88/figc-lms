'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ReminderColor = 'gray' | 'red' | 'green' | 'blue' | 'yellow'

export type Reminder = {
  id: string
  user_id: string
  date: string        // YYYY-MM-DD
  time: string | null // HH:MM (24h) oppure null
  title: string
  note: string | null
  color: ReminderColor
  created_at: string
}

export async function createReminder(data: {
  date: string
  time?: string
  title: string
  note?: string
  color: ReminderColor
}): Promise<{ ok: true; reminder: Reminder } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { data: reminder, error } = await supabase
    .from('user_reminders')
    .insert({ ...data, time: data.time || null, user_id: user.id })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  revalidatePath('/[role]/calendario', 'page')
  return { ok: true, reminder: reminder as Reminder }
}

export async function updateReminder(
  id: string,
  data: { title?: string; note?: string; color?: ReminderColor; date?: string; time?: string | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { error } = await supabase
    .from('user_reminders')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/[role]/calendario', 'page')
  return { ok: true }
}

export async function deleteReminder(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Non autenticato' }

  const { error } = await supabase
    .from('user_reminders')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { ok: false, error: error.message }
  revalidatePath('/[role]/calendario', 'page')
  return { ok: true }
}
