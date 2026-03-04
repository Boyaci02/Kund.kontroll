import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "next-themes"
import { DBProvider } from "@/components/providers/DBProvider"
import { AuthProvider } from "@/components/providers/AuthProvider"
import { AuthGuard } from "@/components/layout/AuthGuard"
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
              <AuthProvider>
                <AuthGuard>
                  {children}
                </AuthGuard>
              </AuthProvider>
              <Toaster richColors position="bottom-right" />
            </TooltipProvider>
          </DBProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
