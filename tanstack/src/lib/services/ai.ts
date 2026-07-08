import geminiConfig from '../../../gemini-config.json'
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

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return cleaned.substring(firstBracket, lastBracket + 1);
  }

  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
}

/**
 * Helper to call Google Gemini 1.5 Flash API with JSON Schema
 */
async function callGemini(
  prompt: string,
  schema: any,
  apiKey: string
): Promise<any> {
  const modelName = geminiConfig.model || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  
  const body: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      ...geminiConfig.generationConfig
    }
  };

  if (geminiConfig.systemInstruction) {
    body.systemInstruction = {
      parts: [
        {
          text: geminiConfig.systemInstruction
        }
      ]
    };
  }

  let response;
  for (let attempt = 1; attempt <= 3; attempt++) {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      break;
    }

    const errorText = await response.text();
    if ((response.status === 503 || response.status === 429) && attempt < 3) {
      console.warn(`Gemini API ${response.status}, retrying in ${attempt * 2}s...`);
      await new Promise(r => setTimeout(r, attempt * 2000));
      continue;
    }
    
    throw new Error(`Gemini API error (HTTP ${response.status}): ${errorText}`);
  }

  if (!response) {
    throw new Error('Gemini API fetch failed');
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini API returned empty content');
  }

  const cleaned = cleanJsonResponse(text);
  return JSON.parse(cleaned);
}

/**
 * Extracts a brand profile from a website's cleaned text content.
 */
export async function extractBrandProfile(
  cleanedText: string,
  candidateImages: string[],
  env: { GEMINI_API_KEY?: string }
): Promise<BrandProfileInput> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY není v konfiguraci Workers nastaven. Přidejte jej prosím do Cloudflare Settings -> Variables.');
  }

  const prompt = `You are an expert brand analyst. You analyze clean text content of a website and extract a structured brand profile.
Do not invent or hallucinate any facts. If you cannot find the answer, use 'not found'.

Website Clean Text Content:
${cleanedText}`;

  const schema = {
    type: "OBJECT",
    properties: {
      companyName: { type: "STRING", description: "Name of the company or 'not found'" },
      description: { type: "STRING", description: "Short 1-2 sentence description of what the company does or 'not found'" },
      targetAudience: { type: "STRING", description: "Description of the target customer/audience or 'not found'" },
      valueProposition: { type: "STRING", description: "The main value proposition/benefits or 'not found'" },
      toneOfVoice: { type: "STRING", description: "1-3 descriptive adjectives for the tone of voice or 'not found'" },
      colorPalette: {
        type: "ARRAY",
        items: { type: "STRING" },
        description: "List of 2-4 primary brand colors (hex codes, e.g. #000000) or 'not found'"
      }
    },
    required: ["companyName", "description", "targetAudience", "valueProposition", "toneOfVoice", "colorPalette"]
  };

  try {
    const parsed = await callGemini(prompt, schema, apiKey);

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
  env: { GEMINI_API_KEY?: string },
  count: number = 3
): Promise<AdOutput[]> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY není v konfiguraci Workers nastaven. Přidejte jej prosím do Cloudflare Settings -> Variables.');
  }

  const prompt = `You are a senior copywriter and creative director. Based on the provided brand profile and candidate images, you generate advertisements.
Generate exactly ${count} diverse, high-performing ads.

CRITICAL RULES FOR DIVERSITY:
1. Every single ad MUST have a COMPLETELY UNIQUE primary text, headline, and description. DO NOT repeat the same phrases or sentences across the ${count} ads.
2. Every single ad MUST use a DIFFERENT imageUrl. You must select ${count} different images from the Candidate Images list. DO NOT use the same imageUrl twice.
3. If there are not enough images, you can use null, but try your best to use unique images.

Brand Profile:
Company Name: ${brandProfile.companyName}
Description: ${brandProfile.description}
Target Audience: ${brandProfile.targetAudience}
Value Proposition: ${brandProfile.valueProposition}
Tone of Voice: ${brandProfile.toneOfVoice}
Colors: ${brandProfile.colorPalette.join(', ')}

Candidate Images (select ONLY from this list):
${candidateImages.length > 0 ? candidateImages.join('\n') : 'No images available'}`;

  const schema = {
    type: "ARRAY",
    description: `Array of exactly ${count} generated ad variations`,
    items: {
      type: "OBJECT",
      properties: {
        creativeIdea: { type: "STRING", description: "Short description of the creative concept behind this ad" },
        primaryText: { type: "STRING", description: "The main ad copy text (2-3 sentences max)" },
        headline: { type: "STRING", description: "A catchy, bold headline (6-10 words)" },
        description: { type: "STRING", description: "A short supporting description or tagline" },
        cta: { type: "STRING", description: "Call to action text, e.g. Shop Now, Learn More" },
        imageUrl: { type: "STRING", description: "Choose the most relevant image URL from the Candidate Images list. If empty, return null." }
      },
      required: ["creativeIdea", "primaryText", "headline", "description", "cta", "imageUrl"]
    }
  };

  try {
    const parsed = await callGemini(prompt, schema, apiKey);

    // Zod validace pole reklam
    const validatedAds = adsArrayZod.parse(parsed);

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
