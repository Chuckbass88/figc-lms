import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'
import { Analytics } from '@vercel/analytics/next'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'CoachLab — Formazione Allenatori',
  description: 'Portale CoachLab per la formazione degli allenatori di calcio',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={spaceGrotesk.variable}>
      <body className="antialiased">
        {children}
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  )
}
