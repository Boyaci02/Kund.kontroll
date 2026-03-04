import type {
  Kund,
  OnboardingSteg,
  Veckoschema,
  KontaktLista,
  SMSMall,
} from "./types"

export const INIT_KUNDER: Kund[] = [
  { id: 1, name: "Drippn Burgers", pkg: "Lilla Paketet", vg: "Philip", ed: "Danah", cc: "Jakob", lr: "26 jan", nr: "10 mars", ns: "Mars", adr: "Ostergatan 12, Sodertalje", cnt: "George", ph: "073-949 86 77", st: "AKTIV", notes: "" },
  { id: 2, name: "KEB", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Sami", lr: "16 feb", nr: "16 mars", ns: "Mars", adr: "Globen Shopping Plan 4", cnt: "Juliette", ph: "070-402 06 83", st: "AKTIV", notes: "" },
  { id: 3, name: "Berra Burras", pkg: "Extra Stort Paket", vg: "Philip", ed: "Danah", cc: "Jakob", lr: "11 feb", nr: "9 mars + 11 mars", ns: "Mars", adr: "Rudbecksgatan 125, Orebro", cnt: "Mansour", ph: "070-400 69 95", st: "AKTIV", notes: "" },
  { id: 4, name: "Ostermalmsgrillen", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Sami", lr: "18 feb", nr: "20 mars", ns: "Mars", adr: "Ostermalmstorg", cnt: "George", ph: "073-324 24 55", st: "AKTIV", notes: "" },
  { id: 5, name: "Qopla", pkg: "Special Paket", vg: "Philip", ed: "Philip", cc: "Jakob", lr: "12 feb", nr: "?", ns: "Mars", adr: "VARIERANDE", cnt: "SLACK", ph: "", st: "AKTIV", notes: "" },
  { id: 6, name: "Fullmoon Wok", pkg: "Stora Paketet", vg: "Etienne", ed: "Danah", cc: "Sami", lr: "23 feb", nr: "Mar V.4", ns: "Mars", adr: "Odenplan / Sveavaegen", cnt: "", ph: "", st: "AKTIV", notes: "" },
  { id: 7, name: "STEKT Burger", pkg: "Stora Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "26 feb", nr: "Mar V.4", ns: "Mars", adr: "MOS / Taby C / Kungens Kurva / Arninge / Sodertalje", cnt: "Tomas", ph: "073-397 08 70", st: "AKTIV", notes: "" },
  { id: 8, name: "Berlin Doner", pkg: "Mellan Paketet", vg: "Etienne", ed: "Danah", cc: "Ingen", lr: "18 feb", nr: "Mar V.3", ns: "Mars", adr: "Nygatan 23, Linkoping", cnt: "Sanne", ph: "073-779 25 33", st: "AKTIV", notes: "" },
  { id: 9, name: "Let's Malatang", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Ingen", lr: "11 feb", nr: "10 mars", ns: "Mars", adr: "Luntmakargatan 90", cnt: "Linn", ph: "073-507 29 90", st: "AKTIV", notes: "" },
  { id: 10, name: "Southside Burgers", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Sami", lr: "17 feb", nr: "19 mars", ns: "Mars", adr: "Skondals Centrum", cnt: "Teo", ph: "079-043 97 38", st: "AKTIV", notes: "" },
  { id: 11, name: "Sushi Revolution", pkg: "Stora Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "9+20+24 feb", nr: "Mar V.4", ns: "April", adr: "Arninge / MOS", cnt: "Tomas", ph: "073-397 08 70", st: "AKTIV", notes: "" },
  { id: 12, name: "ChopChop", pkg: "Mellan Paketet", vg: "Etienne", ed: "Edvin", cc: "Sami", lr: "9 feb", nr: "11 mars", ns: "April", adr: "48 Olika enheter", cnt: "Aaiman", ph: "079-065 37 30", st: "AKTIV", notes: "" },
  { id: 13, name: "Tasty Bro's", pkg: "Mellan Paketet", vg: "Philip", ed: "Edvin", cc: "Sami", lr: "11 feb", nr: "", ns: "April", adr: "Stortorget 6, Orebro", cnt: "Jesper", ph: "073-973 82 84", st: "INAKTIV", notes: "" },
  { id: 14, name: "Asian BBQ", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Jakob", lr: "16 jan", nr: "Mar V.3", ns: "April", adr: "Goran Elgfeltsgatan 23, Taby", cnt: "Joey", ph: "073-938 02 00", st: "AKTIV", notes: "" },
  { id: 15, name: "White Rice", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Ingen", lr: "19 nov", nr: "Jan V.3", ns: "April", adr: "Ostangraend 17, Taby", cnt: "Joey", ph: "073-938 02 00", st: "AKTIV", notes: "" },
  { id: 16, name: "Brams Burgers", pkg: "Stora Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "19 feb", nr: "19 mars", ns: "April", adr: "Kista / Huddinge / Skarholmen / Uppsala", cnt: "Ahmed", ph: "073-904 65 65", st: "AKTIV", notes: "" },
  { id: 17, name: "Falafelbaren", pkg: "Mellan Paketet", vg: "Etienne", ed: "Danah", cc: "Jakob", lr: "17 feb", nr: "10 mars", ns: "April", adr: "Hornsgatan 39B, Stockholm", cnt: "Nidal", ph: "070-781 98 17", st: "AKTIV", notes: "" },
  { id: 18, name: "Mazra'a", pkg: "Mellan Paketet", vg: "Etienne", ed: "Philip", cc: "Jakob", lr: "13 feb", nr: "13 mars", ns: "April", adr: "Skanegatan 82, Stockholm", cnt: "Khader", ph: "070-748 31 22", st: "AKTIV", notes: "" },
  { id: 19, name: "Fluffy House", pkg: "Stora Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "10 feb", nr: "Mar V.2", ns: "April", adr: "Sankt Eriksgatan 44, Stockholm", cnt: "Lin", ph: "070-635 68 88", st: "AKTIV", notes: "" },
  { id: 20, name: "K25", pkg: "Mellan Paketet", vg: "Etienne", ed: "Edvin", cc: "Sami", lr: "12 feb", nr: "Mar V.2", ns: "April", adr: "Kungsgatan 25, Stockholm", cnt: "", ph: "manager@k25.nu", st: "AKTIV", notes: "" },
  { id: 21, name: "Kebabdudes", pkg: "Extra Stort Paket", vg: "Philip", ed: "Philip", cc: "Jakob", lr: "10 feb", nr: "12 mars", ns: "April", adr: "MOS / Jakobsberg / Barkarby / Kungens Kurva / Fruangen", cnt: "David", ph: "073-871 33 90", st: "AKTIV", notes: "" },
  { id: 22, name: "Troll", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Ingen", lr: "30 jan", nr: "", ns: "April", adr: "Hornsgatan 66b", cnt: "Sam", ph: "073-708 08 75", st: "AKTIV", notes: "" },
  { id: 23, name: "Dunder Smash", pkg: "Stora Paketet", vg: "Etienne", ed: "Danah", cc: "Jakob", lr: "1 feb", nr: "3 mars", ns: "Mars", adr: "Tomtbergavaegen 1, Norsborg", cnt: "Noor", ph: "070-096 64 11", st: "AKTIV", notes: "" },
  { id: 24, name: "The Holly Bush", pkg: "Lilla Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "", nr: "4 mars", ns: "Mars", adr: "Gotgatan 82, Stockholm", cnt: "Sebastian", ph: "072-252 40 31", st: "AKTIV", notes: "" },
  { id: 25, name: "Rosa Pantern", pkg: "Mellan Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "", nr: "7 mars", ns: "Mars", adr: "Sysslomansgatan 11, Uppsala", cnt: "Zakaria", ph: "073-683 01 95", st: "AKTIV", notes: "" },
  { id: 26, name: "Itamae Sushi", pkg: "Mellan Paketet", vg: "Etienne", ed: "Edvin", cc: "Sami", lr: "20 feb", nr: "Avvakta", ns: "", adr: "", cnt: "", ph: "", st: "INAKTIV", notes: "" },
  { id: 27, name: "Cutie Care", pkg: "Mellan Paketet", vg: "Etienne", ed: "Danah", cc: "Jakob", lr: "", nr: "Avvakta", ns: "", adr: "Taby / Solna / Danderyd / Nacka Forum / Saltsjobaden", cnt: "Lin", ph: "070-635 68 88", st: "INAKTIV", notes: "" },
  { id: 28, name: "Avidental", pkg: "Mellan Paketet", vg: "Etienne", ed: "Danah", cc: "Jakob", lr: "", nr: "11 mars", ns: "", adr: "Samaritvaegen 12, Tumba", cnt: "Michael", ph: "076-083 10 31", st: "INAKTIV", notes: "" },
  { id: 29, name: "Cedre de Lebanon", pkg: "Lilla Paketet", vg: "Philip", ed: "Edvin", cc: "Sami", lr: "", nr: "Avvakta", ns: "", adr: "", cnt: "", ph: "", st: "INAKTIV", notes: "" },
  { id: 30, name: "Thai House Wok", pkg: "Mellan Paketet", vg: "Etienne", ed: "Edvin", cc: "Sami", lr: "", nr: "PLANERA INSPELNING", ns: "", adr: "Hantverkargatan 78 / Birkagatan 14 / Hornsgatan 67 / Nybrogatan 42 / Folkungagatan 110", cnt: "Robert", ph: "070-871 21 75", st: "AKTIV", notes: "" },
  { id: 31, name: "Doner och Pizza", pkg: "Lilla Paketet", vg: "Etienne", ed: "Danah", cc: "Sami", lr: "", nr: "Avvakta", ns: "", adr: "Taby, Arninge", cnt: "Yasin", ph: "073-954 08 99", st: "AKTIV", notes: "" },
  { id: 32, name: "BOC STHLM", pkg: "Mellan Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "", nr: "Avvakta", ns: "", adr: "Pilottorget 8, Skarpnack", cnt: "Linda", ph: "", st: "INAKTIV", notes: "" },
  { id: 33, name: "SOOK", pkg: "", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "", nr: "Avvakta", ns: "", adr: "Livli Kungens Kurva", cnt: "David", ph: "073-871 33 90", st: "INAKTIV", notes: "" },
  { id: 34, name: "LULU Poke och Sushi Bar", pkg: "", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "", nr: "Avvakta", ns: "", adr: "", cnt: "", ph: "", st: "", notes: "" },
  { id: 35, name: "KERCH", pkg: "Lilla Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "", nr: "", ns: "", adr: "", cnt: "", ph: "", st: "", notes: "" },
  { id: 36, name: "S2", pkg: "Stora Paketet", vg: "Etienne", ed: "Edvin", cc: "Jakob", lr: "", nr: "Avvakta", ns: "", adr: "Mall of Scandinavia, Solna", cnt: "Michel", ph: "manager@k25.nu", st: "AKTIV", notes: "" },
  { id: 37, name: "AMBA", pkg: "Special Paket", vg: "", ed: "", cc: "", lr: "", nr: "", ns: "", adr: "", cnt: "", ph: "", st: "", notes: "" },
]

export const OB_STEG: OnboardingSteg[] = [
  {
    n: 1,
    title: "Admin och Grund",
    time: "5 min",
    tasks: [
      { id: "1a", text: "Kund signerad (avtal klart)", who: "Emanuel" },
      { id: "1b", text: "Kund upplagd i Google Sheet - KUNDER Kontroll", who: "Emanuel" },
      { id: "1c", text: "Kontaktperson + telefonnummer ifyllt", who: "Emanuel" },
      { id: "1d", text: "Paket / omfattning ifyllt", who: "Emanuel" },
      { id: "1e", text: "Status satt till Aktiv", who: "Emanuel" },
    ],
  },
  {
    n: 2,
    title: "Program och Struktur",
    time: "5 min",
    tasks: [
      { id: "2a", text: "Fyll information i Dokumentet TEMA - KUNDER", who: "Emanuel" },
      { id: "2b", text: "Skapa Kundkort i CRM i Notion", who: "Emanuel" },
      { id: "2c", text: "Satta upp / Koppla upp Sociala Medier", who: "Matteus" },
      { id: "2d", text: "Fixa Sociala Medier Profilbild och Bio", who: "Matteus" },
    ],
  },
  {
    n: 3,
    title: "Forbereda for Content",
    time: "",
    tasks: [
      { id: "3a", text: "Samla information om restaurangen", who: "Emanuel" },
      { id: "3b", text: "Lagg till info i kundkort pa Notion och dela till Content Creator", who: "Emanuel" },
      { id: "3c", text: "Analysera Restaurangen for Contentskapande", who: "Jakob" },
      { id: "3d", text: "Skapa Plan och Contentideer", who: "Jakob" },
    ],
  },
  {
    n: 4,
    title: "Planering och Roller",
    time: "5 min",
    tasks: [
      { id: "4a", text: "Tilldela videograf i Sheet", who: "Philip" },
      { id: "4b", text: "Tilldela redigerare i Sheet", who: "Philip" },
      { id: "4c", text: "Satt forsta inspelningsdatum", who: "Philip" },
      { id: "4d", text: "Lagg till Kund under inspelningsfliken", who: "Philip" },
    ],
  },
  {
    n: 5,
    title: "Valkomst-SMS",
    time: "1 min",
    tasks: [
      { id: "5a", text: "Skicka SMS direkt efter onboarding (anvand mall)", who: "Philip" },
    ],
  },
  {
    n: 6,
    title: "Efter forsta inspelning",
    time: "1 min",
    tasks: [
      { id: "6a", text: "Skicka SMS samma dag efter forsta inspelning", who: "Philip" },
    ],
  },
]

export const SCHEMA: Veckoschema = {
  v1: ["Dripp'n Burgers", "K25", "Asian BBQ", "White Rice", "Dunder Smash", "The Holly Bush", "Rosa Pantern"],
  v2: ["Berra Burras", "Mazra'a", "Qopla", "Fluffy House", "Let's Malatang", "Kebabdudes", "ChopChop", "Avidental"],
  v3: ["KEB", "Berlin Doner", "Southside Burgers", "Brams Burgers", "Ostermalmsgrillen", "Falafelbaren", "Doner och Pizza"],
  v4: ["STEKT Burger", "Kebabdudes", "Fullmoon Wok", "Sushi Revolution", "Thai House Wok"],
}

export const KONTAKTER: KontaktLista = {
  booking: [
    { name: "White Rice", day: "(Nar Jakob pratat med Joey)", note: "" },
    { name: "KEB", day: "2 mars", note: "" },
    { name: "Berlin Doner", day: "2 mars", note: "" },
    { name: "Southside Burgers", day: "2 mars", note: "" },
    { name: "Brams Burgers", day: "2 mars", note: "" },
    { name: "Ostermalmsgrillen", day: "2 mars", note: "" },
    { name: "Falafelbaren", day: "2 mars", note: "" },
    { name: "K25", day: "4 mars", note: "" },
  ],
  sms: [
    { name: "Berra Burras", day: "Onsdag", note: "Paminnelse Inspelning" },
    { name: "Let's Malatang", day: "Fredag", note: "Paminnelse Inspelning" },
    { name: "ChopChop", day: "Fredag", note: "Paminnelse Inspelning" },
    { name: "Kebabdudes", day: "Onsdag 11e", note: "Paminnelse Inspelning" },
    { name: "Mazra'a", day: "Torsdag 12e", note: "Paminnelse Inspelning" },
  ],
  quarterly: [
    { name: "Let's Malatang", day: "Onsdag", note: "Check in / Bolla ideer" },
    { name: "Southside Burgers", day: "Onsdag", note: "Check in / Bolla ideer" },
  ],
}

export const SMS_MALLAR: SMSMall[] = [
  {
    id: "welcome",
    title: "Valkomst-SMS",
    sub: "Direkt efter onboarding",
    who: "Philip",
    vars: ["NAMN", "RESTAURANG", "DATUM", "AVSANDARE"],
    text: "Hej [NAMN]!\n\nValkommen till familjen! Vi pa Syns Nu ar jatteglada att ha er ombord.\n\nEr forsta inspelning ar inbokad till [DATUM] - vi hor av oss med detaljer infor den!\n\nTveka inte att hora av er om ni har fragor.\n\nMed vanliga halsningar,\n[AVSANDARE]\nSyns Nu",
  },
  {
    id: "reminder",
    title: "Paminnelse-SMS",
    sub: "Infor inspelning",
    who: "Philip",
    vars: ["NAMN", "RESTAURANG", "DATUM", "TID", "AVSANDARE"],
    text: "Hej [NAMN]!\n\nBara en paminnelse om att vi ses pa [RESTAURANG] den [DATUM] kl [TID] for inspelning.\n\nSes snart!\n[AVSANDARE]",
  },
  {
    id: "after",
    title: "Efter inspelning-SMS",
    sub: "Samma dag efter inspelning",
    who: "Philip",
    vars: ["NAMN", "AVSANDARE"],
    text: "Hej [NAMN]!\n\nTack for idag - det var en riktigt bra inspelning! Vi borjar redigeringen direkt och aterkommer med klipp inom kort.\n\nHor av dig om du har onskemal!\n\n[AVSANDARE]",
  },
  {
    id: "checkin",
    title: "Check-in SMS",
    sub: "Varannan manad",
    who: "Philip",
    vars: ["NAMN", "RESTAURANG", "AVSANDARE"],
    text: "Hej [NAMN]!\n\nHur gar det for [RESTAURANG]? Vi vill bara hora hur ni mar och om det ar nagot ni vill forbattra eller andra i vart samarbete.\n\nVi hor garna era tankar!\n\n[AVSANDARE]",
  },
  {
    id: "quarterly",
    title: "Kvartalsamtal",
    sub: "Var tredje manad (ring)",
    who: "Philip",
    vars: ["NAMN", "RESTAURANG", "AVSANDARE"],
    text: "Hej [NAMN]!\n\nDags for var kvartalsvisa check-in! Vi skulle garna vilja boka in ett kort samtal for att ga igenom hur det gar for [RESTAURANG] och diskutera kommande innehall.\n\nNar passar det for dig?\n\n[AVSANDARE]",
  },
]
