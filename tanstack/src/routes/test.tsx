import { createFileRoute, Link } from '@tanstack/react-router'
import { Compass, Database, Cpu, Chrome, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/test')({
  component: TestHubComponent,
})

function TestHubComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-[var(--bg-base)] text-[var(--sea-ink)] selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <section className="island-shell rise-in relative max-w-xl overflow-hidden rounded-[2.5rem] px-8 py-12 text-center sm:px-16 sm:py-20 w-full">
        {/* Decorative backdrop glows */}
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--hero-a),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--hero-b),transparent_70%)]" />

        {/* Home navigation button */}
        <div className="absolute top-6 left-6 z-10">
          <Link
            to="/lagoonedge"
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Marketingová appka</span>
          </Link>
        </div>

        {/* Title */}
        <p className="island-kicker mb-4 tracking-[0.25em] text-[var(--sea-ink-soft)]">
          Vývojářská zóna
        </p>
        <h1 className="display-title mb-6 text-4xl font-extrabold leading-tight text-[var(--sea-ink)]">
          Testovací Hub
        </h1>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--sea-ink-soft)] mb-10">
          Zde jsou shromážděny veškeré integrační testy pro ověření funkčnosti Cloudflare služeb.
        </p>
        
        {/* Testovací trasy */}
        <div className="flex flex-col gap-4 w-full">
          <Link
            to="/dbcheck"
            className="demo-list-item flex items-center justify-between no-underline transition-all hover:scale-[1.01] hover:border-neutral-400 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--sand)] p-2.5 text-[var(--sea-ink)]">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">Databáze (D1)</span>
                <span className="text-[10px] text-[var(--sea-ink-soft)]">Zápis a čtení protokolů přes Drizzle</span>
              </div>
            </div>
            <span className="text-xs font-bold text-[var(--sea-ink-soft)] bg-[var(--sand)] px-2.5 py-1 rounded-full">/dbcheck</span>
          </Link>

          <Link
            to="/aicheck"
            className="demo-list-item flex items-center justify-between no-underline transition-all hover:scale-[1.01] hover:border-neutral-400 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--sand)] p-2.5 text-[var(--sea-ink)]">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">AI Modely (Gemini)</span>
                <span className="text-[10px] text-[var(--sea-ink-soft)]">Volání Google Gemini 1.5 Flash</span>
              </div>
            </div>
            <span className="text-xs font-bold text-[var(--sea-ink-soft)] bg-[var(--sand)] px-2.5 py-1 rounded-full">/aicheck</span>
          </Link>

          <Link
            to="/browsercheck"
            className="demo-list-item flex items-center justify-between no-underline transition-all hover:scale-[1.01] hover:border-neutral-400 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[var(--sand)] p-2.5 text-[var(--sea-ink)]">
                <Chrome className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-sm block">Prohlížeč (Puppeteer)</span>
                <span className="text-[10px] text-[var(--sea-ink-soft)]">Focení webových stránek z workeru</span>
              </div>
            </div>
            <span className="text-xs font-bold text-[var(--sea-ink-soft)] bg-[var(--sand)] px-2.5 py-1 rounded-full">/browsercheck</span>
          </Link>
        </div>

        {/* Minimal interactive bubble decorative element */}
        <div className="mt-10 flex justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 opacity-40 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-neutral-400 opacity-80" />
          <span
            className="h-1.5 w-1.5 rounded-full bg-neutral-400 opacity-40 animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
        </div>
      </section>
    </main>
  )
}
