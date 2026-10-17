/**
 * Utilidades de saneamiento y escape para prevención de XSS e inyecciones de contenido malicioso.
 */

// Mapa de escape de caracteres HTML estándar
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

/**
 * Escapa caracteres peligrosos en texto plano que pudieran interpretarse como HTML en el navegador.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str).replace(/[&<>"'`=\/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Limpia y sanitiza texto ingresado por el usuario:
 * 1. Elimina etiquetas HTML y scripts.
 * 2. Elimina prefijos peligrosos de esquemas de URL (javascript:, vbscript:, data:text/html).
 * 3. Elimina caracteres de control y bytes nulos.
 * 4. Recorta espacios en blanco.
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return "";

  let cleaned = String(input);

  // 1. Eliminar caracteres de control y bytes nulos (excepto saltos de línea y tabuladores comunes)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Eliminar etiquetas HTML completas <tag ...> y </tag>
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // 3. Desactivar vectores de javascript: y data:text
  cleaned = cleaned.replace(/javascript\s*:/gi, "");
  cleaned = cleaned.replace(/vbscript\s*:/gi, "");
  cleaned = cleaned.replace(/data\s*:\s*text\/html/gi, "");

  // 4. Normalizar espacios múltiples
  cleaned = cleaned.replace(/[ \t]+/g, " ");

  return cleaned.trim();
}

/**
 * Valida si una cadena base64 de imagen es segura y de un tipo MIME permitido (JPEG, PNG, WebP).
 * Rechaza expresamente SVG (vector común de XSS con scripts incrustados) y URLs no válidas.
 */
export function validateBase64Image(dataUri: string, maxSizeBytes: number = 3 * 1024 * 1024): {
  valid: boolean;
  mimeType?: string;
  error?: string;
} {
  if (!dataUri || typeof dataUri !== "string") {
    return { valid: false, error: "La imagen no fue proporcionada." };
  }

  // Verificar formato Data URI
  const match = dataUri.match(/^data:(image\/(jpeg|png|webp));base64,(.+)$/i);
  if (!match) {
    if (dataUri.includes("image/svg+xml") || dataUri.toLowerCase().includes("<svg")) {
      return { valid: false, error: "El formato SVG no está permitido por motivos de seguridad." };
    }
    return { valid: false, error: "Formato de imagen inválido. Solo se admiten JPG, PNG o WebP." };
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[3];

  // Calcular tamaño aproximado en bytes desde base64
  // (cada 4 caracteres base64 representan 3 bytes)
  const estimatedSizeBytes = Math.ceil((base64Data.length * 3) / 4);

  if (estimatedSizeBytes > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `La imagen excede el tamaño máximo permitido (${maxMb} MB).` };
  }

  return { valid: true, mimeType };
}
