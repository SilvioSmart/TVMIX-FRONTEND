"use client";

import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import type { MediaItem } from "@/lib/content";

type ContentRailProps = {
  id?: string;
  title: string;
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
};

export function ContentRail({ id, title, items, onSelect }: ContentRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: number) => {
    railRef.current?.scrollBy({
      left: direction * railRef.current.clientWidth * 0.82,
      behavior: "smooth",
    });
  };

  return (
    <section id={id} className="content-auto group/rail py-5 sm:py-8">
      <div className="mb-4 flex flex-col items-start gap-3 px-[3%]">
        <h2 className="carousel-static-reveal text-xl font-extrabold tracking-[-0.025em] sm:text-2xl">
          {title}
        </h2>

        <div className="carousel-static-reveal flex flex-wrap items-center justify-start gap-2">
          <button
            type="button"
            className="group inline-flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-bold text-white/75 backdrop-blur transition hover:border-cyan/60 hover:bg-cyan hover:text-ink sm:text-sm"
          >
            Vedi tutto
            <ChevronRight
              size={17}
              className="transition group-hover:translate-x-0.5"
            />
          </button>

          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={`Scorri indietro ${title}`}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/75 backdrop-blur transition hover:border-cyan/60 hover:bg-cyan hover:text-ink"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={`Scorri avanti ${title}`}
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/75 backdrop-blur transition hover:border-cyan/60 hover:bg-cyan hover:text-ink"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="relative px-[3%]">
        <div
          ref={railRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="carousel-card group/card relative aspect-video w-[76vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-md bg-panel text-left sm:w-[40vw] lg:w-[25vw] xl:w-[22vw]"
            >
              <Image
                src={item.image}
                alt=""
                fill
                loading="lazy"
                sizes="94vw"
                className="object-cover transition duration-500 group-hover/card:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

              {item.live ? (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                  <span className="size-1.5 rounded-full bg-white" />
                  Live
                </span>
              ) : null}

              <div className="absolute bottom-3 left-[3%] right-[3%] flex flex-col items-start sm:bottom-4">
                <span className="carousel-mask-reveal mb-2 inline-grid size-9 place-items-center rounded-full bg-white text-ink shadow-xl">
                  <Play size={15} fill="currentColor" />
                </span>

                <div className="carousel-mask-reveal w-full text-left">
                  <p className="text-sm font-extrabold sm:text-base">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-white/65 sm:text-xs">
                    {item.subtitle}
                  </p>
                  {item.progress ? (
                    <span className="mt-3 block h-0.5 overflow-hidden rounded bg-white/25">
                      <span
                        className="block h-full bg-cyan"
                        style={{ width: `${item.progress}%` }}
                      />
                    </span>
                  ) : null}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
