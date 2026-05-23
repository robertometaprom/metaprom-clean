import "./globals.css"

export const metadata = {
  title: "Metaprom",
  description: "AI-powered social campaign generator",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
