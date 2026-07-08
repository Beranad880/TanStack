import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Shield, Cpu, Compass, Zap } from 'lucide-react'

export const Route = createFileRoute('/lagoonedge')({
  component: LagoonMarketingComponent,
})

function LagoonMarketingComponent() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'db' | 'ai' | 'browser'>('db')
  const [savingsValue, setSavingsValue] = useState(50) // Pro kalkulačku úspor

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      setIsSubmitted(true)
      setEmail('')
      setTimeout(() => setIsSubmitted(false), 5000)
    }
  }

  // Výpočet odhadovaných úspor (kalkulačka na edge hostingu)
  const calculateCost = (traffic: number) => {
    const traditional = Math.round(traffic * 0.45 + 15)
    const edge = Math.round(traffic * 0.08)
    return { traditional, edge, saved: traditional - edge }
  }

  const costs = calculateCost(savingsValue)

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--sea-ink)] selection:bg-neutral-200 dark:selection:bg-neutral-800">
      {/* Sleek Minimalist Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--line)] bg-[var(--header-bg)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/lagoonedge" className="flex items-center gap-2 font-extrabold tracking-tight text-lg no-underline hover:opacity-85">
            <Compass className="h-5 w-5 stroke-[2.5]" />
            <span>LagoonEdge</span>
          </Link>
          <nav className="flex items-center gap-6">
            <a href="#features" className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]">Vlastnosti</a>
            <a href="#demo" className="text-xs font-semibold uppercase tracking-wider text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]">Kalkulačka</a>
            <Link to="/test" className="demo-button demo-button-secondary text-xs rounded-full px-4 py-2.5">
              Testovací Hub
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20 text-center sm:py-32 overflow-hidden">
        {/* Decorative backdrop gradients */}
        <div className="pointer-events-none absolute -left-40 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--hero-a),transparent_70%)]" />
        <div className="pointer-events-none absolute -right-40 bottom-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--hero-b),transparent_70%)]" />

        <div className="mx-auto max-w-3xl rise-in">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3.5 py-1.5 text-xs font-semibold tracking-wider uppercase text-[var(--sea-ink-soft)]">
            <Zap className="h-3.5 w-3.5 text-yellow-500 animate-pulse fill-yellow-500" />
            <span>Představujeme budoucnost edge aplikací</span>
          </div>
          
          <h1 className="display-title mb-6 text-4xl font-extrabold tracking-tight sm:text-6xl leading-[1.1] text-[var(--sea-ink)]">
            Sestavte. Otestujte.<br />Nasaďte na Edge.
          </h1>
          
          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-[var(--sea-ink-soft)] sm:text-lg">
            LagoonEdge spojuje rychlost a přesnost <strong>TanStack Start</strong> s nekompromisním serverless edge výkonem <strong>Cloudflare</strong>. Vaše aplikace poběží s nulovou latencí po celém světě.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <a href="#features" className="demo-button no-underline text-sm font-semibold rounded-full px-8 py-3.5 shadow-lg">
              Prozkoumat architekturu
            </a>
            <a href="#demo" className="demo-button demo-button-secondary no-underline text-sm font-semibold rounded-full px-8 py-3.5">
              Spočítat úspory
            </a>
          </div>
        </div>
      </section>

      {/* Pillars Section */}
      <section id="features" className="border-t border-[var(--line)] bg-[var(--foam)] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="display-title text-3xl font-extrabold sm:text-4xl text-[var(--sea-ink)]">
              Tři pilíře moderního stacku
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-[var(--sea-ink-soft)]">
              Kompletní sada nástrojů integrovaná v jednom balíčku, běžící přímo na okraji sítě.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {/* Pillar 1 */}
            <div className="island-shell flex flex-col items-center p-8 rounded-[2rem] text-center transition-all hover:scale-[1.02]">
              <div className="mb-6 rounded-2xl bg-[var(--sand)] p-4 text-[var(--sea-ink)]">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-[var(--sea-ink)]">Bezpečné SQL (D1)</h3>
              <p className="text-xs leading-relaxed text-[var(--sea-ink-soft)]">
                SQL databáze D1 s Drizzle ORM s plným typovým zabezpečením a integrovaným auditováním každého zápisu.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="island-shell flex flex-col items-center p-8 rounded-[2rem] text-center transition-all hover:scale-[1.02]">
              <div className="mb-6 rounded-2xl bg-[var(--sand)] p-4 text-[var(--sea-ink)]">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-[var(--sea-ink)]">Serverless AI</h3>
              <p className="text-xs leading-relaxed text-[var(--sea-ink-soft)]">
                Nativní spouštění open-source velkých jazykových modelů (Llama 3.2) přímo v rámci vašeho hostingu bez drahých klíčů.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="island-shell flex flex-col items-center p-8 rounded-[2rem] text-center transition-all hover:scale-[1.02]">
              <div className="mb-6 rounded-2xl bg-[var(--sand)] p-4 text-[var(--sea-ink)]">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-[var(--sea-ink)]">Browser Rendering</h3>
              <p className="text-xs leading-relaxed text-[var(--sea-ink-soft)]">
                Vzdálené spouštění Chrome přes Puppeteer. Focení webů, generování PDF nebo scraping z edge workeru.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Tabs Showcasing Stack Code */}
      <section className="border-t border-[var(--line)] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="display-title text-2xl font-extrabold sm:text-3xl text-[var(--sea-ink)]">
              Naprosto čistý kód
            </h2>
            <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
              Prohlédněte si, jak snadno se s LagoonEdge píše backendová logika.
            </p>
          </div>

          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => setActiveTab('db')}
              className={`demo-button text-xs rounded-full px-5 py-2 ${activeTab === 'db' ? '' : 'demo-button-secondary'}`}
            >
              D1 Databáze
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`demo-button text-xs rounded-full px-5 py-2 ${activeTab === 'ai' ? '' : 'demo-button-secondary'}`}
            >
              Llama 3.2 AI
            </button>
            <button
              onClick={() => setActiveTab('browser')}
              className={`demo-button text-xs rounded-full px-5 py-2 ${activeTab === 'browser' ? '' : 'demo-button-secondary'}`}
            >
              Puppeteer
            </button>
          </div>

          <div className="demo-code-block font-mono text-xs overflow-x-auto p-6 rounded-2xl border border-[var(--line)] bg-[var(--foam)]">
            {activeTab === 'db' && (
              <pre className="text-left text-neutral-800 dark:text-neutral-200">
{`// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const protocols = sqliteTable('protocols', {
  id: integer('id').primaryKey(),
  timestamp: text('timestamp').$defaultFn(() => new Date().toISOString()),
  status: text('status').notNull(),
  ip: text('ip'),
  details: text('details').notNull()
});

// Použití v kódu:
const db = await getDb();
await db.insert(protocols).values({ status: 'success', details: 'Kontrola' });`}
              </pre>
            )}

            {activeTab === 'ai' && (
              <pre className="text-left text-neutral-800 dark:text-neutral-200">
{`// Volání Workers AI s modelem Llama 3.2
const response = await env.AI.run(
  '@cf/meta/llama-3.2-3b-instruct',
  {
    messages: [
      { role: 'system', content: 'You are a friendly assistant' },
      { role: 'user', content: 'Vysvětli termodynamiku' }
    ]
  }
);

console.log(response.response);`}
              </pre>
            )}

            {activeTab === 'browser' && (
              <pre className="text-left text-neutral-800 dark:text-neutral-200">
{`// Cloudflare Browser Rendering + Puppeteer
import puppeteer from '@cloudflare/puppeteer'

const browser = await puppeteer.launch(env.MYBROWSER)
const page = await browser.newPage()
await page.goto('https://example.com')
const imgBuffer = await page.screenshot({ type: 'jpeg' })
await browser.close()

// Vrácení snímku:
return new Response(imgBuffer, { headers: { 'content-type': 'image/jpeg' } })`}
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Savings Calculator */}
      <section id="demo" className="border-t border-[var(--line)] bg-[var(--foam)] px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="display-title text-2xl font-extrabold sm:text-3xl text-[var(--sea-ink)]">
              Kalkulačka úspor Edge hostingu
            </h2>
            <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
              Spočítejte si, kolik ušetříte přechodem z klasického VPS hostingu na LagoonEdge.
            </p>
          </div>

          <div className="island-shell p-8 sm:p-10 rounded-[2.5rem] flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm font-semibold">
                <span>Návštěvnost webu:</span>
                <span className="text-base text-[var(--sea-ink)] font-bold">{savingsValue * 10} 000 požadavků/měsíc</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={savingsValue}
                onChange={(e) => setSavingsValue(Number(e.target.value))}
                className="w-full h-1.5 bg-[var(--sand)] rounded-lg appearance-none cursor-pointer accent-[var(--sea-ink)]"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-center mt-4">
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.3)] dark:bg-[rgba(10,20,24,0.3)]">
                <span className="text-[10px] text-[var(--sea-ink-soft)] uppercase font-semibold">Tradiční Server (VPS)</span>
                <p className="text-xl font-bold mt-1 text-red-600 dark:text-red-400">{costs.traditional} $ / měs</p>
              </div>
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.6)] dark:bg-[rgba(20,30,34,0.6)] ring-1 ring-[var(--sea-ink)]">
                <span className="text-[10px] text-[var(--sea-ink-soft)] uppercase font-semibold">LagoonEdge (Serverless)</span>
                <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{costs.edge} $ / měs</p>
              </div>
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.3)] dark:bg-[rgba(10,20,24,0.3)]">
                <span className="text-[10px] text-[var(--sea-ink-soft)] uppercase font-semibold">Ušetříte celkem</span>
                <p className="text-xl font-bold mt-1 text-[var(--sea-ink)]">{costs.saved} $ / měs</p>
              </div>
            </div>
            
            <p className="text-[10px] text-[var(--sea-ink-soft)] text-center leading-normal">
              * Odhad kalkulovaný na základě průměrných cen VPS (1 CPU, 2GB RAM + přenos dat) oproti Cloudflare Pages a D1 bezplatnému limitu + placeným dotazům v D1 nad limit.
            </p>
          </div>
        </div>
      </section>

      {/* Newsletter Signup (Call to Action) */}
      <section className="border-t border-[var(--line)] px-6 py-20 sm:py-28 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="display-title text-2xl font-extrabold sm:text-3xl text-[var(--sea-ink)] mb-4">
            Zůstaňte v obraze
          </h2>
          <p className="text-sm text-[var(--sea-ink-soft)] mb-8">
            Přihlaste se k odběru novinek o vývoji LagoonEdge. Žádný spam, pouze technické novinky a aktualizace.
          </p>

          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Váš e-mail..."
              required
              disabled={loading || isSubmitted}
              className="demo-input p-3 text-sm rounded-full sm:w-64"
            />
            <button
              type="submit"
              disabled={loading || isSubmitted}
              className="demo-button text-sm rounded-full px-6 py-3"
            >
              {isSubmitted ? 'Přihlášeno ✓' : 'Odebírat'}
            </button>
          </form>

          {isSubmitted && (
            <div className="rise-in mt-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Děkujeme! Váš e-mail byl úspěšně zaregistrován k odběru novinek.
            </div>
          )}
        </div>
      </section>

      {/* Modern Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--foam)] py-12 text-center text-xs text-[var(--sea-ink-soft)]">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-[var(--sea-ink)]">
            <Compass className="h-4 w-4" />
            <span>LagoonEdge Boilerplate</span>
          </div>
          <div>
            © {new Date().getFullYear()} LagoonEdge. Všechna práva vyhrazena.
          </div>
        </div>
      </footer>
    </div>
  )
}
