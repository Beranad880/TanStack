import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [apiResponse, setApiResponse] = useState<string | null>(null)
  const [todosList, setTodosList] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)

  const testApi = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ahoj')
      const data = await res.json()
      setApiResponse(data.message)
      if (data.todos) {
        setTodosList(data.todos)
      }
    } catch (err) {
      setApiResponse('Chyba při volání API')
      setTodosList(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="island-shell rise-in relative max-w-xl overflow-hidden rounded-[2.5rem] px-8 py-12 text-center sm:px-16 sm:py-20">
        {/* Decorative backdrop glows */}
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.35),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.22),transparent_70%)]" />

        {/* Subtle top decoration line */}
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gradient-to-r from-[var(--lagoon)] to-[var(--palm)] opacity-80" />
        <p className="island-kicker mb-4 tracking-[0.25em] text-[var(--lagoon-deep)]">
          Vítejte
        </p>
        <h1 className="display-title mb-6 text-5xl font-extrabold leading-tight text-[var(--sea-ink)] sm:text-6xl">
          Ahoj světe!
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--sea-ink-soft)] sm:text-base">
          Tato aplikace byla úspěšně vyčištěna. Zbyla pouze tato jediná,
          minimalistická a moderní stránka.
        </p>
        {/* API Testing Area */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex gap-2 flex-wrap justify-center">
            <button
              onClick={testApi}
              disabled={loading}
              className="demo-button relative z-10 rounded-full px-6 py-2.5 shadow-md transition-all hover:scale-105"
            >
              {loading ? 'Načítání...' : 'Vyzkoušet /api/ahoj'}
            </button>
            <Link
              to="/dbcheck"
              className="demo-button demo-button-secondary relative z-10 rounded-full px-6 py-2.5 shadow-md transition-all hover:scale-105 no-underline"
            >
              Ověřit databázi (/dbcheck)
            </Link>
          </div>

          {apiResponse && (
            <div className="rise-in flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.4)] px-4 py-3 text-sm font-medium text-[var(--palm)] dark:bg-[rgba(10,20,24,0.4)] w-full">
              <div>
                Odpověď z API:{' '}
                <code className="ml-1 font-semibold text-[var(--lagoon-deep)]">
                  {apiResponse}
                </code>
              </div>
              {todosList && todosList.length > 0 && (
                <div className="mt-2 text-left border-t border-[var(--line)] pt-2 w-full">
                  <p className="font-semibold text-[10px] text-[var(--sea-ink-soft)] uppercase tracking-wider mb-1">Úkoly z D1 Databáze:</p>
                  <ul className="list-disc list-inside text-xs text-[var(--sea-ink)] flex flex-col gap-1">
                    {todosList.map((todo) => (
                      <li key={todo.id} className="truncate">
                        <span className={todo.completed ? 'line-through text-[var(--sea-ink-soft)]' : ''}>
                          {todo.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Minimal interactive bubble decorative element */}
        <div className="mt-8 flex justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--lagoon)] opacity-40 animate-pulse" />
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--lagoon)] opacity-80" />
          <span
            className="h-2 w-2 rounded-full bg-[var(--lagoon)] opacity-40 animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
        </div>
      </section>
    </main>
  )
}
