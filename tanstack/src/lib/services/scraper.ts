import puppeteer from '@cloudflare/puppeteer'

/**
 * Clean HTML content to leave only readable text by removing styles, scripts, SVGs, etc.
 */
function cleanHtmlText(html: string): string {
  // Replace script and style tags and their contents
  let clean = html.replace(/<(script|style|svg|iframe|canvas|noscript)[^>]*>([\s\S]*?)<\/\1>/gi, '');
  // Remove navigation and footer tags to focus on the main content
  clean = clean.replace(/<(nav|footer|header)[^>]*>([\s\S]*?)<\/\1>/gi, '');
  // Replace HTML comments
  clean = clean.replace(/<!--[\s\S]*?-->/g, '');
  // Strip all remaining HTML tags, leaving only text
  clean = clean.replace(/<[^>]+>/g, ' ');
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  // Limit length to avoid blowing up context window (approx 6000 words max)
  return clean.substring(0, 24000);
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

    // Wait 1s for any dynamically rendered content to settle
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get page content
    const html = await page.content();
    const cleanedText = cleanHtmlText(html);

    // Extract images using page.evaluate
    const imagesInfo = await page.evaluate(() => {
      const imgs: string[] = [];
      
      // 1. Check open graph image
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg && ogImg.getAttribute('content')) {
        const content = ogImg.getAttribute('content');
        if (content) {
          try {
            imgs.push(new URL(content, window.location.href).href);
          } catch (_) {}
        }
      }

      // 2. Query normal images and filter by size / name
      const allImgs = Array.from(document.querySelectorAll('img'));
      for (const img of allImgs) {
        const src = img.src;
        if (!src) continue;
        
        // Filter out typical UI elements
        const srcLower = src.toLowerCase();
        if (
          srcLower.includes('logo') || 
          srcLower.includes('icon') || 
          srcLower.includes('avatar') || 
          srcLower.includes('pixel') ||
          srcLower.endsWith('.svg')
        ) {
          continue;
        }

        // Filter out small images (icons/decorations)
        const width = img.naturalWidth || img.clientWidth || 0;
        const height = img.naturalHeight || img.clientHeight || 0;
        if ((width > 0 && width < 120) || (height > 0 && height < 120)) {
          continue;
        }

        try {
          imgs.push(new URL(src, window.location.href).href);
        } catch (_) {}
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

      // Simple regex extraction for image links as fallback
      const fallbackImages: string[] = [];
      
      // Find og:image
      const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) || 
                      html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/i);
      if (ogMatch && ogMatch[1]) {
        try {
          fallbackImages.push(new URL(ogMatch[1], url).href);
        } catch (_) {}
      }

      // Find standard images
      const imgRegex = /<img[^>]+src="([^">]+)"/gi;
      let match;
      while ((match = imgRegex.exec(html)) !== null && fallbackImages.length < 10) {
        const src = match[1];
        const srcLower = src.toLowerCase();
        if (
          !srcLower.includes('logo') && 
          !srcLower.includes('icon') && 
          !srcLower.includes('pixel') &&
          !srcLower.endsWith('.svg')
        ) {
          try {
            fallbackImages.push(new URL(src, url).href);
          } catch (_) {}
        }
      }

      return {
        text: cleanedText || 'not found',
        candidateImages: fallbackImages.slice(0, 10)
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
