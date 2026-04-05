/**
 * Email helper — usa Resend se RESEND_API_KEY è configurata.
 * Se la variabile non è presente, logga e ignora silenziosamente.
 */

const FROM = process.env.RESEND_FROM ?? 'CoachLab <noreply@coachlab.it>'

type EmailPayload = {
  to: string | string[]
  subject: string
  html: string
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[email] RESEND_API_KEY non configurata — email non inviata:', payload.subject)
    return
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const to = Array.isArray(payload.to) ? payload.to : [payload.to]
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: payload.subject,
      html: payload.html,
    })
    if (error) console.error('[email] Errore invio:', error)
  } catch (err) {
    console.error('[email] Errore:', err)
  }
}

// ─── Template email ──────────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <tr>
    <td style="background:linear-gradient(135deg,#1B3768 0%,#1565C0 100%);padding:20px 32px;text-align:left;">
      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:20px;font-weight:900;letter-spacing:-0.5px;">
        <span style="color:#ffffff;">COACH</span><span style="color:#29ABE2;">LAB</span>
      </span>
      <div style="color:rgba(255,255,255,.6);font-size:11px;margin-top:2px;">Formazione Allenatori</div>
    </td>
  </tr>
  <tr><td style="padding:28px 32px 32px;">${content}</td></tr>
  <tr>
    <td style="background:#f8fafc;padding:14px 32px;border-top:1px solid #e2e8f0;">
      <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
        CoachLab · Formazione Allenatori<br>
        Non rispondere a questa email — è generata automaticamente.
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

function btn(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#1565C0;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:10px 22px;border-radius:8px;margin-top:20px;">${label}</a>`
}

function title(text: string): string {
  return `<h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#0f172a;">${text}</h1>`
}

function subtitle(text: string): string {
  return `<p style="margin:0 0 20px;font-size:13px;color:#64748b;">${text}</p>`
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">`
}

function pill(text: string, color = '#dbeafe', textColor = '#1d4ed8'): string {
  return `<span style="background:${color};color:${textColor};font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">${text}</span>`
}

// ─── Template specifici ───────────────────────────────────────────────────────

export function emailNuovoTask(opts: {
  recipientName: string
  taskTitle: string
  courseNme: string
  dueDate: string | null
  appUrl: string
}): EmailPayload {
  const dueLine = opts.dueDate
    ? `${divider()}<p style="margin:0;font-size:13px;color:#64748b;">⏰ Scadenza: <strong style="color:#dc2626;">${new Date(opts.dueDate).toLocaleDateString('it-IT')}</strong></p>`
    : ''
  return {
    subject: `Nuovo task assegnato: ${opts.taskTitle}`,
    to: '', // sostituito da chi chiama
    html: emailWrapper(`
      ${title('Nuovo task assegnato')}
      ${subtitle(`Ciao ${opts.recipientName}, ti è stato assegnato un nuovo task.`)}
      <div style="background:#f8faff;border:1px solid #e0e8ff;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;">${opts.taskTitle}</p>
        <p style="margin:0;font-size:12px;color:#64748b;">${pill(opts.courseNme)}</p>
      </div>
      ${dueLine}
      ${btn(opts.appUrl, 'Vai al task →')}
    `),
  }
}

export function emailNuovoQuiz(opts: {
  recipientName: string
  quizTitle: string
  courseName: string
  passScore: number
  appUrl: string
}): EmailPayload {
  return {
    subject: `Nuovo quiz disponibile: ${opts.quizTitle}`,
    to: '',
    html: emailWrapper(`
      ${title('Nuovo quiz disponibile')}
      ${subtitle(`Ciao ${opts.recipientName}, è disponibile un nuovo quiz.`)}
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;">${opts.quizTitle}</p>
        <p style="margin:0;font-size:12px;color:#64748b;">${pill(opts.courseName, '#dcfce7', '#16a34a')}</p>
      </div>
      ${divider()}
      <p style="margin:0;font-size:13px;color:#64748b;">Soglia superamento: <strong>${opts.passScore}%</strong></p>
      ${btn(opts.appUrl, 'Svolgi il quiz →')}
    `),
  }
}

export function emailValutazioneTask(opts: {
  recipientName: string
  taskTitle: string
  courseName: string
  grade: string
  feedback: string | null
  appUrl: string
}): EmailPayload {
  const feedbackBlock = opts.feedback
    ? `${divider()}<p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:.5px;">Commento del docente</p><p style="margin:0;font-size:13px;color:#334155;">${opts.feedback}</p>`
    : ''
  return {
    subject: `Valutazione ricevuta: ${opts.taskTitle}`,
    to: '',
    html: emailWrapper(`
      ${title('Hai ricevuto una valutazione')}
      ${subtitle(`Ciao ${opts.recipientName}, il tuo task è stato valutato.`)}
      <div style="background:#fefce8;border:1px solid #fef08a;border-radius:10px;padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;">${opts.taskTitle}</p>
        <p style="margin:0 0 8px;font-size:12px;color:#64748b;">${pill(opts.courseName, '#fef9c3', '#a16207')}</p>
        <p style="margin:0;font-size:20px;font-weight:900;color:#1565C0;">${opts.grade}</p>
      </div>
      ${feedbackBlock}
      ${btn(opts.appUrl, 'Visualizza il task →')}
    `),
  }
}

export function emailNuovoAnnuncio(opts: {
  recipientName: string
  announcementTitle: string
  courseName: string
  content: string
  appUrl: string
}): EmailPayload {
  return {
    subject: `Nuovo annuncio: ${opts.announcementTitle}`,
    to: '',
    html: emailWrapper(`
      ${title('Nuovo annuncio nel corso')}
      ${subtitle(`Ciao ${opts.recipientName}, è stato pubblicato un nuovo annuncio.`)}
      <div style="background:#f8faff;border-left:4px solid #1565C0;border-radius:0 10px 10px 0;padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;">${opts.announcementTitle}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">${opts.content.slice(0, 200)}${opts.content.length > 200 ? '…' : ''}</p>
      </div>
      ${btn(opts.appUrl, 'Leggi l\'annuncio →')}
    `),
  }
}

export function emailInvitoCorso(opts: {
  courseName: string
  inviteUrl: string
}): EmailPayload {
  return {
    subject: `Sei stato invitato al corso: ${opts.courseName}`,
    to: '',
    html: emailWrapper(`
      ${title('Invito al corso')}
      ${subtitle(`Sei stato invitato a partecipare al seguente corso di formazione.`)}
      <div style="background:#f8faff;border:1px solid #e0e8ff;border-radius:10px;padding:16px 20px;">
        <p style="margin:0;font-size:16px;font-weight:800;color:#1565C0;">${opts.courseName}</p>
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:#64748b;">Clicca il pulsante per registrarti e accedere al corso. Il link è personale e non trasferibile.</p>
      ${btn(opts.inviteUrl, 'Accetta invito →')}
    `),
  }
}
