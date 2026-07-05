"use client";

import dynamic from "next/dynamic";
import { X } from "lucide-react";

const VideoPlayer = dynamic(() => import("./VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video w-full animate-pulse bg-white/5" />
  ),
});

type PlayerModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  poster?: string;
  src?: string;
};

export function PlayerModal({
  open,
  onClose,
  title,
  poster,
  src,
}: PlayerModalProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Riproduci ${title}`}
      className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/90 p-0 backdrop-blur-md sm:p-6"
    >
      <div className="max-h-[100svh] w-full max-w-6xl overflow-y-auto sm:max-h-[calc(100svh-3rem)]">
        <div className="flex min-w-0 items-center justify-between gap-3 bg-[#050b14] px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-cyan">
              Ora in riproduzione
            </p>
            <h2 className="mt-0.5 truncate font-extrabold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi player"
            className="grid size-10 place-items-center rounded-full hover:bg-white/10"
          >
            <X />
          </button>
        </div>
        {src ? (
          <VideoPlayer src={src} poster={poster} title={title} autoPlay />
        ) : (
          <div className="grid aspect-video place-items-center bg-black px-6 text-center text-white/70">
            Questo contenuto non ha ancora uno stream HLS pubblicato.
          </div>
        )}
      </div>
    </div>
  );
}
