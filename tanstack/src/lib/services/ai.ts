import groqConfig from '../../../groq-config.json'
import { z } from 'zod';

const brandProfileZod = z.object({
  companyName: z.string().optional().default('not found'),
  description: z.string().optional().default('not found'),
  targetAudience: z.string().optional().default('not found'),
  valueProposition: z.string().optional().default('not found'),
  toneOfVoice: z.string().optional().default('not found'),
  colorPalette: z.array(z.string()).optional().default(['not found'])
});

const adZod = z.object({
  creativeIdea: z.string().optional().default('Ad concept'),
  primaryText: z.string().optional().default('Experience our services today.'),
  headline: z.string().optional().default('Welcome'),
  description: z.string().optional().default('Learn more on our website.'),
  cta: z.string().optional().default('Learn More'),
  imageUrl: z.string().nullable().optional().default(null)
});

const adsArrayZod = z.array(adZod);

export interface BrandProfileInput {
  companyName: string;
  description: string;
  targetAudience: string;
  valueProposition: string;
  toneOfVoice: string;
  colorPalette: string[];
  candidateImages: string[];
}

export interface AdOutput {
  creativeIdea: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  imageUrl: string | null;
}

/**
 * Cleans the model response by extracting only the valid JSON substring.
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/, '');
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  // Zjistíme, jestli struktura začíná jako objekt nebo jako pole
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      return cleaned.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      return cleaned.substring(firstBracket, lastBracket + 1);
    }
  }

  return cleaned;
}

/**
 * Helper to call Groq API via fetch with optional JSON mode
 */
async function callGroq(
  prompt: string,
  systemInstruction: string | undefined,
  apiKey: string,
  jsonMode: boolean = true
): Promise<any> {
  const modelName = groqConfig.model || 'openai/gpt-oss-120b';
  const url = 'https://api.groq.com/openai/v1/chat/completions';

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const body: any = {
    model: modelName,
    messages,
    temperature: groqConfig.temperature ?? 0.7,
    top_p: groqConfig.top_p ?? 0.95
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      break;
    }

    const errorText = await response.text();
    if ((response.status === 503 || response.status === 429) && attempt < 3) {
      console.warn(`Groq API ${response.status}, retrying in ${attempt * 2}s...`);
      await new Promise(r => setTimeout(r, attempt * 2000));
      continue;
    }

    throw new Error(`Groq API error (HTTP ${response.status}): ${errorText}`);
  }

  if (!response) {
    throw new Error('Groq API fetch failed');
  }

  const result: any = await response.json();
  const text = result.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Groq API returned empty content');
  }

  if (jsonMode) {
    const cleaned = cleanJsonResponse(text);
    return JSON.parse(cleaned);
  }

  return text;
}

/**
 * Extracts a brand profile from a website's cleaned text content.
 */
export async function extractBrandProfile(
  cleanedText: string,
  candidateImages: string[],
  env: { GROQ_API_KEY?: string; GEMINI_API_KEY?: string }
): Promise<BrandProfileInput> {
  const rawKey = env.GROQ_API_KEY || env.GEMINI_API_KEY;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
  if (!apiKey) {
    throw new Error('GROQ_API_KEY není v konfiguraci Workers nastaven. Přidejte jej prosím do Cloudflare Settings -> Variables (nebo souboru .dev.vars).');
  }

  const prompt = `Jsi expert na analýzu značek a firemní identity. Analyzuj text z webu a extrahuj strukturovaný profil značky.
Nevymýšlej si fakta. Pokud informaci nelze dohledat, uveď 'not found'.

STRIKTNÍ JAZYKOVÉ PRAVIDLO:
Všechny textové hodnoty v JSONu (description, targetAudience, valueProposition, toneOfVoice) MUSÍŠ napsat VÝHRADNĚ V ČEŠTINĚ.

Odpověz striktně validním JSON objektem v tomto formátu:
{
  "companyName": "Název firmy nebo 'not found'",
  "description": "Stručný popis činnosti firmy (1-2 věty) v češtině nebo 'not found'",
  "targetAudience": "Popis cílové skupiny zákazníků v češtině nebo 'not found'",
  "valueProposition": "Hlavní hodnota a přínos pro zákazníky v češtině nebo 'not found'",
  "toneOfVoice": "1-3 přídavná jména vystihující tón komunikace v češtině nebo 'not found'",
  "colorPalette": ["#000000", "#FFFFFF"] // Seznam 3-6 primárních brandových barev v hex kódu
}

Obsah webu:
${cleanedText}`;

  try {
    const parsed = await callGroq(
      prompt, 
      groqConfig.systemInstruction || 'Jsi expert na analýzu značek. Vracej výhradně validní JSON.', 
      apiKey, 
      true
    );

    // Vynutíme validaci Zodem (automaticky doplní defaulty při případné absenci polí)
    const validated = brandProfileZod.parse(parsed);

    return {
      ...validated,
      candidateImages: candidateImages
    };
  } catch (error: any) {
    console.error('extractBrandProfile failed:', error.message);
    // Fallback brand profile in case of API failure
    return {
      companyName: 'not found (AI extraction error)',
      description: 'not found (AI extraction error)',
      targetAudience: 'not found',
      valueProposition: 'not found',
      toneOfVoice: 'not found',
      colorPalette: ['#000000', '#FFFFFF'],
      candidateImages: candidateImages
    };
  }
}

/**
 * Generates ads based on a brand profile and selected candidate images.
 */
export async function generateAds(
  brandProfile: Omit<BrandProfileInput, 'candidateImages'>,
  candidateImages: string[],
  env: { GROQ_API_KEY?: string; GEMINI_API_KEY?: string },
  count: number = 3
): Promise<AdOutput[]> {
  const rawKey = env.GROQ_API_KEY || env.GEMINI_API_KEY;
  const apiKey = typeof rawKey === 'string' ? rawKey.trim().replace(/^["']|["']$/g, '') : '';
  if (!apiKey) {
    throw new Error('GROQ_API_KEY není v konfiguraci Workers nastaven. Přidejte jej prosím do Cloudflare Settings -> Variables (nebo souboru .dev.vars).');
  }

  const prompt = `Jsi zkušený český marketingový copywriter a kreativní ředitel. Na základě profilu značky a kandidátských obrázků vygeneruj reklamy.
Vyhodnoť hloubku a kvalitu profilu značky a vygeneruj mezi 1 a ${count} rozmanitých reklamních variant.

STRIKTNÍ JAZYKOVÉ PRAVIDLO:
VŠECHEN vygenerovaný obsah a texty reklam (creativeIdea, primaryText, headline, description, cta) MUSÍ BÝT VYGENEROVÁNY VÝHRADNĚ V ČEŠTINĚ. Žádné anglické texty!

KRITICKÁ PRAVIDLA PRO REKLAMY:
1. Každá jednotlivá reklama MUSÍ mít ZCELA UNIKÁTNÍ hlavní text (primaryText), titulek (headline) a popisek (description). Neopakuj stejná slova ani fráze. Vše v přirozené a poutavé češtině.
2. Každá reklama MUSÍ použít JINÝ imageUrl ze seznamu kandidátů. Nepoužívej stejný obrázek dvakrát.
3. Pokud není dostatek obrázků, můžeš použít null, ale snaž se vybrat nejlepší kandidáty.
4. Text reklamy musí úzce souviset s vybraným obrázkem (imageUrl).

Odpověz striktně validním JSON objektem v tomto formátu:
{
  "ads": [
    {
      "creativeIdea": "Stručný popis kreativního konceptu za touto reklamou v češtině",
      "primaryText": "Hlavní text reklamy (max 2-3 věty) v češtině",
      "headline": "Úderný, chytlavý titulek (6-10 slov) v češtině",
      "description": "Doprovodný popisek nebo slogan v češtině",
      "cta": "Text výzvy k akci v češtině, např. Zjistit více, Vyzkoušet hned, Objednat",
      "imageUrl": "Vyber nejvhodnější URL obrázku ze seznamu kandidátů. Pokud žádný nepasuje, null"
    }
  ]
}

Profil značky:
Název firmy: ${brandProfile.companyName}
Popis: ${brandProfile.description}
Cílová skupina: ${brandProfile.targetAudience}
Hlavní přínos: ${brandProfile.valueProposition}
Tón komunikace: ${brandProfile.toneOfVoice}
Barvy: ${brandProfile.colorPalette.join(', ')}

Kandidátské obrázky (vybírej POUZE z tohoto seznamu):
${candidateImages.length > 0 ? candidateImages.join('\n') : 'Žádné obrázky nejsou k dispozici'}`;

  try {
    const parsed = await callGroq(prompt, groqConfig.systemInstruction, apiKey, true);

    // Groq vrátí buď { ads: [...] } nebo přímo pole
    const rawList = Array.isArray(parsed) ? parsed : (parsed.ads || Object.values(parsed)[0] || []);

    // Zod validace pole reklam
    const validatedAds = adsArrayZod.parse(rawList);

    return validatedAds.map(ad => ({
      ...ad,
      // Fallback pro chybějící obrázek
      imageUrl: ad.imageUrl || (candidateImages.length > 0 ? candidateImages[0] : null)
    }));
  } catch (error: any) {
    console.error('generateAds failed:', error.message);
    const fallbacks = [];
    
    // Různé varianty textů pro fallback
    const headlines = [
      `Objevte ${brandProfile.companyName !== 'not found' ? brandProfile.companyName : 'náš web'}`,
      `Proč si vybrat ${brandProfile.companyName !== 'not found' ? brandProfile.companyName : 'nás'}?`,
      `To nejlepší z ${brandProfile.companyName !== 'not found' ? brandProfile.companyName : 'naší nabídky'}`
    ];
    
    const primaryTexts = [
      `Zjistěte více o ${brandProfile.companyName !== 'not found' ? brandProfile.companyName : 'naší nabídce'}. ${brandProfile.valueProposition !== 'not found' ? brandProfile.valueProposition : 'Špičkové produkty a služby pro vás.'}`,
      `Jsme tu pro vás. ${brandProfile.description !== 'not found' ? brandProfile.description.substring(0, 80) + '...' : 'Připojte se k tisícům spokojených zákazníků.'} Podívejte se na náš web.`,
      `Hledáte kvalitu a spolehlivost? ${brandProfile.companyName !== 'not found' ? brandProfile.companyName : 'My'} vám přinášíme přesně to, co potřebujete.`
    ];

    for (let i = 0; i < count; i++) {
      fallbacks.push({
        creativeIdea: `Základní produktový koncept zaměřený na hlavní hodnoty značky.`,
        primaryText: primaryTexts[i % primaryTexts.length],
        headline: headlines[i % headlines.length],
        description: brandProfile.description !== 'not found' ? brandProfile.description.substring(0, 50) + '...' : 'Zjistěte více informací.',
        cta: i % 2 === 0 ? 'Zjistit více' : 'Více informací',
        imageUrl: candidateImages.length > i ? candidateImages[i] : (candidateImages.length > 0 ? candidateImages[0] : null)
      });
    }
    return fallbacks;
  }
}
