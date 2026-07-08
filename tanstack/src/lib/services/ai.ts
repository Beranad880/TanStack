import geminiConfig from '../../../gemini-config.json'

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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (HTTP ${response.status}): ${errorText}`);
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

    return {
      companyName: parsed.companyName || 'not found',
      description: parsed.description || 'not found',
      targetAudience: parsed.targetAudience || 'not found',
      valueProposition: parsed.valueProposition || 'not found',
      toneOfVoice: parsed.toneOfVoice || 'not found',
      colorPalette: Array.isArray(parsed.colorPalette) ? parsed.colorPalette : ['not found'],
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
Select the imageUrl ONLY from the provided Candidate Images list. Do not make up any image URLs. If there are no images or none fit, output null.

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

    if (Array.isArray(parsed)) {
      return parsed.map(ad => ({
        creativeIdea: ad.creativeIdea || 'Ad concept',
        primaryText: ad.primaryText || 'Experience our services today.',
        headline: ad.headline || 'Welcome to ' + brandProfile.companyName,
        description: ad.description || 'Learn more on our website.',
        cta: ad.cta || 'Learn More',
        imageUrl: ad.imageUrl || (candidateImages.length > 0 ? candidateImages[0] : null)
      }));
    }
    throw new Error('Response is not a JSON array');
  } catch (error: any) {
    console.error('generateAds failed:', error.message);
    // Fallback ad in case of failure
    return [{
      creativeIdea: 'Fallback concept',
      primaryText: `Discover more about ${brandProfile.companyName}.`,
      headline: `Visit ${brandProfile.companyName}`,
      description: brandProfile.description !== 'not found' ? brandProfile.description : 'Welcome to our platform.',
      cta: 'Learn More',
      imageUrl: candidateImages.length > 0 ? candidateImages[0] : null
    }];
  }
}
