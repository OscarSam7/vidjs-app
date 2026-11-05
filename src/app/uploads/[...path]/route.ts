import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  gif: "image/gif",
  jfif: "image/jpeg",
  pjpeg: "image/jpeg",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  webm: "video/webm",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Prevenir Directory Traversal
    const safeSegments = pathSegments.filter((seg) => seg !== ".." && seg !== "." && !seg.includes("/"));
    const filePath = path.join(process.cwd(), "public", "uploads", ...safeSegments);

    try {
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        const fileBuffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase().replace(".", "");
        const contentType = MIME_MAP[ext] || "application/octet-stream";

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": stat.size.toString(),
            "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      }
    } catch {
      // El archivo físico no existe en disco. Generar fallback estético según el tipo de recurso solicitado.
    }

    const filename = safeSegments[safeSegments.length - 1] || "";
    const isLogo = filename.includes("logo") || safeSegments.includes("logos");
    const isBanner = filename.includes("banner") || filename.includes("portada") || safeSegments.includes("banners");

    if (isLogo) {
      const svgLogo = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6"/>
      <stop offset="50%" stop-color="#10B981"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#8B5CF6" flood-opacity="0.4"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="96" fill="#0A0B10"/>
  <rect x="20" y="20" width="472" height="472" rx="80" fill="none" stroke="url(#neonGlow)" stroke-width="6" opacity="0.6"/>
  <g filter="url(#shadow)" transform="translate(156, 120)">
    <circle cx="100" cy="100" r="90" fill="#18181B" stroke="url(#neonGlow)" stroke-width="8"/>
    <circle cx="100" cy="100" r="40" fill="#27272A" stroke="#10B981" stroke-width="4"/>
    <circle cx="100" cy="100" r="14" fill="#06B6D4"/>
  </g>
  <text x="256" y="380" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#FFFFFF" text-anchor="middle" letter-spacing="4">
    RETRO BAR
  </text>
  <text x="256" y="420" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="16" fill="#10B981" text-anchor="middle" letter-spacing="6">
    KARAOKE &amp; LOUNGE
  </text>
</svg>`.trim();

      return new NextResponse(svgLogo, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (isBanner) {
      const svgBanner = `
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#05060A"/>
      <stop offset="40%" stop-color="#0D1120"/>
      <stop offset="100%" stop-color="#020305"/>
    </linearGradient>
    <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="#10B981" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#06B6D4" stop-opacity="0.3"/>
    </linearGradient>
    <radialGradient id="neonSpot" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#05060A" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#bgGrad)"/>
  <rect width="1920" height="1080" fill="url(#neonSpot)"/>
  <path d="M0,700 C300,600 600,800 960,680 C1320,560 1620,720 1920,620 L1920,1080 L0,1080 Z" fill="url(#waveGrad)"/>
  <path d="M0,760 C400,690 800,830 1200,740 C1600,650 1750,780 1920,710 L1920,1080 L0,1080 Z" fill="#040406" fill-opacity="0.85"/>
  <g opacity="0.35">
    <circle cx="300" cy="200" r="180" fill="#10B981" filter="blur(80px)"/>
    <circle cx="1600" cy="300" r="220" fill="#8B5CF6" filter="blur(90px)"/>
  </g>
</svg>`.trim();

      return new NextResponse(svgBanner, {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return new NextResponse("File Not Found", { status: 404 });
  } catch (error) {
    console.error("Error al servir archivo de upload:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
