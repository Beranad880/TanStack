# 🌊 LagoonEdge: AI Ad Generator & Cloudflare Boilerplate

*Vytvořeno pomocí nástroje **Antigravity CLI** a s využitím **Google AI Studio API Key**.*

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

---

## 📝 Poznámky k zadání (Snaprime Hiring Assignment)

### Přístup a Architektura
Tento úkol (vertical slice) jsem postavil na **TanStack Start** pro full-stack routing a React vrstvu v kombinaci s **Cloudflare Workers, Pages a D1**. Toto nastavení zajišťuje, že aplikace i databáze běží nativně na edge infrastruktuře, což splňuje požadavky na perzistenci, rychlost a reálnou nasaditelnost.

Pro hlavní úkol (extrakce a generování):
1. **Extrakce**: Zaintegroval jsem Cloudflare Browser Rendering (`@cloudflare/puppeteer`) pro zpracování stránek vykreslovaných JavaScriptem (JS-rendered). Protože Puppeteer uvnitř edge workerů občas může narážet na timeouty nebo limity bezplatného tarifu, vytvořil jsem navíc explicitní **graceful fallback** (záložní řešení) využívající standardní `fetch` + `cheerio`. Díky tomu, i když headless prohlížeč selže, pipeline nespadne, ale elegantně se přepne a pokusí se alespoň naparsovat surová HTML metadata a OpenGraph obrázky.
2. **AI vrstva**: Vybral jsem **Google Gemini API** pro jeho rychlost a nativní schopnost generovat JSON schémata přímo přes standardní HTTP požadavky. To mi umožnilo striktně typovat odpovědi LLM (za použití validátoru `zod`) bez nutnosti spoléhat na těžkopádné knihovny. Přidal jsem striktní kontrolu: pokud LLM nedokáže na stránce data najít, dosadí "not found". Naše pipeline to pak explicitně zachytí a raději generování přeruší, než aby si vymýšlela fakta nebo produkovala nesmyslné reklamy.
3. **Perzistence a Náhledy**: Reklamy a profily značek se trvale ukládají do Cloudflare D1 přes Drizzle ORM. Úpravy reklam a generování jednotlivých reklamních konceptů fungují jako přímé úpravy konkrétních řádků (Row updates) ve SQLite databázi (`saveAdEditFn` a `regenerateAdFn`). To zaručuje, že úprava jedné reklamy a přegenerování druhé si navzájem nikdy nepřepíší stav.

### Co bylo záměrně odloženo (a proč)
Vzhledem k rozpočtu zhruba 5-6 hodin jsem upřednostnil vytvoření kompletní, plně funkční pipeline (Scrape -> Extract -> DB -> UI -> Edit/Regenerate). U následujících bodů jsem udělal vědomé kompromisy:
* **Deduplikace obrázků a pokročilé filtrování:** V tuto chvíli vybíráme kandidátské obrázky podle základních CSS parametrů a minimální velikosti (pro odfiltrování ikon a prvků UI) a limitujeme je na 10 kusů. Pokročilá deduplikace nebo vektorové vyhodnocování relevance byly vynechány, protože základní heuristické filtrování bohatě stačí k prokázání, že jádro aplikace (core loop) funguje.
* **Precizní extrakce barev značky:** Pro vyhledání barevných kódů (hex) jsem použil jednoduchý regulární výraz na zdrojový HTML kód stránky, který pak předávám LLM jako kontext. Získávat *skutečné* vypočítané CSS proměnné přímo přes Puppeteer by bylo sice přesnější, ale zbytečně časově náročné kvůli procházení různorodých DOM stromů. AI navíc z nabídky hex kódů dokáže vybrat barvy překvapivě dobře.
* **Autentizace / Uživatelské účty:** Není součástí řešení. Místo toho databáze pro udržení relace spoléhá na automaticky generovaná unikátní ID (`siteId`), která se drží v URL.
* **Komplexní ukládání do cache (LLM Caching):** Přestože D1 ukládá výsledné reklamy, mezikroky samotné extrakce LLM u opakujících se URL adres necachuji. Vynechal jsem to, protože hlavním cílem bylo prokázat, že generovací pipeline funguje, nikoliv optimalizovat náklady na API za duplicitní dotazy.

### Jak byl při vývoji využit AI Agent
* **Jakého agenta jsem použil:** Používal jsem pokročilého autonomního programovacího IDE asistenta (Antigravity).
* **V čem mi pomohl:** Agent byl naprosto klíčový při sestavování struktury pro Drizzle schéma, propojení databáze D1 se serverovými funkcemi v TanStack Start a při generování složitého boilerplate kódu pro Cloudflare Puppeteer. Také hodně pomohl s refaktoringem uživatelského rozhraní, aby používalo čistý a moderní design systém.
* **Kde udělal chybu a jak se to muselo opravit:** 
  1. Agent zpočátku bojoval s rozdílem mezi proměnnými prostředí (`env`) v Cloudflare Workerech a běžným Node.js `process.env`. Protože TanStack Start pracuje s objektem `env` v edge funkcích trochu jinak, musel jsem ho explicitně instruovat, aby proměnné `env` předával přímo ze serverových funkcí a nespoléhal na globální `process`.
  2. Jazykový model (Gemini API) si na začátku začal vymýšlet (halucinovat) odpovědi u stránek, kde chyběl potřebný obsah. S agentem jsem musel poladit system prompt a zavést striktní Zod schéma, které model nutí odpovědět `"not found"`. Následně jsme museli napsat bezpečnostní pojistku (pipeline guard), která celý proces zruší, pokud na nás vyskočí hodnota `"not found"`.
  3. Kvůli mému trochu nepřesnému zadání, aby se "všechno v aplikaci přepsalo na Gemini 3.5 Flash", agent omylem přepsal i název modelu ve vnitřním API volání. Jelikož verze `gemini-3.5-flash` na backendu Googlu zatím neexistuje, začalo API padat (hlásilo chyby 404/503). Agenta jsem pak musel navést, aby na backendu vrátil stabilní verzi `gemini-2.5-flash`, zatímco v uživatelském rozhraní (UI) nechal nápisy na "3.5", jak jsem původně chtěl.
