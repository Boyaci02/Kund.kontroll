"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/AuthProvider"
import { SignInPage, type Testimonial } from "@/components/ui/sign-in"
import { toast } from "sonner"

const TESTIMONIALS: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "Philip Strand",
    handle: "@philip",
    text: "Systemet gör det enkelt att hålla koll på alla kunder och inspelningar. Sparar massor av tid varje vecka.",
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Danah Lindqvist",
    handle: "@danah",
    text: "Onboarding-checklistorna är guld värda. Inget faller mellan stolarna längre.",
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/67.jpg",
    name: "Jakob Eriksson",
    handle: "@jakob",
    text: "SMS-mallarna sparar mig 30 minuter per vecka. Riktigt smidigt verktyg för hela teamet.",
  },
]

export default function LoginPage() {
  const { user, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace("/")
  }, [user, router])

  async function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = (formData.get("email") as string) ?? ""
    const password = (formData.get("password") as string) ?? ""

    const success = await login(name, password)
    if (success) {
      router.push("/")
    } else {
      toast.error("Ogiltigt namn eller lösenord")
    }
  }

  function handleGoogleSignIn() {
    toast.error("Google-inloggning är inte tillgängligt")
  }

  function handleResetPassword() {
    toast.info("Kontakta Emanuel för att återställa lösenordet")
  }

  function handleCreateAccount() {
    toast.info("Kontakta Emanuel för att få åtkomst")
  }

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        title={
          <span>
            Välkommen till{" "}
            <span className="text-primary">Syns Nu</span>
          </span>
        }
        description="Logga in med ditt namn och det gemensamma lösenordet"
        heroImageSrc="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1800&q=80"
        testimonials={TESTIMONIALS}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onResetPassword={handleResetPassword}
        onCreateAccount={handleCreateAccount}
      />
    </div>
  )
}
