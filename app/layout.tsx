import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'
import { Analytics } from '@vercel/analytics/next'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'CoachLab — Formazione Allenatori',
  description: 'Portale CoachLab per la formazione degli allenatori di calcio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={jakarta.variable}>
      <body className="antialiased">
        {children}
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  )
}
