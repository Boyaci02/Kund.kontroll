-- Tema-populering — matchad mot faktiska kundnamn i databasen
-- Kör i Supabase Studio → SQL Editor

-- id=1  Drippn Burgers (= Drippin Burgers)
UPDATE kunder SET tema = '{"musik":"Familjevänlig förorts-musik, Svensk Rap, Spansk Rap, Fransk Rap, Hip-hop. Gungiga och upbeat låtar med tunga beats.","kansla":"Positiv / Glad / Kaxig / Förort / Varm","typ":"Högt tempo, Snabba klipp, Snabba transitions","farg":"Varmare / Gulare","typsnitt":"BUNGEE"}' WHERE id = 1;

-- id=2  KEB
UPDATE kunder SET tema = '{"musik":"Hip-hop, Gungiga beats med lite sång/rap, tunga och upbeat beats.","kansla":"Positiv / Inbjudande / Chill / Lugn / Gungigt / 50 Cent-ish","typ":"Högt tempo, Snabba klipp, Snabba transitions","farg":"Kallare / Blått","typsnitt":"Bebas Neue"}' WHERE id = 2;

-- id=3  Berra Burras (= Berra Burras Kebab)
UPDATE kunder SET tema = '{"musik":"Hip-hop, Gungiga beats med lite sång/rap, glada och upbeat låtar.","kansla":"Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt","typ":"Variation: Högt tempo / Lugnare videos","farg":"Kallare / Blått","typsnitt":"Montserrat (Fetstilt)"}' WHERE id = 3;

-- id=4  Ostermalmsgrillen (= Östermalmsgrillen)
UPDATE kunder SET tema = '{"musik":"Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.","kansla":"Positiv / Inbjudande / Chill / Lugn / Gungigt","typ":"Högt tempo, Snabba Klipp, Snabba transitions","farg":"Varmare / Gulare / Neutral","typsnitt":"Montserrat Bold"}' WHERE id = 4;

-- id=6  Fullmoon Wok
UPDATE kunder SET tema = '{"musik":"Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.","kansla":"Positiv / Inbjudande / Chill / Lugn / Gungigt","typ":"Högt tempo, Snabba Klipp, Snabba transitions / Variation med lugnare videos.","farg":"Varmare / Gulare / Neutral","typsnitt":"TOMO-Fango"}' WHERE id = 6;

-- id=7  STEKT Burger (= STEKT Burgers & Stuff)
UPDATE kunder SET tema = '{"musik":"Hip-hop, upbeat låtar med energi, Funk, Sköna beats. Populära amerikanska låtar: Kanye West / Travis Scott / JAY-Z, osv","kansla":"Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt","typ":"Upbeat med energi, lite ljus- och glitch-effekter","farg":"Varmare / Gulare / Neutral","typsnitt":"Clarify-Blk / Poppins"}' WHERE id = 7;

-- id=8  Berlin Doner (= Berlin Döner)
UPDATE kunder SET tema = '{"musik":"Gungiga beats, mestadels instrumentala, glada och inbjudande.","kansla":"Glad / Positiv / Inbjudande / Chill / Lugn","typ":"Högt tempo, Snabba klipp, Snabba transitions / Variation med lugnare videos","farg":"Varmare / Gulare","typsnitt":"Staatliches-Regular"}' WHERE id = 8;

-- id=9  Let's Malatang
UPDATE kunder SET tema = '{"musik":"Lofi Chill Beats, Orientalisk musik, Hip-hop, upbeat låtar med energi.","kansla":"Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt","typ":"Upbeat med energi, ljus- och glitch-effekter","farg":"Varmare / Gulare / Neutral","typsnitt":"Integraf-CF-Heavy (Bold)"}' WHERE id = 9;

-- id=10 Southside Burgers
UPDATE kunder SET tema = '{"musik":"Hip-hop, upbeat låtar med energi, Funk, Sköna beats. Populära amerikanska låtar: Kanye West / Travis Scott / JAY-Z, osv","kansla":"Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt","typ":"Upbeat med energi, lite ljus- och glitch-effekter","farg":"Varmare / Gulare / Neutral","typsnitt":"Helvetica"}' WHERE id = 10;

-- id=11 Sushi Revolution
UPDATE kunder SET tema = '{"musik":"Hip-hop, upbeat låtar med energi, Funk, Sköna beats. Populära amerikanska låtar: Kanye West / Travis Scott / JAY-Z, osv","kansla":"Coolt / Neon / Positiv / Inbjudande / Chill / Lugn / Gungigt","typ":"Upbeat med energi, snabba klipp, fokus på visuellt coola shots: t.ex eld på sushi / doppar sushi i sås etc.","farg":"Varmare / Neutral","typsnitt":"Dosis (Bold)"}' WHERE id = 11;

-- id=12 ChopChop
UPDATE kunder SET tema = '{"musik":"(ENDAST COPYRIGHT FRITT) Glad Musik, POP, Hip-hop Beats, Positiv Vibe","kansla":"Glad / Positiv / Inbjudande / TIKTOK Känsla","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Neutral","typsnitt":"Poppins (Bold)"}' WHERE id = 12;

-- id=13 Tasty Bro's
UPDATE kunder SET tema = '{"musik":"Hip-hop, Gungiga beats med lite sång/rap, glada och upbeat låtar.","kansla":"Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt","typ":"Variation: Högt tempo / Lugnare videos / Längre videos med mer naturlig känsla","farg":"Kallare / Blått","typsnitt":"Luckiest Guy"}' WHERE id = 13;

-- id=14 Asian BBQ (= Asian BBQ & Bistro)
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Hip-Hop, Funk. Låtar från toppen på Världslistan på Spotify, Lugna låtar.","kansla":"Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Varmare / Gulare / Neutral","typsnitt":"Poppins (Bold)"}' WHERE id = 14;

-- id=15 White Rice
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Hip-Hop, Funk. Låtar från toppen på Världslistan på Spotify, Lugna låtar.","kansla":"Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Varmare / Gulare / Neutral","typsnitt":"Bebas Neue (Bold)"}' WHERE id = 15;

-- id=16 Brams Burgers
UPDATE kunder SET tema = '{"musik":"Ingen musik","kansla":"Positiv / Glad / Inbjudande / Chill / Lugn / Gungigt","typ":"Högt tempo, Snabba klipp, Snabba transitions. Text animation: Reveal. Lite skugga på texten.","farg":"Varmare / Gulare / Neutral. Starka färger","typsnitt":"League Gothic"}' WHERE id = 16;

-- id=17 Falafelbaren
UPDATE kunder SET tema = '{"musik":"Arabisk musik, orientalisk musik. Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc","kansla":"Glad / Positiv / Inbjudande / TIKTOK Känsla","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Neutral","typsnitt":"Baskervville / Serif (Bold)"}' WHERE id = 17;

-- id=19 Fluffy House
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Låtar från toppen på Världslistan på Spotify, Lugna låtar. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc","kansla":"Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn","typ":"Mer långsamma stilrena videos","farg":"Varmare / Gulare","typsnitt":"Bebas Neue"}' WHERE id = 19;

-- id=20 K25
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc","kansla":"Glad / Positiv / Inbjudande / TIKTOK Känsla","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Neutral","typsnitt":"Zurich BT Black Font"}' WHERE id = 20;

-- id=23 Dunder Smash
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc","kansla":"Glad / Positiv / Inbjudande / TIKTOK Känsla","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Neutral","typsnitt":"ANTON"}' WHERE id = 23;

-- id=24 The Holly Bush
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc","kansla":"Glad / Positiv / Inbjudande / TIKTOK Känsla","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Neutral","typsnitt":"ArchivoBlack-Rg"}' WHERE id = 24;

-- id=25 Rosa Pantern
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Housemusik, Låtar från toppen på Världslistan på Spotify. Gärna låtar med en kvinna som sjunger - ex. Taylor Swift, Sabrina Carpenter etc","kansla":"Glad / Positiv / Inbjudande / TIKTOK Känsla","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Neutral","typsnitt":"pantherfont"}' WHERE id = 25;

-- id=28 Avidental
UPDATE kunder SET tema = '{"musik":"Avslappnad, Funk, Lo-fi Beats","kansla":"Glad / Positiv / Inbjudande / Professionell","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Naturligt","typsnitt":"Poppins (Bold)"}' WHERE id = 28;

-- id=30 Thai House Wok
UPDATE kunder SET tema = '{"musik":"Glad Musik, POP, Hip-hop Beats, Positiv Vibe","kansla":"Glad / Positiv / Inbjudande / TIKTOK Känsla","typ":"Högt Tempo, Kortare Klipp / Variation med Lugnare videos","farg":"Orange, Lilla är deras färger","typsnitt":"Anton"}' WHERE id = 30;

-- id=31 Doner och Pizza (= DAP - Döner and Pizza)
UPDATE kunder SET tema = '{"musik":"Amerikansk Hip-hop, Gungiga låtar, Mestadels beats (lite sång / rap), Fokus på tunga och sköna beats, gärna mycket tempo / upbeat.","kansla":"Glad / Positiv / Inbjudande / Elegant / Stilrent / Lugn","typ":"Variation lugnare videos / mer upbeat","farg":"Orange / Varmare","typsnitt":"Chewy"}' WHERE id = 31;
