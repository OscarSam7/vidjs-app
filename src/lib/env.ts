import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
    JWT_SECRET: z
      .string()
      .min(16, "JWT_SECRET debe tener al menos 16 caracteres")
      .default("vidjs-development-super-secret-key-must-be-32-chars-or-more"),
    JWT_EXPIRES_IN: z.string().default("8h"),
    COOKIE_NAME: z.string().default("vidjs_session"),
    NEXT_PUBLIC_APP_NAME: z.string().default("Vidjs Entertainment SaaS"),
  })
  .refine(
    (data) => {
      // En producción, prohibir explícitamente usar la clave secreta por defecto de desarrollo
      if (data.NODE_ENV === "production") {
        return (
          Boolean(data.JWT_SECRET) &&
          data.JWT_SECRET !== "vidjs-development-super-secret-key-must-be-32-chars-or-more" &&
          data.JWT_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message:
        "CRÍTICO PARA PRODUCCIÓN: Debes configurar en tus variables de entorno un JWT_SECRET seguro, aleatorio y único de al menos 32 caracteres.",
      path: ["JWT_SECRET"],
    }
  );

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  COOKIE_NAME: process.env.COOKIE_NAME,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});
