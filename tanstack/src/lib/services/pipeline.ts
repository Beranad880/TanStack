import { scrapeWebsite } from './scraper'
import { extractBrandProfile, generateAds } from './ai'
import type { BrandProfileInput, AdOutput } from './ai'

export interface PipelineResult {
  url: string;
  brandProfile: BrandProfileInput;
  ads: AdOutput[];
  latencyMs: number;
  costUsd: number;
}

/**
 * Orchestrator that executes the full pipeline:
 * Scrape website -> Extract brand profile -> Generate ads
 */
export async function runAdGenerationPipeline(
  url: string,
  env: { MYBROWSER: any; GEMINI_API_KEY?: string }
): Promise<PipelineResult> {
  const startTime = performance.now();

  // Step 1: Scrape website using Puppeteer
  const { text: cleanText, candidateImages, error: scrapeError } = await scrapeWebsite(url, env);

  if (scrapeError && cleanText === 'not found') {
    throw new Error(`Nepodařilo se stáhnout obsah zadaného webu. Zkontrolujte URL nebo zda web neblokuje roboty. Podrobnosti: ${scrapeError}`);
  }

  // Step 2: Extract brand profile using Google Gemini
  const brandProfile = await extractBrandProfile(cleanText, candidateImages, env);

  if (
    brandProfile.companyName.toLowerCase().includes('not found') || 
    brandProfile.description.toLowerCase().includes('not found')
  ) {
    throw new Error('Nepodařilo se z webu extrahovat potřebná data pro vytvoření reklamy (not found). Pravděpodobně vypadlo spojení s modelem Gemini. Generování bylo zrušeno.');
  }

  // Step 3: Generate 3 ads using Google Gemini
  const generatedAds = await generateAds(brandProfile, candidateImages, env, 3);

  // Zrušit, pokud jakákoliv z vygenerovaných reklam obsahuje "not found"
  for (const ad of generatedAds) {
    const adText = JSON.stringify(ad).toLowerCase();
    if (adText.includes('not found') || adText.includes('notfound')) {
      throw new Error('AI vygenerovalo neplatný obsah reklam (obsahuje not found). Pravděpodobně vypadlo spojení s modelem Gemini. Generování bylo zrušeno.');
    }
  }

  const endTime = performance.now();
  const latencyMs = Math.round(endTime - startTime);

  // Since we are running Google Gemini, the cost is extremely minimal
  // (under $0.001 USD for typical site analysis & generation), so we round it to $0.00.
  const costUsd = 0.00;

  return {
    url,
    brandProfile,
    ads: generatedAds,
    latencyMs,
    costUsd
  };
}
