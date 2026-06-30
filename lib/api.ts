import {
  entertainment,
  liveChannels,
  mostWatched,
  type MediaItem,
} from "./content";

type ApiCollection<T> = {
  data?: T[];
};

type ApiVideo = {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  hlsUrl: string;
  category?: {
    name: string;
    slug: string;
  } | null;
};

type ApiLiveChannel = {
  id: string;
  name: string;
  description?: string | null;
  hlsUrl: string;
  posterUrl?: string | null;
  status: "OFFLINE" | "LIVE" | "SCHEDULED";
};

export type HomeContent = {
  featured: MediaItem;
  mostWatched: MediaItem[];
  liveChannels: MediaItem[];
  entertainment: MediaItem[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.tvmix.it";
const FALLBACK_POSTER = "/images/senza-filtri-hero.png";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 60 },
      headers: { accept: "application/json" },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function mapVideo(video: ApiVideo): MediaItem {
  return {
    id: video.id,
    title: video.title,
    subtitle: video.category?.name ?? "On demand",
    description: video.description ?? undefined,
    image: video.thumbnailUrl || FALLBACK_POSTER,
    hlsUrl: video.hlsUrl,
  };
}

function mapLiveChannel(channel: ApiLiveChannel): MediaItem {
  return {
    id: channel.id,
    title: channel.name,
    subtitle: channel.status === "LIVE" ? "In diretta" : channel.status,
    description: channel.description ?? undefined,
    image: channel.posterUrl || FALLBACK_POSTER,
    hlsUrl: channel.hlsUrl,
    live: channel.status === "LIVE",
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  const [videoResponse, liveResponse] = await Promise.all([
    fetchJson<ApiCollection<ApiVideo>>("/api/v1/videos?limit=24"),
    fetchJson<ApiCollection<ApiLiveChannel>>("/api/v1/live-channels"),
  ]);

  const apiVideos = videoResponse?.data?.map(mapVideo) ?? [];
  const apiLiveChannels = liveResponse?.data?.map(mapLiveChannel) ?? [];
  const featured = apiVideos[0] ?? mostWatched[0] ?? entertainment[0];

  return {
    featured,
    mostWatched: apiVideos.length > 0 ? apiVideos : mostWatched,
    liveChannels: apiLiveChannels.length > 0 ? apiLiveChannels : liveChannels,
    entertainment: apiVideos.length > 0 ? apiVideos.slice(0, 12) : entertainment,
  };
}
