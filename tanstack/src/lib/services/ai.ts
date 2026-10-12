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

  const prompt = `You are an expert brand analyst. You analyze clean text content of a website and extract a structured brand profile.
Do not invent or hallucinate any facts. If you cannot find the answer, use 'not found'.
Respond entirely in Czech (čeština).

You MUST respond strictly with a valid JSON object matching this schema:
{
  "companyName": "Name of the company or 'not found'",
  "description": "Short 1-2 sentence description of what the company does or 'not found'",
  "targetAudience": "Description of the target customer/audience or 'not found'",
  "valueProposition": "The main value proposition/benefits or 'not found'",
  "toneOfVoice": "1-3 descriptive adjectives for the tone of voice or 'not found'",
  "colorPalette": ["#000000", "#FFFFFF"] // List of 3-6 distinct primary and secondary brand colors in hex format
}

Website Clean Text Content:
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

  const prompt = `You are a senior copywriter and creative director. Based on the provided brand profile and candidate images, you generate advertisements.
Evaluate the quality and depth of the provided brand profile. Based on how detailed and rich the information is, generate between 1 and ${count} diverse, high-performing ads. If the profile is very basic or lacks detail, generate only 1 or 2 ads. If it is rich, generate up to ${count} ads.
All generated content MUST be in Czech language (čeština).

CRITICAL RULES FOR DIVERSITY AND RELEVANCE:
1. Every single ad MUST have a COMPLETELY UNIQUE primary text, headline, and description. DO NOT repeat the same phrases or sentences. All text must be in Czech.
2. Every single ad MUST use a DIFFERENT imageUrl. You must select different images from the Candidate Images list. DO NOT use the same imageUrl twice.
3. If there are not enough images, you can use null, but try your best to use unique images.
4. The generated ad text (primaryText, headline, description) MUST be highly relevant to the visual content or context of the specific image (imageUrl) you choose for that ad. Align the creative idea and copy with what the selected image likely represents.

You MUST respond strictly with a valid JSON object matching this schema:
{
  "ads": [
    {
      "creativeIdea": "Short description of the creative concept behind this ad",
      "primaryText": "The main ad copy text (2-3 sentences max)",
      "headline": "A catchy, bold headline (6-10 words)",
      "description": "A short supporting description or tagline",
      "cta": "Call to action text, e.g. Zjistit více, Vyzkoušet nyní",
      "imageUrl": "Choose the most relevant image URL from the Candidate Images list. If empty, null"
    }
  ]
}

Brand Profile:
Company Name: ${brandProfile.companyName}
Description: ${brandProfile.description}
Target Audience: ${brandProfile.targetAudience}
Value Proposition: ${brandProfile.valueProposition}
Tone of Voice: ${brandProfile.toneOfVoice}
Colors: ${brandProfile.colorPalette.join(', ')}

Candidate Images (select ONLY from this list):
${candidateImages.length > 0 ? candidateImages.join('\n') : 'No images available'}`;

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
