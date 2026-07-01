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
  hlsUrl?: string | null;
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

type ApiMenuItem = {
  id: string;
  label: string;
  url: string;
  placements?: Array<"HEADER" | "FOOTER" | "MOBILE">;
  placement?: "HEADER" | "FOOTER" | "MOBILE";
  sortOrder: number;
  external: boolean;
  parentId?: string | null;
};

type ApiCarouselSlide = {
  id: string;
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  imageUrl: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  sortOrder: number;
  video?: ApiVideo | null;
};

export type NavigationItem = {
  id: string;
  label: string;
  url: string;
  external: boolean;
};

export type HeroSlide = {
  id: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  ctaLabel?: string;
  ctaUrl?: string;
  media?: MediaItem;
};

export type HomeContent = {
  featured: MediaItem;
  heroSlides: HeroSlide[];
  headerMenu: NavigationItem[];
  footerMenu: NavigationItem[];
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
    hlsUrl: video.hlsUrl ?? undefined,
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

function mapMenuItem(item: ApiMenuItem): NavigationItem {
  return {
    id: item.id,
    label: item.label,
    url: item.url,
    external: item.external,
  };
}

function hasPlacement(item: ApiMenuItem, placement: "HEADER" | "FOOTER" | "MOBILE"): boolean {
  return item.placements?.includes(placement) || item.placement === placement;
}

function mapCarouselSlide(slide: ApiCarouselSlide): HeroSlide {
  const media = slide.video ? mapVideo(slide.video) : undefined;

  return {
    id: slide.id,
    eyebrow: slide.eyebrow ?? undefined,
    title: slide.title,
    subtitle: slide.subtitle ?? media?.subtitle,
    description: slide.description ?? media?.description,
    image: slide.imageUrl || media?.image || FALLBACK_POSTER,
    ctaLabel: slide.ctaLabel ?? "Guarda ora",
    ctaUrl: slide.ctaUrl ?? undefined,
    media,
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  const [videoResponse, liveResponse, menuResponse, carouselResponse] = await Promise.all([
    fetchJson<ApiCollection<ApiVideo>>("/api/v1/videos?limit=24"),
    fetchJson<ApiCollection<ApiLiveChannel>>("/api/v1/live-channels"),
    fetchJson<ApiCollection<ApiMenuItem>>("/api/v1/menu"),
    fetchJson<ApiCollection<ApiCarouselSlide>>("/api/v1/carousel"),
  ]);

  const apiVideos = videoResponse?.data?.map(mapVideo) ?? [];
  const apiLiveChannels = liveResponse?.data?.map(mapLiveChannel) ?? [];
  const apiMenu = menuResponse?.data ?? [];
  const apiHeroSlides = carouselResponse?.data?.map(mapCarouselSlide) ?? [];
  const featured =
    apiHeroSlides.find((slide) => slide.media)?.media ??
    apiVideos[0] ??
    mostWatched[0] ??
    entertainment[0];

  return {
    featured,
    heroSlides: apiHeroSlides,
    headerMenu: apiMenu.filter((item) => hasPlacement(item, "HEADER")).map(mapMenuItem),
    footerMenu: apiMenu.filter((item) => hasPlacement(item, "FOOTER")).map(mapMenuItem),
    mostWatched: apiVideos.length > 0 ? apiVideos : mostWatched,
    liveChannels: apiLiveChannels.length > 0 ? apiLiveChannels : liveChannels,
    entertainment: apiVideos.length > 0 ? apiVideos.slice(0, 12) : entertainment,
  };
}
