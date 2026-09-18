export interface YouTubeVideoResult {
  id: string;
  title: string;
  parsedTitle: string;
  parsedArtist: string;
  channelTitle: string;
  thumbnail: string;
  embedUrl: string;
}

interface CacheEntry {
  results: YouTubeVideoResult[];
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de caché

export function parseYouTubeTitle(rawTitle: string, channelName?: string): { artist: string; title: string } {
  let clean = rawTitle;
  let prev = "";
  while (prev !== clean) {
    prev = clean;
    clean = clean
      .replace(
        /\s*[\(\[]\s*(karaoke|instrumental|versi[oó]n|lyrics|con letra|letra|video oficial|official video|official audio|audio oficial|audio|hd|4k|hq|remastered)[^\)\]]*[\)\]]/gi,
        ""
      )
      .trim();
  }

  // Comprobar patrón "Artista - Título" o "Artista : Título"
  const splitMatch = clean.match(/^([^-:–—]+)\s*[-:–—]\s*(.+)$/);
  if (splitMatch) {
    return {
      artist: splitMatch[1].trim(),
      title: splitMatch[2].trim(),
    };
  }

  return {
    artist: channelName || "Artista",
    title: clean || rawTitle,
  };
}

/**
 * Busca videos en YouTube utilizando ytInitialData (Costo $0) o API Key oficial si existe.
 */
export async function searchYouTube(
  query: string,
  options: { isKaraoke?: boolean; limit?: number } = {}
): Promise<YouTubeVideoResult[]> {
  const isKaraoke = options.isKaraoke ?? true;
  const limit = options.limit ?? 6;
  const cacheKey = `${isKaraoke ? "k:" : "s:"}${query.toLowerCase().trim()}:${limit}`;

  // Verificar caché en memoria
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.results;
  }

  const results: YouTubeVideoResult[] = [];
  const apiKey = process.env.YOUTUBE_API_KEY;
  const searchQuery = isKaraoke
    ? `${query} karaoke instrumental`
    : `${query} audio`;

  // 1. Intentar con API Key oficial si está configurada
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(
        searchQuery
      )}&key=${apiKey}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = await res.json();
        for (const item of json.items || []) {
          const rawTitle = item.snippet?.title || query;
          const channelName = item.snippet?.channelTitle || "";
          const parsed = parseYouTubeTitle(rawTitle, channelName);
          results.push({
            id: item.id.videoId,
            title: rawTitle,
            parsedTitle: parsed.title,
            parsedArtist: parsed.artist,
            channelTitle: channelName,
            thumbnail:
              item.snippet.thumbnails?.medium?.url ||
              item.snippet.thumbnails?.default?.url ||
              `https://i.ytimg.com/vi/${item.id.videoId}/mqdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&enablejsapi=1`,
          });
        }
      }
    } catch (err) {
      console.warn("YouTube API call failed, using scraper fallback:", err);
    }
  }

  // 2. Scraper directo con extracción precisa de ytInitialData ($0, sin límites)
  if (results.length === 0) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
      });

      if (res.ok) {
        const html = await res.text();

        // Método A: Parsear el JSON estructural de ytInitialData
        const dataMatch =
          html.match(/var ytInitialData = ({.*?});<\/script>/s) ||
          html.match(/ytInitialData = ({.*?});<\/script>/s);

        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1]);
            const sections =
              data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

            for (const sec of sections) {
              const items = sec.itemSectionRenderer?.contents || [];
              for (const item of items) {
                const v = item.videoRenderer;
                if (v && v.videoId) {
                  const rawTitle = v.title?.runs?.[0]?.text || v.title?.simpleText || query;
                  const channelName = v.ownerText?.runs?.[0]?.text || "YouTube";
                  const parsed = parseYouTubeTitle(rawTitle, channelName);
                  const thumb =
                    v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                    `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`;

                  results.push({
                    id: v.videoId,
                    title: rawTitle,
                    parsedTitle: parsed.title,
                    parsedArtist: parsed.artist,
                    channelTitle: channelName,
                    thumbnail: thumb,
                    embedUrl: `https://www.youtube.com/embed/${v.videoId}?autoplay=1&enablejsapi=1`,
                  });
                }
                if (results.length >= limit) break;
              }
              if (results.length >= limit) break;
            }
          } catch (jsonErr) {
            console.warn("Error parsing ytInitialData JSON in searchYouTube:", jsonErr);
          }
        }

        // Método B: Regex defensivo si ytInitialData no arrojó resultados
        if (results.length === 0) {
          const videoIdMatches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
          const seenIds = new Set<string>();

          for (const match of videoIdMatches) {
            const vid = match[1];
            if (!seenIds.has(vid)) {
              seenIds.add(vid);
              const parsed = parseYouTubeTitle(query);
              results.push({
                id: vid,
                title: `${query} (Karaoke Version)`,
                parsedTitle: parsed.title,
                parsedArtist: parsed.artist,
                channelTitle: "YouTube Karaoke",
                thumbnail: `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
                embedUrl: `https://www.youtube.com/embed/${vid}?autoplay=1&enablejsapi=1`,
              });
            }
            if (results.length >= limit) break;
          }
        }
      }
    } catch (scrapErr) {
      console.warn("Error scraping YouTube in searchYouTube:", scrapErr);
    }
  }

  // Guardar en caché si hubo resultados
  if (results.length > 0) {
    searchCache.set(cacheKey, {
      results,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  return results;
}
