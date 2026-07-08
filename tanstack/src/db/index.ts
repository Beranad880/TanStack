import { drizzle } from 'drizzle-orm/d1';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  // D1 binding je na Cloudflare i lokálně v Miniflare dostupný v globálním kontextu nebo process.env
  const d1 = (process.env.MY_BINDING || (globalThis as any).MY_BINDING) as D1Database | undefined;

  if (!d1) {
    throw new Error('D1 databáze "MY_BINDING" nebyla nalezena. Ujistěte se, že máte správný binding v wrangler.jsonc a běží vám lokální simulace.');
  }

  dbInstance = drizzle(d1);
  return dbInstance;
}
