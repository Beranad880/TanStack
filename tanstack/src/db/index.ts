import { drizzle } from 'drizzle-orm/d1';
// @ts-ignore - cloudflare:workers je virtuální modul poskytovaný Vite pluginem
import { env } from 'cloudflare:workers';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  // env.MY_BINDING je automaticky injektováno Cloudflare i lokálním Miniflare emulátorem
  const d1 = (env as any).MY_BINDING as D1Database | undefined;

  if (!d1) {
    throw new Error('D1 databáze "MY_BINDING" nebyla nalezena. Ujistěte se, že máte správný D1 binding v wrangler.jsonc.');
  }

  dbInstance = drizzle(d1);
  return dbInstance;
}
