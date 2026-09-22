import { drizzle } from 'drizzle-orm/d1';
// @ts-ignore - cloudflare:workers je virtuální modul poskytovaný Vite pluginem
import { env } from 'cloudflare:workers';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let initialized = false;

const TABLE_SCHEMAS = [
  `CREATE TABLE IF NOT EXISTS sites (
    id text PRIMARY KEY NOT NULL,
    url text NOT NULL,
    session_id text,
    ip text,
    latency_ms integer NOT NULL,
    cost_usd real NOT NULL,
    created_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS brand_profiles (
    id text PRIMARY KEY NOT NULL,
    site_id text NOT NULL,
    company_name text NOT NULL,
    description text NOT NULL,
    target_audience text NOT NULL,
    value_proposition text NOT NULL,
    tone_of_voice text NOT NULL,
    color_palette text NOT NULL,
    candidate_images text NOT NULL,
    created_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ads (
    id text PRIMARY KEY NOT NULL,
    site_id text NOT NULL,
    creative_idea text NOT NULL,
    primary_text text NOT NULL,
    headline text NOT NULL,
    description text NOT NULL,
    cta text NOT NULL,
    image_url text,
    created_at text NOT NULL,
    updated_at text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS todos (
    id integer PRIMARY KEY,
    text text NOT NULL,
    completed integer DEFAULT 0 NOT NULL,
    created_at text
  )`,
  `CREATE TABLE IF NOT EXISTS protocols (
    id integer PRIMARY KEY,
    timestamp text,
    status text NOT NULL,
    ip text,
    user_agent text,
    details text NOT NULL
  )`
];

async function ensureTables(d1: any) {
  if (initialized) return;

  // 1. Automaticky vytvoří všechny tabulky pomocí jednotlivých prepare().run() dotazů
  for (const sql of TABLE_SCHEMAS) {
    try {
      await d1.prepare(sql).run();
    } catch (err: any) {
      console.error('Chyba při vytváření tabulky D1:', err?.message || err);
    }
  }

  // 2. Pokud tabulka sites existovala dříve ze starší verze, zajistí existenci sloupců session_id a ip
  try {
    await d1.prepare('ALTER TABLE sites ADD COLUMN session_id text').run();
  } catch {
    // Sloupec již existuje
  }
  try {
    await d1.prepare('ALTER TABLE sites ADD COLUMN ip text').run();
  } catch {
    // Sloupec již existuje
  }

  initialized = true;
}

export async function getDb() {
  const d1 = (env as any).MY_BINDING as D1Database | undefined;

  if (!d1) {
    throw new Error(
      'D1 databáze "MY_BINDING" nebyla nalezena. Ujistěte se, že máte správný D1 binding v wrangler.jsonc.'
    );
  }

  await ensureTables(d1);

  if (!dbInstance) {
    dbInstance = drizzle(d1);
  }

  return dbInstance;
}
