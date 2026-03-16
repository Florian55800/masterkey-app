import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MasterKey Dashboard',
  description: 'Dashboard de gestion pour MasterKey Conciergerie',
}

export const viewport = {
  themeColor: '#1b1b1b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-background text-white antialiased">
        {children}
      </body>
    </html>
  )
}
