import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ROLE_PREFIX: Record<string, string> = {
  super_admin: '/super-admin',
  docente: '/docente',
  studente: '/studente',
}

const PROTECTED_PREFIXES = ['/super-admin', '/docente', '/studente']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Non autenticato: /login, /invito/* e /invito-docente/* accessibili senza auth
  const publicPaths = ['/login', '/invito', '/invito-docente']
  if (!user && !publicPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Autenticato su /login: redirect alla dashboard del ruolo
  if (user && pathname === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role) {
      return NextResponse.redirect(new URL(ROLE_PREFIX[profile.role] ?? '/super-admin', request.url))
    }
  }

  // Protezione per ruolo errato (es. studente su /super-admin)
  const isProtected = PROTECTED_PREFIXES.some(p => pathname.startsWith(p))
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role) {
      // super_admin può accedere a tutte le rotte protette
      if (profile.role === 'super_admin') return supabaseResponse
      const userPrefix = ROLE_PREFIX[profile.role]
      const isWrongRole = PROTECTED_PREFIXES.some(p => pathname.startsWith(p) && p !== userPrefix)
      if (isWrongRole) {
        return NextResponse.redirect(new URL(userPrefix, request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|.*\\.webp).*)'],
}
