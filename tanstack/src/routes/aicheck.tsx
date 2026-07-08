import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers is a virtual module provided by Vite plugin
import { env } from 'cloudflare:workers'
import { useState } from 'react'

// Serverová funkce pro volání Cloudflare Workers AI - běží výhradně na serveru
const askLlamaFn = createServerFn({ method: 'POST' })
  .validator((d: { prompt: string }) => d)
  .handler(async ({ data }) => {
    try {
      const ai = (env as any).AI

      if (!ai) {
        return {
          success: false,
          error: 'Cloudflare AI binding "AI" nebyl nalezen v konfiguraci wrangler.jsonc, nebo neběží lokální simulace.'
        }
      }

      // Voláme bezplatný model Llama 3.2 3B běžící přímo na Cloudflare
      const response = await ai.run(
        '@cf/meta/llama-3.2-3b-instruct',
        {
          messages: [
            { role: 'system', content: 'You are a friendly assistant' },
            { role: 'user', content: data.prompt },
          ],
        }
      )

      // Výstupní text z modelu Llama se nachází ve vlastnosti 'response'
      const text = response.response

      if (!text) {
        return { success: false, error: 'Model vrátil prázdnou odpověď nebo neočekávanou strukturu.' }
      }

      return { success: true, text }
    } catch (error: any) {
      console.error('Llama AI Error:', error)
      return { success: false, error: error.message || String(error) }
    }
  })

export const Route = createFileRoute('/aicheck')({
  component: AiCheckComponent,
})

function AiCheckComponent() {
  const [prompt, setPrompt] = useState('What is the origin of the phrase Hello, World')
  const [response, setResponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAskLlama = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await askLlamaFn({ data: { prompt } })
      if (res.success) {
        setResponse(res.text || null)
      } else {
        setError(res.error || 'Něco se nepodařilo')
      }
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="island-shell rise-in max-w-2xl w-full rounded-[2rem] p-8 sm:p-12">
        <h1 className="display-title mb-6 text-3xl font-extrabold text-[var(--sea-ink)] text-center">
          Cloudflare Workers AI
        </h1>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
              Otázka pro model Llama 3.2 (Prompt)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="demo-textarea p-3 text-sm font-sans"
              rows={3}
              placeholder="Zadejte otázku..."
              disabled={loading}
            />
          </div>

          <button
            onClick={handleAskLlama}
            disabled={loading || !prompt.trim()}
            className="demo-button w-full relative z-10 rounded-full px-6 py-3 shadow-md transition-all hover:scale-[1.01]"
          >
            {loading ? 'Generování odpovědi přes Llama 3.2...' : 'Odeslat dotaz do Llama 3.2'}
          </button>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-300 text-sm">
              <p className="font-semibold">🔴 Chyba při volání Workers AI:</p>
              <p className="text-xs mt-2 font-mono break-all bg-black/5 dark:bg-black/20 p-2 rounded">{error}</p>
            </div>
          )}

          {response && (
            <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4 w-full">
              <p className="font-semibold text-xs text-[var(--sea-ink-soft)] uppercase tracking-wider">
                Odpověď z modelu Llama-3.2-3b-instruct:
              </p>
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(10,20,24,0.4)] text-sm leading-relaxed text-[var(--sea-ink)] max-h-80 overflow-y-auto whitespace-pre-wrap font-sans">
                {response}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-center border-t border-[var(--line)] pt-4">
            <Link to="/" className="demo-button demo-button-secondary text-xs rounded-full px-6 py-2.5">
              Zpět na hlavní stránku
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
