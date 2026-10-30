import { z } from "zod";

const DEV_DEFAULT_SECRET = "vidjs-development-super-secret-key-must-be-32-chars-or-more";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    APP_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
    JWT_SECRET: z.string().min(16, "JWT_SECRET debe tener al menos 16 caracteres").default(DEV_DEFAULT_SECRET),
    JWT_EXPIRES_IN: z.string().default("8h"),
    COOKIE_NAME: z.string().default("vidjs_session"),
    NEXT_PUBLIC_APP_NAME: z.string().default("Vidjeis Entertainment SaaS"),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      const secret = process.env.JWT_SECRET;
      if (!secret || secret === DEV_DEFAULT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message:
            "En entorno de producción, JWT_SECRET es estrictamente obligatorio, no debe ser el valor por defecto de desarrollo y debe proveerse como variable de entorno.",
        });
      } else if (secret.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "En producción, JWT_SECRET debe tener al menos 32 caracteres criptográficos seguros.",
        });
      }
    }
  });

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || DEV_DEFAULT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  COOKIE_NAME: process.env.COOKIE_NAME,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});

