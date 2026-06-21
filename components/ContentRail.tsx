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
    <section id={id} className="content-auto py-5 sm:py-8">
      <div className="mb-4 flex items-end justify-between px-5 sm:px-8 lg:px-12">
        <h2 className="text-xl font-extrabold tracking-[-0.025em] sm:text-2xl">
          {title}
        </h2>
        <button
          type="button"
          className="group inline-flex items-center gap-1 text-xs font-bold text-white/65 transition hover:text-white sm:text-sm"
        >
          Vedi tutto
          <ChevronRight
            size={17}
            className="transition group-hover:translate-x-0.5"
          />
        </button>
      </div>

      <div className="group/rail relative">
        <div
          ref={railRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:gap-4 sm:px-8 lg:px-12"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="group/card relative aspect-video w-[76vw] max-w-[340px] shrink-0 snap-start overflow-hidden rounded-md bg-panel text-left sm:w-[40vw] lg:w-[25vw] xl:w-[22vw]"
            >
              <Image
                src={item.image}
                alt=""
                fill
                loading="lazy"
                sizes="(max-width: 640px) 76vw, (max-width: 1024px) 40vw, 25vw"
                className="object-cover transition duration-500 group-hover/card:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />

              {item.live ? (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide">
                  <span className="size-1.5 rounded-full bg-white" />
                  Live
                </span>
              ) : null}

              <span className="absolute right-3 top-3 grid size-9 translate-y-1 place-items-center rounded-full bg-white text-ink opacity-0 shadow-xl transition group-hover/card:translate-y-0 group-hover/card:opacity-100">
                <Play size={15} fill="currentColor" />
              </span>

              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <p className="text-sm font-extrabold sm:text-base">{item.title}</p>
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
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scroll(-1)}
          aria-label={`Scorri indietro ${title}`}
          className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/90 text-white opacity-0 shadow-xl transition hover:bg-cyan group-hover/rail:opacity-100 lg:grid"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => scroll(1)}
          aria-label={`Scorri avanti ${title}`}
          className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-ink/90 text-white opacity-0 shadow-xl transition hover:bg-cyan group-hover/rail:opacity-100 lg:grid"
        >
          <ChevronRight />
        </button>
      </div>
    </section>
  );
}
