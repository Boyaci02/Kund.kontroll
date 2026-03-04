import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { Sidebar } from "@/components/layout/Sidebar"
import { DBProvider } from "@/components/providers/DBProvider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export const metadata: Metadata = {
  title: "Kunder Kontroll | Syns Nu",
  description: "Kundhantering och onboarding för Syns Nu",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <DBProvider>
            <TooltipProvider>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 ml-60 min-h-screen bg-background">
                  {children}
                </main>
              </div>
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </DBProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
