import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers is a virtual module provided by Vite plugin
import { env } from 'cloudflare:workers'
import { useState } from 'react'

// Serverová funkce pro volání Gemini přes Workers AI - běží výhradně na serveru
const askGeminiFn = createServerFn({ method: 'POST' })
  .validator((d: { prompt: string }) => d)
  .handler(async ({ data }) => {
    try {
      const response = await (env as any).AI.run(
        'google/gemini-3.5-flash',
        {
          contents: [
            {
              parts: [{ text: data.prompt }],
              role: 'user',
            },
          ],
        }
      )
      
      console.log('Gemini response:', response)
      return { success: true, response }
    } catch (error: any) {
      console.error('Gemini error:', error)
      return { success: false, error: error.message || String(error) }
    }
  })

export const Route = createFileRoute('/aicheck')({
  component: AiCheckComponent,
})

function AiCheckComponent() {
  const [prompt, setPrompt] = useState('What are the three laws of thermodynamics?')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAskGemini = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await askGeminiFn({ data: { prompt } })
      if (res.success) {
        setResponse(res.response)
      } else {
        setError(res.error || 'Něco se nepodařilo')
      }
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  // Pomocná funkce pro zobrazení odpovědi (přímo text, nebo formátovaný JSON podle toho, co model vrátí)
  const renderResponseText = () => {
    if (!response) return null
    
    // Pokud D1 / Workers AI vrátí strukturovanou odpověď s textem
    if (response.response) {
      return response.response
    }
    if (response.text) {
      return response.text
    }
    // Jinak zobrazíme jako text nebo JSON
    return typeof response === 'string' ? response : JSON.stringify(response, null, 2)
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="island-shell rise-in max-w-2xl w-full rounded-[2rem] p-8 sm:p-12">
        <h1 className="display-title mb-6 text-3xl font-extrabold text-[var(--sea-ink)] text-center">
          Testování Google Gemini
        </h1>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
              Otázka pro model (Prompt)
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
            onClick={handleAskGemini}
            disabled={loading || !prompt.trim()}
            className="demo-button w-full relative z-10 rounded-full px-6 py-3 shadow-md transition-all hover:scale-[1.01]"
          >
            {loading ? 'Generování odpovědi přes Gemini...' : 'Odeslat dotaz do Gemini'}
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
                Odpověď z modelu google/gemini-3.5-flash:
              </p>
              <div className="p-4 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(10,20,24,0.4)] text-sm leading-relaxed text-[var(--sea-ink)] max-h-80 overflow-y-auto whitespace-pre-wrap font-sans">
                {renderResponseText()}
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
