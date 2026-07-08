import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState, useTransition } from 'react'
import { getDb } from '../db/index'
import { sites, brandProfiles, ads } from '../db/schema'
import { desc, eq } from 'drizzle-orm'
import { runAdGenerationPipeline } from '../lib/services/pipeline'
import { generateAds } from '../lib/services/ai'
// @ts-ignore - cloudflare:workers je virtuální modul poskytovaný Vite pluginem
import { env } from 'cloudflare:workers'
import { 
  Compass, ArrowRight, Loader2, Sparkles, 
  Save, Check, Globe, Eye, RefreshCw, X, Clock, Edit2, Zap, Menu 
} from 'lucide-react'

// --- SERVER FUNCTIONS ---

// 1. Load data helper (history + selected site metadata)
const getLagoonedgeDataFn = createServerFn({ method: 'GET' })
  .validator((siteId?: string) => siteId)
  .handler(async ({ data: siteId }) => {
    try {
      const db = await getDb()
      
      // Load all sites for history sidebar
      const historyList = await db
        .select()
        .from(sites)
        .orderBy(desc(sites.createdAt))
        .limit(10)

      let selectedData = null

      if (siteId) {
        // Load specific site
        const selectedSite = await db
          .select()
          .from(sites)
          .where(eq(sites.id, siteId))
          .limit(1)

        if (selectedSite[0]) {
          // Load brand profile
          const selectedProfile = await db
            .select()
            .from(brandProfiles)
            .where(eq(brandProfiles.siteId, siteId))
            .limit(1)

          // Load ads
          const selectedAds = await db
            .select()
            .from(ads)
            .where(eq(ads.siteId, siteId))

          selectedData = {
            site: selectedSite[0],
            brandProfile: selectedProfile[0] || null,
            ads: selectedAds
          }
        }
      }

      return {
        history: historyList,
        selected: selectedData
      }
    } catch (error: any) {
      console.error('getLagoonedgeDataFn failed:', error.message)
      return { history: [], selected: null }
    }
  })

// 2. Generate Brand Profile & Ads (Orchestrate Scrape + LLM)
const generateLagoonedgeAdsFn = createServerFn({ method: 'POST' })
  .validator((url: string) => url)
  .handler(async ({ data: url }) => {
    // Basic URL sanitation
    let sanitizedUrl = url.trim()
    if (!/^https?:\/\//i.test(sanitizedUrl)) {
      sanitizedUrl = 'https://' + sanitizedUrl
    }

    try {
      const db = await getDb()
      
      // Run the pipeline
      const pipelineResult = await runAdGenerationPipeline(sanitizedUrl, env as any)
      
      const siteId = crypto.randomUUID()
      const profileId = crypto.randomUUID()

      // Insert Site record
      await db.insert(sites).values({
        id: siteId,
        url: sanitizedUrl,
        latencyMs: pipelineResult.latencyMs,
        costUsd: pipelineResult.costUsd,
        createdAt: new Date().toISOString()
      })

      // Insert Brand Profile record
      await db.insert(brandProfiles).values({
        id: profileId,
        siteId,
        companyName: pipelineResult.brandProfile.companyName,
        description: pipelineResult.brandProfile.description,
        targetAudience: pipelineResult.brandProfile.targetAudience,
        valueProposition: pipelineResult.brandProfile.valueProposition,
        toneOfVoice: pipelineResult.brandProfile.toneOfVoice,
        colorPalette: pipelineResult.brandProfile.colorPalette,
        candidateImages: pipelineResult.brandProfile.candidateImages,
        createdAt: new Date().toISOString()
      })

      // Insert Ads records
      for (const ad of pipelineResult.ads) {
        await db.insert(ads).values({
          id: crypto.randomUUID(),
          siteId,
          creativeIdea: ad.creativeIdea,
          primaryText: ad.primaryText,
          headline: ad.headline,
          description: ad.description,
          cta: ad.cta,
          imageUrl: ad.imageUrl,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      }

      return { success: true, siteId }
    } catch (error: any) {
      console.error('generateLagoonedgeAdsFn failed:', error.message)
      throw new Error(`Generování selhalo: ${error.message}`)
    }
  })

// 3. Update single Ad content (Edited by user)
const saveAdEditFn = createServerFn({ method: 'POST' })
  .validator((data: {
    adId: string;
    headline: string;
    primaryText: string;
    description: string;
    cta: string;
    imageUrl: string | null;
  }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await getDb()
      
      await db
        .update(ads)
        .set({
          headline: data.headline,
          primaryText: data.primaryText,
          description: data.description,
          cta: data.cta,
          imageUrl: data.imageUrl,
          updatedAt: new Date().toISOString()
        })
        .where(eq(ads.id, data.adId))

      return { success: true }
    } catch (error: any) {
      console.error('saveAdEditFn failed:', error.message)
      throw new Error(`Uložení selhalo: ${error.message}`)
    }
  })

// 4. Regenerate a single ad concept using Gemini
const regenerateAdFn = createServerFn({ method: 'POST' })
  .validator((data: { siteId: string; adId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const db = await getDb()
      
      // Load Brand Profile
      const profileList = await db
        .select()
        .from(brandProfiles)
        .where(eq(brandProfiles.siteId, data.siteId))
        .limit(1)

      if (!profileList[0]) {
        throw new Error('Nenalezen profil značky pro regeneraci')
      }

      const profile = profileList[0]
      const candidateImages: string[] = profile.candidateImages

      // Call Gemini to generate exactly 1 ad
      const generatedAds = await generateAds(
        {
          companyName: profile.companyName,
          description: profile.description,
          targetAudience: profile.targetAudience,
          valueProposition: profile.valueProposition,
          toneOfVoice: profile.toneOfVoice,
          colorPalette: profile.colorPalette
        },
        candidateImages,
        env,
        1
      )

      if (generatedAds.length === 0) {
        throw new Error('LLM model nevygeneroval žádný koncept')
      }

      const newAd = generatedAds[0]

      // Update specific Ad row in database
      await db
        .update(ads)
        .set({
          creativeIdea: newAd.creativeIdea,
          primaryText: newAd.primaryText,
          headline: newAd.headline,
          description: newAd.description,
          cta: newAd.cta,
          imageUrl: newAd.imageUrl,
          updatedAt: new Date().toISOString()
        })
        .where(eq(ads.id, data.adId))

      return { success: true }
    } catch (error: any) {
      console.error('regenerateAdFn failed:', error.message)
      throw new Error(`Regenerace selhala: ${error.message}`)
    }
  })

// 5. Delete a site and its ads / brand profile
const deleteLagoonedgeSiteFn = createServerFn({ method: 'POST' })
  .validator((siteId: string) => siteId)
  .handler(async ({ data: siteId }) => {
    try {
      const db = await getDb()
      
      // Explicitly delete children first (SQLite doesn't always cascade by default without PRAGMA foreign_keys = ON)
      await db.delete(ads).where(eq(ads.siteId, siteId))
      await db.delete(brandProfiles).where(eq(brandProfiles.siteId, siteId))
      
      // Finally delete the site itself
      await db.delete(sites).where(eq(sites.id, siteId))

      return { success: true }
    } catch (error: any) {
      console.error('deleteLagoonedgeSiteFn failed:', error.message)
      throw new Error(`Smazání selhalo: ${error.message}`)
    }
  })

// --- ROUTE DEFINITION ---

interface LagoonEdgeSearch {
  siteId?: string
}

export const Route = createFileRoute('/lagoonedge')({
  validateSearch: (search: Record<string, unknown>): LagoonEdgeSearch => {
    return {
      siteId: typeof search.siteId === 'string' ? search.siteId : undefined,
    }
  },
  loaderDeps: ({ search: { siteId } }) => ({ siteId }),
  loader: async ({ deps: { siteId } }) => {
    return getLagoonedgeDataFn({ data: siteId })
  },
  component: LagoonedgeComponent,
})

function LagoonedgeComponent() {
  const { history, selected } = Route.useLoaderData()
  const { siteId } = Route.useSearch()
  const router = useRouter()
  
  const [inputUrl, setInputUrl] = useState('')
  const [isPending, startTransition] = useTransition()
  const [loadingStep, setLoadingStep] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  // State to track ad card edits locally before saving
  const [editingAdId, setEditingAdId] = useState<string | null>(null)
  const [editFields, setEditFields] = useState<{
    headline: string;
    primaryText: string;
    description: string;
    cta: string;
    imageUrl: string | null;
  } | null>(null)
  
  const [savingAdId, setSavingAdId] = useState<string | null>(null)
  const [regeneratingAdId, setRegeneratingAdId] = useState<string | null>(null)
  const [saveSuccessAdId, setSaveSuccessAdId] = useState<string | null>(null)

  // Handle deleting a campaign
  const handleDeleteSite = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Opravdu chcete tuto reklamní kampaň kompletně smazat?')) return

    try {
      await deleteLagoonedgeSiteFn({ data: id })
      
      // If we are currently viewing the deleted site, reset URL parameter
      if (siteId === id) {
        router.navigate({
          to: '/lagoonedge',
          search: { siteId: undefined }
        })
      } else {
        router.invalidate() // Refresh data (reload history list)
      }
    } catch (err: any) {
      alert(`Chyba při mazání: ${err.message}`)
    }
  }

  // Start generation pipeline
  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputUrl.trim()) return

    setErrorMsg('')
    setLoadingStep('🔍 Krok 1/3: Stahování a renderování webu přes Puppeteer...')

    startTransition(async () => {
      try {
        // Step 1: Set step timer simulator
        const stepTimer = setTimeout(() => {
          setLoadingStep('🧠 Krok 2/3: Extrakce brand profilu přes Google Gemini...')
        }, 5500)
        
        const stepTimer2 = setTimeout(() => {
          setLoadingStep('✍️ Krok 3/3: Generování a přizpůsobení 3 reklamních kreativ...')
        }, 11000)

        const result = await generateLagoonedgeAdsFn({ data: inputUrl })
        
        clearTimeout(stepTimer)
        clearTimeout(stepTimer2)

        setInputUrl('')
        setLoadingStep('')
        router.navigate({
          to: '/lagoonedge',
          search: { siteId: result.siteId }
        })
      } catch (err: any) {
        setLoadingStep('')
        setErrorMsg(err.message || 'Generování selhalo. Zkontrolujte URL a zkuste to znovu.')
      }
    })
  }

  // Handle local text inputs
  const handleFieldChange = (key: string, value: string | null) => {
    if (editFields) {
      setEditFields({
        ...editFields,
        [key]: value
      })
    }
  }

  // Save edited Ad values
  const handleSaveAd = async (adId: string) => {
    if (!editFields) return
    setSavingAdId(adId)
    try {
      await saveAdEditFn({
        data: {
          adId,
          ...editFields
        }
      })
      setEditingAdId(null)
      setEditFields(null)
      setSaveSuccessAdId(adId)
      setTimeout(() => setSaveSuccessAdId(null), 3000)
      router.invalidate() // Invalidate router cache to pull fresh DB data
    } catch (err: any) {
      alert(`Chyba při ukládání: ${err.message}`)
    } finally {
      setSavingAdId(null)
    }
  }

  // Regenerate a single Ad concept
  const handleRegenerateAd = async (adId: string) => {
    if (!siteId) return
    if (!confirm('Opravdu chcete tuto reklamu kompletně přepsat novým AI konceptem? Vaše ruční úpravy u této karty budou přepsány.')) return

    setRegeneratingAdId(adId)
    try {
      await regenerateAdFn({
        data: {
          siteId,
          adId
        }
      })
      // Clear edits if regenerating the active one
      if (editingAdId === adId) {
        setEditingAdId(null)
        setEditFields(null)
      }
      router.invalidate()
    } catch (err: any) {
      alert(`Chyba při regeneraci: ${err.message}`)
    } finally {
      setRegeneratingAdId(adId)
      setRegeneratingAdId(null)
    }
  }

  // Initialize edit fields when user clicks Edit
  const startEditing = (ad: any) => {
    setEditingAdId(ad.id)
    setEditFields({
      headline: ad.headline,
      primaryText: ad.primaryText,
      description: ad.description,
      cta: ad.cta,
      imageUrl: ad.imageUrl
    })
  }

  // Parse strings lists (Colors and Candidate Images) safely
  const colors: string[] = selected
    ? selected.brandProfile.colorPalette
    : []
  
  const candidateImages: string[] = selected
    ? selected.brandProfile.candidateImages
    : []

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--sea-ink)] selection:bg-neutral-200 dark:selection:bg-neutral-800 flex flex-col">
      
      {/* 1. HEADER: Logo and links */}
      <header className="border-b border-[var(--line)] bg-[var(--header-bg)] px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Historie kampaní"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 font-extrabold tracking-tight text-base no-underline hover:opacity-85 text-white drop-shadow-sm">
            <Compass className="h-5 w-5" />
            <span>LagoonEdge</span>
          </Link>
        </div>
        <Link to="/test" className="text-xs font-semibold text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)] flex items-center gap-1">
          <span>Testy</span>
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col w-full min-h-0 relative">
        
        {/* SIDEBAR OVERLAY */}
        {isHistoryOpen && (
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsHistoryOpen(false)}
          />
        )}

        {/* SLIDE-OUT SIDEBAR: History of Campaigns */}
        <aside 
          className={`fixed top-0 left-0 h-full w-80 bg-[var(--bg-base)] border-r border-[var(--line)] shadow-2xl z-50 p-5 flex flex-col gap-4 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-y-auto ${
            isHistoryOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)] mt-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--sea-ink)] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[var(--sea-ink-soft)]" />
              <span>Historie kampaní</span>
            </h2>
            <div className="flex items-center gap-2">
              <Link
                to="/lagoonedge"
                search={{ siteId: undefined }}
                onClick={() => setIsHistoryOpen(false)}
                className="text-[10px] font-bold text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)] no-underline px-2 py-1 rounded-md border border-[var(--line)] bg-[var(--surface)] hover:bg-neutral-200"
              >
                + Nová
              </Link>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-1 rounded-md text-neutral-400 hover:text-[var(--sea-ink)] hover:bg-neutral-200/50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {history.length === 0 ? (
              <p className="text-xs text-[var(--sea-ink-soft)] italic p-4 text-center">
                Žádné předchozí kampaně.
              </p>
            ) : (
              history.map((item: any) => {
                const cleanUrl = item.url.replace(/^https?:\/\/(www\.)?/i, '')
                const formattedDate = new Date(item.createdAt).toLocaleDateString('cs-CZ', {
                  day: 'numeric',
                  month: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })
                const isActive = siteId === item.id

                return (
                  <Link
                    key={item.id}
                    to="/lagoonedge"
                    search={{ siteId: item.id }}
                    onClick={() => setIsHistoryOpen(false)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs no-underline transition-all group ${
                      isActive
                        ? 'border-[var(--sea-ink)] bg-[var(--sand)] font-bold text-[var(--sea-ink)] shadow-sm'
                        : 'border-[var(--line)] bg-[var(--surface)]/50 hover:bg-[var(--link-bg-hover)] text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
                    }`}
                  >
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="truncate font-semibold text-[var(--sea-ink)]">
                        {cleanUrl}
                      </span>
                      <span className="text-[10px] text-[var(--sea-ink-soft)] font-normal">
                        {formattedDate}
                      </span>
                    </div>

                    <button
                      onClick={(e) => handleDeleteSite(e, item.id)}
                      title="Odstranit kampaň"
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100/60 dark:hover:bg-red-950/40 text-neutral-400 hover:text-red-600 transition-all shrink-0 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                )
              })
            )}
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 p-6 md:p-12 w-full md:overflow-y-auto md:max-h-[calc(100vh-73px)]">
          <div className="max-w-5xl mx-auto w-full">
        
        {/* A. SCENE 1: URL input page (If no site is currently selected/viewed) */}
        {!selected ? (
          <div className="min-h-[70vh] flex flex-col justify-center max-w-lg mx-auto py-12">
            <div className="text-center mb-12">
              <div className="text-6xl md:text-7xl font-black tracking-tighter mb-3 text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.4)] pb-1">
                LagoonEdge
              </div>
              <h1 className="display-title text-xl md:text-2xl font-bold tracking-tight text-[var(--sea-ink-soft)] mb-6">
                Brand & Ad Generator
              </h1>
              <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed">
                Zadejte libovolné URL firmy. Puppeteer web zanalyzuje a Google Gemini extrahuje tón značky a vygeneruje 3 hotové reklamy.
              </p>
            </div>

            <form onSubmit={handleGenerate} className="island-shell p-8 rounded-[2rem] flex flex-col gap-6 shadow-md">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[var(--sea-ink-soft)] uppercase tracking-wider">URL adresa firmy</label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    disabled={isPending}
                    required
                    className="demo-input p-3 text-sm rounded-xl"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-100/30 p-3 rounded-lg border border-red-500/20">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="demo-button w-full rounded-xl py-3.5 flex justify-center items-center gap-2"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Skenování a analýza...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 fill-white dark:fill-black" />
                    <span>Generovat reklamní kampaň</span>
                  </>
                )}
              </button>
            </form>

            {/* Simulated pipeline logging step info */}
            {isPending && loadingStep && (
              <div className="mt-8 p-4 rounded-xl border border-[var(--line)] bg-[var(--foam)] text-xs text-center rise-in flex flex-col gap-2 items-center">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--sea-ink-soft)]" />
                <span className="font-semibold text-[var(--sea-ink-soft)]">{loadingStep}</span>
                <span className="text-[10px] text-neutral-400">Tento proces trvá přibližně 10-15 sekund kvůli spouštění prohlížeče Chrome na serveru.</span>
              </div>
            )}
          </div>
        ) : (
          
          /* B. SCENE 2: Detailed Results View (Brand profile & Editable Ads) */
          <div className="rise-in flex flex-col gap-10">
            
            {/* Header section with Stats Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[var(--line)]">
              <div>
                <span className="text-[10px] font-bold text-[var(--sea-ink-soft)] uppercase tracking-wider">Analyzovaná stránka</span>
                <h1 className="text-xl font-black text-[var(--sea-ink)] flex items-center gap-2 truncate mt-1">
                  <Globe className="h-4.5 w-4.5 shrink-0" />
                  <span>{selected.site.url}</span>
                </h1>
              </div>

              <div className="flex items-center flex-wrap gap-3">
                {/* Cost/Latency badge */}
                <div className="rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-4 py-2 text-xs font-semibold flex items-center gap-4">
                  <span>⏱️ <strong>{(selected.site.latencyMs / 1000).toFixed(1)}s</strong> latence</span>
                </div>
                
                <Link
                  to="/lagoonedge"
                  search={{ siteId: undefined }}
                  className="demo-button demo-button-secondary text-xs rounded-full px-4 py-2 no-underline"
                >
                  Nové skenování
                </Link>
              </div>
            </div>

            {/* 1. BRAND PROFILE DISPLAY PANEL */}
            <section className="demo-panel relative overflow-hidden">
              <h2 className="text-base font-extrabold text-[var(--sea-ink)] mb-6 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Extrahovaný profil značky</span>
              </h2>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-5">
                  <div>
                    <span className="text-xs uppercase font-extrabold text-[var(--sea-ink)] tracking-widest border-b-2 border-blue-500/30 pb-0.5 mb-1.5 inline-block">Název firmy</span>
                    <p className="font-bold text-sm text-[var(--sea-ink)]">{selected.brandProfile.companyName}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-[var(--sea-ink)] tracking-widest border-b-2 border-blue-500/30 pb-0.5 mb-1.5 inline-block">Stručný popis</span>
                    <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed">{selected.brandProfile.description}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-[var(--sea-ink)] tracking-widest border-b-2 border-blue-500/30 pb-0.5 mb-1.5 inline-block">Cílové publikum</span>
                    <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed">{selected.brandProfile.targetAudience}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <span className="text-xs uppercase font-extrabold text-[var(--sea-ink)] tracking-widest border-b-2 border-blue-500/30 pb-0.5 mb-1.5 inline-block">Hlavní hodnota (Value Prop)</span>
                    <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed">{selected.brandProfile.valueProposition}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold text-[var(--sea-ink)] tracking-widest border-b-2 border-blue-500/30 pb-0.5 mb-1.5 inline-block">Tón komunikace</span>
                    <p className="text-sm text-[var(--sea-ink-soft)] leading-relaxed capitalize">{selected.brandProfile.toneOfVoice}</p>
                  </div>
                  
                  {/* Colors color palette */}
                  <div>
                    <span className="text-xs uppercase font-extrabold text-[var(--sea-ink)] tracking-widest border-b-2 border-blue-500/30 pb-0.5 mb-2.5 inline-block">Barevná paleta</span>
                    <div className="flex items-center gap-2">
                      {colors.length === 0 || colors[0] === 'not found' ? (
                        <span className="text-xs text-[var(--sea-ink-soft)] italic">not found</span>
                      ) : (
                        colors.map((color, idx) => {
                          const cleanColor = color.trim()
                          const isValidColor = /^#([0-9A-F]{3}){1,2}$/i.test(cleanColor) || /^[a-zA-Z]+$/.test(cleanColor)
                          return (
                            <div key={idx} className="flex items-center gap-1.5 border border-[var(--line)] bg-[var(--surface)] px-2 py-1 rounded-lg shadow-sm">
                              <span 
                                className="h-4 w-4 rounded-full border border-neutral-300 shrink-0" 
                                style={{ backgroundColor: isValidColor ? cleanColor : '#ccc' }}
                              />
                              <span className="text-[10px] font-bold font-mono">{cleanColor}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scraped candidate images carousel */}
              <div className="mt-8 pt-6 border-t border-[var(--line)]">
                <span className="text-xs uppercase font-extrabold text-[var(--sea-ink)] tracking-widest border-b-2 border-blue-500/30 pb-0.5 mb-4 inline-block">
                  Nalezené obrázky na webu ({candidateImages.length})
                </span>
                
                {candidateImages.length === 0 ? (
                  <p className="text-xs text-[var(--sea-ink-soft)] italic">Žádné obrázky nebyly detekovány.</p>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                    {candidateImages.map((imgUrl, idx) => (
                      <a 
                        key={idx} 
                        href={imgUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="relative h-20 w-32 shrink-0 border border-[var(--line)] rounded-lg overflow-hidden bg-[var(--bg-base)] transition-all hover:scale-[1.03] group block"
                      >
                        <img src={imgUrl} alt={`Kandidát ${idx}`} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="h-4 w-4 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* 2. ADVERTISEMENTS GRID (Visual editable cards) */}
            <section className="flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-extrabold text-[var(--sea-ink)]">
                  Návrhy reklamních kreativ pro {selected.brandProfile.companyName !== 'not found' ? selected.brandProfile.companyName : selected.site.url.replace(/^https?:\/\/(www\.)?/i, '')}
                </h2>
                <p className="text-sm text-[var(--sea-ink-soft)] mt-1">
                  Tyto reklamy na produktové a domovské stránky <strong>{selected.site.url.replace(/^https?:\/\/(www\.)?/i, '')}</strong> můžete přímo upravovat, měnit u nich obrázek, uložit změny, nebo každou nezávisle regenerovat.
                </p>
              </div>

              <div className="grid gap-12 lg:grid-cols-2">
                {selected.ads.map((ad, idx) => {
                  const isAdEditing = editingAdId === ad.id
                  const isAdSaving = savingAdId === ad.id
                  const isAdRegenerating = regeneratingAdId === ad.id
                  const isAdSaveSuccess = saveSuccessAdId === ad.id

                  // Find chosen image index
                  const activeImgUrl = isAdEditing ? editFields?.imageUrl : ad.imageUrl

                  return (
                    <div 
                      key={ad.id} 
                      className={`demo-card flex flex-col rounded-2xl relative overflow-hidden transition-all ${
                        isAdEditing ? 'ring-2 ring-[var(--sea-ink)]' : ''
                      }`}
                    >
                      {/* Regeneration Overlay Spinner */}
                      {isAdRegenerating && (
                        <div className="absolute inset-0 bg-[var(--surface-strong)] z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-[1px]">
                          <Loader2 className="h-8 w-8 animate-spin text-[var(--sea-ink)]" />
                          <span className="text-xs font-bold">Generování nového konceptu...</span>
                        </div>
                      )}

                      {/* Title block with number */}
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sea-ink-soft)] bg-[var(--sand)] px-2.5 py-1 rounded-full">
                          Reklama #{idx + 1}
                        </span>
                        
                        <div className="flex items-center gap-1.5">
                          {isAdSaveSuccess && (
                            <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-1 bg-emerald-100/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <Check className="h-3 w-3" />
                              <span>Uloženo</span>
                            </span>
                          )}
                          <button
                            onClick={() => handleRegenerateAd(ad.id)}
                            title="Regenerovat AI"
                            disabled={isAdRegenerating || isAdSaving}
                            className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-neutral-200 text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Mockup Ad Preview Graphic */}
                      <div className="border border-[var(--line)] rounded-2xl overflow-hidden bg-white dark:bg-[#18191A] mb-4 text-left shadow-sm flex flex-col">
                        
                        {/* Header: Avatar + Domain text */}
                        <div className="flex items-center gap-2 p-3 pb-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center shrink-0 shadow-sm text-white font-bold text-xs">
                            {selected.site.url.replace(/^https?:\/\/(www\.)?/i, '').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer">
                              {selected.brandProfile.companyName !== 'not found' ? selected.brandProfile.companyName : selected.site.url.replace(/^https?:\/\/(www\.)?/i, '')}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-medium">Sponzorováno • {selected.site.url.replace(/^https?:\/\/(www\.)?/i, '')}</span>
                          </div>
                        </div>

                        {/* Primary text */}
                        <div className="px-3 pb-3">
                        {isAdEditing ? (
                          <textarea
                            value={editFields?.primaryText || ''}
                            onChange={(e) => handleFieldChange('primaryText', e.target.value)}
                            className="w-full text-[13px] text-neutral-800 dark:text-neutral-200 leading-snug bg-blue-50/40 dark:bg-blue-900/10 focus:bg-white dark:focus:bg-[#18191A] border border-blue-300 dark:border-blue-700 focus:border-[var(--sea-ink)] rounded-lg p-2.5 resize-none transition-all outline-none shadow-inner"
                            rows={3}
                            placeholder="Hlavní text reklamy..."
                          />
                        ) : (
                          <p className="text-[13px] text-neutral-800 dark:text-neutral-200 leading-snug">
                            {ad.primaryText}
                          </p>
                        )}
                        </div>

                        {/* Image Preview Box */}
                        <div className="relative aspect-video bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden group">
                          {activeImgUrl ? (
                            <img src={activeImgUrl} alt="Ad creative" className="h-full w-full object-cover" />
                          ) : (
                            <div className="text-[10px] text-neutral-400 italic">not found (Bez obrázku)</div>
                          )}
                          
                          {/* Image selector dropdown floating when editing */}
                          {isAdEditing && candidateImages.length > 0 && (
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-white text-[10px] font-bold uppercase tracking-wider mb-2">Změnit obrázek</span>
                              <select
                                value={editFields?.imageUrl || ''}
                                onChange={(e) => handleFieldChange('imageUrl', e.target.value || null)}
                                className="bg-white text-neutral-900 text-xs font-bold p-2 px-3 rounded-lg shadow-xl border-none outline-none w-[80%] max-w-[200px] cursor-pointer"
                              >
                                <option value="">Bez obrázku</option>
                                {candidateImages.map((imgUrl, i) => (
                                  <option key={i} value={imgUrl}>
                                    Obrázek #{i + 1}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {/* Bottom Headline & Call To Action block */}
                        <div className="bg-neutral-50 dark:bg-[#242526] p-3 flex justify-between items-center gap-3 border-t border-[var(--line)]">
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            {isAdEditing ? (
                              <div className="flex flex-col gap-1.5">
                                <input
                                  type="text"
                                  value={editFields?.headline || ''}
                                  onChange={(e) => handleFieldChange('headline', e.target.value)}
                                  className="font-bold text-[13px] text-neutral-900 dark:text-neutral-100 leading-tight bg-blue-50/40 dark:bg-blue-900/10 focus:bg-white dark:focus:bg-[#18191A] border border-blue-300 dark:border-blue-700 focus:border-[var(--sea-ink)] rounded-md px-2 py-1 outline-none w-full shadow-inner transition-colors"
                                  placeholder="Titulek"
                                />
                                <input
                                  type="text"
                                  value={editFields?.description || ''}
                                  onChange={(e) => handleFieldChange('description', e.target.value)}
                                  className="text-[11px] text-neutral-600 dark:text-neutral-400 bg-blue-50/40 dark:bg-blue-900/10 focus:bg-white dark:focus:bg-[#18191A] border border-blue-300 dark:border-blue-700 focus:border-[var(--sea-ink)] rounded-md px-2 py-1 outline-none w-full shadow-inner transition-colors"
                                  placeholder="Popis (Tagline)"
                                />
                              </div>
                            ) : (
                              <>
                                <h4 className="font-bold text-[13px] text-neutral-900 dark:text-neutral-100 leading-tight truncate">
                                  {ad.headline}
                                </h4>
                                <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                                  {ad.description}
                                </p>
                              </>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isAdEditing ? (
                              <input
                                type="text"
                                value={editFields?.cta || ''}
                                onChange={(e) => handleFieldChange('cta', e.target.value)}
                                className="bg-blue-50/40 dark:bg-blue-900/10 focus:bg-white dark:focus:bg-[#18191A] border border-blue-300 dark:border-blue-700 focus:border-[var(--sea-ink)] rounded-lg px-2 py-1.5 text-center text-[11px] font-bold text-neutral-900 dark:text-neutral-100 w-24 outline-none shadow-inner transition-colors"
                                placeholder="Tlačítko"
                              />
                            ) : (
                              <div className="bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors text-[11px] font-bold text-neutral-900 dark:text-neutral-100 px-4 py-2 rounded-lg select-none cursor-pointer">
                                {ad.cta}
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Creative idea breakdown (Only visible when not editing) */}
                      {!isAdEditing && (
                        <div className="mt-1 mb-2 text-[11px] text-[var(--sea-ink-soft)] bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-3 rounded-xl text-left flex gap-2">
                          <Zap className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                          <span className="leading-relaxed"><strong>Kreativa:</strong> {ad.creativeIdea}</span>
                        </div>
                      )}

                      {/* Card Action Buttons (Edit, Save, Cancel) */}
                      <div className="mt-auto pt-3 flex gap-2 w-full">
                        {isAdEditing ? (
                          <>
                            <button
                              onClick={() => handleSaveAd(ad.id)}
                              disabled={isAdSaving}
                              className="demo-button text-xs rounded-xl py-2.5 flex-1 flex justify-center items-center gap-1.5"
                            >
                              {isAdSaving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              <span>Uložit</span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingAdId(null)
                                setEditFields(null)
                              }}
                              disabled={isAdSaving}
                              className="demo-button demo-button-secondary text-xs rounded-xl py-2.5 flex-1"
                            >
                              Zrušit
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEditing(ad)}
                            disabled={isAdRegenerating}
                            className="demo-button demo-button-secondary text-xs rounded-xl py-2.5 w-full flex justify-center items-center gap-1.5 border border-[var(--line)] bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                            <span>Upravit reklamu</span>
                          </button>
                        )}
                      </div>

                    </div>
                  )
                })}
              </div>
            </section>

          </div>
        )}

          </div>
        </main>

      </div>

    </div>
  )
}
