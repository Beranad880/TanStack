import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
// @ts-ignore: cloudflare:workers is a virtual module provided by Vite plugin
import { env } from 'cloudflare:workers'
import { useState } from 'react'
import puppeteer from '@cloudflare/puppeteer'

// Serverová funkce pro spuštění headless prohlížeče a pořízení snímku - běží pouze na serveru
const takeScreenshotFn = createServerFn({ method: 'POST' })
  .validator((d: { url: string }) => d)
  .handler(async ({ data }) => {
    let browser: any = null
    try {
      const myBrowser = (env as any).MYBROWSER
      if (!myBrowser) {
        return {
          success: false,
          error: 'Browser binding "MYBROWSER" nebyl nalezen v konfiguraci wrangler.jsonc.'
        }
      }

      console.log(`Spouštím prohlížeč pro URL: ${data.url}`)
      browser = await puppeteer.launch(myBrowser)
      const page = await browser.newPage()
      
      // Nastavení velikosti okna
      await page.setViewport({ width: 1024, height: 768 })
      
      // Navigace na URL s timeoutem 20 sekund
      await page.goto(data.url, { 
        waitUntil: 'networkidle2', 
        timeout: 20000 
      })
      
      // Pořízení snímku jako JPEG
      const imgBuffer = await page.screenshot({ 
        type: 'jpeg', 
        quality: 80 
      })
      
      // Převedení binárních dat na Base64 pro přenos do UI
      const base64 = Buffer.from(imgBuffer).toString('base64')
      
      await browser.close()
      console.log('Prohlížeč úspěšně ukončen.')

      return { success: true, imageBase64: base64 }
    } catch (error: any) {
      console.error('Browser check error:', error)
      if (browser) {
        try {
          await browser.close()
        } catch (closeErr) {
          console.error('Nelze zavřít prohlížeč po chybě:', closeErr)
        }
      }
      return { success: false, error: error.message || String(error) }
    }
  })

export const Route = createFileRoute('/browsercheck')({
  component: BrowserCheckComponent,
})

function BrowserCheckComponent() {
  const [url, setUrl] = useState('https://example.com')
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScreenshot = async () => {
    setLoading(true)
    setError(null)
    setScreenshot(null)
    
    // Zajištění, že URL začíná protokolem http/https
    let targetUrl = url.trim()
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl
      setUrl(targetUrl)
    }

    try {
      const res = await takeScreenshotFn({ data: { url: targetUrl } })
      if (res.success && res.imageBase64) {
        setScreenshot(res.imageBase64)
      } else {
        setError(res.error || 'Nepodařilo se pořídit snímek.')
      }
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <section className="island-shell rise-in max-w-3xl w-full rounded-[2rem] p-8 sm:p-12">
        <h1 className="display-title mb-6 text-3xl font-extrabold text-[var(--sea-ink)] text-center">
          Cloudflare Browser Rendering
        </h1>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-[var(--sea-ink-soft)] uppercase tracking-wider">
              Webová adresa k vyfocení (URL)
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="demo-textarea p-3 text-sm font-sans"
              placeholder="Např. https://example.com"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleScreenshot}
            disabled={loading || !url.trim()}
            className="demo-button w-full relative z-10 rounded-full px-6 py-3 shadow-md transition-all hover:scale-[1.01]"
          >
            {loading ? 'Spouštím prohlížeč a fotím web...' : 'Vyfotit stránku'}
          </button>

          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-800 dark:text-rose-300 text-sm">
              <p className="font-semibold">🔴 Chyba při renderingu:</p>
              <p className="text-xs mt-2 font-mono break-all bg-black/5 dark:bg-black/20 p-2 rounded">{error}</p>
            </div>
          )}

          {screenshot && (
            <div className="flex flex-col gap-2 border-t border-[var(--line)] pt-4 w-full">
              <p className="font-semibold text-xs text-[var(--sea-ink-soft)] uppercase tracking-wider mb-2">
                Snímek stránky ({url}):
              </p>
              <div className="rounded-xl overflow-hidden border border-[var(--line)] bg-[rgba(255,255,255,0.4)] dark:bg-[rgba(10,20,24,0.4)] p-2 flex justify-center">
                <img 
                  src={`data:image/jpeg;base64,${screenshot}`} 
                  alt={`Screenshot ${url}`}
                  className="max-w-full h-auto rounded-lg shadow-sm border border-black/10 dark:border-white/10"
                />
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
