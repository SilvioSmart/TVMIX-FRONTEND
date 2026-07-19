"use client";

import { ChevronLeft, ChevronRight, CalendarClock, Play } from "lucide-react";
import { useMemo, useState } from "react";

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
};

export function NoticePublicPage({ notices }: { notices: PublicNoticeArticle[] }) {
  const latest = notices[0] ?? null;
  const [selectedId, setSelectedId] = useState(latest?.id ?? "");
  const selected = useMemo(
    () => notices.find((notice) => notice.id === selectedId) ?? latest,
    [latest, notices, selectedId],
  );

  if (!selected) {
    return <EmptyNewsPage title="9notice" message="Nessuna notizia pubblicata." />;
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22bdf3]">TVMIX News</p>
        <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">9notice</h1>
      </div>

      <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#06111d] shadow-[0_30px_100px_rgba(0,0,0,0.36)]">
        <div className="grid min-h-[360px] lg:grid-cols-[0.92fr_1.08fr]">
          <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]">
              <span className="rounded-full border border-[#22bdf3]/35 bg-[#22bdf3]/10 px-3 py-1 text-[#22bdf3]">{selected.category}</span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <CalendarClock size={13} />
                {formatPublicDate(selected.publishedAt ?? selected.createdAt)}
              </span>
            </div>
            <h2 className="text-3xl font-black leading-tight tracking-[-0.055em] sm:text-5xl">{selected.title}</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{selected.body}</p>
          </div>
          <div className="relative min-h-[260px] overflow-hidden bg-black">
            <img src={selected.imageUrl} alt={selected.title} className="h-full min-h-[260px] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#06111d]/30 via-transparent to-transparent" />
          </div>
        </div>
      </article>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {notices.map((notice) => {
          const active = notice.id === selected.id;
          return (
            <button
              key={notice.id}
              type="button"
              onClick={() => setSelectedId(notice.id)}
              className={`group overflow-hidden rounded-2xl border bg-[#071321] text-left transition ${
                active ? "border-[#22bdf3] shadow-[0_0_0_1px_rgba(34,189,243,0.35)]" : "border-white/10 hover:border-[#22bdf3]/45"
              }`}
            >
              <div className="aspect-[16/9] overflow-hidden bg-black">
                <img src={notice.imageUrl} alt={notice.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#22bdf3]">
                  {notice.category} · {formatPublicDate(notice.publishedAt ?? notice.createdAt)}
                </p>
                <h3 className="mt-2 line-clamp-2 text-base font-bold text-white">{notice.title}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{notice.excerpt || notice.body}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Tg9PublicPage({ videos }: { videos: PublicTg9Video[] }) {
  const [index, setIndex] = useState(0);
  const current = videos[index] ?? null;

  if (!current) {
    return <EmptyNewsPage title="TG9" message="Nessun video TG9 pubblicato." />;
  }

  function move(direction: -1 | 1) {
    setIndex((value) => (value + direction + videos.length) % videos.length);
  }

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#22bdf3]">TVMIX News</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] sm:text-5xl">TG9</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1)} className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/5 hover:border-[#22bdf3]/50"><ChevronLeft size={20} /></button>
          <button type="button" onClick={() => move(1)} className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/5 hover:border-[#22bdf3]/50"><ChevronRight size={20} /></button>
        </div>
      </div>

      <article className="overflow-hidden rounded-[28px] border border-white/10 bg-[#06111d] shadow-[0_30px_100px_rgba(0,0,0,0.36)]">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <video src={current.videoUrl} poster={current.posterUrl ?? undefined} controls className="aspect-video h-full w-full bg-black object-contain" />
          <div className="flex flex-col justify-center p-6 sm:p-9">
            <span className="mb-4 inline-flex w-max items-center gap-2 rounded-full border border-[#22bdf3]/35 bg-[#22bdf3]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-[#22bdf3]">
              <Play size={13} /> Video {index + 1}/{videos.length}
            </span>
            <h2 className="text-3xl font-black leading-tight tracking-[-0.055em]">{current.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-400">{current.description ?? "Servizio video TG9"}</p>
          </div>
        </div>
      </article>

      <div className="mt-7 flex gap-4 overflow-x-auto pb-3">
        {videos.map((video, videoIndex) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setIndex(videoIndex)}
            className={`w-[260px] shrink-0 overflow-hidden rounded-2xl border bg-[#071321] text-left ${videoIndex === index ? "border-[#22bdf3]" : "border-white/10"}`}
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

function formatPublicDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
