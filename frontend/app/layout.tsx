import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono, Syne } from 'next/font/google'
import './globals.css'

const syne = Syne({ subsets: ['latin'], variable: '--font-syne' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'ReelClone',
  description: 'Clone le format de tes Reels performants en 3 minutes',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body
        className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable} font-dm-sans bg-bg-primary text-text-primary min-h-screen`}
      >
        {children}
      </body>
    </html>
  )
}
