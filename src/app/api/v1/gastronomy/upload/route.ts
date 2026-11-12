import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, BadRequestError, ForbiddenError } from "@/lib/errors";

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/x-png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/jfif": "jpg",
};

const ALLOWED_EXTENSIONS: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  svg: "svg",
  gif: "gif",
  jfif: "jpg",
  pjpeg: "jpg",
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const canManage = hasAnyPermission(session.role, [
      PERMISSIONS.GASTRO_MENU_MANAGE,
      PERMISSIONS.GASTRO_BAR_MANAGE,
      PERMISSIONS.GASTRO_KITCHEN_MANAGE,
      "ADMIN",
      "OWNER",
      "MANAGER",
    ]);

    if (!canManage) {
      throw new ForbiddenError("No tienes permisos para subir fotos de productos");
    }

    const formData = await req.formData();
    const file = formData.get("file");

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

    const mimeType = (imageFile.type || "").toLowerCase();
    let ext = ALLOWED_MIME_TYPES[mimeType];

    if (!ext && imageFile.name) {
      const parsedExt = path.extname(imageFile.name).toLowerCase().replace(".", "");
      ext = ALLOWED_EXTENSIONS[parsedExt];
    }

    if (!ext) {
      throw new BadRequestError(
        "Formato no admitido. Formatos válidos: PNG, JPG, JPEG, WebP, SVG o GIF"
      );
    }

    // Carpeta de destino pública
    const uploadDir = path.join(process.cwd(), "public", "uploads", "gastronomy");
    await fs.mkdir(uploadDir, { recursive: true });

    // Nombre de archivo seguro
    const cleanTenant = (tenantId || "default").replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `prod-${cleanTenant}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const targetFilePath = path.join(uploadDir, filename);

    // Guardar archivo en disco
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(targetFilePath, buffer);

    const publicUrl = `/uploads/gastronomy/${filename}`;

    return NextResponse.json({
      success: true,
      message: "Imagen subida exitosamente",
      url: publicUrl,
      filename,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
