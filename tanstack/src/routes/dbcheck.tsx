import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { getDb } from '../db/index'
import { todos, protocols } from '../db/schema'
import { desc } from 'drizzle-orm'

// Serverová funkce pro kontrolu databáze - běží striktně na serveru
const checkDatabaseFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    // Načteme hlavičky požadavku na serverové straně
    const headers = getRequestHeaders()
    const userAgent = headers.get('user-agent') || undefined
    const ip = headers.get('cf-connecting-ip') || headers.get('x-real-ip') || undefined

    try {
      const db = await getDb()
      
      // Zápis protokolu o spuštění kontroly
      await db.insert(protocols).values({
        status: 'success',
        details: 'Spuštěna kontrola databáze z /dbcheck',
        ip,
        userAgent,
      })

      // Vytvoříme kontrolní záznam s aktuálním časem
      const checkText = `Kontrola připojení k D1: ${new Date().toLocaleTimeString()}`
      
      // Vložíme testovací záznam do databáze
      const inserted = await db.insert(todos).values({
        text: checkText,
        completed: false,
      }).returning()

      // Načteme všechny uložené záznamy a posledních 5 protokolů
      const allTodos = await db.select().from(todos)
      const allProtocols = await db.select().from(protocols).orderBy(desc(protocols.timestamp)).limit(5)

      return {
        success: true,
        message: 'Připojení k databázi D1 přes Drizzle funguje skvěle!',
        inserted: inserted[0] || { text: checkText },
        count: allTodos.length,
        protocols: allProtocols,
      }
    } catch (error: any) {
      console.error('DbCheck Server Function Error:', error)
      try {
        const db = await getDb()
        await db.insert(protocols).values({
          status: 'failed',
          details: `Kontrola z /dbcheck selhala: ${error.message}`,
          ip,
          userAgent,
        })
      } catch (dbErr) {
        console.error('Nelze zapsat chybový protokol do DB:', dbErr)
      }

      return {
        success: false,
        message: 'Připojení k databázi selhalo.',
        error: error.message || String(error),
      }
    }
  })

export const Route = createFileRoute('/dbcheck')({
  // Loader pouze zavolá serverovou funkci (bezpečně přenositelnou mezi klientem a serverem)
  loader: async () => {
    return checkDatabaseFn()
  },
  component: DbCheckComponent,
})

function DbCheckComponent() {
  const data = Route.useLoaderData()

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="island-shell rise-in max-w-xl w-full rounded-[2rem] p-8 sm:p-12">
        <h1 className="display-title mb-6 text-3xl font-extrabold text-[var(--sea-ink)] text-center">
          Kontrola databáze
        </h1>
        
        {data.success ? (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold text-sm">🟢 {data.message}</p>
            </div>
            
            <div className="flex flex-col gap-2 text-sm text-[var(--sea-ink-soft)] bg-[rgba(255,255,255,0.3)] dark:bg-[rgba(10,20,24,0.3)] p-4 rounded-xl border border-[var(--line)]">
              <p>
                <strong>Zapsaný záznam:</strong> <br />
                <code className="text-emerald-700 dark:text-emerald-300 font-semibold">{data.inserted.text}</code>
              </p>
              <p className="mt-2">
                <strong>Celkový počet záznamů v tabulce todos:</strong> {data.count}
              </p>
            </div>

            {/* Protokoly o ověření */}
            {data.protocols.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4 w-full">
                <p className="font-semibold text-xs text-[var(--sea-ink-soft)] uppercase tracking-wider mb-2">Historie ověření (Protokoly):</p>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {data.protocols.map((proto: any) => (
                    <div 
                      key={proto.id} 
                      className="text-xs p-3 rounded-lg border border-[var(--line)] bg-[rgba(255,255,255,0.25)] dark:bg-[rgba(10,20,24,0.255)] flex flex-col gap-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-semibold ${proto.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {proto.status === 'success' ? 'Úspěch' : 'Chyba'}
                        </span>
                        <span className="text-[10px] text-[var(--sea-ink-soft)]">
                          {new Date(proto.timestamp).toLocaleTimeString()} {new Date(proto.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-[var(--sea-ink)] font-medium">{proto.details}</p>
                      {proto.ip && (
                        <p className="text-[9px] text-[var(--sea-ink-soft)]">
                          IP: <code>{proto.ip}</code>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2 flex justify-center">
              <a href="/" className="demo-button text-xs rounded-full px-6 py-2.5 shadow-md">
                Zpět na hlavní stránku
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-300">
              <p className="font-semibold text-sm">🔴 {data.message}</p>
              <p className="text-xs mt-2 font-mono break-all bg-black/5 dark:bg-black/20 p-2 rounded">{data.error}</p>
            </div>
            
            <div className="mt-4 flex justify-center">
              <a href="/" className="demo-button demo-button-secondary text-xs rounded-full px-6 py-2.5">
                Zpět na hlavní stránku
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
