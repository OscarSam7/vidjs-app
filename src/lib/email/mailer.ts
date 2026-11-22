import nodemailer from "nodemailer";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  provider: "smtp" | "resend" | "none";
  error?: string;
}

/**
 * Envío unificado de correos para CYNKO OS.
 * Soporta:
 *  1) SMTP universal (Gmail App Password, Brevo, Zoho, Hostinger, etc.)
 *     Variables: SMTP_HOST (opcional si usas GMAIL_USER), SMTP_PORT, SMTP_USER / GMAIL_USER, SMTP_PASS / GMAIL_APP_PASSWORD
 *  2) Resend API
 *     Variables: RESEND_API_KEY, EMAIL_FROM
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  const defaultFrom = process.env.EMAIL_FROM || "CYNKO OS <seguridad@cynko.app>";

  // 1. Intentar por SMTP / Gmail si está configurado
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? "smtp.gmail.com" : undefined);

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const port = Number(process.env.SMTP_PORT || (smtpHost === "smtp.gmail.com" ? 465 : 587));
      const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port,
        secure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const smtpFrom = process.env.EMAIL_FROM || `CYNKO OS <${smtpUser}>`;

      await transporter.sendMail({
        from: smtpFrom,
        to: recipients.join(", "),
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      return { sent: true, provider: "smtp" };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error SMTP desconocido";
      console.error("[MAILER_SMTP_ERROR]", msg);
      // Si también existe Resend, hacemos fallback a Resend antes de rendirnos
      if (!process.env.RESEND_API_KEY) {
        return { sent: false, provider: "smtp", error: msg };
      }
    }
  }

  // 2. Intentar por Resend API si está configurado
  if (process.env.RESEND_API_KEY) {
    const tryResend = async (fromAddr: string) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddr,
          to: recipients,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.status, data };
    };

    try {
      let attempt = await tryResend(defaultFrom);

      // Si el dominio personalizado aún no está verificado en Resend, reintentar con onboarding@resend.dev
      if (!attempt.ok && defaultFrom !== "CYNKO OS <onboarding@resend.dev>") {
        console.warn("[MAILER_RESEND_RETRY]", attempt.status, attempt.data);
        attempt = await tryResend("CYNKO OS <onboarding@resend.dev>");
      }

      if (attempt.ok) {
        return { sent: true, provider: "resend" };
      }

      const errMsg =
        (attempt.data as { message?: string })?.message ||
        `Resend rechazó el envío (HTTP ${attempt.status})`;
      console.error("[MAILER_RESEND_ERROR]", errMsg, attempt.data);
      return { sent: false, provider: "resend", error: errMsg };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de red con Resend";
      console.error("[MAILER_RESEND_NETWORK_ERROR]", msg);
      return { sent: false, provider: "resend", error: msg };
    }
  }

  // 3. Ningún proveedor configurado
  console.warn("[MAILER_NOT_CONFIGURED] No hay SMTP_USER/GMAIL_USER ni RESEND_API_KEY configurados.");
  return {
    sent: false,
    provider: "none",
    error: "No hay proveedor de correo configurado en el servidor (SMTP o Resend).",
  };
}
