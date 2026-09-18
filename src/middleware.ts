import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proteger rutas del panel de control
  if (pathname.startsWith("/dashboard")) {
    const sessionCookie = request.cookies.get("vidjs_session")?.value;

    if (!sessionCookie) {
      const loginUrl = new URL("/login", request.url);
      // Preservar la ruta a la que intentaba ingresar para mejor UX
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Coincidir con todas las rutas de dashboard
     */
    "/dashboard/:path*",
  ],
};
