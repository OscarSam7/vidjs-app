import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, BadRequestError } from "@/lib/errors";

export const dynamic = "force-dynamic";

// Formatos multimedia admitidos (Audio y Video)
const ALLOWED_MIME_TYPES: Record<string, string> = {
  // Video
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/ogg": "ogv",
  // Audio
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/webm": "weba",
  "audio/flac": "flac",
};

const ALLOWED_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v", "ogv", "mp3", "wav", "ogg", "aac", "m4a", "flac"]);

// Tamaño máximo: 200 MB para permitir videos en alta definición o sets DJ
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      throw new UnauthorizedError("Debes iniciar sesión para subir archivos a la biblioteca");
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      throw new BadRequestError("No se ha seleccionado ningún archivo de audio o video");
    }

    const mediaFile = file as File;

    if (mediaFile.size === 0) {
      throw new BadRequestError("El archivo seleccionado está vacío");
    }

    if (mediaFile.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError("El tamaño máximo permitido es de 200 MB");
    }

    // Extraer extensión de MIME o del nombre original
    const mimeType = mediaFile.type.toLowerCase();
    let ext = ALLOWED_MIME_TYPES[mimeType];

    if (!ext) {
      const match = mediaFile.name.match(/\.([a-zA-Z0-9]+)$/);
      const fileExt = match ? match[1].toLowerCase() : "";
      if (ALLOWED_EXTENSIONS.has(fileExt)) {
        ext = fileExt;
      }
    }

    if (!ext) {
      throw new BadRequestError(
        "Formato de archivo no admitido. Formatos permitidos: MP4, WebM, MOV, M4V, MP3, WAV, OGG, AAC, FLAC"
      );
    }

    const isVideo = ["mp4", "webm", "mov", "m4v", "ogv"].includes(ext) || mimeType.startsWith("video/");

    // Carpeta de destino pública
    const uploadDir = path.join(process.cwd(), "public", "uploads", "media");
    await fs.mkdir(uploadDir, { recursive: true });

    // Generar nombre de archivo único y seguro
    const cleanTenant = (session.tenantId || "media").replace(/[^a-zA-Z0-9_-]/g, "");
    const safeBaseName = mediaFile.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .substring(0, 30);
    const filename = `${cleanTenant}-${Date.now()}-${safeBaseName}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const targetFilePath = path.join(uploadDir, filename);

    // Guardar archivo en disco
    const arrayBuffer = await mediaFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/media/${filename}`;

    // Extraer título y artista sugeridos a partir del nombre del archivo
    let rawName = mediaFile.name.replace(/\.[^/.]+$/, "").trim();
    // Limpiar etiquetas típicas "(Official Video)", etc.
    rawName = rawName.replace(/\s*[\(\[](official\s*video|audio\s*oficial|video\s*oficial|hd|4k|videoclip|letra|lyrics)[\)\]]/gi, "").trim();

    let cleanTitle = rawName;
    let artistName = "";

    if (rawName.includes(" - ")) {
      const parts = rawName.split(" - ");
      artistName = parts[0].trim();
      cleanTitle = parts.slice(1).join(" - ").trim();
    }

    return NextResponse.json({
      success: true,
      message: `${isVideo ? "Video MP4" : "Archivo de audio"} subido exitosamente`,
      data: {
        url: publicUrl,
        filename,
        originalName: mediaFile.name,
        size: mediaFile.size,
        mimeType: mimeType || (isVideo ? "video/mp4" : "audio/mpeg"),
        isVideo,
        cleanTitle: cleanTitle || rawName,
        artistName: artistName || (isVideo ? "Video Clip" : "Artista Local"),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
