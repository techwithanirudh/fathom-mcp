import type { Metadata } from 'next'

import '@/styles/globals.css'
import { Figtree } from 'next/font/google'
import { cn } from '@/lib/utils'

const figtree = Figtree({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  description: 'Connect your Fathom account to AI assistants via MCP.',
  title: 'Fathom MCP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={cn('font-sans', figtree.variable)} lang='en'>
      <body>{children}</body>
    </html>
  )
}
