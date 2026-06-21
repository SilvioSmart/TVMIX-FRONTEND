"use client";

import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";

const links = ["Live", "Programmi", "Categorie"];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/75 backdrop-blur-xl">
      <nav
        aria-label="Navigazione principale"
        className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:h-[76px] sm:px-8 lg:px-12"
      >
        <a href="#" aria-label="TVMIX Home">
          <Logo />
        </a>

        <div className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="text-sm font-semibold text-white/78 transition hover:text-white"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Cerca"
            className="grid size-11 place-items-center rounded-full text-white transition hover:bg-white/10"
          >
            <Search size={21} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            onClick={() => setOpen((value) => !value)}
            className="grid size-11 place-items-center rounded-full text-white transition hover:bg-white/10 md:hidden"
          >
            {open ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-white/10 bg-ink px-5 py-5 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-white/85 hover:bg-white/5"
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
