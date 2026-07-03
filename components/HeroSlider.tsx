"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { heroSlides, type MediaItem } from "@/lib/content";

type HeroSlide = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image: string;
  eyebrow?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  media?: MediaItem | null;
  video?: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    hlsUrl?: string | null;
  } | null;
};

type ApiCarouselSlide = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl: string;
  eyebrow?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  video?: {
    id: string;
    title: string;
    thumbnailUrl?: string | null;
    hlsUrl?: string | null;
  } | null;
};

type HeroSliderProps = {
  featured?: MediaItem;
  slides?: HeroSlide[];
  onPlay: (item: MediaItem) => void;
};

const fallbackSlides: HeroSlide[] = heroSlides.map((slide) => ({
  ...slide,
  eyebrow: "TVMIX Original",
}));

const carouselEndpoint = "https://api.tvmix.it/api/v1/carousel";

function getInitialSlides(slides?: HeroSlide[], featured?: MediaItem): HeroSlide[] {
  if (slides && slides.length > 0) return slides;
  if (featured) {
    return [
      {
        id: featured.id,
        title: featured.title,
        subtitle: featured.subtitle,
        description: featured.description,
        image: featured.image,
        eyebrow: "TVMIX Original",
        ctaLabel: "Guarda ora",
        media: featured,
      },
    ];
  }

  return fallbackSlides;
}

export function HeroSlider({
  featured,
  slides: providedSlides,
  onPlay,
}: HeroSliderProps) {
  const [slides, setSlides] = useState<HeroSlide[]>(
    getInitialSlides(providedSlides, featured),
  );
  const [active, setActive] = useState(0);

  useEffect(() => {
    setSlides(getInitialSlides(providedSlides, featured));
    setActive(0);
  }, [featured, providedSlides]);

  useEffect(() => {
    if (providedSlides && providedSlides.length > 0) return;

    let cancelled = false;

    const loadCarousel = async () => {
      try {
        const response = await fetch(carouselEndpoint, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as { data?: ApiCarouselSlide[] };
        const remoteSlides =
          payload.data
            ?.filter((slide) => slide.imageUrl)
            .map<HeroSlide>((slide) => ({
              id: slide.id,
              title: slide.title,
              subtitle: slide.subtitle,
              description: slide.description,
              image: slide.imageUrl,
              eyebrow: slide.eyebrow || "TVMIX Original",
              ctaLabel: slide.ctaLabel,
              ctaUrl: slide.ctaUrl,
              video: slide.video,
            })) ?? [];

        if (!cancelled && remoteSlides.length > 0) {
          setSlides(remoteSlides);
          setActive(0);
        }
      } catch {
        // In caso di API non raggiungibile resta attivo il carosello locale.
      }
    };

    void loadCarousel();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % slides.length),
      7000,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const changeSlide = (direction: number) => {
    setActive(
      (current) =>
        (current + direction + slides.length) % slides.length,
    );
  };

  const activeSlide = slides[active] ?? fallbackSlides[0];

  const handlePlay = () => {
    if (activeSlide.ctaUrl) {
      window.location.href = activeSlide.ctaUrl;
      return;
    }

    onPlay(
      activeSlide.media ?? {
        id: activeSlide.video?.id ?? activeSlide.id,
        title:
          activeSlide.video?.title ?? activeSlide.title.replace(/\n/g, " "),
        image: activeSlide.video?.thumbnailUrl ?? activeSlide.image,
        subtitle: activeSlide.subtitle ?? undefined,
        description: activeSlide.description ?? undefined,
        hlsUrl: activeSlide.video?.hlsUrl ?? undefined,
      },
    );
  };

  const handleShow = () => {
    document
      .getElementById("programmi")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Contenuti in evidenza"
      className="relative min-h-[640px] overflow-hidden bg-black sm:min-h-[720px] lg:min-h-[760px]"
    >
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          aria-hidden={index !== active}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            index === active ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className="object-cover object-[64%_center] sm:object-[70%_center]"
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-[linear-gradient(90deg,#020711_0%,rgba(2,7,17,.97)_22%,rgba(2,7,17,.72)_48%,rgba(2,7,17,.18)_74%,rgba(2,7,17,.05)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,#020711_0%,rgba(2,7,17,.58)_18%,transparent_48%,rgba(2,7,17,.45)_100%)]" />
      <div className="absolute inset-y-0 left-0 w-[56vw] bg-[radial-gradient(circle_at_0%_48%,rgba(3,169,244,.14),transparent_34%)]" />

      <div className="relative z-10 flex min-h-[640px] w-full items-end px-4 pb-24 pt-28 sm:min-h-[720px] sm:items-center sm:px-5 sm:pb-16 lg:min-h-[760px] lg:px-6 xl:px-8">
        <div
          key={activeSlide.id}
          className="max-w-[700px] animate-[carousel-mask-open_640ms_cubic-bezier(0.22,1,0.36,1)_both]"
        >
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-white/58 sm:text-sm">
            {activeSlide.eyebrow || "TVMIX Original"}
          </p>
          <h1 className="max-w-[780px] text-[2.25rem] font-black leading-[1.02] tracking-[-0.045em] text-white/88 sm:text-[3.35rem] lg:text-[4.5rem]">
            {activeSlide.title.replace(/\n/g, " ")}
          </h1>
          {activeSlide.subtitle ? (
            <p className="mt-5 max-w-[670px] text-lg font-bold leading-7 text-cyan/90 sm:text-2xl sm:leading-8">
              {activeSlide.subtitle}
            </p>
          ) : null}
          {activeSlide.description ? (
            <p className="mt-3 max-w-[650px] text-sm leading-6 text-white/68 sm:text-base sm:leading-7">
              {activeSlide.description}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-white/55 sm:text-xs">
            <span>{activeSlide.subtitle || "On demand"}</span>
            <span className="text-white/28">|</span>
            <span>Streaming</span>
            <span className="text-white/28">|</span>
            <span>TVMIX</span>
            <span className="text-white/28">|</span>
            <span>HD</span>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePlay}
              className="inline-flex h-10 items-center gap-2 rounded-[3px] bg-cyan px-4 text-sm font-extrabold text-white transition hover:bg-[#18c1ff] sm:h-11 sm:px-5"
            >
              <Play size={16} fill="currentColor" />
              {activeSlide.ctaLabel || "Guarda ora"}
            </button>
            <button
              type="button"
              onClick={handleShow}
              className="inline-flex h-10 items-center rounded-[3px] border border-cyan/60 bg-black/10 px-4 text-sm font-bold text-cyan backdrop-blur-sm transition hover:bg-cyan/10 sm:h-11 sm:px-5"
            >
              Vai allo Show
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => changeSlide(-1)}
        aria-label="Slide precedente"
        className="absolute bottom-10 right-[calc(3%+52px)] z-20 hidden size-10 place-items-center rounded-full border border-white/10 bg-black/20 text-white/80 backdrop-blur transition hover:border-cyan/60 hover:text-cyan sm:grid"
      >
        <ChevronLeft />
      </button>
      <button
        type="button"
        onClick={() => changeSlide(1)}
        aria-label="Slide successiva"
        className="absolute bottom-10 right-[3%] z-20 hidden size-10 place-items-center rounded-full border border-white/10 bg-black/20 text-white/80 backdrop-blur transition hover:border-cyan/60 hover:text-cyan sm:grid"
      >
        <ChevronRight />
      </button>

      <div className="absolute bottom-10 left-[3%] z-20 flex gap-2 sm:bottom-12">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Vai alla slide ${index + 1}`}
            aria-current={index === active}
            className={`h-1 rounded-full transition-all ${
              index === active ? "w-10 bg-cyan" : "w-5 bg-white/35"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
