# 🌊 LagoonEdge: AI Ad Generator & Cloudflare Boilerplate

Moderní full-stack projekt postavený na technologii **TanStack Start** (React), optimalizovaný pro běh v ultra-rychlém a škálovatelném edge prostředí **Cloudflare Workers / Pages**. Projekt demonstruje stavbu komplexní AI aplikace – od scrapování cizích webů přes headless prohlížeč až po generování strukturovaného reklamního obsahu pomocí velkých jazykových modelů (LLM).

Vzhled a stylování zajišťuje **Tailwind CSS v4.0** s moderním designem, efekty skleněného povrchu (glassmorphism) a plynulými mikro-animacemi.

---

## ✨ Hlavní aplikace: LagoonEdge AI Generátor (`/lagoonedge`)

Jádrem projektu je komplexní nástroj na tvorbu reklamních kampaní na pár kliknutí.
1. **Skenování webu (Puppeteer & Cheerio):** Zadáte URL adresu libovolné firmy. Aplikace na Cloudflaru spustí neviditelný Chrome prohlížeč, projde web, počká na načtení dynamického obsahu a vyextrahuje čistý text. Pro parsování dat a obrázků využívá robustní DOM parser `cheerio`.
2. **Extrakce profilu značky (Google Gemini & Zod):** Ze získaného textu model *Gemini 2.5 Flash* sestaví "Brand Profile" (název, cílovka, tón komunikace, paleta barev). Výstup z AI je před zapsáním do databáze striktně kontrolován a validován pomocí knihovny `zod`.
3. **Generování reklam (Google Gemini):** Na základě profilu značky AI vygeneruje 3 unikátní a chytlavé reklamní kreativy včetně nadpisů a výzev k akci (CTA). Každou kreativu si navíc v UI můžete libovolně upravit nebo nechat znovu přegenerovat.

## 🚀 Technologický Stack & Architektura

* **Frontend:** TanStack Start, React 19, Tailwind CSS v4, Lucide Icons
* **Backend:** Cloudflare Workers (Edge Computing)
* **Databáze:** Cloudflare D1 (Serverless SQLite) + Drizzle ORM
  * *Optimalizace:* Plné využití nativních JSON polí u SQLite, nastaveno kaskádové mazání záznamů (`ON DELETE CASCADE`) napříč databázovým schématem.
* **AI & Zpracování dat:**
  * Google Gemini API (model `gemini-2.5-flash`)
  * Cloudflare Browser Rendering (`@cloudflare/puppeteer`)
  * `zod` pro validaci a vynucení JSON schémat z výstupů umělé inteligence
  * `cheerio` pro spolehlivé parsování HTML fallback struktury

---

## 📂 Adresářová struktura

```
tanstack/
├── drizzle/                # SQL migrační soubory vygenerované Drizzle Kit
├── src/                    # Zdrojový kód aplikace
│   ├── db/                 # Databázová konfigurace
│   │   ├── index.ts        # Inicializace Drizzle ORM (připojení na D1)
│   │   └── schema.ts       # Databázové schéma (JSON pole a kaskádové vztahy)
│   ├── lib/services/       # Obchodní logika a backendové služby
│   │   ├── ai.ts           # Integrace Gemini a striktní validace pomocí Zod
│   │   ├── scraper.ts      # Cloudflare Puppeteer scraper s Cheerio fallbackem
│   │   └── pipeline.ts     # Orchestrátor celého procesu generování
│   ├── routes/             # Souborově orientované směrování (file-based routing)
│   │   ├── __root.tsx      # Globální layout, HTML kostra
│   │   ├── index.tsx       # Hlavní domovská stránka (/)
│   │   └── lagoonedge.tsx  # Hlavní aplikace pro generování reklam
│   └── styles.css          # Globální CSS a CSS Proměnné (LagoonEdge Design System)
├── gemini-config.json      # Centralizovaná konfigurace pro Google Gemini LLM
├── .dev.vars               # Tajné klíče pro lokální vývoj (nutno vytvořit)
├── package.json            # NPM závislosti, metadata a skripty
├── vite.config.ts          # Vite sestavení (pluginy React, Tailwind, Cloudflare)
└── wrangler.jsonc          # Produkční konfigurace Cloudflare (bindings pro D1, Browser)
```

---

## 💻 Lokální vývoj (Spuštění projektu)

Pro lokální běh projektu na vašem počítači postupujte podle následujících kroků:

### 1. Přihlášení do Cloudflare a instalace
Nejprve se přihlaste ke svému Cloudflare účtu (Miniflare potřebuje komunikovat s prostředky) a nainstalujte závislosti:
```bash
npx wrangler login
npm install
```

### 2. Vytvoření lokálního souboru s tajnými klíči (`.dev.vars`)
Vytvořte soubor `.dev.vars` v kořenovém adresáři `/tanstack` a přidejte do něj svůj Google Gemini API klíč:
```env
GEMINI_API_KEY="vas-google-gemini-api-klic"
```

### 3. Příprava lokální databáze (Migrace)
Převeďte definované schéma z kódu do SQL migrací a aplikujte je na lokální SQLite databázi:
```bash
npm run db:generate
npm run db:migrate:local
```

### 4. Spuštění serveru
```bash
npm run dev
```
Aplikace poběží na adrese [http://localhost:3000](http://localhost:3000).

---

## 🌐 Nasazení na Cloudflare (Produkce)

### 1. Vytvoření ostré D1 databáze
Vytvořte novou databázi přes Wrangler CLI:
```bash
npx wrangler d1 create my-binding-database
```
Příkaz vám vygeneruje unikátní `database_id` (UUID). Otevřete `wrangler.jsonc` a nahraďte hodnotu `database_id`.

### 2. Nahrání API klíče na Cloudflare
Aby vaše aplikace mohla komunikovat s AI v produkci, nahrajte Gemini klíč na Cloudflare servery:
```bash
npx wrangler secret put GEMINI_API_KEY
```

### 3. Aplikace migrací v produkci
Nahrajte schéma tabulek do ostré databáze:
```bash
npm run db:migrate:prod
```

### 4. Nahrání aplikace (Deployment)
Sestavte projekt a nahrajte jej na servery Cloudflaru:
```bash
npm run deploy
```

---

## 🛠️ Přehled NPM příkazů

| Skript | Příkaz | Popis |
| :--- | :--- | :--- |
| `npm run dev` | `vite dev --port 3000` | Spustí lokální vývojový server |
| `npm run build` | `vite build` | Sestaví produkční balíček (klient + server) |
| `npm run deploy` | `npm run build && wrangler deploy` | Sestaví projekt a nahraje jej na Cloudflare |
| `npm run db:generate` | `drizzle-kit generate` | Vytvoří SQL migrační soubory z kódu ve `schema.ts` |
| `npm run db:migrate:local` | `wrangler d1 migrations apply ... --local` | Aplikuje SQL změny na lokální SQLite |
| `npm run db:migrate:prod` | `wrangler d1 migrations apply ... --remote` | Aplikuje SQL změny na Cloudflare D1 |
| `npm run lint` | `eslint` | Provede analýzu kódu a vyhledá chyby |
