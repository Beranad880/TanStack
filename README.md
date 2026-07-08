# 🌊 LagoonEdge: TanStack Start + Cloudflare Boilerplate

Moderní full-stack šablona postavená na technologii **TanStack Start** (React), optimalizovaná pro běh v ultra-rychlém a škálovatelném edge prostředí **Cloudflare Workers / Pages**. Šablona obsahuje ukázkovou integraci SQL databáze **Cloudflare D1** pomocí **Drizzle ORM**, spouštění lokálních LLM modelů přes **Workers AI** a vzdálené ovládání headless prohlížeče Chrome přes **Browser Rendering**.

Vzhled a stylování zajišťuje **Tailwind CSS v4.0** s moderním tmavým/světlým režimem, efekty skleněného povrchu (glassmorphism) a plynulými mikro-animacemi.

---

## 🚀 Klíčové vlastnosti (Testovací trasy)

Aplikace obsahuje 3 interaktivní testovací stránky, které demonstrují možnosti integrace s Cloudflare ekosystémem:

1.  **💾 Databázová kontrola (`/dbcheck`)**
    *   **Technologie:** Cloudflare D1 SQL databáze + Drizzle ORM.
    *   **Funkčnost:** Při každém načtení pořídí auditní protokol (IP adresa uživatele, čas, User-Agent) a zapíše ho do tabulky `protocols` a `todos`. Stránka zobrazuje celkový počet záznamů a tabulku s historií posledních 5 protokolů přímo z databáze.
2.  **🤖 Umělá inteligence (`/aicheck`)**
    *   **Technologie:** Cloudflare Workers AI + Meta Llama 3.2 (`@cf/meta/llama-3.2-3b-instruct`).
    *   **Funkčnost:** Spouští otevřený LLM model Llama 3.2 3B přímo na GPU infrastruktuře Cloudflaru. Umožňuje zadávat textové dotazy a v reálném čase zobrazuje odpovědi bez nutnosti jakýchkoliv externích placených API klíčů (využívá bezplatný limit 10 000 neuronů denně).
3.  **📸 Vzdálený prohlížeč (`/browsercheck`)**
    *   **Technologie:** Cloudflare Browser Rendering + `@cloudflare/puppeteer`.
    *   **Funkčnost:** Spustí instanci headless prohlížeče Chrome přímo v serverless Workeru na Cloudflaru, navštíví zadanou URL adresu, vytvoří snímek obrazovky (screenshot) a vrátí ho jako Base64 obrázek zpět do klientského rozhraní.

---

## 📂 Adresářová struktura

```
tanstack-repo/ (Root)
├── .github/                # GitHub Actions konfigurace (automatický deploy na Cloudflare)
├── README.md               # Tento dokument
└── tanstack/               # Hlavní složka s projektem
    ├── drizzle/            # SQL migrační soubory vygenerované Drizzle Kit
    ├── src/                # Zdrojový kód aplikace
    │   ├── db/             # Databázová konfigurace
    │   │   ├── index.ts    # Inicializace Drizzle ORM (s bezpečným edge importem)
    │   │   └── schema.ts   # Databázové schéma (tabulky todos a protocols)
    │   ├── routes/         # Souborově orientované směrování (file-based routing)
    │   │   ├── api/        # Serverové API endpointy
    │   │   │   └── ahoj.ts # Ukázkové API vracející statický JSON
    │   │   ├── __root.tsx  # Globální layout, HTML kostra, správa témat a stylů
    │   │   ├── index.tsx   # Hlavní domovská stránka (/)
    │   │   ├── dbcheck.tsx # Loader a UI pro kontrolu zápisu do D1 databáze
    │   │   ├── aicheck.tsx # UI a serverová funkce pro Llama 3.2 Workers AI
    │   │   └── browsercheck.tsx # UI a serverová funkce pro focení webů přes Puppeteer
    │   ├── routeTree.gen.ts # Automaticky generovaný strom tras (TSR)
    │   ├── router.tsx      # Konfigurace TanStack routeru
    │   └── styles.css      # Globální CSS, barevná témata a Tailwind CSS v4.0 konfigurace
    ├── .env                # Lokální environmentální proměnné (tokeny, API klíče)
    ├── drizzle.config.ts   # Konfigurace generátoru migrací Drizzle Kit
    ├── package.json        # NPM závislosti, metadata a skripty
    ├── tsconfig.json       # Konfigurace TypeScriptu
    ├── tsr.config.json     # Konfigurace pro generátor tras TanStack Router
    ├── vite.config.ts      # Vite sestavení (pluginy React, Tailwind, Cloudflare, TanStack)
    └── wrangler.jsonc      # Produkční konfigurace Cloudflare (bindings pro D1, AI, Browser)
```

---

## 💻 Lokální vývoj (Spuštění projektu)

Před spuštěním jakéhokoliv příkazu přejděte v terminálu do podadresáře **`tanstack`**:
```bash
cd tanstack
```

### 1. Příprava přihlášení a instalace
Nejprve se přihlaste ke svému Cloudflare účtu, aby lokální emulátor (Miniflare) mohl komunikovat s GPU zdroji pro AI a Browser Rendering:
```bash
# Přihlášení do Cloudflare
npx wrangler login

# Instalace závislostí
npm install
```

### 2. Vytvoření lokálního `.env`
Vytvořte soubor `.env` ve složce `/tanstack` a přidejte do něj svůj Cloudflare token pro lokální AI proxy:
```env
# Token pro lokální testování Cloudflare Workers AI
CLOUDFLARE_API_TOKEN="vas-cloudflare-user-token"
```

### 3. Příprava lokální databáze (Migrace)
Převeďte definované schéma z kódu do SQL migrací a aplikujte je na lokální SQLite databázi:
```bash
# Vygenerování SQL migračních souborů
npm run db:generate

# Aplikace změn na lokální databázi
npm run db:migrate:local
```

### 4. Spuštění serveru
```bash
npm run dev
```
Aplikace poběží na adrese [http://localhost:3000](http://localhost:3000).

---

## 🌐 Nasazení na Cloudflare (Produkce)

Ujistěte se, že se v terminálu nacházíte v adresáři `/tanstack`.

### 1. Vytvoření ostré D1 databáze
Vytvořte novou databázi přes Wrangler CLI:
```bash
npx wrangler d1 create my-binding-database
```
Příkaz vám vygeneruje unikátní `database_id` (UUID).

### 2. Aktualizace `wrangler.jsonc`
Otevřete `wrangler.jsonc` a v části `d1_databases` nahraďte hodnotu `database_id` za vaše nově vygenerované ID.

### 3. Aplikace migrací v produkci
Nahrajte schéma tabulek do ostré databáze v Cloudflaru:
```bash
npm run db:migrate:prod
```

### 4. Nahrání aplikace (Deployment)
Sestavte projekt a nahrajte jej na servery Cloudflaru:
```bash
npm run deploy
```

---

## ⚙️ Automatické nasazování přes GitHub Actions (CI/CD)

Projekt obsahuje předpřipravené workflow pro automatický deploy při každém pushnutí kódu do větve `main`.

1.  Nahrajte svůj projekt do GitHub repozitáře.
2.  Na GitHubu přejděte do **Settings** -> **Secrets and variables** -> **Actions** -> **New repository secret**.
3.  Vytvořte tajnou proměnnou **`CLOUDFLARE_API_TOKEN`** a vložte do ní svůj Cloudflare token.
4.  Při každém pushnutí na GitHub se kód automaticky zkontroluje linterem, sestaví a bezpečně nasadí.

---

## 🛠️ Přehled NPM příkazů

Všechny příkazy spouštějte v adresáři `/tanstack`:

| Skript | Příkaz | Popis |
| :--- | :--- | :--- |
| `npm run dev` | `vite dev --port 3000` | Spustí lokální vývojový server |
| `npm run build` | `vite build` | Sestaví produkční balíček (klient + server) |
| `npm run preview` | `vite preview` | Lokální náhled produkčního sestavení |
| `npm run deploy` | `npm run build && wrangler deploy` | Sestaví projekt a nahraje jej na Cloudflare |
| `npm run db:generate` | `drizzle-kit generate` | Vytvoří SQL migrační soubory z kódu ve `schema.ts` |
| `npm run db:migrate:local` | `wrangler d1 migrations apply ... --local` | Aplikuje SQL změny na lokální SQLite |
| `npm run db:migrate:prod` | `wrangler d1 migrations apply ... --remote` | Aplikuje SQL změny na Cloudflare D1 |
| `npm run generate-routes` | `tsr generate` | Přegeneruje strom tras `routeTree.gen.ts` |
| `npm run lint` | `eslint` | Provede analýzu kódu a vyhledá chyby |
| `npm run format` | `prettier --write . && eslint --fix` | Automaticky naformátuje zdrojový kód |
