import { Facebook, Instagram, Youtube } from "lucide-react";
import type { BrandSettings, NavigationItem } from "@/lib/api";
import { Logo } from "./Logo";

const fallbackLinks: NavigationItem[] = [
  { id: "live", label: "Live", url: "#live", external: false },
  { id: "programmi", label: "Programmi", url: "#programmi", external: false },
  { id: "categorie", label: "Categorie", url: "#categorie", external: false },
];

type FooterProps = {
  links?: NavigationItem[];
  brand?: BrandSettings;
};

export function Footer({ links = fallbackLinks, brand }: FooterProps) {
  const footerLinks = links.length > 0 ? links : fallbackLinks;
  const accent = brand?.accentColor || "#03A9F4";
  const platformName = brand?.platformName || "TVMIX";

  return (
    <footer className="mt-16 border-t bg-[#030a14]" style={{ borderColor: `${accent}24` }}>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12 lg:py-16">
        <div>
          <Logo brand={brand} />
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">
            Dirette, programmi e storie italiane. Tutto in un solo posto.
          </p>
          <div className="mt-5 flex gap-2">
            {[Facebook, Instagram, Youtube].map((Icon, index) => (
              <a
                key={index}
                href="#"
                aria-label={`Social ${platformName}`}
                className="grid size-9 place-items-center rounded-full border text-white/70 transition hover:bg-white/5"
                style={{ borderColor: `${accent}44` }}
              >
                <Icon size={17} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold">Esplora</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/55">
            {footerLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer" : undefined}
                className="hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold">Informazioni</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/55">
            <a href="/chi-siamo" className="hover:text-white">Chi siamo</a>
            <a href="/contatti" className="hover:text-white">Contatti</a>
            <a href="/assistenza" className="hover:text-white">Assistenza</a>
            <a href="/lavora-con-noi" className="hover:text-white">Lavora con noi</a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold">Resta aggiornato</h3>
          <p className="mt-4 text-sm leading-6 text-white/55">
            Novità, anteprime e consigli di visione nella tua inbox.
          </p>
          <form className="mt-4 flex" action="#">
            <label htmlFor="email" className="sr-only">Email</label>
            <input
              id="email"
              type="email"
              placeholder="La tua email"
              className="min-w-0 flex-1 rounded-l-md border bg-white/5 px-3 text-sm outline-none"
              style={{ borderColor: `${accent}44` }}
            />
            <button
              type="submit"
              className="rounded-r-md px-4 text-sm font-black text-black"
              style={{ backgroundColor: accent }}
            >
              Vai
            </button>
          </form>
        </div>
      </div>

      <div className="border-t px-5 py-5 text-center text-xs text-white/40 sm:px-8" style={{ borderColor: `${accent}24` }}>
        © 2026 TVMIX S.r.l. · <a href="/privacy-policy" className="hover:text-white">Privacy Policy</a> · <a href="/cookie" className="hover:text-white">Cookie</a>
      </div>
    </footer>
  );
}
