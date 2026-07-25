"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Info, Megaphone, MessageSquare, Monitor, Play, Send, Share2, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

const PLAYLIST_CYCLE_SECONDS = 12 * 60 * 60;

type PlaylistPlayback = {
  epgId: string;
  item: MediaItem;
  seekTo: number;
  key: string;
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
    <section id={`module-${module.id}`} className="content-auto group/rail scroll-mt-24 py-6 sm:py-9">
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

function mediaArchiveLabel(item: MediaItem, fallback = "Archivio TVMIX") {
  return item.archiveLabel || item.subtitle || fallback;
}

function mediaDurationLabel(item: MediaItem) {
  return item.duration ? formatDuration(item.duration) : "";
}

function mediaDurationSummary(item: MediaItem) {
  if (!item.duration) return "Durata non indicata";
  const totalMinutes = Math.max(0, Math.round(item.duration / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function mediaSharePayload(item: MediaItem) {
  const path = item.id ? `/?media=${encodeURIComponent(item.id)}` : "/";
  const url = typeof window !== "undefined" ? `${window.location.origin}${path}` : `https://www.tvmix.it${path}`;
  const text = `Guarda ${item.title} su TVMIX`;
  return {
    url,
    text,
    encodedUrl: encodeURIComponent(url),
    encodedText: encodeURIComponent(text),
  };
}

function mediaSocialLinks(item: MediaItem) {
  const payload = mediaSharePayload(item);
  return [
    { label: "Facebook", icon: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${payload.encodedUrl}` },
    { label: "X", icon: "X", href: `https://twitter.com/intent/tweet?url=${payload.encodedUrl}&text=${payload.encodedText}` },
    { label: "WhatsApp", icon: "W", href: `https://wa.me/?text=${payload.encodedText}%20${payload.encodedUrl}` },
    { label: "Telegram", icon: "T", href: `https://t.me/share/url?url=${payload.encodedUrl}&text=${payload.encodedText}` },
  ];
}

function mediaBooleanFlag(item: MediaItem, keys: string[]) {
  const record = item as unknown as Record<string, unknown>;
  return keys.some((key) => {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return ["true", "yes", "on", "1", "presente", "presenti"].includes(value.toLowerCase());
    if (Array.isArray(value)) return value.length > 0;
    return false;
  });
}

function mediaSeasonEpisodeLabel(item: MediaItem) {
  const season = item.seasonNumber ? `Stagione ${item.seasonNumber}` : item.seasonTitle || "";
  const episode = item.episodeNumber ? `Ep. ${item.episodeNumber}` : "";
  return [season, episode].filter(Boolean).join(" · ") || mediaArchiveLabel(item);
}

function mediaEpisodeSummary(item: MediaItem) {
  if (!item.episodeNumber) return "Episodio non indicato";
  if (item.seasonEpisodeCount) return `Episodio ${item.episodeNumber} di ${item.seasonEpisodeCount} episodi`;
  return `Episodio ${item.episodeNumber}`;
}

function activeVideoQuality(item: MediaItem) {
  const value = `${item.videoQuality ?? ""} ${item.mediaFormat ?? ""}`.toLowerCase();
  if (value.includes("4k") || value.includes("2160") || value.includes("uhd")) return "4K";
  if (value.includes("hd") || value.includes("720") || value.includes("1080")) return "HD";
  if (value.includes("sd") || value.includes("480") || value.includes("576")) return "SD";
  return "";
}

function audioTrackList(item: MediaItem) {
  return Array.isArray(item.audioTracks) ? item.audioTracks as Array<Record<string, unknown>> : [];
}

function hasStereoAudio(item: MediaItem) {
  return audioTrackList(item).some((track) => Number(track.channels ?? 0) >= 2 || String(track.layout ?? "").toLowerCase().includes("stereo"));
}

function hasMonoAudio(item: MediaItem) {
  return audioTrackList(item).some((track) => Number(track.channels ?? 0) === 1 || String(track.layout ?? "").toLowerCase().includes("mono"));
}

function hasDolbyAudio(item: MediaItem) {
  return audioTrackList(item).some((track) => /ac-?3|eac-?3|dolby|5\.1|7\.1/i.test(`${track.codec ?? ""} ${track.layout ?? ""}`));
}

function hasAudioDescription(item: MediaItem) {
  return mediaBooleanFlag(item, ["audioDescription", "audioDescriptions", "hasAudioDescription"]);
}

function hasSubtitles(item: MediaItem) {
  return mediaBooleanFlag(item, ["subtitles", "captions", "hasSubtitles"]);
}

async function copyMediaShareLink(item: MediaItem) {
  if (typeof navigator === "undefined" || !navigator.clipboard) return;
  const payload = mediaSharePayload(item);
  await navigator.clipboard.writeText(`${payload.text} ${payload.url}`);
}

function proxyPlaybackUrl(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname !== "media.tvmix.it") return value;
    return `/api/media${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function secondsOfHalfDay(time: number) {
  const date = new Date(time);
  return ((date.getHours() % 12) * 3600) + date.getMinutes() * 60 + date.getSeconds();
}

function secondsFromItemDay(value: string) {
  const date = new Date(value);
  return (date.getHours() % 12) * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function formatCycleTime(second: number) {
  const safe = Math.max(0, Math.min(PLAYLIST_CYCLE_SECONDS, Math.round(second)));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function activePlaylistItem(module: HomeModule, now: number) {
  const cycleSecond = secondsOfHalfDay(now);
  for (const item of module.epg) {
    if (!item.video?.hlsUrl) continue;
    const startsAt = secondsFromItemDay(item.startsAt);
    const duration = Math.max(1, Math.round((new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 1000));
    const endsAt = Math.min(PLAYLIST_CYCLE_SECONDS, startsAt + duration);
    if (cycleSecond >= startsAt && cycleSecond < endsAt) {
      return {
        item,
        seekTo: cycleSecond - startsAt,
        progress: ((cycleSecond - startsAt) / duration) * 100,
      };
    }
  }
  return null;
}

function sortedPlayablePlaylistItems(module: HomeModule) {
  return module.epg
    .filter((item) => Boolean(item.video?.hlsUrl))
    .map((item) => ({
      item,
      startsAt: secondsFromItemDay(item.startsAt),
    }))
    .sort((a, b) => a.startsAt - b.startsAt);
}

function nextPlaylistPlayback(module: HomeModule, currentEpgId: string): PlaylistPlayback | null {
  const playable = sortedPlayablePlaylistItems(module);
  if (!playable.length) return null;
  const index = playable.findIndex((entry) => entry.item.id === currentEpgId);
  const next = playable[index >= 0 ? (index + 1) % playable.length : 0];
  if (!next.item.video?.hlsUrl) return null;
  return {
    epgId: next.item.id,
    item: {
      ...next.item.video,
      subtitle: "Playlist sincronizzata",
      live: true,
    },
    seekTo: 0,
    key: `${next.item.id}-${Date.now()}`,
  };
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
        <VideoPlayer src={item.hlsUrl} poster={item.image} title={item.title} vastUrl={item.vastUrl} />
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

function SonicLivePlayer({
  item,
  module,
  onSelect,
  seekTo,
  playbackKey,
  autoPlay = false,
  deferPlayback = false,
  onStartPlayback,
  onEnded,
  onPause,
}: {
  item?: MediaItem;
  module: HomeModule;
  onSelect: (item: MediaItem) => void;
  seekTo?: number;
  playbackKey?: string;
  autoPlay?: boolean;
  deferPlayback?: boolean;
  onStartPlayback?: () => void;
  onEnded?: () => void;
  onPause?: () => void;
}) {
  if (!item) {
    return (
      <div className="sonicplaylist__player min-h-[300px] w-full max-w-[510px] rounded-[18px] border border-white/10 bg-white/[0.04]" />
    );
  }

  return (
    <article className="sonicplaylist__player group/player w-full overflow-hidden rounded-[18px] border border-white/10 bg-[#050b14] shadow-[0_28px_80px_rgba(0,0,0,0.42)] lg:max-w-[510px]">
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {item.hlsUrl && !deferPlayback ? (
          <VideoPlayer
            key={playbackKey ?? item.id}
            src={item.hlsUrl}
            poster={item.image}
            title={item.title}
            vastUrl={item.vastUrl}
            autoPlay={autoPlay}
            seekTo={seekTo}
            seekKey={seekTo !== undefined ? `${item.id}-${Math.floor(seekTo)}` : item.id}
            onEnded={onEnded}
            onPause={onPause}
          />
        ) : (
          <>
            <Image src={item.image} alt="" fill sizes="(min-width: 1024px) 510px, 94vw" className="object-cover" />
            {item.hlsUrl && deferPlayback ? (
              <button
                type="button"
                onClick={onStartPlayback}
                className="absolute inset-0 grid place-items-center bg-black/18 text-white/75 transition hover:bg-black/28 hover:text-white"
                aria-label="Avvia playlist dal playhead"
              >
                <span className="grid place-items-center drop-shadow-[0_18px_35px_rgba(0,0,0,0.95)]">
                  <Play size={112} fill="currentColor" strokeWidth={1.2} className="translate-x-1 opacity-80 sm:size-36" />
                  <span className="mt-3 rounded-full bg-black/55 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em]">
                    Avvia dal playhead
                  </span>
                </span>
              </button>
            ) : null}
          </>
        )}
      </div>
      <div className="flex min-h-[178px] flex-col border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 sm:p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
          {item.live ? "In diretta" : item.subtitle || "Live"}
        </p>
        <h3 className="mt-1 line-clamp-1 text-[clamp(1.05rem,1.65vw,1.65rem)] font-black uppercase leading-none tracking-[-0.045em] text-white">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[500px] text-sm font-medium leading-5 text-white/70">
          {item.description || module.subtitle || "Canale live TVMIX con palinsesto aggiornato."}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span className="min-w-0 truncate text-left text-[10px] font-black uppercase tracking-[0.13em] text-cyan/90">
            {module.title}
          </span>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="shrink-0 text-right text-[10px] font-black uppercase tracking-[0.13em] text-white/70"
          >
            Apri player
          </button>
        </div>
      </div>
    </article>
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
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {item.hlsUrl ? (
          <VideoPlayer key={item.id} src={item.hlsUrl} poster={item.image} title={item.title} vastUrl={item.vastUrl} />
        ) : (
          <Image src={item.image} alt="" fill priority={false} sizes="(min-width: 1024px) 510px, 94vw" className="object-cover" />
        )}
      </div>

      <div className="flex min-h-[178px] flex-col border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-4 sm:p-5">
        <h3 className="line-clamp-1 text-[clamp(1.05rem,1.65vw,1.65rem)] font-black uppercase leading-none tracking-[-0.045em] text-white">
          {item.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[500px] text-sm font-medium leading-5 text-white/70">
          {item.description || module.subtitle || "Guarda il contenuto selezionato dalla libreria TVMIX."}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <span className="min-w-0 truncate text-left text-[10px] font-black uppercase tracking-[0.13em] text-cyan/90">
            {mediaArchiveLabel(item, module.title)}
          </span>
          <span className="shrink-0 text-right text-[10px] font-black uppercase tracking-[0.13em] text-white/70">
            {mediaDurationLabel(item)}
          </span>
        </div>
      </div>
    </article>
  );
}

function SonicPlaylistThumbnail({
  item,
  active,
  onChoose,
  onInfo,
  onPlay,
}: {
  item: MediaItem;
  active: boolean;
  onChoose: () => void;
  onInfo: () => void;
  onPlay: () => void;
}) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [hoverPreviewActive, setHoverPreviewActive] = useState(false);

  const openHover = () => {
    setHoverOpen(true);
    setHoverPreviewActive(Boolean(item.hlsUrl));
  };
  const closeHover = () => {
    setHoverOpen(false);
    setHoverPreviewActive(false);
  };

  return (
    <article
      onMouseEnter={openHover}
      onMouseLeave={closeHover}
      onFocus={openHover}
      className={`sonicplaylist__thumb group/thumb relative flex w-[87vw] min-w-[318px] max-w-[395px] shrink-0 snap-start flex-col overflow-visible rounded-[14px] border bg-[#050b14] text-left shadow-[0_16px_40px_rgba(0,0,0,0.28)] transition duration-300 sm:w-[56vw] lg:w-[20.5vw] lg:max-w-[320px] ${
        active ? "border-cyan ring-2 ring-cyan/35" : "border-white/10 hover:border-white/35"
      }`}
    >
      <div className="relative aspect-video w-full overflow-hidden rounded-t-[14px] bg-black">
        <button type="button" onClick={onChoose} className="absolute inset-0 z-10" aria-label={`Mostra ${item.title} nel player`} />
        <Image
          src={item.image}
          alt=""
          fill
          loading="lazy"
          sizes="395px"
          className="object-cover transition duration-500 group-hover/thumb:scale-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      </div>
      <div className="relative flex min-h-[142px] flex-col border-t border-white/10 p-3">
        <p className="line-clamp-2 min-w-0 text-[13px] font-black uppercase leading-[1.03] tracking-[-0.035em] text-white">
          {item.title}
        </p>
        <p className="mt-2 line-clamp-2 text-[10px] font-semibold leading-4 text-white/58">
          {item.description || item.subtitle || "Contenuto disponibile nel catalogo TVMIX."}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <span className="min-w-0 truncate text-left text-[9px] font-black uppercase tracking-[0.13em] text-cyan/85">
            {mediaSeasonEpisodeLabel(item)}
          </span>
          <span className="shrink-0 text-right text-[9px] font-black uppercase tracking-[0.13em] text-white/68">
            {mediaDurationLabel(item)}
          </span>
        </div>
      </div>
      {hoverOpen ? (
        <div className="absolute left-1/2 top-0 z-50 w-[150%] min-w-[360px] -translate-x-1/2 -translate-y-[34%] rounded-[18px] border border-cyan/30 bg-[#050b14]/98 p-2 shadow-[0_28px_90px_rgba(0,0,0,0.72)] backdrop-blur-xl">
          <div className="relative aspect-video overflow-hidden rounded-[14px] bg-black">
            <CarouselClipPreviewMedia item={item} active={hoverPreviewActive} muted onPreviewEnd={() => setHoverPreviewActive(false)} durationMs={20_000} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onPlay}
              aria-label={`Riproduci ${item.title}`}
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-transparent text-white transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
            >
              <Play size={16} fill="currentColor" />
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onInfo}
                aria-label={`Informazioni ${item.title}`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-transparent text-white/85 transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
              >
                <ChevronDown size={18} />
              </button>
              {mediaSocialLinks(item).map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Condividi ${item.title} su ${link.label}`}
                  className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-transparent text-xs font-black text-white/85 transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
                >
                  {link.label === "Telegram" ? <Send size={15} /> : link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function StatusIcon({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      title={label}
      aria-label={`${label}: ${active ? "attivo" : "non attivo"}`}
      className={`inline-flex min-w-[72px] items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition ${
        active
          ? "border-cyan/75 bg-cyan/15 text-cyan shadow-[0_0_24px_rgba(3,169,244,0.2)]"
          : "border-white/10 bg-white/[0.025] text-white/26"
      }`}
    >
      {children}
    </span>
  );
}

function CarouselClipPreviewMedia({
  item,
  active,
  onPreviewEnd,
  muted,
  durationMs = 10_000,
}: {
  item: MediaItem;
  active: boolean;
  onPreviewEnd: () => void;
  muted: boolean;
  durationMs?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!active || !item.hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;
    let hls: { destroy: () => void } | null = null;
    let cancelled = false;
    const previewUrl = proxyPlaybackUrl(item.hlsUrl);

    const startPreview = async () => {
      if (cancelled) return;
      try {
        const target = video.duration && Number.isFinite(video.duration) ? Math.min(120, Math.max(0, video.duration - 1)) : 120;
        video.currentTime = target;
        video.muted = muted;
        video.playsInline = true;
        await video.play();
      } catch {
        // Se il browser blocca la preview, resta comunque visibile la miniatura finale.
      }
    };

    const loadPreview = async () => {
      if (!previewUrl) return;
      if (previewUrl.includes(".m3u8")) {
        const Hls = (await import("hls.js")).default;
        if (cancelled) return;
        if (Hls.isSupported()) {
          const hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: true });
          hls = hlsInstance;
          hlsInstance.loadSource(previewUrl);
          hlsInstance.attachMedia(video);
          hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => void startPreview());
          return;
        }
      }
      video.src = previewUrl;
      video.load();
      video.addEventListener("loadedmetadata", startPreview, { once: true });
    };

    void loadPreview();

    const timer = window.setTimeout(() => {
      video.pause();
      onPreviewEnd();
    }, durationMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [active, durationMs, item.hlsUrl, muted, onPreviewEnd]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  if (!active || !item.hlsUrl) {
    return <Image src={item.image} alt="" fill sizes="33vw" className="object-cover" />;
  }

  return (
    <video
      ref={videoRef}
      muted={muted}
      playsInline
      preload="auto"
      poster={item.image}
      className="h-full w-full object-cover"
      aria-label={`Anteprima ${item.title}`}
    />
  );
}

function CarouselClipInfoModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  const synopsis = item.description || "Sinossi non disponibile per questo contenuto.";
  const [previewActive, setPreviewActive] = useState(Boolean(item.hlsUrl));
  const [previewMuted, setPreviewMuted] = useState(true);
  const [bodyAnchorTop, setBodyAnchorTop] = useState(80);
  const quality = activeVideoQuality(item);
  const subtitlesActive = hasSubtitles(item);
  const audioDescriptionActive = hasAudioDescription(item);
  const audioLabel = audioDescriptionActive ? "AD" : hasDolbyAudio(item) ? "DB" : hasStereoAudio(item) ? "ST" : hasMonoAudio(item) ? "MN" : "Audio";
  const hasAudio = audioTrackList(item).length > 0 || audioDescriptionActive;
  const finishPreview = useCallback(() => setPreviewActive(false), []);

  useEffect(() => {
    setPreviewActive(Boolean(item.hlsUrl));
  }, [item.hlsUrl, item.id]);

  useEffect(() => {
    setBodyAnchorTop(Math.max(80, window.scrollY + 80));
  }, [item.id]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="absolute left-0 top-0 z-[999] w-full" role="dialog" aria-modal="false" aria-label={`Informazioni ${item.title}`}>
      <button type="button" aria-label="Chiudi informazioni clip" className="fixed inset-0 cursor-default bg-transparent" onClick={onClose} />
      <article
        className="absolute left-1/2 z-10 w-[50vw] min-w-[420px] max-w-[840px] -translate-x-1/2 overflow-hidden rounded-[22px] border border-cyan/25 bg-[#050b14]/98 text-white shadow-[0_28px_100px_rgba(0,0,0,0.72)] backdrop-blur-xl"
        style={{ top: bodyAnchorTop }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-3 top-3 z-30 grid size-9 place-items-center rounded-xl border border-white/20 bg-transparent text-white/85 backdrop-blur transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
        >
          <X size={18} />
        </button>

        <div className="relative aspect-video overflow-hidden bg-black">
          <CarouselClipPreviewMedia item={item} active={previewActive} muted={previewMuted} onPreviewEnd={finishPreview} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
          {previewActive && item.hlsUrl ? (
            <button
              type="button"
              onClick={() => setPreviewMuted((value) => !value)}
              aria-label={previewMuted ? "Attiva audio anteprima" : "Disattiva audio anteprima"}
              className="absolute bottom-3 right-3 z-30 grid size-9 place-items-center rounded-xl border border-white/20 bg-transparent text-white/85 backdrop-blur transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
            >
              {previewMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          ) : null}
          <div className="absolute bottom-4 left-4 right-12">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan/90">
              Scheda clip
            </p>
            <h3 className="mt-1 line-clamp-3 text-[clamp(1.35rem,2.9vw,2.7rem)] font-black uppercase leading-[0.9] tracking-[-0.06em] text-white">
              {item.title}
            </h3>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 pb-3">
            <span className="text-xs font-black uppercase tracking-[0.13em] text-cyan/90">
              {mediaSeasonEpisodeLabel(item)}
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-white/82">
              <Clock size={15} className="text-cyan" />
              {mediaDurationSummary(item)}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <StatusIcon label={`Qualità video ${quality || "non indicata"}`} active={Boolean(quality)}>
              <Monitor size={16} />
              {quality || "Q"}
            </StatusIcon>
            <StatusIcon label={`Tipo audio ${audioLabel}`} active={hasAudio}>
              <Volume2 size={16} />
              {audioLabel}
            </StatusIcon>
            <StatusIcon label="Sottotitoli" active={subtitlesActive}>
              <MessageSquare size={16} />
              ST
            </StatusIcon>
            <StatusIcon label="Audiodescrizioni" active={audioDescriptionActive}>
              <Megaphone size={16} />
              AD
            </StatusIcon>
          </div>

          <div className="hidden">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
              <Monitor size={15} /> Qualità video
            </span>
            <StatusIcon label={`Qualità video ${quality || "non indicata"}`} active={Boolean(quality)}>
              <Monitor size={16} />
              {quality || "Q"}
            </StatusIcon>
          </div>

          <div className="hidden">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
              <Volume2 size={15} /> Audio
            </span>
            <StatusIcon label={`Tipo audio ${audioLabel}`} active={hasAudio}>
              <Volume2 size={16} />
              {audioLabel}
            </StatusIcon>
          </div>

          <div className="hidden">
            <StatusIcon label="Sottotitoli" active={subtitlesActive}>
              <MessageSquare size={16} />
              ST
            </StatusIcon>
            <StatusIcon label="Audiodescrizioni" active={audioDescriptionActive}>
              <Megaphone size={16} />
              AD
            </StatusIcon>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
            {mediaSocialLinks(item).map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                aria-label={`Condividi ${item.title} su ${link.label}`}
                className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-transparent text-xs font-black text-white/85 transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
              >
                {link.label === "Telegram" ? <Send size={15} /> : link.icon}
              </a>
            ))}
            <button
              type="button"
              onClick={() => void copyMediaShareLink(item)}
              className="inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-transparent text-white/85 transition hover:border-cyan/70 hover:bg-cyan/10 hover:text-cyan"
              aria-label={`Copia link ${item.title}`}
            >
              <Copy size={15} />
            </button>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan/85">Sinossi puntata</p>
            <p className="mt-2 line-clamp-7 whitespace-pre-wrap text-sm font-medium leading-6 text-white/76">
              {synopsis}
            </p>
          </div>
        </div>
      </article>
    </div>,
    document.body,
  );
}

function CarouselSliderModule({ module, onSelect }: { module: HomeModule; onSelect: (item: MediaItem) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(module.items[0]?.id ?? null);
  const [infoItem, setInfoItem] = useState<MediaItem | null>(null);
  const featured = module.items.find((item) => item.id === activeId) ?? module.items[0];
  const items = module.items;
  const scroll = (direction: number) =>
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section id={`module-${module.id}`} className="sonicplaylist__bg content-auto group/rail relative scroll-mt-24 overflow-visible py-8 sm:py-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,rgba(3,169,244,0.18),transparent_32%),linear-gradient(180deg,rgba(2,7,17,0.2),#020711_92%)]" />
      <div className="relative z-10 px-[3%]">
        <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(390px,510px)_minmax(0,1fr)] xl:gap-5">
          <SonicPlaylistFeatured item={featured} module={module} onSelect={onSelect} />
          <div className="flex min-w-0 flex-col justify-between gap-4">
            <div className="carousel-static-reveal flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan/85">
                  Playlist
                </p>
                <h2 className="mt-1 max-w-4xl text-[clamp(1.35rem,2.45vw,2.7rem)] font-black uppercase leading-[0.92] tracking-[-0.055em]">
                  {module.title}
                </h2>
                {module.subtitle ? (
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/58">{module.subtitle}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <RailButton label={`Scorri indietro ${module.title}`} direction="prev" onClick={() => scroll(-1)} />
                <RailButton label={`Scorri avanti ${module.title}`} direction="next" onClick={() => scroll(1)} />
              </div>
            </div>

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
                    onChoose={() => setActiveId(item.id)}
                    onInfo={() => setInfoItem(item)}
                    onPlay={() => onSelect(item)}
                  />
                ))
              ) : (
                <EmptyModuleNotice />
              )}
            </div>
          </div>
        </div>
      </div>
      {infoItem ? <CarouselClipInfoModal item={infoItem} onClose={() => setInfoItem(null)} /> : null}
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

function PublicPlaylistTimeline({ module, now }: { module: HomeModule; now: number }) {
  const cycleSecond = secondsOfHalfDay(now);
  const windowSeconds = 4 * 60 * 60;
  const maxWindowStart = PLAYLIST_CYCLE_SECONDS - windowSeconds;
  const [windowStart, setWindowStart] = useState(() =>
    Math.min(maxWindowStart, Math.max(0, Math.floor(Math.max(0, secondsOfHalfDay(Date.now()) - windowSeconds / 2) / 3600) * 3600)),
  );
  const windowEnd = windowStart + windowSeconds;
  const playheadInWindow = cycleSecond >= windowStart && cycleSecond <= windowEnd;
  const hourMarks = Array.from({ length: 5 }, (_, index) => windowStart + index * 3600);
  const playlistItems = module.epg
    .filter((item) => Boolean(item.video?.hlsUrl))
    .map((item) => {
      const startsAt = secondsFromItemDay(item.startsAt);
      const duration = Math.max(1, Math.round((new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 1000));
      const endsAt = Math.min(PLAYLIST_CYCLE_SECONDS, startsAt + duration);
      const isActive = cycleSecond >= startsAt && cycleSecond < endsAt;
      const progress = isActive ? ((cycleSecond - startsAt) / Math.max(1, endsAt - startsAt)) * 100 : 0;
      return { item, startsAt, endsAt, duration, isActive, progress };
    })
    .filter(({ startsAt, endsAt }) => startsAt < windowEnd && endsAt > windowStart)
    .sort((a, b) => a.startsAt - b.startsAt);
  const pan = (deltaSeconds: number) =>
    setWindowStart((value) => Math.min(maxWindowStart, Math.max(0, value + deltaSeconds)));
  const centerOnNow = () =>
    setWindowStart(Math.min(maxWindowStart, Math.max(0, Math.floor(Math.max(0, cycleSecond - windowSeconds / 2) / 300) * 300)));

  if (!module.epg.some((item) => item.video?.hlsUrl)) {
    return (
      <div className="rounded-[18px] border border-white/10 bg-[#050b14]/86 p-4">
        <EmptyModuleNotice text="Nessuna clip programmata nella timeline playlist." />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#050b14]/86 p-4 shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-300">Timeline playlist · finestra 4 ore</p>
          <p className="mt-1 text-xs text-white/46">
            Pan {formatCycleTime(windowStart)}-{formatCycleTime(windowEnd)}. La barra gialla indica il punto usato dal player quando premi play.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => pan(-3600)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-cyan/60 hover:text-cyan">
            -1h
          </button>
          <button type="button" onClick={centerOnNow} className="rounded-full border border-[#ffcc33]/40 bg-[#ffcc33]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#ffcc33] transition hover:bg-[#ffcc33]/20">
            Ora {formatCycleTime(cycleSecond)}
          </button>
          <button type="button" onClick={() => pan(3600)} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/70 transition hover:border-cyan/60 hover:text-cyan">
            +1h
          </button>
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={maxWindowStart}
        step={300}
        value={windowStart}
        onChange={(event) => setWindowStart(Number(event.target.value))}
        className="mb-3 w-full accent-[#ffcc33]"
        aria-label="Pan timeline playlist"
      />

      <div className="relative h-[270px] overflow-hidden rounded-xl border border-white/10 bg-[#020711] p-4">
        <div className="absolute inset-x-4 top-4 grid text-[9px] font-black uppercase tracking-[0.12em] text-white/42" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {hourMarks.slice(0, 4).map((hour) => (
            <span key={hour} className="border-l border-white/10 pl-1">
              {formatCycleTime(hour)}
            </span>
          ))}
        </div>
        <div className="absolute inset-x-4 top-11 h-px bg-white/10" />
        {hourMarks.map((hour) => (
          <span key={hour} className="absolute bottom-4 top-11 w-px bg-white/5" style={{ left: `calc(1rem + ${((hour - windowStart) / windowSeconds) * 100}% - ${((hour - windowStart) / windowSeconds) * 2}rem)` }} />
        ))}
        {playheadInWindow ? (
          <div
            className="absolute bottom-4 top-11 z-20 w-0.5 bg-[#ffcc33] shadow-[0_0_18px_rgba(255,204,51,0.75)]"
            style={{ left: `calc(1rem + ${((cycleSecond - windowStart) / windowSeconds) * 100}% - ${((cycleSecond - windowStart) / windowSeconds) * 2}rem)` }}
          >
            <span className="absolute -left-8 -top-6 rounded bg-[#ffcc33] px-2 py-0.5 text-[10px] font-black text-black">
              {formatCycleTime(cycleSecond)}
            </span>
          </div>
        ) : (
          <span className="absolute right-4 top-12 rounded-full border border-[#ffcc33]/30 bg-[#ffcc33]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#ffcc33]">
            Playhead fuori finestra
          </span>
        )}

        {playlistItems.length ? playlistItems.map(({ item, startsAt, endsAt, isActive, progress }) => {
          const visibleStart = Math.max(startsAt, windowStart);
          const visibleEnd = Math.min(endsAt, windowEnd);
          const visibleDuration = Math.max(1, visibleEnd - visibleStart);
          return (
          <article
            key={item.id}
            className={`absolute top-16 flex h-36 flex-col overflow-hidden rounded-xl border p-3 shadow-xl ${
              isActive ? "border-[#ffcc33] bg-red-500/[0.16] ring-2 ring-[#ffcc33]/70" : "border-cyan/25 bg-[#071321]"
            }`}
            style={{
              left: `calc(1rem + ${((visibleStart - windowStart) / windowSeconds) * 100}% - ${((visibleStart - windowStart) / windowSeconds) * 2}rem)`,
              width: `max(44px, calc(${(visibleDuration / windowSeconds) * 100}% - ${(visibleDuration / windowSeconds) * 2}rem))`,
            }}
          >
            <div className="text-[9px] font-black uppercase tracking-[0.12em] text-cyan/90">
              {formatCycleTime(startsAt)}
            </div>
            <h3 className="mt-2 line-clamp-2 text-sm font-black uppercase leading-tight text-white">
              {item.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/52">{item.description}</p>
            <span className="mt-auto block h-1.5 overflow-hidden rounded-full bg-white/10">
              <span className={`block h-full rounded-full ${isActive ? "bg-[#ffcc33]" : "bg-cyan/70"}`} style={{ width: `${Math.max(progress, isActive ? 3 : 0)}%` }} />
            </span>
          </article>
        );
        }) : (
          <div className="absolute inset-x-4 top-16 rounded-xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-white/45">
            Nessuna clip in questa finestra. Sposta il pan per consultare il resto della playlist.
          </div>
        )}
      </div>
    </div>
  );
}

function LiveEpgModule({ module, onSelect }: { module: HomeModule; onSelect: (item: MediaItem) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const stream = module.liveStream;
  const [now, setNow] = useState(() => Date.now());
  const [playlistPlayback, setPlaylistPlayback] = useState<PlaylistPlayback | null>(null);
  const playlistState = stream?.streamType === "PLAYLIST" ? activePlaylistItem(module, now) : null;
  const liveItem: MediaItem | undefined = stream
    ? stream.streamType === "PLAYLIST"
      ? playlistPlayback?.item ?? (playlistState?.item.video
        ? {
            ...playlistState.item.video,
            subtitle: "Playlist sincronizzata",
            live: true,
            progress: playlistState.progress,
          }
        : undefined)
      : {
        id: stream.id,
        title: stream.name,
        subtitle: stream.status === "LIVE" ? "In diretta" : stream.status,
        description: stream.description ?? undefined,
        image: stream.posterUrl || "/images/senza-filtri-hero.png",
        hlsUrl: proxyPlaybackUrl(stream.hlsUrl),
        live: stream.status === "LIVE",
      }
    : undefined;

  useEffect(() => {
    if (stream?.streamType !== "PLAYLIST") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [stream?.streamType]);

  useEffect(() => {
    if (stream?.streamType !== "PLAYLIST") setPlaylistPlayback(null);
  }, [stream?.streamType]);

  function startPlaylistFromPlayhead() {
    const state = activePlaylistItem(module, Date.now());
    if (!state?.item.video) return;
    setPlaylistPlayback({
      epgId: state.item.id,
      item: {
        ...state.item.video,
        subtitle: "Playlist sincronizzata",
        live: true,
        progress: state.progress,
      },
      seekTo: state.seekTo,
      key: `${state.item.id}-${Date.now()}`,
    });
  }

  function playNextPlaylistItem() {
    if (!playlistPlayback) return;
    setPlaylistPlayback(nextPlaylistPlayback(module, playlistPlayback.epgId));
  }

  function resetPlaylistPlayback() {
    setPlaylistPlayback(null);
  }

  const scroll = (direction: number) =>
    railRef.current?.scrollBy({ left: direction * railRef.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section id={`module-${module.id}`} className="sonicplaylist__bg content-auto group/epg relative scroll-mt-24 overflow-hidden py-8 sm:py-10 lg:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_18%,rgba(239,68,68,0.16),transparent_32%),linear-gradient(180deg,rgba(2,7,17,0.2),#020711_92%)]" />
      <div className="relative z-10 px-[3%]">
        <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-[minmax(390px,510px)_minmax(0,1fr)] xl:gap-5">
          <SonicLivePlayer
            item={liveItem}
            module={module}
            onSelect={onSelect}
            seekTo={playlistPlayback?.seekTo}
            playbackKey={playlistPlayback?.key}
            autoPlay={Boolean(playlistPlayback)}
            deferPlayback={stream?.streamType === "PLAYLIST" && !playlistPlayback}
            onStartPlayback={startPlaylistFromPlayhead}
            onEnded={stream?.streamType === "PLAYLIST" ? playNextPlaylistItem : undefined}
            onPause={stream?.streamType === "PLAYLIST" ? resetPlaylistPlayback : undefined}
          />

          <div className="flex min-w-0 flex-col justify-between gap-4">
            <div className="carousel-static-reveal flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-red-300">
                  <span className="size-2 rounded-full bg-red-400 shadow-[0_0_16px_rgba(248,113,113,0.9)]" />
                  {stream?.streamType === "PLAYLIST" ? "Playlist 12 ore" : "Live & guida TV"}
                </p>
                <h2 className="mt-1 max-w-4xl text-[clamp(1.35rem,2.45vw,2.7rem)] font-black uppercase leading-[0.92] tracking-[-0.055em]">
                  {module.title}
                </h2>
                {module.subtitle ? (
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-white/58">{module.subtitle}</p>
                ) : null}
              </div>

              {stream?.streamType !== "PLAYLIST" ? (
                <div className="flex shrink-0 items-center gap-2">
                  <RailButton label={`Scorri indietro ${module.title}`} direction="prev" onClick={() => scroll(-1)} />
                  <RailButton label={`Scorri avanti ${module.title}`} direction="next" onClick={() => scroll(1)} />
                </div>
              ) : null}
            </div>

            {stream?.streamType === "PLAYLIST" ? (
              <PublicPlaylistTimeline module={module} now={now} />
            ) : (
            <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#050b14]/86 shadow-[0_20px_70px_rgba(0,0,0,0.34)]">
              <div className="flex min-w-[860px] border-b border-white/10 bg-white/[0.045] text-[10px] font-black uppercase tracking-[0.16em] text-white/46">
                {Array.from({ length: 7 }).map((_, index) => {
                  const hour = new Date(now + index * 60 * 60 * 1000);
                  return (
                    <span key={index} className="w-[180px] shrink-0 border-r border-white/10 px-4 py-3">
                      {hour.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  );
                })}
              </div>

              <div
                ref={railRef}
                className="no-scrollbar flex min-h-[236px] min-w-0 snap-x snap-mandatory items-stretch gap-0 overflow-x-auto"
              >
                {module.epg.length > 0 ? module.epg.map((item) => {
                  const start = new Date(item.startsAt).getTime();
                  const end = new Date(item.endsAt).getTime();
                  const durationMinutes = Math.max(30, Math.round((end - start) / 60000));
                  const playlistStart = secondsFromItemDay(item.startsAt);
                  const playlistEnd = Math.min(PLAYLIST_CYCLE_SECONDS, playlistStart + Math.max(1, Math.round((end - start) / 1000)));
                  const cycleSecond = secondsOfHalfDay(now);
                  const progress = stream?.streamType === "PLAYLIST"
                    ? cycleSecond >= playlistStart && cycleSecond <= playlistEnd
                      ? ((cycleSecond - playlistStart) / Math.max(1, playlistEnd - playlistStart)) * 100
                      : 0
                    : now >= start && now <= end ? ((now - start) / (end - start)) * 100 : 0;
                  const isLive = progress > 0 && progress < 100;
                  return (
                    <article
                      key={item.id}
                      className={`relative flex min-w-[220px] snap-start flex-col border-r border-white/10 p-4 ${
                        isLive ? "bg-red-500/[0.13]" : "bg-white/[0.035]"
                      }`}
                      style={{ width: `${Math.min(Math.max(durationMinutes * 4, 220), 520)}px` }}
                    >
                      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.12em] text-white/62">
                        <Clock size={14} className={isLive ? "text-red-300" : "text-cyan/80"} />
                        <span>
                          {new Date(item.startsAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} -{" "}
                          {new Date(item.endsAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <h3 className="mt-4 line-clamp-2 text-xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-4 text-sm leading-5 text-white/58">{item.description}</p>
                      <div className="mt-auto pt-5">
                        {isLive ? (
                          <span className="mb-2 inline-flex rounded-full bg-red-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-black">
                            Ora in onda
                          </span>
                        ) : null}
                        <span className="block h-1.5 overflow-hidden rounded-full bg-white/10">
                          <span className={`block h-full rounded-full ${isLive ? "bg-red-300" : "bg-cyan/70"}`} style={{ width: `${Math.max(progress, isLive ? 3 : 0)}%` }} />
                        </span>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="p-4">
                    <EmptyModuleNotice text="Nessun evento EPG programmato per questa diretta." />
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </section>
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
