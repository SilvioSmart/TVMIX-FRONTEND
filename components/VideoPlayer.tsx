"use client";

import Hls from "hls.js";
import {
  Maximize,
  Minimize,
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
  autoPlay?: boolean;
  className?: string;
};

type QualityLevel = {
  index: number;
  label: string;
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export default function VideoPlayer({
  src,
  poster,
  title = "TVMIX Player",
  autoPlay = false,
  className = "",
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [previousVolume, setPreviousVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [theater, setTheater] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

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
        if (autoPlay) void video.play().catch(() => setControlsVisible(true));
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      if (autoPlay) void video.play().catch(() => setControlsVisible(true));
    } else {
      video.src = src;
      video.load();
    }

    const syncPlay = () => setPlaying(true);
    const syncPause = () => setPlaying(false);
    const syncTime = () => setCurrentTime(video.currentTime);
    const syncDuration = () => setDuration(video.duration);
    video.addEventListener("play", syncPlay);
    video.addEventListener("pause", syncPause);
    video.addEventListener("timeupdate", syncTime);
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("durationchange", syncDuration);

    return () => {
      video.removeEventListener("play", syncPlay);
      video.removeEventListener("pause", syncPause);
      video.removeEventListener("timeupdate", syncTime);
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("durationchange", syncDuration);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [autoPlay, src]);

  useEffect(() => {
    if (playing && controlsVisible) {
      const timer = window.setTimeout(() => setControlsVisible(false), 2600);
      return () => window.clearTimeout(timer);
    }
  }, [controlsVisible, playing]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setControlsVisible(true));
    else video.pause();
  }, []);

  const setVideoVolume = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
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
    if (!document.fullscreenElement) await container.requestFullscreen();
    else await document.exitFullscreen();
  };

  return (
    <div
      ref={containerRef}
      className={`${theater ? "fixed inset-0 z-[100] bg-black" : "relative"} group aspect-video w-full overflow-hidden bg-black ${className}`}
      onMouseMove={() => playing && setControlsVisible(true)}
      onMouseLeave={() => playing && setControlsVisible(false)}
      onTouchStart={() => playing && setControlsVisible(true)}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        aria-label={title}
        onClick={togglePlay}
        className="h-full w-full object-contain"
      />

      {!playing ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Riproduci"
          className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cyan text-white shadow-2xl transition hover:scale-105 sm:size-20"
        >
          <Play size={30} fill="currentColor" className="translate-x-0.5" />
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
              onClick={() => setTheater((value) => !value)}
              aria-label={theater ? "Esci dalla modalità teatro" : "Modalità teatro"}
              className="grid size-9 place-items-center"
            >
              {theater ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Schermo intero"
              className="hidden size-9 place-items-center sm:grid"
            >
              <Maximize size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
