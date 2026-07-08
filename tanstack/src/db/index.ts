import { drizzle } from 'drizzle-orm/d1';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  let d1: D1Database | undefined;

  if (import.meta.env.DEV) {
    try {
      // Dynamický import wrangleru, který se spustí pouze při lokálním vývoji v Node.js
      const { getPlatformProxy } = await import('wrangler');
      const { env } = await getPlatformProxy<any>();
      d1 = env.MY_BINDING;
    } catch (e) {
      console.error('Nepodařilo se připojit k lokální D1 databázi přes wrangler proxy:', e);
    }
  } else {
    // V produkci na Cloudflare je binding dostupný globálně nebo v process.env
    d1 = (process.env.MY_BINDING || (globalThis as any).MY_BINDING) as D1Database | undefined;
  }

  if (!d1) {
    throw new Error('D1 databáze "MY_BINDING" nebyla nalezena. Ujistěte se, že máte správný binding v wrangler.jsonc.');
  }

  dbInstance = drizzle(d1);
  return dbInstance;
}
