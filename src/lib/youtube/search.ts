export interface YouTubeVideoResult {
  id: string;
  title: string;
  parsedTitle: string;
  parsedArtist: string;
  channelTitle: string;
  thumbnail: string;
  embedUrl: string;
  duration?: string;
}

interface CacheEntry {
  results: YouTubeVideoResult[];
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora de caché

/**
 * Extrae de forma infalible el ID de 11 caracteres de un enlace o texto de YouTube.
 * Soporta: standard, youtu.be, shorts, embed, live, mobile (m.), music.youtube, y parámetros complejos.
 */
export function extractYoutubeVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const clean = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;

  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i;
  const match = clean.match(regExp);
  return match && match[1] ? match[1] : null;
}

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
 * Busca videos en YouTube utilizando un motor de triple contingencia:
 * 1. Detección directa de URL/ID con resolución oficial oEmbed (0ms, 100% confiable).
 * 2. API Key oficial de Google/YouTube Data v3 si está en las variables de entorno.
 * 3. YouTube Innertube Web Client API (Costo $0, ultra rápido, compatible con Vercel/Cloud IPs).
 * 4. Scraper directo con cookies de consentimiento (Fallback de seguridad).
 */
export async function searchYouTube(
  query: string,
  options: { isKaraoke?: boolean; limit?: number } = {}
): Promise<YouTubeVideoResult[]> {
  const isKaraoke = options.isKaraoke ?? true;
  const limit = options.limit ?? 6;
  const trimmed = query.trim();

  if (!trimmed) return [];

  const cacheKey = `${isKaraoke ? "k:" : "s:"}${trimmed.toLowerCase()}:${limit}`;

  // Verificar caché en memoria
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.results;
  }

  const results: YouTubeVideoResult[] = [];

  // =========================================================================
  // NIVEL 1: DETECCIÓN DIRECTA DE ENLACE / ID DE YOUTUBE (VÍA OEMBED OFICIAL)
  // =========================================================================
  const directId = extractYoutubeVideoId(trimmed);
  if (directId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directId}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        const rawTitle = data.title || "Video de YouTube";
        const channelName = data.author_name || "YouTube";
        const parsed = parseYouTubeTitle(rawTitle, channelName);
        const singleResult: YouTubeVideoResult = {
          id: directId,
          title: rawTitle,
          parsedTitle: parsed.title,
          parsedArtist: parsed.artist,
          channelTitle: channelName,
          thumbnail: data.thumbnail_url || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${directId}?autoplay=1&enablejsapi=1`,
        };
        searchCache.set(cacheKey, { results: [singleResult], expiresAt: Date.now() + CACHE_TTL_MS });
        return [singleResult];
      }
    } catch (e) {
      console.warn("[YouTube] Error resolviendo oEmbed para ID directo:", directId, e);
    }
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  const searchQuery = isKaraoke
    ? `${trimmed} karaoke instrumental`
    : `${trimmed} audio`;

  // =========================================================================
  // NIVEL 2: API KEY OFICIAL DE GOOGLE (SI EXISTE)
  // =========================================================================
  if (apiKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(
        searchQuery
      )}&key=${apiKey}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const json = await res.json();
        for (const item of json.items || []) {
          const rawTitle = item.snippet?.title || trimmed;
          const channelName = item.snippet?.channelTitle || "";
          const parsed = parseYouTubeTitle(rawTitle, channelName);
          results.push({
            id: item.id.videoId,
            title: rawTitle,
            parsedTitle: parsed.title,
            parsedArtist: parsed.artist,
            channelTitle: channelName,
            thumbnail:
              item.snippet.thumbnails?.high?.url ||
              item.snippet.thumbnails?.medium?.url ||
              `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
            embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&enablejsapi=1`,
          });
        }
      }
    } catch (err) {
      console.warn("[YouTube] Falló API Key oficial, usando motor Innertube:", err);
    }
  }

  // =========================================================================
  // NIVEL 3: YOUTUBE INNERTUBE WEB API (NATIVO, SIN BLOQUEOS DE CLOUD / VERCEL)
  // =========================================================================
  if (results.length === 0) {
    try {
      const innertubeUrl = "https://www.youtube.com/youtubei/v1/search";
      const payload = {
        context: {
          client: {
            clientName: "WEB",
            clientVersion: "2.20230531.04.00",
            hl: "es",
            gl: "ES",
          },
        },
        query: searchQuery,
      };

      const res = await fetch(innertubeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const sections =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

        for (const sec of sections) {
          const items = sec.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const rawTitle = v.title?.runs?.[0]?.text || v.title?.simpleText || trimmed;
              const channelName = v.ownerText?.runs?.[0]?.text || "YouTube";
              const parsed = parseYouTubeTitle(rawTitle, channelName);
              const thumb =
                v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
                `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
              const duration = v.lengthText?.simpleText || undefined;

              results.push({
                id: v.videoId,
                title: rawTitle,
                parsedTitle: parsed.title,
                parsedArtist: parsed.artist,
                channelTitle: channelName,
                thumbnail: thumb,
                embedUrl: `https://www.youtube.com/embed/${v.videoId}?autoplay=1&enablejsapi=1`,
                duration,
              });
            }
            if (results.length >= limit) break;
          }
          if (results.length >= limit) break;
        }
      }
    } catch (innerErr) {
      console.warn("[YouTube] Error en motor Innertube API:", innerErr);
    }
  }

  // =========================================================================
  // NIVEL 4: SCRAPER HTML DIRECTO CON COOKIES DE CONSENTIMIENTO (FALLBACK)
  // =========================================================================
  if (results.length === 0) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
          Cookie:
            "SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjMwODI5LjA3X3AwGgJlbiACGgYIgLCpqAY; CONSENT=YES+cb.20230531-04-p0.es+FX+999",
        },
      });

      if (res.ok) {
        const html = await res.text();

        // Extracción resiliente de videoId y títulos
        const videoIdMatches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
        const seenIds = new Set<string>();

        for (const match of videoIdMatches) {
          const vid = match[1];
          if (!seenIds.has(vid)) {
            seenIds.add(vid);
            const parsed = parseYouTubeTitle(trimmed);
            results.push({
              id: vid,
              title: `${trimmed} (${isKaraoke ? "Versión Karaoke" : "Audio"})`,
              parsedTitle: parsed.title,
              parsedArtist: parsed.artist,
              channelTitle: "YouTube Music",
              thumbnail: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
              embedUrl: `https://www.youtube.com/embed/${vid}?autoplay=1&enablejsapi=1`,
            });
          }
          if (results.length >= limit) break;
        }
      }
    } catch (scrapErr) {
      console.warn("[YouTube] Error en scraper HTML fallback:", scrapErr);
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
