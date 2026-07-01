"use client";

import { Menu, Search, X } from "lucide-react";
import { useState } from "react";
import type { NavigationItem } from "@/lib/api";
import { Logo } from "./Logo";

const fallbackLinks: NavigationItem[] = [
  { id: "live", label: "Live", url: "#live", external: false },
  { id: "programmi", label: "Programmi", url: "#programmi", external: false },
  { id: "categorie", label: "Categorie", url: "#categorie", external: false },
];

type NavbarProps = {
  links?: NavigationItem[];
};

export function Navbar({ links = fallbackLinks }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const navLinks = links.length > 0 ? links : fallbackLinks;

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
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              className="text-sm font-semibold text-white/78 transition hover:text-white"
            >
              {link.label}
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
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-base font-semibold text-white/85 hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
