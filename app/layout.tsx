import type React from "react"
import type { Metadata } from "next"
import { Inter, Sora } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { StagewiseToolbar } from "@stagewise/toolbar-next"

const inter = Inter({ subsets: ["latin"] })
const sora = Sora({ 
  subsets: ["latin"],
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: "Popmint - AI Ad Agent",
  description: "Create AI-powered ad creatives",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${sora.variable}`}>
        {process.env.NODE_ENV === "development" && (
          <StagewiseToolbar config={{ plugins: [] }} />
        )}
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
