"use client";

import Hls from "hls.js";
import {
  Maximize,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type VideoPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
  vastUrl?: string | null;
  autoPlay?: boolean;
  seekTo?: number;
  seekKey?: string | number;
  onEnded?: () => void;
  onPause?: () => void;
  className?: string;
};

type QualityLevel = {
  index: number;
  label: string;
};

type VastAd = {
  mediaUrl: string;
  impressionUrls: string[];
  startTrackingUrls: string[];
  completeTrackingUrls: string[];
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

function xmlText(node: Element | null | undefined) {
  return node?.textContent?.trim() ?? "";
}

function requestTracking(urls: string[]) {
  for (const url of urls) {
    if (!url) continue;
    try {
      void fetch(url, { method: "GET", mode: "no-cors", cache: "no-store", keepalive: true });
    } catch {
      // I tracking pixel non devono mai bloccare il player.
    }
  }
}

function bestVastMediaFile(document: XMLDocument) {
  const mediaFiles = Array.from(document.querySelectorAll("MediaFile"))
    .map((node) => ({
      url: xmlText(node),
      type: node.getAttribute("type") ?? "",
      delivery: node.getAttribute("delivery") ?? "",
      width: Number(node.getAttribute("width") ?? 0),
    }))
    .filter((file) => file.url);

  return (
    mediaFiles.find((file) => file.type.includes("mp4") && file.delivery !== "streaming") ??
    mediaFiles.find((file) => file.type.includes("mp4")) ??
    mediaFiles.find((file) => file.type.includes("webm")) ??
    mediaFiles.find((file) => file.type.includes("mpegurl") || file.url.includes(".m3u8")) ??
    mediaFiles.sort((a, b) => b.width - a.width)[0]
  )?.url;
}

async function fetchVastDocument(vastUrl: string) {
  const response = await fetch(`/api/vast?url=${encodeURIComponent(vastUrl)}`, {
    cache: "no-store",
    headers: { Accept: "application/xml,text/xml,*/*" },
  });
  if (!response.ok) throw new Error("VAST non disponibile");
  const xml = await response.text();
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) throw new Error("XML VAST non valido");
  return document;
}

async function resolveVastAd(vastUrl: string, depth = 0): Promise<VastAd | null> {
  if (depth > 3) return null;
  const document = await fetchVastDocument(vastUrl);
  const wrapperUrl = xmlText(document.querySelector("Wrapper VASTAdTagURI"));
  if (wrapperUrl) return resolveVastAd(wrapperUrl, depth + 1);

  const mediaUrl = bestVastMediaFile(document);
  if (!mediaUrl) return null;

  const trackingEvents = Array.from(document.querySelectorAll("Tracking"));
  return {
    mediaUrl,
    impressionUrls: Array.from(document.querySelectorAll("Impression")).map((node) => xmlText(node)),
    startTrackingUrls: trackingEvents.filter((node) => node.getAttribute("event") === "start").map((node) => xmlText(node)),
    completeTrackingUrls: trackingEvents.filter((node) => node.getAttribute("event") === "complete").map((node) => xmlText(node)),
  };
}

export default function VideoPlayer({
  src,
  poster,
  title = "TVMIX Player",
  vastUrl,
  autoPlay = false,
  seekTo,
  seekKey,
  onEnded,
  onPause,
  className = "",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const adHlsRef = useRef<Hls | null>(null);
  const onEndedRef = useRef(onEnded);
  const onPauseRef = useRef(onPause);
  const playerIdRef = useRef(`tvmix-player-${Math.random().toString(36).slice(2)}`);
  const vastPlayedRef = useRef<string | null>(null);
  const activeAdRef = useRef<VastAd | null>(null);
  const [adActive, setAdActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    onPauseRef.current = onPause;
  }, [onPause]);

  const playContentVideo = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    await video.play();
  }, []);

  const stopAd = useCallback(() => {
    const adVideo = adVideoRef.current;
    if (adVideo) {
      adVideo.pause();
      adVideo.removeAttribute("src");
      adVideo.load();
    }
    adHlsRef.current?.destroy();
    adHlsRef.current = null;
    activeAdRef.current = null;
    setAdActive(false);
  }, []);

  const playAd = useCallback(async (ad: VastAd) => {
    const adVideo = adVideoRef.current;
    const contentVideo = videoRef.current;
    if (!adVideo) return false;

    contentVideo?.pause();
    adHlsRef.current?.destroy();
    adHlsRef.current = null;
    activeAdRef.current = ad;
    setAdActive(true);

    if (Hls.isSupported() && ad.mediaUrl.includes(".m3u8")) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      adHlsRef.current = hls;
      hls.loadSource(ad.mediaUrl);
      hls.attachMedia(adVideo);
      await new Promise<void>((resolve) => {
        hls.on(Hls.Events.MANIFEST_PARSED, () => resolve());
        window.setTimeout(resolve, 2200);
      });
    } else {
      adVideo.src = ad.mediaUrl;
      adVideo.load();
    }

    requestTracking([...ad.impressionUrls, ...ad.startTrackingUrls]);
    await adVideo.play();
    window.dispatchEvent(new CustomEvent("tvmix:video-play", { detail: { id: playerIdRef.current } }));
    return true;
  }, []);

  const playVideo = useCallback(async () => {
    const vastKey = `${src}|${vastUrl ?? ""}`;
    if (vastUrl && vastPlayedRef.current !== vastKey) {
      vastPlayedRef.current = vastKey;
      try {
        const ad = await resolveVastAd(vastUrl);
        if (ad?.mediaUrl && await playAd(ad)) return;
      } catch {
        // Se il VAST non è valido, il contenuto deve partire comunque.
      }
    }
    await playContentVideo();
  }, [playAd, playContentVideo, src, vastUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    vastPlayedRef.current = null;
    stopAd();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setQualities([]);
    setSelectedQuality(-1);
    setControlsVisible(true);

    if (Hls.isSupported() && src.includes(".m3u8")) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const levels = data.levels.map((level, index) => ({
          index,
          label: level.height ? `${level.height}p` : `Livello ${index + 1}`,
        }));
        setQualities(levels);
        if (autoPlay) void playVideo().catch(() => setControlsVisible(true));
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      if (autoPlay) void playVideo().catch(() => setControlsVisible(true));
    } else {
      video.src = src;
      video.load();
    }

    const syncPlay = () => {
      setPlaying(true);
      window.dispatchEvent(new CustomEvent("tvmix:video-play", { detail: { id: playerIdRef.current } }));
    };
    const syncPause = () => {
      setPlaying(false);
      if (!video.ended) onPauseRef.current?.();
    };
    const syncTime = () => setCurrentTime(video.currentTime);
    const syncDuration = () => setDuration(video.duration);
    const syncEnded = () => onEndedRef.current?.();
    video.addEventListener("play", syncPlay);
    video.addEventListener("pause", syncPause);
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("durationchange", syncDuration);
    video.addEventListener("ended", syncEnded);

    const pauseWhenAnotherPlayerStarts = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string }>).detail;
      if (detail?.id === playerIdRef.current) return;
      if (video.paused && !activeAdRef.current) return;
      stopAd();
      video.pause();
    };
    window.addEventListener("tvmix:video-play", pauseWhenAnotherPlayerStarts);

    return () => {
      video.removeEventListener("play", syncPlay);
      video.removeEventListener("pause", syncPause);
      video.removeEventListener("timeupdate", syncTime);
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("durationchange", syncDuration);
      video.removeEventListener("ended", syncEnded);
      window.removeEventListener("tvmix:video-play", pauseWhenAnotherPlayerStarts);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      adHlsRef.current?.destroy();
      adHlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [autoPlay, playVideo, src, stopAd]);

  useEffect(() => {
    const adVideo = adVideoRef.current;
    if (!adVideo) return;

    const finishAd = () => {
      const ad = activeAdRef.current;
      if (ad) requestTracking(ad.completeTrackingUrls);
      stopAd();
      void playContentVideo().catch(() => setControlsVisible(true));
    };

    adVideo.addEventListener("ended", finishAd);
    adVideo.addEventListener("error", finishAd);
    return () => {
      adVideo.removeEventListener("ended", finishAd);
      adVideo.removeEventListener("error", finishAd);
    };
  }, [playContentVideo, stopAd]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || seekTo === undefined || !Number.isFinite(seekTo)) return;
    const next = Math.max(0, seekTo);
    const applySeek = () => {
      if (Math.abs(video.currentTime - next) > 0.75) video.currentTime = next;
      if (autoPlay && video.paused) void playVideo().catch(() => setControlsVisible(true));
    };
    if (video.readyState >= 1) applySeek();
    else video.addEventListener("loadedmetadata", applySeek, { once: true });
    return () => video.removeEventListener("loadedmetadata", applySeek);
  }, [autoPlay, playVideo, seekKey, seekTo]);

  useEffect(() => {
    if (playing && controlsVisible) {
      const timer = window.setTimeout(() => setControlsVisible(false), 2600);
      return () => window.clearTimeout(timer);
    }
  }, [controlsVisible, playing]);

  useEffect(() => {
    const syncFullscreen = () => {
      setFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const togglePlay = useCallback(() => {
    const adVideo = adVideoRef.current;
    if (adActive && adVideo) {
      if (adVideo.paused) void adVideo.play().catch(() => setControlsVisible(true));
      else adVideo.pause();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void playVideo().catch(() => setControlsVisible(true));
    else video.pause();
  }, [adActive, playVideo]);

  const setVideoVolume = (nextVolume: number) => {
    const video = videoRef.current;
    const adVideo = adVideoRef.current;
    if (video) {
      video.volume = nextVolume;
      video.muted = nextVolume === 0;
    }
    if (adVideo) {
      adVideo.volume = nextVolume;
      adVideo.muted = nextVolume === 0;
    }
    setVolume(nextVolume);
    if (nextVolume > 0) setPreviousVolume(nextVolume);
  };

  const toggleMute = () => {
    setVideoVolume(volume === 0 ? previousVolume || 1 : 0);
  };

  const seek = (value: number) => {
    if (videoRef.current) videoRef.current.currentTime = value;
  };

  const changeQuality = (value: number) => {
    setSelectedQuality(value);
    if (hlsRef.current) hlsRef.current.currentLevel = value;
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;
    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
      return;
    }
    if (document.fullscreenElement) await document.exitFullscreen();
    await container.requestFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className={`relative group aspect-video w-full overflow-hidden bg-black ${fullscreen ? "h-screen max-h-screen" : ""} ${className}`}
      onMouseMove={() => playing && setControlsVisible(true)}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={() => playing && setControlsVisible(true)}
    >
      <video
        ref={adVideoRef}
        playsInline
        preload="auto"
        controls={false}
        aria-label={`Annuncio ${title}`}
        onClick={togglePlay}
        className={`absolute inset-0 z-20 h-full w-full bg-black object-contain transition ${
          adActive ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {adActive ? (
        <span className="absolute left-3 top-3 z-30 rounded bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/80">
          Pubblicità
        </span>
      ) : null}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        controls={false}
        aria-label={title}
        onClick={togglePlay}
        className="h-full w-full object-contain"
      />

      {!playing && !adActive ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Riproduci"
          className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center text-white/55 drop-shadow-[0_14px_30px_rgba(0,0,0,0.85)] transition hover:scale-110 hover:text-white/80"
        >
          <Play size={108} fill="currentColor" strokeWidth={1.35} className="translate-x-1.5 opacity-80 sm:size-36" />
        </button>
      ) : null}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-3 pb-3 pt-16 transition duration-300 sm:px-5 sm:pb-5 ${
          playing && controlsVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(event) => seek(Number(event.target.value))}
          aria-label="Posizione video"
          className="h-1 w-full cursor-pointer"
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:gap-4">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pausa" : "Riproduci"}
            className="grid size-9 place-items-center"
          >
            {playing ? (
              <Pause size={21} fill="currentColor" />
            ) : (
              <Play size={21} fill="currentColor" />
            )}
          </button>

          <div className="group/volume flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={volume === 0 ? "Attiva audio" : "Disattiva audio"}
              className="grid size-9 place-items-center"
            >
              {volume === 0 ? (
                <VolumeX size={21} />
              ) : volume < 0.5 ? (
                <Volume1 size={21} />
              ) : (
                <Volume2 size={21} />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVideoVolume(Number(event.target.value))}
              aria-label="Volume"
              className="hidden w-16 cursor-pointer sm:block"
            />
          </div>

          <span className="min-w-[82px] text-[11px] font-medium tabular-nums text-white/70 sm:min-w-0 sm:text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-2">
            <select
              value={selectedQuality}
              onChange={(event) => changeQuality(Number(event.target.value))}
              aria-label="Qualità video"
              className="h-9 max-w-[82px] rounded border border-white/20 bg-black/45 px-2 text-[11px] font-bold text-white sm:max-w-none sm:text-xs"
            >
              <option value={-1}>Auto</option>
              {qualities.map((quality) => (
                <option key={quality.index} value={quality.index}>
                  {quality.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Esci da schermo intero" : "Schermo intero"}
              className="grid size-9 place-items-center"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
