import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { handleApiError, BadRequestError } from "@/lib/errors";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const rawType = formData.get("type"); // "decoration" | "package" | "payment_proof" | "birthday_photo"

    let subfolder = "decorations";
    if (rawType === "package") subfolder = "packages";
    else if (rawType === "payment_proof") subfolder = "receipts";
    else if (rawType === "birthday_photo") subfolder = "birthdays";

    if (!file || typeof file === "string") {
      throw new BadRequestError("No se ha seleccionado ningún archivo de imagen");
    }

    const imageFile = file as File;

    if (imageFile.size === 0) {
      throw new BadRequestError("El archivo de imagen está vacío");
    }

    if (imageFile.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestError("El tamaño máximo permitido es de 10 MB");
    }

    const mimeType = imageFile.type.toLowerCase();
    const ext = ALLOWED_MIME_TYPES[mimeType];

    if (!ext) {
      throw new BadRequestError(
        "Formato no admitido. Formatos permitidos: PNG, JPG, JPEG, WebP o GIF"
      );
    }

    // Carpeta de destino pública
    const uploadDir = path.join(process.cwd(), "public", "uploads", "reservations", subfolder);
    await fs.mkdir(uploadDir, { recursive: true });

    // Nombre de archivo seguro y único
    const filename = `${subfolder}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const targetFilePath = path.join(uploadDir, filename);

    // Guardar archivo en disco
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/reservations/${subfolder}/${filename}`;

    return NextResponse.json({
      success: true,
      message: "Imagen subida exitosamente",
      data: {
        url: publicUrl,
        filename,
        originalName: imageFile.name,
        size: imageFile.size,
        mimeType,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
