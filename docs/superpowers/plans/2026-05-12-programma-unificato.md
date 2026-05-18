# Programma Unificato Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire i tab ridondanti Sessioni + Programma + Calendario con un'unica sezione "Programma" che include: timetable delle giornate (Elenco), vista calendario, registrazione presenze per giornata con note di assenza, e stampa/condivisione del programma completo.

**Architecture:** La nuova sezione usa `corso_eventi` come unica fonte di verità per il calendario. Le presenze vengono spostate in una nuova tabella `corso_presenze` (corso_id, student_id, data, present, note_assenza) scollegata dal vecchio sistema `course_sessions`/`attendances` che rimane invariato per backward compatibility. Il componente `ProgrammaTab` è condiviso tra super-admin e docente, con props che controllano i permessi di editing.

**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL, Tailwind v4, `window.print()` per la stampa (no librerie PDF esterne).

**Stato:** ✅ COMPLETATO — 12 maggio 2026

---

## Checklist finale (da verificare in browser prima del deploy)

- [ ] `/super-admin/corsi/[id]/programma` → mostra sub-tab Elenco / Calendario / Presenze
- [ ] Elenco → mostra righe per giorno con blocchi fascia oraria
- [ ] Elenco (admin) → hover fascia → icone edit/delete; "+ Aggiungi fascia"; "+ Aggiungi giornata"
- [ ] Calendario → mostra la CalendarioTabella esistente
- [ ] Presenze → selettore data, lista studenti con toggle presente/assente, campo nota
- [ ] Pulsante "Applica template" in ProgrammaTab → modal funzionante, ricarica pagina
- [ ] Pulsante "Stampa / Condividi" → modal, selezione sezioni, `window.print()` apre dialogo stampa
- [ ] Stampa → PrintLayout visibile, UI nascosta
- [ ] Docente su `/docente/corsi/[id]/programma` → stessa UI, può registrare presenze
- [ ] Nav super-admin → non ci sono più Sessioni e Calendario nel nav
- [ ] Vecchio sistema presenze (`/docente/corsi/[id]/presenze`) ancora funzionante (backward compat)
