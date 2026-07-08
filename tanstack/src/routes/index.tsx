import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
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
        
        {/* Tlačítko pro ověření databáze */}
        <div className="mt-8 flex justify-center">
          <Link
            to="/dbcheck"
            className="demo-button relative z-10 rounded-full px-8 py-3 shadow-md transition-all hover:scale-105 no-underline"
          >
            Ověřit databázi (/dbcheck)
          </Link>
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
