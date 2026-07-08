import { createFileRoute, Link } from '@tanstack/react-router'
import { Compass, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/lagoonedge')({
  component: LagoonedgeComponent,
})

function LagoonedgeComponent() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-[var(--bg-base)] text-[var(--sea-ink)] selection:bg-neutral-200 dark:selection:bg-neutral-800">
      <section className="island-shell rise-in relative max-w-xl overflow-hidden rounded-[2.5rem] px-8 py-12 text-center sm:px-16 sm:py-20 w-full">
        {/* Decorative backdrop glows */}
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--hero-a),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,var(--hero-b),transparent_70%)]" />

        {/* Minimal Icon */}
        <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sand)] text-[var(--sea-ink)]">
          <Compass className="h-6 w-6 stroke-[2]" />
        </div>

        {/* Header Kicker */}
        <p className="island-kicker mb-4 tracking-[0.25em] text-[var(--sea-ink-soft)]">
          Projekt spuštěn
        </p>

        {/* Main Title */}
        <h1 className="display-title mb-6 text-4xl font-extrabold leading-tight text-[var(--sea-ink)] sm:text-5xl">
          Vítejte na LagoonEdge
        </h1>

        {/* Subtitle */}
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-[var(--sea-ink-soft)] mb-10">
          Moderní full-stack šablona postavená na technologii TanStack Start a optimalizovaná pro edge prostředí Cloudflare.
        </p>
        
        {/* Navigation Buttons */}
        <div className="flex justify-center">
          <Link
            to="/test"
            className="demo-button relative z-10 rounded-full px-8 py-3.5 shadow-md transition-all hover:scale-105 no-underline flex items-center gap-2"
          >
            <span>Vstoupit do Testovacího Hubu</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="mt-10 flex justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-400 opacity-40 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-neutral-400 opacity-85" />
          <span
            className="h-1.5 w-1.5 rounded-full bg-neutral-400 opacity-40 animate-pulse"
            style={{ animationDelay: '0.5s' }}
          />
        </div>
      </section>
    </main>
  )
}
