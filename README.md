# Ljusspår

Familjens minneskarta med brinnande ljus, detaljerad OpenStreetMap-karta och stöd för mobil och dator. Alla i familjen använder samma kod och kan lägga till, ändra och ta bort enstaka ljus.

Webbappen körs statiskt på GitHub Pages. Firebase Authentication kontrollerar familjekoden och Realtime Database lagrar och synkroniserar ljusen. Inga Cloud Functions, betalplaner eller serverprocesser behövs.

## Firebase Spark

1. Använd ett separat Firebase-projekt på Spark-planen utan fakturering.
2. Registrera en webbapp och kopiera dess publika Firebase-konfiguration till `.env.local` enligt `.env.example`.
3. Aktivera Authentication → Email/Password. Skapa en gemensam appanvändare med adressen `familj@ljusspar.invalid` och den överenskomna familjekoden som lösenord. Adressen är bara ett tekniskt konto och tar inte emot e-post. Familjen skriver bara koden i appen.
4. Kopiera användarens UID till `VITE_FAMILY_UID`. Aktivera inte publik registrering i appen.
5. Skapa Realtime Database i Europa i **locked mode**. Lägg dess URL i `VITE_FIREBASE_DATABASE_URL`.
6. Publicera `database.rules.json`. Dessa regler ger endast appanvändaren åtkomst till sin familjs karta, och validerar varje ljus. Lägg aldrig in öppna testregler.
7. Lägg `jakobbergsten.github.io` i Authentication → Settings → Authorized domains om Firebase kräver det.

Firebase-konfigurationen och användarens UID är publik metadata. Familjekoden, tjänstekontonycklar, sessioner och familjens ljus ska aldrig läggas i GitHub-repot eller i byggvariabler.

## GitHub Pages

Lägg variablerna från `.env.example` som GitHub repository **Actions variables** under Settings → Secrets and variables → Actions → Variables. Välj Settings → Pages → Source → GitHub Actions. Workflowen bygger, testar och publicerar ändringar på `main`.

Den nya adressen blir `https://jakobbergsten.github.io/Ljuskarta/` när Pages är aktiverat och publiceringen lyckats. Alla interna filer använder relativa sökvägar så att även projektadressen fungerar.

## Utveckling

```sh
npm ci
npm test
npm run dev
npm run build
```

## Flytt av befintliga ljus

Exportera ljusen från den befintliga appens JSON-knapp. Förvara exporten utanför repot. Importera data i Realtime Database under `families/<appanvändarens UID>/candles`, med varje ljus under sin befintliga ID-nyckel. Behåll datum, koordinater och tidsstämplar. Ta bort exportfältet `canEdit`; det beräknas av appen. Kontrollera att samma ID:n och antal finns efter importen innan familjen byter adress. Den gamla sidan ligger kvar under kontrollen.

Kartdata: © OpenStreetMap contributors. Reservöversikt: Natural Earth. Leaflet-licens finns under `public/vendor/`.
