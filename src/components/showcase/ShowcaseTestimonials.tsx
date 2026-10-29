"use client";

import { Star, Building2, Quote, Award } from "lucide-react";

export function ShowcaseTestimonials() {
  const testimonials = [
    {
      quote:
        "Los jueves eran nuestra noche más floja de la semana. Implementamos los torneos de karaoke con 'Super Votos' condicionados al consumo de barra y ahora los jueves facturan casi lo mismo que un sábado. La gente pide rondas enteras para apoyar a su mesa.",
      author: "Ignacio Restrepo",
      role: "Propietario & Director General",
      venue: "Retro Bar & Cocktail Lounge",
      city: "Buenos Aires, Argentina",
      metric: "+42% en consumo los jueves",
      rating: 5,
    },
    {
      quote:
        "Llevo 12 años pinchando música en boliches. Mezclar video y audio en HD directo desde el navegador con bandejas aisladas, sin que se tilde la máquina ni tener que pagar licencias abusivas de software, es el futuro de la industria DJ.",
      author: "DJ Matías Krause",
      role: "DJ Residente & Productor",
      venue: "Sky Club & Terraza",
      city: "Santiago, Chile",
      metric: "99.9% estabilidad sin cortes",
      rating: 5,
    },
    {
      quote:
        "Se acabaron los papelitos con dedicatorias ilegibles y las discusiones con clientes exigiendo que pongan su canción 'ya mismo'. El QR en cada mesa democratizó la música y ordenó la cabina como nunca antes.",
      author: "Camila Valenzuela",
      role: "Gerente de Operaciones",
      venue: "La Birrería Rooftop Garden",
      city: "Bogotá, Colombia",
      metric: "+2.2 hrs permanencia media",
      rating: 5,
    },
  ];

  return (
    <section className="py-24 bg-[#08080c] relative border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-bold text-cyan-300 mb-3">
            <Award className="w-3.5 h-3.5 text-cyan-400" />
            <span>Casos de Éxito en la Industria Nocturna</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Validado por Quienes Viven de la Noche
          </h2>
          <p className="mt-3 text-base text-zinc-400">
            Dueños de locales, gerentes gastronómicos y DJs profesionales que ya multiplicaron su facturación y su experiencia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between space-y-6 relative hover:border-zinc-700 transition-all shadow-xl"
            >
              <div>
                {/* 5 Estrellas */}
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {[...Array(item.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                <Quote className="w-8 h-8 text-zinc-700 mb-2 opacity-50" />
                <p className="text-sm text-zinc-300 leading-relaxed italic">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                <div className="inline-block px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-mono font-black text-emerald-300">
                  {item.metric}
                </div>
                <div>
                  <div className="text-sm font-black text-white">{item.author}</div>
                  <div className="text-xs text-zinc-400">{item.role}</div>
                  <div className="text-[11px] font-semibold text-cyan-400 mt-0.5">
                    {item.venue} &bull; <span className="text-zinc-500">{item.city}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
