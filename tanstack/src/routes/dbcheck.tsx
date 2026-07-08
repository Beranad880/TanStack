import { createFileRoute } from '@tanstack/react-router'
import { getDb } from '../db/index'
import { todos } from '../db/schema'

export const Route = createFileRoute('/dbcheck')({
  loader: async () => {
    try {
      const db = await getDb()
      
      // Vytvoříme kontrolní záznam s aktuálním časem
      const checkText = `Kontrola připojení k D1: ${new Date().toLocaleTimeString()}`
      
      // Vložíme testovací záznam do databáze
      const inserted = await db.insert(todos).values({
        text: checkText,
        completed: false,
      }).returning()

      // Načteme všechny uložené záznamy
      const allTodos = await db.select().from(todos)

      return {
        success: true,
        message: 'Připojení k databázi D1 přes Drizzle funguje skvěle!',
        inserted: inserted[0] || { text: checkText },
        count: allTodos.length,
        all: allTodos,
      }
    } catch (error: any) {
      console.error('DbCheck Loader Error:', error)
      return {
        success: false,
        message: 'Připojení k databázi selhalo.',
        error: error.message || String(error),
      }
    }
  },
  component: DbCheckComponent,
})

function DbCheckComponent() {
  const data = Route.useLoaderData()

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="island-shell rise-in max-w-lg w-full rounded-[2rem] p-8 sm:p-12">
        <h1 className="display-title mb-6 text-3xl font-extrabold text-[var(--sea-ink)] text-center">
          Kontrola databáze
        </h1>
        
        {data.success ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold text-sm">🟢 {data.message}</p>
            </div>
            
            <div className="flex flex-col gap-2 text-sm text-[var(--sea-ink-soft)] bg-[rgba(255,255,255,0.3)] dark:bg-[rgba(10,20,24,0.3)] p-4 rounded-xl border border-[var(--line)]">
              <p>
                <strong>Zapsaný záznam:</strong> <br />
                <code className="text-emerald-700 dark:text-emerald-300 font-semibold">{data.inserted.text}</code>
              </p>
              <p className="mt-2">
                <strong>Celkový počet záznamů v tabulce:</strong> {data.count}
              </p>
            </div>

            <div className="mt-4 flex justify-center">
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
