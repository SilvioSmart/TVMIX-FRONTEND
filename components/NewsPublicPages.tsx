"use client";

import { CalendarClock, ChevronLeft, ChevronRight, Copy, Play, Send, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "./VideoPlayer";

export type PublicNoticeArticle = {
  id: string;
  category: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  imageUrl: string;
  publishedAt: string | null;
  createdAt: string;
};

export type PublicTg9Video = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  videoUrl: string;
  posterUrl: string | null;
  publishedAt: string | null;
  createdAt: string;
  subclips?: PublicTg9Subclip[];
};

export type PublicTg9Subclip = {
  id: string;
  title: string | null;
  slug?: string | null;
  vastUrl?: string | null;
  startTime: number;
  endTime: number;
  sortOrder: number;
};

export function NoticePublicPage({ notices, initialSlug }: { notices: PublicNoticeArticle[]; initialSlug?: string }) {
  const latest = notices[0] ?? null;
  const initialNotice = notices.find((notice) => notice.slug === initialSlug) ?? latest;
  const [selectedId, setSelectedId] = useState(initialNotice?.id ?? "");
  const selected = useMemo(
    () => notices.find((notice) => notice.id === selectedId) ?? initialNotice,
    [initialNotice, notices, selectedId],
  );

  if (!selected) {
    return <EmptyNewsPage title="9notice" message="Nessuna notizia pubblicata." />;
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 pb-10 pt-28 text-white sm:px-6 sm:pt-32 lg:px-8">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22bdf3]">TVMIX News</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">9notice</h1>
      </div>

      <article className="h-[760px] overflow-hidden rounded-[28px] border border-white/10 bg-[#06111d] shadow-[0_30px_100px_rgba(0,0,0,0.36)] sm:h-[680px] lg:h-[500px]">
        <div className="grid h-full lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex min-h-0 flex-col justify-center p-6 sm:p-9 lg:p-12">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
              <span className="rounded-full border border-[#22bdf3]/35 bg-[#22bdf3]/10 px-3 py-1 text-[#22bdf3]">{selected.category}</span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <CalendarClock size={13} />
                {formatPublicDate(selected.publishedAt ?? selected.createdAt)}
              </span>
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] sm:text-5xl">{selected.title}</h2>
            <div className="mt-5 min-h-0 max-w-2xl overflow-y-auto pr-2 text-sm leading-7 text-slate-300 [scrollbar-color:#22bdf3_rgba(255,255,255,0.08)] sm:text-base">
              <p>{selected.body}</p>
            </div>
            <div className="mt-5">
              <SocialShareButtons title={selected.title} text={selected.excerpt || selected.body} slug={selected.slug} variant="large" />
            </div>
          </div>
          <div className="relative min-h-0 overflow-hidden bg-black">
            <img src={selected.imageUrl} alt={selected.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06111d]/30 via-transparent to-transparent" />
          </div>
        </div>
      </article>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {notices.map((notice) => {
          const active = notice.id === selected.id;
          return (
            <article
              key={notice.id}
              className={`group overflow-hidden rounded-2xl border bg-[#071321] text-left transition ${
                active ? "border-[#22bdf3] shadow-[0_0_0_1px_rgba(34,189,243,0.35)]" : "border-white/10 hover:border-[#22bdf3]/45"
              }`}
            >
              <button type="button" onClick={() => setSelectedId(notice.id)} className="block w-full text-left">
                <div className="aspect-[16/9] overflow-hidden bg-black">
                  <img src={notice.imageUrl} alt={notice.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                </div>
                <div className="p-4 pb-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#22bdf3]">
                    {notice.category} · {formatPublicDate(notice.publishedAt ?? notice.createdAt)}
                  </p>
                  <h3 className="mt-2 line-clamp-2 text-base font-bold text-white">{notice.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{notice.excerpt || notice.body}</p>
                </div>
              </button>
              <div className="border-t border-white/10 px-4 py-3">
                <SocialShareButtons title={notice.title} text={notice.excerpt || notice.body} slug={notice.slug} />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function Tg9PublicPage({ videos }: { videos: PublicTg9Video[] }) {
  const [index, setIndex] = useState(0);
  const [activeSubclip, setActiveSubclip] = useState<PublicTg9Subclip | null>(null);
  const [playbackKey, setPlaybackKey] = useState(0);
  const archiveRef = useRef<HTMLDivElement | null>(null);
  const current = videos[index] ?? null;
  const selectedSubclips = useMemo(() => current?.subclips ?? [], [current]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!slug) return;
    const hashIndex = videos.findIndex((video) => video.slug === slug);
    if (hashIndex >= 0) {
      setIndex(hashIndex);
      setActiveSubclip(null);
      return;
    }
    const subclipVideoIndex = videos.findIndex((video) => video.subclips?.some((subclip) => subclip.slug === slug));
    if (subclipVideoIndex >= 0) {
      const subclip = videos[subclipVideoIndex]?.subclips?.find((item) => item.slug === slug) ?? null;
      setIndex(subclipVideoIndex);
      setActiveSubclip(subclip);
      if (subclip) setPlaybackKey((value) => value + 1);
    }
  }, [videos]);

  if (!current) {
    return <EmptyNewsPage title="TG9" message="Nessun video TG9 pubblicato." />;
  }

  function move(direction: -1 | 1) {
    setIndex((value) => (value + direction + videos.length) % videos.length);
    setActiveSubclip(null);
  }

  function scrollArchive(direction: -1 | 1) {
    archiveRef.current?.scrollBy({
      left: direction * 620,
      behavior: "smooth",
    });
  }

  function playSubclip(subclip: PublicTg9Subclip) {
    setActiveSubclip(subclip);
    setPlaybackKey((value) => value + 1);
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 pb-10 pt-28 text-white sm:px-6 sm:pt-32 lg:px-8">
      <div className="mb-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22bdf3]">TVMIX News</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">TG9</h1>
        </div>
      </div>

      <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#06111d] shadow-[0_30px_100px_rgba(0,0,0,0.36)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]">
          <div className="flex min-h-[260px] items-center bg-black sm:min-h-[420px] lg:min-h-[500px]">
            <VideoPlayer
              key={`${current.id}-${activeSubclip?.id ?? "full"}-${playbackKey}`}
              src={current.videoUrl}
              poster={current.posterUrl ?? undefined}
              title={activeSubclip?.title ?? current.title}
              vastUrl={activeSubclip?.vastUrl ?? null}
              seekTo={activeSubclip?.startTime}
              seekKey={`${activeSubclip?.id ?? "full"}-${playbackKey}`}
              autoPlay={Boolean(activeSubclip)}
              className="aspect-video h-auto max-h-full w-full bg-black object-contain"
            />
          </div>
          <aside className="flex min-h-[360px] flex-col justify-between border-t border-white/10 p-6 sm:p-9 lg:border-l lg:border-t-0">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex w-max items-center gap-2 rounded-full border border-[#22bdf3]/35 bg-[#22bdf3]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#22bdf3]">
                  <Play size={13} /> Clip {index + 1}/{videos.length}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  <CalendarClock size={13} />
                  {formatPublicDate(current.publishedAt ?? current.createdAt)}
                </span>
              </div>
              <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] sm:text-4xl">{current.title}</h2>
              <div className="mt-4 max-h-[210px] overflow-y-auto pr-2 text-sm leading-7 text-slate-400 [scrollbar-color:#22bdf3_rgba(255,255,255,0.08)]">
                <p>{current.description ?? "Servizio video TG9"}</p>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-[#22bdf3]">Comandi notizia</p>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => move(-1)} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.14em] text-white/80 transition hover:border-[#22bdf3]/60 hover:text-[#22bdf3]">
                  <ChevronLeft size={16} /> Precedente
                </button>
                <button type="button" onClick={() => move(1)} className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.14em] text-white/80 transition hover:border-[#22bdf3]/60 hover:text-[#22bdf3]">
                  Successiva <ChevronRight size={16} />
                </button>
              </div>
              <div className="mt-4">
                <SocialShareButtons
                  title={activeSubclip?.title ?? current.title}
                  text={current.description}
                  slug={activeSubclip?.slug ?? current.slug}
                  variant="large"
                  pathPrefix="/tg9"
                  label={activeSubclip ? "Condividi sottoclip" : "Condividi TG9"}
                />
              </div>
            </div>
          </aside>
        </div>
      </article>

      <section className="mt-7 rounded-[24px] border border-white/10 bg-[#06111d]/55 p-4 sm:p-5">
        <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#22bdf3]">Timeline TG9</p>
            <p className="mt-1 text-sm text-slate-500">La barra evidenzia la clip selezionata dall’elenco media.</p>
          </div>
          <span className="text-xs font-black uppercase tracking-[0.16em] text-white/45">
            {current.title} · {selectedSubclips.length} sottoclip
          </span>
        </div>
        <div className="relative min-h-28 overflow-hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-5">
          <div className="absolute left-4 right-4 top-12 h-1 rounded-full bg-white/10" />
          {selectedSubclips.length ? (
            selectedSubclips.map((subclip, subclipIndex) => {
              const left = (subclipIndex / Math.max(selectedSubclips.length, 1)) * 100;
              const width = 100 / Math.max(selectedSubclips.length, 1);
              return (
                <button
                  key={subclip.id}
                  type="button"
                  onClick={() => playSubclip(subclip)}
                  aria-label={`Riproduci sottoclip ${subclip.title ?? subclipIndex + 1}`}
                  className="absolute top-6 h-12 rounded-full border border-[#22bdf3]/60 bg-[#22bdf3]/15 px-2 text-left text-[#22bdf3] shadow-[0_0_24px_rgba(34,189,243,0.16)] transition hover:bg-[#22bdf3]/25"
                  style={{ left: `calc(1rem + ${left}%)`, width: `max(70px, calc(${width}% - 0.5rem))`, maxWidth: "calc(100% - 2rem)" }}
                >
                  <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em]">
                    {String(subclipIndex + 1).padStart(2, "0")} · {formatSeconds(subclip.startTime)} / {formatSeconds(subclip.endTime)}
                  </span>
                  <span className="block truncate text-[11px] font-bold">{subclip.title ?? "Sottoclip TG9"}</span>
                  <span className="block truncate text-[10px] font-black text-current/75">{formatSeconds(subclip.endTime - subclip.startTime)} {subclip.vastUrl ? "· VAST" : ""}</span>
                </button>
              );
            })
          ) : (
            <div className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.025] text-center text-sm text-slate-500">
              Nessuna sottoclip pubblicata per questa clip TG9.
            </div>
          )}
          {selectedSubclips.length ? (
            <div className="mt-20 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
              {selectedSubclips.map((subclip, subclipIndex) => (
                <button key={`${subclip.id}-label`} type="button" onClick={() => playSubclip(subclip)} className="rounded-full border border-white/10 px-3 py-1 transition hover:border-[#22bdf3]/60 hover:text-[#22bdf3]">
                  {String(subclipIndex + 1).padStart(2, "0")} · {formatSeconds(subclip.endTime - subclip.startTime)}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-7 rounded-[24px] border border-white/10 bg-[#06111d]/55 p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#22bdf3]">Archivio TG9</p>
            <p className="mt-1 text-sm text-slate-500">Carousel dell’elenco media: seleziona una clip per caricarla nel player e nella timeline.</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => scrollArchive(-1)} className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/5 hover:border-[#22bdf3]/50" aria-label="Scorri archivio indietro"><ChevronLeft size={20} /></button>
            <button type="button" onClick={() => scrollArchive(1)} className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/5 hover:border-[#22bdf3]/50" aria-label="Scorri archivio avanti"><ChevronRight size={20} /></button>
          </div>
        </div>
        <div ref={archiveRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-color:#22bdf3_rgba(255,255,255,0.08)]">
          {videos.map((video, videoIndex) => (
            <button
              key={video.id}
              type="button"
              onClick={() => {
                setIndex(videoIndex);
                setActiveSubclip(null);
              }}
              className={`w-[260px] shrink-0 overflow-hidden rounded-2xl border bg-[#071321] text-left transition hover:border-[#22bdf3]/50 ${videoIndex === index ? "border-[#22bdf3]" : "border-white/10"}`}
            >
              <div className="aspect-video bg-black">
                <video src={video.videoUrl} poster={video.posterUrl ?? undefined} muted preload="metadata" className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-bold text-white">{video.title}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}

function EmptyNewsPage({ title, message }: { title: string; message: string }) {
  return (
    <section className="mx-auto grid min-h-[50vh] max-w-[900px] place-items-center px-4 py-20 text-center text-white">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22bdf3]">TVMIX News</p>
        <h1 className="mt-2 text-4xl font-black">{title}</h1>
        <p className="mt-4 text-slate-500">{message}</p>
      </div>
    </section>
  );
}

function SocialShareButtons({
  title,
  text,
  slug,
  variant = "compact",
  pathPrefix = "/9notice",
  label = "Condividi notizia",
}: {
  title: string;
  text?: string | null;
  slug: string;
  variant?: "compact" | "large";
  pathPrefix?: "/9notice" | "/tg9";
  label?: string;
}) {
  const url = getShareUrl(pathPrefix, slug);
  const encodedUrl = encodeURIComponent(url);
  const shareText = text ? `${title} — ${text.slice(0, 180)}` : title;
  const encodedTitle = encodeURIComponent(shareText);
  const sizeClass = variant === "large" ? "size-10" : "size-8";
  const iconClass = variant === "large" ? "text-sm" : "text-xs";
  const links = [
    { label: "Facebook", icon: <span className={`${iconClass} font-black`}>f</span>, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", icon: <span className={`${iconClass} font-black`}>X</span>, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "WhatsApp", icon: <span className={`${iconClass} font-black`}>W</span>, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` },
    { label: "Telegram", icon: <Send size={variant === "large" ? 17 : 14} />, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
  ];

  async function copyLink() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={label}>
      <span className={`inline-flex ${sizeClass} items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#22bdf3]`}>
        <Share2 size={variant === "large" ? 17 : 14} />
      </span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={`Condividi su ${link.label}`}
          className={`inline-flex ${sizeClass} items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/85 transition hover:border-[#22bdf3]/60 hover:bg-[#22bdf3]/10 hover:text-[#22bdf3]`}
        >
          {link.icon}
        </a>
      ))}
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copia link"
        className={`inline-flex ${sizeClass} items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/85 transition hover:border-[#22bdf3]/60 hover:bg-[#22bdf3]/10 hover:text-[#22bdf3]`}
      >
        <Copy size={variant === "large" ? 17 : 14} />
      </button>
    </div>
  );
}

function getShareUrl(pathPrefix: "/9notice" | "/tg9", slug: string) {
  if (pathPrefix === "/tg9") {
    const hash = slug ? `#${encodeURIComponent(slug)}` : "";
    if (typeof window === "undefined") return `https://www.tvmix.it/tg9${hash}`;
    return `${window.location.origin}/tg9${hash}`;
  }
  const safeSlug = slug ? `/${encodeURIComponent(slug)}` : "";
  if (typeof window === "undefined") return `https://www.tvmix.it/9notice${safeSlug}`;
  return `${window.location.origin}/9notice${safeSlug}`;
}

function formatPublicDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSeconds(value: number) {
  const safe = Math.max(0, Math.floor(value));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}
