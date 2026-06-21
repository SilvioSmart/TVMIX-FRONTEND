import { Facebook, Instagram, Youtube } from "lucide-react";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-[#030a14]">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12 lg:py-16">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-6 text-white/55">
            Dirette, programmi e storie italiane. Tutto in un solo posto.
          </p>
          <div className="mt-5 flex gap-2">
            {[Facebook, Instagram, Youtube].map((Icon, index) => (
              <a
                key={index}
                href="#"
                aria-label="Social TVMIX"
                className="grid size-9 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-cyan hover:text-cyan"
              >
                <Icon size={17} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold">Esplora</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/55">
            <a href="#live" className="hover:text-white">Live</a>
            <a href="#programmi" className="hover:text-white">Programmi</a>
            <a href="#categorie" className="hover:text-white">Categorie</a>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-extrabold">Informazioni</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-white/55">
            <a href="#" className="hover:text-white">Chi siamo</a>
            <a href="#" className="hover:text-white">Contatti</a>
            <a href="#" className="hover:text-white">Assistenza</a>
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
              className="min-w-0 flex-1 rounded-l-md border border-white/15 bg-white/5 px-3 text-sm outline-none focus:border-cyan"
            />
            <button
              type="submit"
              className="rounded-r-md bg-cyan px-4 text-sm font-black"
            >
              Vai
            </button>
          </form>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/40 sm:px-8">
        © 2026 TVMIX S.r.l. · Privacy · Cookie Policy · Termini di utilizzo
      </div>
    </footer>
  );
}
