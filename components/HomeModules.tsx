"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Clock, Play } from "lucide-react";
import { useMemo, useRef } from "react";
import type { HomeModule } from "@/lib/api";
import type { MediaItem } from "@/lib/content";

const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
  ssr: false,
  loading: () => <div className="aspect-video w-full animate-pulse bg-white/5" />,
});

type HomeModulesProps = {
  modules: HomeModule[];
  fallbackModules: HomeModule[];
  onSelect: (item: MediaItem) => void;
};

function RailButton({
  label,
  onClick,
  direction,
}: {
  label: string;
  onClick: () => void;
  direction: "prev" | "next";
}) {
  const Icon = direction === "prev" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-white/75 backdrop-blur transition hover:border-cyan/60 hover:bg-cyan hover:text-ink"
    >
      <Icon size={18} />
    </button>
  );
}

function ModuleShell({
  module,
  children,
  onPrev,
  onNext,
}: {
  module: HomeModule;
  children: React.ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  return (
    <section id={`module-${module.id}`} className="content-auto group/rail py-6 sm:py-9">
      <div className="mb-4 flex flex-col items-start gap-3 px-[3%]">
        <div>
          <p className="carousel-static-reveal text-[11px] font-bold uppercase tracking-[0.18em] text-cyan/75">
            {module.type === "LIVE_EPG" ? "Live & guida TV" : "TVMIX"}
          </p>
          <h2 className="carousel-static-reveal mt-1 text-xl font-extrabold tracking-[-0.025em] sm:text-2xl">
            {module.title}
          </h2>
          {module.subtitle ? (
            <p className="mt-1 max-w-2xl text-sm text-white/55">{module.subtitle}</p>
          ) : null}
        </div>

        {onPrev && onNext ? (
          <div className="carousel-static-reveal flex flex-wrap items-center justify-start gap-2">
            <RailButton label={`Scorri indietro ${module.title}`} direction="prev" onClick={onPrev} />
            <RailButton label={`Scorri avanti ${module.title}`} direction="next" onClick={onNext} />
          </div>
        ) : null}
      </div>

      {children}
    </section>
  );
}

function MediaThumbnail({
  item,
  poster = false,
  onSelect,
}: {
  item: MediaItem;
  poster?: boolean;
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`carousel-card group/card relative shrink-0 snap-start overflow-hidden rounded-md bg-panel text-left ${
        poster
          ? "aspect-[2/3] w-[42vw] max-w-[210px] sm:w-[22vw] lg:w-[14vw] xl:w-[11vw]"
          : "aspect-video w-[42vw] max-w-[260px] sm:w-[24vw] lg:w-[16vw] xl:w-[13vw]"
      }`}
    >
      <Image
        src={item.image}
        alt=""
        fill
        loading="lazy"
        sizes={poster ? "210px" : "260px"}
        className="object-cover transition duration-500 group-hover/card:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
      <div className="absolute bottom-3 left-[5%] right-[5%]">
        <span className="carousel-mask-reveal mb-2 inline-grid size-8 place-items-center rounded-full bg-white text-ink shadow-xl">
          <Play size={14} fill="currentColor" />
        </span>
        <div className="carousel-mask-reveal text-left">
          <p className="text-sm font-extrabold leading-tight">{item.title}</p>
          <p className="mt-0.5 text-[11px] font-medium text-white/65">{item.subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function FeaturedPlayer({
  item,
  onSelect,
}: {
  item?: MediaItem;
  onSelect: (item: MediaItem) => void;
}) {
  if (!item) {
    return <div className="aspect-video min-w-[min(88vw,560px)] rounded-md bg-white/5" />;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="relative aspect-video min-w-[min(88vw,560px)] overflow-hidden rounded-md bg-black text-left shadow-2xl shadow-black/30 lg:min-w-[560px]"
    >
      {item.hlsUrl ? (
        <VideoPlayer src={item.hlsUrl} poster={item.image} title={item.title} />
      ) : (
        <Image src={item.image} alt="" fill sizes="560px" className="object-cover" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <p className="text-lg font-black tracking-[-0.03em] sm:text-2xl">{item.title}</p>
        <p className="mt-1 line-clamp-2 text-sm text-white/68">{item.description ?? item.subtitle}</p>
      </div>
    </button>
  );
}

function CarouselSliderModule({ module, onSelect }: { module: HomeModule; onSelect: (item: MediaItem) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const featured = module.items[0];
  const items = module.items.slice(1);
  const scroll = (direction: number) =>
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <ModuleShell module={module} onPrev={() => scroll(-1)} onNext={() => scroll(1)}>
      <div className="flex gap-4 overflow-hidden px-[3%]">
        <FeaturedPlayer item={featured} onSelect={onSelect} />
        <div ref={railRef} className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4">
          {(items.length > 0 ? items : module.items).map((item) => (
            <MediaThumbnail key={item.id} item={item} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}

function PosterRailModule({ module, onSelect }: { module: HomeModule; onSelect: (item: MediaItem) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const scroll = (direction: number) =>
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * 0.82, behavior: "smooth" });

  return (
    <ModuleShell module={module} onPrev={() => scroll(-1)} onNext={() => scroll(1)}>
      <div className="px-[3%]">
        <div ref={railRef} className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:gap-4">
          {module.items.map((item) => (
            <MediaThumbnail key={item.id} item={item} poster onSelect={onSelect} />
          ))}
        </div>
      </div>
    </ModuleShell>
  );
}

function LiveEpgModule({ module, onSelect }: { module: HomeModule; onSelect: (item: MediaItem) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const stream = module.liveStream;
  const liveItem: MediaItem | undefined = stream
    ? {
        id: stream.id,
        title: stream.name,
        subtitle: stream.status === "LIVE" ? "In diretta" : stream.status,
        description: stream.description ?? undefined,
        image: stream.posterUrl || "/images/senza-filtri-hero.png",
        hlsUrl: stream.hlsUrl,
        live: stream.status === "LIVE",
      }
    : undefined;
  const now = useMemo(() => Date.now(), []);
  const scroll = (direction: number) =>
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <ModuleShell module={module} onPrev={() => scroll(-1)} onNext={() => scroll(1)}>
      <div className="flex gap-4 overflow-hidden px-[3%]">
        <FeaturedPlayer item={liveItem} onSelect={onSelect} />
        <div ref={railRef} className="no-scrollbar flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {module.epg.map((item) => {
            const start = new Date(item.startsAt).getTime();
            const end = new Date(item.endsAt).getTime();
            const progress = now >= start && now <= end ? ((now - start) / (end - start)) * 100 : 0;
            return (
              <article
                key={item.id}
                className="min-w-[260px] snap-start rounded-md border border-white/10 bg-white/[0.045] p-4 backdrop-blur sm:min-w-[320px]"
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-cyan/80">
                  <Clock size={14} />
                  <span>
                    {new Date(item.startsAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} -{" "}
                    {new Date(item.endsAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black tracking-[-0.02em]">{item.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/62">{item.description}</p>
                <span className="mt-4 block h-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-cyan" style={{ width: `${progress}%` }} />
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </ModuleShell>
  );
}

export function HomeModules({ modules, fallbackModules, onSelect }: HomeModulesProps) {
  const visibleModules = modules.length > 0 ? modules : fallbackModules;

  return (
    <div className="-mt-7 relative z-20 pb-4 sm:-mt-14">
      {visibleModules.map((module) => {
        if (module.type === "LIVE_EPG") {
          return <LiveEpgModule key={module.id} module={module} onSelect={onSelect} />;
        }
        if (module.type === "POSTER_RAIL") {
          return <PosterRailModule key={module.id} module={module} onSelect={onSelect} />;
        }
        return <CarouselSliderModule key={module.id} module={module} onSelect={onSelect} />;
      })}
    </div>
  );
}
