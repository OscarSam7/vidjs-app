import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/showcase",
          "/login",
          "/register",
          "/guest",
          "/staff/asistencia",
          "/menu",
          "/reservas",
          "/eventos",
        ],
        disallow: [
          "/dashboard/",
          "/api/",
          "/auth/qr-link",
          "/uploads/",
        ],
      },
    ],
    sitemap: "https://cynko.app/sitemap.xml",
  };
}
