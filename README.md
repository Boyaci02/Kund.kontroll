# Kunder Kontroll

CRM och onboarding-system för **Syns Nu** – ett verktyg för att hantera restaurangkunder, inspelningsschema, onboarding-checklistor och SMS-kommunikation.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Komponenter:** [shadcn/ui](https://ui.shadcn.com/)
- **Dark mode:** [next-themes](https://github.com/pacocoursey/next-themes)
- **Ikoner:** [Lucide React](https://lucide.dev/)
- **Data:** localStorage (ingen backend krävs)

## Funktioner

- **Översikt** – Dashboard med statistik och kommande inspelningar
- **Kunder** – Fullständig CRM med sök, filter, lägg till/redigera/ta bort
- **Onboarding** – 6-stegs checklista per kund med framsteg-spårning
- **Veckoplanering** – 4-veckors inspelningsschema
- **Kundkontakt** – Bokning, SMS-påminnelser och kvartalsamtal
- **SMS-mallar** – 5 mallar med variabelifyllning och kopieringsfunktion
- **Dark mode** – Toggle i sidebaren

## Kom igång

```bash
# Installera beroenden
npm install

# Starta dev-server
npm run dev

# Bygg för produktion
npm run build
```

Öppna [http://localhost:3000](http://localhost:3000) i din webbläsare.

## Datalagring

All data sparas i webbläsarens `localStorage` under nyckeln `kkv4`. Data kan exporteras/importeras via knapparna i sidebaren.

## Projektstruktur

```
src/
├── app/              # Next.js App Router-sidor
│   ├── page.tsx      # Översikt
│   ├── kunder/       # Kundlista
│   ├── onboarding/   # Onboarding-checklista
│   ├── veckoplanering/
│   ├── kundkontakt/
│   └── sms-mallar/
├── components/
│   ├── layout/       # Sidebar, ThemeToggle
│   ├── providers/    # DBProvider (state)
│   └── ui/           # shadcn/ui-komponenter
└── lib/
    ├── types.ts      # TypeScript-interfaces
    ├── data.ts       # Initiala kunddata
    ├── store.ts      # localStorage-state
    └── helpers.ts    # Utility-funktioner
```
