import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lista de patrones de sondeo maliciosos y escáneres automáticos de vulnerabilidades
const SUSPICIOUS_PATTERNS = [
  /\.php($|\?)/i,
  /\/wp-admin/i,
  /\/wp-login/i,
  /\/wp-content/i,
  /\/xmlrpc\.php/i,
  /\/\.env/i,
  /\/\.git/i,
  /\/cgi-bin/i,
  /\/shell/i,
  /\/setup\.php/i,
  /\/phpinfo/i,
  /\/pma/i,
  /\/phpmyadmin/i,
  /\/eval-stdin/i,
  /\/vendor\/phpunit/i,
  /\/actuator/i,
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Detección y bloqueo inmediato de bots y escáneres de vulnerabilidades
  const isMaliciousProbe = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(pathname));
  if (isMaliciousProbe) {
    return new NextResponse("Access Denied: Malicious pattern detected", {
      status: 403,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // 2. Proteger rutas del panel de control de administración (/dashboard)
  if (pathname.startsWith("/dashboard")) {
    const sessionCookie = request.cookies.get("vidjs_session")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 3. Continuar con cabeceras de respuesta seguras
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas excepto archivos estáticos internos de Next.js
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
