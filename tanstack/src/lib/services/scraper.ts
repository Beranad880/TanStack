import puppeteer from '@cloudflare/puppeteer'
import * as cheerio from 'cheerio'

/**
 * Clean HTML content to leave only readable text by removing styles, scripts, SVGs, etc.
 */
function cleanHtmlText(html: string): string {
  // Extract hex colors from the raw HTML before stripping tags
  const hexColors = html.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || [];
  const uniqueColors = Array.from(new Set(hexColors)).slice(0, 40);

  // Parse with Cheerio to extract structured metadata first
  const $ = cheerio.load(html);
  const metaTitle = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
  
  // Extract h1 and h2 for priority context
  const h1s = $('h1').map((_, el) => $(el).text().trim()).get().join(' | ');
  const h2s = $('h2').map((_, el) => $(el).text().trim()).get().join(' | ');

  let metadataContext = `[META TITLE]: ${metaTitle}\n`;
  if (metaDesc) metadataContext += `[META DESCRIPTION]: ${metaDesc}\n`;
  if (metaKeywords) metadataContext += `[META KEYWORDS]: ${metaKeywords}\n`;
  if (h1s) metadataContext += `[MAIN HEADINGS (H1)]: ${h1s}\n`;
  if (h2s) metadataContext += `[SUB HEADINGS (H2)]: ${h2s}\n`;

  // Replace script and style tags and their contents
  let clean = html.replace(/<(script|style|svg|iframe|canvas|noscript)[^>]*>([\s\S]*?)<\/\1>/gi, '');
  
  // Replace block elements with line breaks before stripping so text doesn't mash together
  clean = clean.replace(/<\/?(div|p|h[1-6]|li|br|tr|section|article|main)[^>]*>/gi, '\n');
  
  // Strip all remaining HTML tags, leaving only text
  clean = clean.replace(/<[^>]+>/g, ' ');
  // Collapse whitespace (preserve newlines but collapse horizontal space)
  clean = clean.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  
  // Limit length to avoid blowing up context window (approx 6000 words max)
  const truncated = clean.substring(0, 24000);

  let result = metadataContext + `\n[PAGE TEXT CONTENT]:\n` + truncated;
  if (uniqueColors.length > 0) {
    result += `\n\n[System Note - Possible brand colors found in HTML/CSS source code: ${uniqueColors.join(', ')}]`;
  }
  return result;
}

/**
 * Scrapes a website using Cloudflare Browser Rendering (Puppeteer).
 * Falls back to direct fetch if Puppeteer fails.
 */
export async function scrapeWebsite(
  url: string,
  env: { MYBROWSER: any }
): Promise<{ text: string; candidateImages: string[]; error?: string }> {
  let browser: any = null;
  const candidateImagesSet = new Set<string>();

  try {
    if (!env.MYBROWSER) {
      throw new Error('MYBROWSER binding is not available');
    }

    // Launch browser
    browser = await puppeteer.launch(env.MYBROWSER);
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Go to URL with 15s timeout
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

    // Scroll down to trigger lazy loading images
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 4000) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    // Wait 1s for any dynamically rendered content to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get page content
    const html = await page.content();
    const cleanedText = cleanHtmlText(html);

    // Extract images using page.evaluate
    const imagesInfo = await page.evaluate(() => {
      const imgs: string[] = [];
      
      const isValidImage = (src: string | null) => {
        if (!src || src.startsWith('data:')) return false;
        const srcLower = src.toLowerCase();
        
        // Filter out videos
        if (/\.(mp4|webm|avi|mov|mkv|flv|wmv|gifv|m4v)(\?.*)?$/.test(srcLower)) return false;
        if (srcLower.includes('youtube.com') || srcLower.includes('vimeo.com') || srcLower.includes('ytimg.com')) return false;
        
        const negatives = ['logo', 'icon', 'avatar', 'pixel', 'spinner', 'loader', 'spacer', 'button', 'transparent', 'placeholder', '.svg'];
        return !negatives.some(word => srcLower.includes(word));
      };
      
      // 1. Check open graph image
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && ogImg.getAttribute('content')) {
        const content = ogImg.getAttribute('content');
        if (isValidImage(content)) {
          try { imgs.push(new URL(content!, window.location.href).href); } catch (_) {}
        }
      }

      // 2. Query normal images and filter by size / name
      const allImgs = Array.from(document.querySelectorAll('img'));
      for (const img of allImgs) {
        const src = img.currentSrc || img.src; // currentSrc gets the right size from srcset/picture
        if (!isValidImage(src)) continue;

        // Filter out small images (thumbnails, icons) - ad images should be larger
        const width = img.naturalWidth || img.clientWidth || 0;
        const height = img.naturalHeight || img.clientHeight || 0;
        if ((width > 0 && width < 250) || (height > 0 && height < 250)) continue;

        try { imgs.push(new URL(src, window.location.href).href); } catch (_) {}
      }
      
      // 3. Search for background images in large elements (hero sections, etc.)
      const elementsWithBg = Array.from(document.querySelectorAll('div, section, header, figure, span'));
      for (const el of elementsWithBg) {
        const style = window.getComputedStyle(el);
        const bgImg = style.backgroundImage;
        if (bgImg && bgImg !== 'none' && bgImg.startsWith('url(')) {
          // Check element size to ensure it's a large banner
          const width = el.clientWidth || 0;
          const height = el.clientHeight || 0;
          if (width > 300 && height > 200) {
            const match = bgImg.match(/^url\(["']?([^"']+)["']?\)$/i);
            if (match && match[1]) {
               const src = match[1];
               if (isValidImage(src)) {
                  try { imgs.push(new URL(src, window.location.href).href); } catch (_) {}
               }
            }
          }
        }
      }

      return imgs;
    });

    for (const img of imagesInfo) {
      candidateImagesSet.add(img);
    }

    await browser.close();

    return {
      text: cleanedText || 'not found',
      candidateImages: Array.from(candidateImagesSet).slice(0, 10) // Limit to top 10 candidates
    };

  } catch (error: any) {
    const puppeteerError = error.message || String(error);
    console.error(`Puppeteer scrape failed: ${puppeteerError}. Falling back to fetch...`);
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const html = await response.text();
      const cleanedText = cleanHtmlText(html);

      // Bezpečnější extrakce přes Cheerio (DOM parser) namísto RegEx
      const $ = cheerio.load(html);
      const fallbackImages: string[] = [];
      
      const isValidImage = (src: string | undefined) => {
        if (!src || src.startsWith('data:')) return false;
        const srcLower = src.toLowerCase();
        
        // Filter out videos
        if (/\.(mp4|webm|avi|mov|mkv|flv|wmv|gifv|m4v)(\?.*)?$/.test(srcLower)) return false;
        if (srcLower.includes('youtube.com') || srcLower.includes('vimeo.com') || srcLower.includes('ytimg.com')) return false;
        
        const negatives = ['logo', 'icon', 'avatar', 'pixel', 'spinner', 'loader', 'spacer', 'button', 'transparent', 'placeholder', '.svg'];
        return !negatives.some(word => srcLower.includes(word));
      };
      
      // Find og:image
      const ogImage = $('meta[property="og:image"], meta[content][property="og:image"]').attr('content');
      if (isValidImage(ogImage)) {
        try { fallbackImages.push(new URL(ogImage!, url).href); } catch (_) {}
      }

      // Find standard images
      $('img').each((_, img) => {
        const src = $(img).attr('src');
        // fallback fallback -> no currentSrc, rely purely on negative words
        if (isValidImage(src)) {
          try { fallbackImages.push(new URL(src!, url).href); } catch (_) {}
        }
      });
      
      // Find inline background images
      $('[style*="background-image"]').each((_, el) => {
        const style = $(el).attr('style');
        if (style) {
          const match = style.match(/background-image\s*:\s*url\(["']?([^"']+)["']?\)/i);
          if (match && match[1] && isValidImage(match[1])) {
             try { fallbackImages.push(new URL(match[1], url).href); } catch (_) {}
          }
        }
      });

      // Filter uniques
      const uniqueFallbacks = Array.from(new Set(fallbackImages));

      return {
        text: cleanedText || 'not found',
        candidateImages: uniqueFallbacks.slice(0, 10)
      };

    } catch (fallbackError: any) {
      const fetchError = fallbackError.message || String(fallbackError);
      console.error(`Fallback fetch failed: ${fetchError}`);
      return {
        text: 'not found',
        candidateImages: [],
        error: `Browser Rendering failed: ${puppeteerError}. Fetch fallback failed: ${fetchError}`
      };
    }
  }
}
