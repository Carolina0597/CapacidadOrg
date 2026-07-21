import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gestión de Capacidad Organizacional · Sistecrédito For+',
  description:
    'Habilitador estratégico de la capacidad organizacional: visibilidad, control y decisiones basadas en datos sobre la agenda de formación, sensibilización y experiencias.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#0e2647',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="light" style={{ background: '#f4f6f9' }}>
      <body className="antialiased" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' }}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
