# TanStack Start App s Drizzle ORM & Cloudflare D1

Tento projekt je moderní full-stack webová aplikace postavená na technologii **[TanStack Start](https://tanstack.com/router/latest/docs/framework/react/start/overview)** (React framework založený na **TanStack Router**). Aplikace je optimalizována pro běh v serverless edge prostředí **Cloudflare** (Workers / Pages) a pro správu dat využívá databázi **Cloudflare D1** společně s **Drizzle ORM**.

Vzhled a stylování zajišťuje **Tailwind CSS v4.0** a rychlé sestavení aplikace obstarává **Vite**.

---

## 📂 Adresářová struktura a význam souborů

```
tanstack/
├── drizzle/                # Složka obsahující vygenerované SQL migrace pro D1 databázi
├── public/                 # Statické soubory (ikony, obrázky) kopírované přímo do buildu
├── src/                    # Hlavní zdrojový kód aplikace
│   ├── db/                 # Nastavení a konfigurace databáze
│   │   ├── index.ts        # Inicializace klienta Drizzle ORM (vývojová proxy / produkční binding)
│   │   └── schema.ts       # Databázové schéma (definice tabulek a relací)
│   ├── components/         # Znovupoužitelné UI komponenty
│   ├── routes/             # Souborově orientované směrování (file-based routing)
│   │   ├── api/            # Serverové API trasy (běžící na Cloudflare Workeru)
│   │   │   └── ahoj.ts     # Ukázková API trasa komunikující s databází D1
│   │   ├── __root.tsx      # Globální rozvržení (layout), HTML struktura, správa tmavého motivu
│   │   └── index.tsx       # Domovská stránka (/) zobrazující data z databáze
│   ├── routeTree.gen.ts    # Automaticky generovaný strom tras (vytváří TanStack Router)
│   ├── router.tsx          # Konfigurace a inicializace instance routeru
│   └── styles.css          # Globální CSS styly a nastavení barevných témat v Tailwind CSS v4.0
├── drizzle.config.ts       # Konfigurace pro Drizzle Kit (generátor migrací)
├── eslint.config.js        # Konfigurace ESLint (statická analýza kódu)
├── package.json            # Závislosti projektu, metadata a NPM skripty
├── prettier.config.js      # Konfigurace formátování kódu Prettier
├── tsconfig.json           # Konfigurace TypeScriptu
├── tsr.config.json         # Konfigurace pro generátor tras TanStack Router
├── vite.config.ts          # Konfigurace sestavení Vite (pluginy React, Tailwind, Cloudflare, TanStack)
└── wrangler.jsonc          # Konfigurace nasazení na platformu Cloudflare (databázové vazby a proměnné)
```

---

## 💾 Databáze (Cloudflare D1 & Drizzle ORM)

Projekt používá SQL databázi **Cloudflare D1** a **Drizzle ORM** pro typově bezpečné dotazování.

*   **Definice schématu**: Tabulky a sloupce se definují v souboru `src/db/schema.ts`.
*   **Inicializace databáze**: Soubor `src/db/index.ts` automaticky detekuje prostředí. Během vývoje využívá Wrangler platform proxy k simulaci D1 na lokálním SQLite, v produkci se připojuje přímo k bindingu `MY_BINDING`.

---

## 🚀 Jak začít (Lokální spuštění)

Pro lokální běh projektu postupujte podle následujících kroků:

### 1. Instalace závislostí
```bash
npm install
```

### 2. Generování a aplikace databázových migrací
Nejprve převeďte kód schématu do SQL souborů a poté je aplikujte na lokální SQLite databázi:
```bash
# Vygenerování SQL migrací
npm run db:generate

# Aplikace migrací na lokální SQLite (spravované Wranglerem)
npm run db:migrate:local
```

### 3. Spuštění vývojového serveru
```bash
npm run dev
```
Aplikace poběží na adrese [http://localhost:3000](http://localhost:3000).

---

## 🌐 Nasazení na Cloudflare (Production)

### 1. Vytvoření D1 databáze v Cloudflare
Pokud ještě nemáte vytvořenou D1 databázi, vytvořte ji přes Wrangler CLI:
```bash
npx wrangler d1 create my-binding-database
```
Příkaz vám vygeneruje ID databáze (např. `database_id = "56a29e12-c2e3-4903-8d02-3c1c73a628be"`).

### 2. Aktualizace ID v konfiguraci
Otevřete soubor `wrangler.jsonc` a v sekci `d1_databases` nahraďte hodnotu `"YOUR_D1_DATABASE_ID_HERE"` za ID, které jste získali v předchozím kroku.

### 3. Spuštění migrací na produkční databázi
Aplikujte SQL schéma na ostrou databázi v Cloudflare:
```bash
npm run db:migrate:prod
```

### 4. Sestavení a nahrání aplikace (Deployment)
Spusťte produkční build a nasazení:
```bash
npm run deploy
```

*Poznámka: Pokud nasazujete automaticky přes Git integraci v Cloudflare Pages, ujistěte se, že máte v nastavení projektu v Cloudflare dashboardu nastaven **Root directory** (Kořenový adresář) na složku `tanstack` a **Build command** na `npm run deploy`.*

---

## 🛠️ Přehled NPM skriptů

Všechny příkazy spouštějte v podadresáři `tanstack/`:

| Skript | Příkaz pod kapotou | Popis |
| :--- | :--- | :--- |
| `npm run dev` | `vite dev --port 3000` | Spustí lokální vývojový server |
| `npm run build` | `vite build` | Zkompiluje aplikaci (klient + server) pro produkci |
| `npm run preview` | `vite preview` | Lokálně spustí náhled produkčního sestavení |
| `npm run deploy` | `npm run build && wrangler deploy` | Sestaví projekt a nahraje jej na Cloudflare |
| `npm run db:generate` | `drizzle-kit generate` | Vytvoří SQL migrační soubory z kódu ve `schema.ts` |
| `npm run db:migrate:local` | `wrangler d1 migrations apply my-binding-database --local` | Aplikuje SQL změny na lokální SQLite |
| `npm run db:migrate:prod` | `wrangler d1 migrations apply my-binding-database --remote` | Aplikuje SQL změny na produkční Cloudflare D1 |
| `npm run generate-routes` | `tsr generate` | Ručně přegeneruje strom tras `routeTree.gen.ts` |
| `npm run test` | `vitest run` | Spustí testy pomocí Vitest |
| `npm run lint` | `eslint` | Provede analýzu kódu a vyhledá syntaktické chyby |
| `npm run format` | `prettier --write . && eslint --fix` | Automaticky naformátuje kód |
