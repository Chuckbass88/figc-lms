import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendEmail, emailReminder } from '@/lib/email'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

  const now = new Date().toISOString()

  const { data: due } = await supabase
    .from('personal_reminders')
    .select('*')
    .eq('user_id', user.id)
    .eq('sent', false)
    .lte('remind_at', now)

  if (!due || due.length === 0) return NextResponse.json({ sent: 0 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://coachlab.it'
  let sentCount = 0

  for (const reminder of due) {
    const notifyType: string = reminder.notify_type ?? 'both'

    if (notifyType === 'notification' || notifyType === 'both') {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title: `⏰ Promemoria: ${reminder.title}`,
        message: reminder.description ?? reminder.title,
        read: false,
      })
    }

    if ((notifyType === 'email' || notifyType === 'both') && profile?.email) {
      const payload = emailReminder({
        recipientName: profile.full_name ?? 'Utente',
        title: reminder.title,
        description: reminder.description ?? null,
        remindAt: reminder.remind_at,
        appUrl,
      })
      payload.to = profile.email
      await sendEmail(payload)
    }

    await supabase
      .from('personal_reminders')
      .update({ sent: true })
      .eq('id', reminder.id)

    sentCount++
  }

  return NextResponse.json({ sent: sentCount })
}
