"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Clock, Play } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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

function EmptyModuleNotice({ text = "Nessun contenuto pubblicato per questo modulo." }: { text?: string }) {
  return (
    <div className="min-w-[260px] rounded-md border border-dashed border-white/15 bg-white/[0.035] p-5 text-sm leading-6 text-white/55 sm:min-w-[360px]">
      {text}
    </div>
  );
}

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function mediaMetaLine(item: MediaItem, fallback = "Archivio TVMIX") {
  return [item.archiveLabel || item.subtitle || fallback, item.duration ? formatDuration(item.duration) : null]
    .filter(Boolean)
    .join(" · ");
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
    return <div className="aspect-video w-full rounded-md bg-white/5 lg:min-w-[min(44vw,560px)]" />;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className="relative aspect-video w-full overflow-hidden rounded-md bg-black text-left shadow-2xl shadow-black/30 lg:min-w-[min(44vw,560px)]"
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

function SonicPlaylistFeatured({
  item,
  module,
  onSelect,
}: {
  item?: MediaItem;
  module: HomeModule;
  onSelect: (item: MediaItem) => void;
}) {
  if (!item) {
    return (
      <div className="sonicplaylist__player min-h-[300px] w-full max-w-[510px] rounded-[18px] border border-white/10 bg-white/[0.04]" />
    );
  }

  return (
    <article className="sonicplaylist__player group/player w-full overflow-hidden rounded-[18px] border border-white/10 bg-[#050b14] shadow-[0_28px_80px_rgba(0,0,0,0.42)] lg:max-w-[510px]">
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="relative block aspect-video w-full overflow-hidden bg-black text-left"
        aria-label={`Riproduci ${item.title}`}
      >
        {item.hlsUrl ? (
          <VideoPlayer src={item.hlsUrl} poster={item.image} title={item.title} />
        ) : (
          <Image src={item.image} alt="" fill priority={false} sizes="(min-width: 1024px) 510px, 94vw" className="object-cover" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.48)_0%,rgba(0,0,0,0.12)_46%,rgba(0,0,0,0.03)_100%)]" />
        <span className="absolute left-5 top-5 inline-grid size-12 place-items-center rounded-full bg-white text-black opacity-95 shadow-xl transition group-hover/player:scale-105 group-hover/player:bg-cyan">
          <Play size={18} fill="currentColor" />
        </span>
      </button>

      <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 sm:p-5">
        <h3 className="text-[clamp(1.25rem,2.2vw,2.35rem)] font-black uppercase leading-[0.94] tracking-[-0.05em] text-white">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[500px] text-sm font-medium leading-5 text-white/70">
          {item.description || module.subtitle || "Guarda il contenuto selezionato dalla libreria TVMIX."}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.13em] text-cyan/90">
            {mediaMetaLine(item, module.title)}
          </span>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="ml-0 inline-flex h-9 items-center gap-2 rounded-full bg-white px-4 text-xs font-black uppercase tracking-[-0.01em] text-black shadow-xl transition hover:scale-[1.02] hover:bg-cyan focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan sm:ml-auto"
          >
            <Play size={14} fill="currentColor" />
            Guarda
          </button>
        </div>
      </div>
    </article>
  );
}

function SonicPlaylistThumbnail({
  item,
  active,
  onPreview,
  onSelect,
}: {
  item: MediaItem;
  active: boolean;
  onPreview: () => void;
  onSelect: (item: MediaItem) => void;
}) {
  return (
    <article
      className={`sonicplaylist__thumb group/thumb relative flex w-[58vw] min-w-[212px] max-w-[263px] shrink-0 snap-start flex-col overflow-hidden rounded-[14px] border bg-[#050b14] text-left shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition duration-300 sm:w-[37.5vw] lg:w-[13.75vw] lg:max-w-[213px] ${
        active ? "border-cyan ring-2 ring-cyan/35" : "border-white/10 hover:border-white/35"
      }`}
      onMouseEnter={onPreview}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        <button type="button" onClick={onPreview} className="absolute inset-0 z-10" aria-label={`Mostra ${item.title} nel player`} />
        <Image
          src={item.image}
          alt=""
          fill
          loading="lazy"
          sizes="263px"
          className="object-cover transition duration-500 group-hover/thumb:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(item);
          }}
          className="absolute right-2 top-2 z-20 grid size-7 place-items-center rounded-full bg-white text-black opacity-0 shadow-xl transition group-hover/thumb:opacity-100 group-focus-within/thumb:opacity-100"
          aria-label={`Guarda ${item.title}`}
        >
          <Play size={12} fill="currentColor" />
        </button>
      </div>
      <div className="min-h-[118px] border-t border-white/10 p-3">
        <p className="line-clamp-2 text-sm font-black uppercase leading-[0.98] tracking-[-0.035em] text-white">
          {item.title}
        </p>
        <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-white/58">
          {item.description || "Contenuto disponibile nel catalogo TVMIX."}
        </p>
        <p className="mt-2 line-clamp-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan/85">
          {mediaMetaLine(item)}
        </p>
      </div>
    </article>
  );
}

function CarouselSliderModule({ module, onSelect }: { module: HomeModule; onSelect: (item: MediaItem) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(module.items[0]?.id ?? null);
  const featured = module.items.find((item) => item.id === activeId) ?? module.items[0];
  const items = module.items;
  const scroll = (direction: number) =>
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section id={`module-${module.id}`} className="sonicplaylist__bg content-auto group/rail relative overflow-hidden py-8 sm:py-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(3,169,244,0.18),transparent_32%),linear-gradient(180deg,rgba(2,7,17,0.2),#020711_92%)]" />
      <div className="relative z-10 px-[3%]">
        <div className="mb-5 flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="carousel-static-reveal text-[11px] font-black uppercase tracking-[0.22em] text-cyan/85">
              Playlist
            </p>
            <h2 className="carousel-static-reveal mt-1 max-w-4xl text-[clamp(1.55rem,3.2vw,3.35rem)] font-black uppercase leading-[0.92] tracking-[-0.055em]">
              {module.title}
            </h2>
            {module.subtitle ? (
              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/58">{module.subtitle}</p>
            ) : null}
          </div>

          <div className="carousel-static-reveal flex items-center gap-2">
            <RailButton label={`Scorri indietro ${module.title}`} direction="prev" onClick={() => scroll(-1)} />
            <RailButton label={`Scorri avanti ${module.title}`} direction="next" onClick={() => scroll(1)} />
          </div>
        </div>

        <div className="grid min-w-0 items-end gap-4 lg:grid-cols-[minmax(390px,510px)_minmax(0,1fr)] xl:gap-5">
          <SonicPlaylistFeatured item={featured} module={module} onSelect={onSelect} />
          <div
            ref={railRef}
            className="no-scrollbar flex snap-x snap-mandatory items-end gap-3 overflow-x-auto pb-0 lg:items-end xl:gap-4"
          >
          {module.items.length > 0 ? (
            items.map((item) => (
              <SonicPlaylistThumbnail
                key={item.id}
                item={item}
                active={item.id === featured?.id}
                onPreview={() => setActiveId(item.id)}
                onSelect={onSelect}
              />
            ))
          ) : (
            <EmptyModuleNotice />
          )}
          </div>
        </div>
      </div>
    </section>
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
          {module.items.length > 0 ? (
            module.items.map((item) => (
              <MediaThumbnail key={item.id} item={item} poster onSelect={onSelect} />
            ))
          ) : (
            <EmptyModuleNotice />
          )}
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
      <div className="flex flex-col gap-4 overflow-hidden px-[3%] lg:flex-row">
        <FeaturedPlayer item={liveItem} onSelect={onSelect} />
        <div ref={railRef} className="no-scrollbar flex min-w-0 flex-1 snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {module.epg.length > 0 ? module.epg.map((item) => {
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
          }) : (
            <EmptyModuleNotice text="Nessun evento EPG programmato per questa diretta." />
          )}
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
