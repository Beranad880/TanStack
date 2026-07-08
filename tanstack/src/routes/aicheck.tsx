import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers is a virtual module provided by Vite plugin
import { env } from 'cloudflare:workers'
import { useState } from 'react'
import geminiConfig from '../../gemini-config.json'

// Serverová funkce pro volání Google Gemini - běžící výhradně na serveru
const askGeminiFn = createServerFn({ method: 'POST' })
  .validator((d: { prompt: string }) => d)
  .handler(async ({ data }) => {
    try {
      const apiKey = (env as any).GEMINI_API_KEY

      if (!apiKey) {
        return {
          success: false,
          error: 'API klíč "GEMINI_API_KEY" nebyl nalezen v konfiguraci Workers.'
        }
      }

      const modelName = geminiConfig.model || 'gemini-2.5-flash'
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`
      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: data.prompt }]
              }
            ]
          })
        })

        if (response.ok) {
          break;
        }

        const errorText = await response.text()
        if ((response.status === 503 || response.status === 429) && attempt < 3) {
          console.warn(`Gemini API ${response.status}, retrying in ${attempt * 2}s...`);
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }

        return {
          success: false,
          error: `Gemini API error (HTTP ${response.status}): ${errorText}`
        }
      }

      if (!response) {
        return { success: false, error: 'Gemini API fetch failed' }
      }

      const result = await response.json()
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        return { success: false, error: 'Model vrátil prázdnou odpověď nebo neočekávanou strukturu.' }
      }

      return { success: true, text }
    } catch (error: any) {
      console.error('Gemini AI Error:', error)
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

  const handleAskGemini = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)
    try {
      const res = await askGeminiFn({ data: { prompt } })
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
        <h1 className="display-title mb-6 text-3xl font-extrabold text-[var(--sea-ink)] text-center capitalize">
          Google {geminiConfig.model.replace('models/', '').replace(/-/g, ' ')}
        </h1>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
              Otázka pro model Gemini (Prompt)
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
            {loading ? `Generování odpovědi přes ${geminiConfig.model}...` : 'Odeslat dotaz do Gemini'}
          </button>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-300 text-sm">
              <p className="font-semibold">🔴 Chyba při volání Gemini API:</p>
              <p className="text-xs mt-2 font-mono break-all bg-black/5 dark:bg-black/20 p-2 rounded">{error}</p>
            </div>
          )}

          {response && (
            <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4 w-full">
              <p className="font-semibold text-xs text-[var(--sea-ink-soft)] uppercase tracking-wider">
                Odpověď z modelu Gemini:
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
