"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Info, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { heroSlides, type MediaItem } from "@/lib/content";

type HeroSliderProps = {
  featured: MediaItem;
  onPlay: () => void;
};

export function HeroSlider({ featured, onPlay }: HeroSliderProps) {
  const slides = useMemo(
    () => [
      {
        id: featured.id,
        title: featured.title,
        subtitle: featured.subtitle ?? "TVMIX",
        description:
          featured.description ??
          "Guarda ora il contenuto selezionato dalla redazione TVMIX.",
        image: featured.image,
      },
      ...heroSlides.filter((slide) => slide.id !== featured.id),
    ],
    [featured],
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const changeSlide = (direction: number) => {
    setActive((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Contenuti in evidenza"
      className="relative min-h-[620px] overflow-hidden sm:min-h-[700px] lg:min-h-[790px]"
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== active}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover object-[68%_center] sm:object-center"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(90deg,#020711_0%,rgba(2,7,17,.91)_24%,rgba(2,7,17,.34)_60%,rgba(2,7,17,.05)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,#020711_0%,transparent_44%,rgba(2,7,17,.36)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[620px] max-w-[1440px] items-end px-5 pb-24 pt-28 sm:min-h-[700px] sm:items-center sm:px-8 sm:pb-16 lg:min-h-[790px] lg:px-12">
        <div className="max-w-[610px]">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-cyan sm:text-base">
            TVMIX Original
          </p>
          <h1 className="whitespace-pre-line text-[3.5rem] font-black leading-[0.83] tracking-[-0.075em] text-white sm:text-[5.6rem] lg:text-[7rem]">
            {slides[active].title}
          </h1>
          <p className="mt-5 text-lg font-bold text-white sm:text-2xl">
            {slides[active].subtitle}
          </p>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/72 sm:text-base sm:leading-7">
            {slides[active].description}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPlay}
              className="inline-flex h-12 items-center gap-2 rounded-md bg-cyan px-5 text-sm font-extrabold text-white transition hover:bg-[#23b7fa] sm:h-14 sm:px-7 sm:text-base"
            >
              <Play size={19} fill="currentColor" />
              Guarda ora
            </button>
            <button
              type="button"
              className="inline-flex h-12 items-center gap-2 rounded-md border border-white/45 bg-black/20 px-5 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/10 sm:h-14 sm:px-7 sm:text-base"
            >
              <Info size={20} />
              Info
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => changeSlide(-1)}
        aria-label="Slide precedente"
        className="absolute left-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/55 sm:grid lg:left-6"
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        onClick={() => changeSlide(1)}
        aria-label="Slide successiva"
        className="absolute right-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/55 sm:grid lg:right-6"
      >
        <ChevronRight />
      </button>

      <div className="absolute bottom-12 left-5 z-20 flex gap-2 sm:bottom-14 sm:left-1/2 sm:-translate-x-1/2">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Vai alla slide ${index + 1}`}
            aria-current={index === active}
            className={`h-1.5 rounded-full transition-all ${
              index === active ? "w-8 bg-cyan" : "w-1.5 bg-white/55"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
