/**
 * Cleans the model response by extracting only the valid JSON substring.
 * Extremely robust for smaller models that include conversational preamble/postamble.
 */
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();

  // Find first { and last } for JSON objects
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Find first [ and last ] for JSON arrays
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return cleaned.substring(firstBracket, lastBracket + 1);
  }

  // Fallback to basic markdown cleanup
  cleaned = cleaned.replace(/^```json\s*/i, '');
  cleaned = cleaned.replace(/^```\s*/i, '');
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
}

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
 * Extracts a brand profile from a website's cleaned text content.
 */
export async function extractBrandProfile(
  cleanedText: string,
  candidateImages: string[],
  aiBinding: any
): Promise<BrandProfileInput> {
  const systemPrompt = `You are an expert brand analyst. You analyze clean text content of a website and extract a structured brand profile.
You MUST output ONLY a valid JSON object conforming exactly to this schema:
{
  "companyName": "Name of company or 'not found'",
  "description": "Short 1-2 sentence description of what the company does or 'not found'",
  "targetAudience": "Description of the target customer/audience or 'not found'",
  "valueProposition": "The main value proposition/benefits or 'not found'",
  "toneOfVoice": "1-3 descriptive adjectives for the tone of voice or 'not found'",
  "colorPalette": ["List of 2-4 primary brand colors, e.g., hex codes, colors, or 'not found'"]
}

Rule 1: Respond ONLY with the raw JSON object. Do not wrap in markdown or add explanations.
Rule 2: Do not invent or hallucinate any facts. If you cannot find the answer, use 'not found'.
Rule 3: Ensure all JSON keys and string values are wrapped in double quotes.
Rule 4: NEVER use double quotes inside your string values (e.g. use 'iPhone' instead of "iPhone").
Rule 5: NEVER write raw newlines inside JSON string values. Keep all text on a single line.`;

  const userPrompt = `Website Clean Text Content:
${cleanedText}`;

  let rawResponse = '';
  try {
    const stream = await aiBinding.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      max_tokens: 1500
    });

    rawResponse = stream.response || '';
    const jsonText = cleanJsonResponse(rawResponse);
    const parsed = JSON.parse(jsonText);

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
    console.error('extractBrandProfile failed:', error.message, 'Raw response was:', rawResponse);
    // Fallback brand profile in case of model error or JSON parse error
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
  aiBinding: any,
  count: number = 3
): Promise<AdOutput[]> {
  const systemPrompt = `You are a senior copywriter and creative director. Based on the provided brand profile and candidate images, you generate advertisements.
You MUST output ONLY a valid JSON array of objects conforming exactly to this schema:
[
  {
    "creativeIdea": "Short description of the creative concept behind this ad",
    "primaryText": "The main ad copy text (2-3 sentences max)",
    "headline": "A catchy, bold headline (6-10 words)",
    "description": "A short supporting description or tagline",
    "cta": "Call to action text (e.g., Shop Now, Learn More)",
    "imageUrl": "Choose the most relevant image URL from the Candidate Images list. If the list is empty or none fit, output null."
  }
]

Generate exactly ${count} diverse, high-performing ads.
Rule 1: Respond ONLY with the raw JSON array. Do not wrap in markdown or add explanations.
Rule 2: Select the imageUrl ONLY from the provided Candidate Images list. Do not make up any image URLs. If there are no images, output null.
Rule 3: Ensure all JSON keys and string values are wrapped in double quotes.
Rule 4: NEVER use double quotes inside your string values (e.g. use 'iPhone' instead of "iPhone").
Rule 5: NEVER write raw newlines inside JSON string values. Keep all text on a single line.`;

  const userPrompt = `Brand Profile:
Company Name: ${brandProfile.companyName}
Description: ${brandProfile.description}
Target Audience: ${brandProfile.targetAudience}
Value Proposition: ${brandProfile.valueProposition}
Tone of Voice: ${brandProfile.toneOfVoice}
Colors: ${brandProfile.colorPalette.join(', ')}

Candidate Images (select ONLY from this list):
${candidateImages.length > 0 ? candidateImages.join('\n') : 'No images available'}`;

  let rawResponse = '';
  try {
    const stream = await aiBinding.run('@cf/meta/llama-3.2-3b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false,
      max_tokens: 1800
    });

    rawResponse = stream.response || '';
    const jsonText = cleanJsonResponse(rawResponse);
    const parsed = JSON.parse(jsonText);

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
    console.error('generateAds failed:', error.message, 'Raw response was:', rawResponse);
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
