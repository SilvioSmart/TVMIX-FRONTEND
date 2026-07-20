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
  slug?: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  hlsUrl?: string | null;
  duration?: number | null;
  episodeNumber?: number | null;
  episodeCode?: string | null;
  category?: {
    name: string;
    slug: string;
  } | null;
  season?: {
    id: string;
    number: number;
    title?: string | null;
    program?: {
      id: string;
      name: string;
      slug: string;
    } | null;
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

export type EpgItem = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  thumbnailUrl?: string | null;
  video?: MediaItem | null;
};

export type LiveModuleStream = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  streamType?: "LIVE_STREAMING" | "PLAYLIST";
  hlsUrl: string;
  posterUrl?: string | null;
  status: "OFFLINE" | "LIVE" | "SCHEDULED";
};

export type HomeModule = {
  id: string;
  title: string;
  subtitle?: string | null;
  type: "CAROUSEL_SLIDER" | "LIVE_EPG" | "POSTER_RAIL";
  queryType: "LATEST" | "CATEGORY" | "PROGRAM" | "SEASON" | "MANUAL" | "LIVE";
  sortMethod?: "RECENT" | "OLDEST" | "TITLE_ASC";
  sortOrder: number;
  items: MediaItem[];
  liveStream?: LiveModuleStream | null;
  epg: EpgItem[];
};

type ApiEpgItem = Omit<EpgItem, "video"> & {
  video?: ApiVideo | null;
};

type ApiHomeModule = Omit<HomeModule, "items" | "epg"> & {
  items?: ApiVideo[];
  epg?: ApiEpgItem[];
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
  modules: HomeModule[];
  mostWatched: MediaItem[];
  liveChannels: MediaItem[];
  entertainment: MediaItem[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.tvmix.it";
const FALLBACK_POSTER = "/images/senza-filtri-hero.png";
const MEDIA_HOST = "media.tvmix.it";

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function mapVideo(video: ApiVideo): MediaItem {
  const seasonLabel = video.season
    ? [
        video.season.title || `Stagione ${video.season.number}`,
        video.episodeNumber ? `Ep. ${video.episodeNumber}` : null,
      ].filter(Boolean).join(" · ")
    : null;

  return {
    id: video.id,
    title: video.title,
    subtitle: video.category?.name ?? "On demand",
    description: video.description ?? undefined,
    image: video.thumbnailUrl || FALLBACK_POSTER,
    hlsUrl: proxyMediaUrl(video.hlsUrl),
    duration: video.duration ?? undefined,
    archiveLabel: seasonLabel ?? video.category?.name ?? "Archivio TVMIX",
    categoryName: video.category?.name ?? undefined,
  };
}

function proxyMediaUrl(value?: string | null) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname !== MEDIA_HOST) return value;
    return `/api/media${url.pathname}${url.search}`;
  } catch {
    return value;
  }
}

function mapLiveChannel(channel: ApiLiveChannel): MediaItem {
  return {
    id: channel.id,
    title: channel.name,
    subtitle: channel.status === "LIVE" ? "In diretta" : channel.status,
    description: channel.description ?? undefined,
    image: channel.posterUrl || FALLBACK_POSTER,
    hlsUrl: proxyMediaUrl(channel.hlsUrl),
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

function mapHomeModule(module: ApiHomeModule): HomeModule {
  return {
    ...module,
    items: module.items?.map(mapVideo) ?? [],
    epg: module.epg?.map((item) => ({
      ...item,
      video: item.video ? mapVideo(item.video) : null,
    })) ?? [],
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  const [videoResponse, liveResponse, menuResponse, carouselResponse, moduleResponse] = await Promise.all([
    fetchJson<ApiCollection<ApiVideo>>("/api/v1/videos?limit=24"),
    fetchJson<ApiCollection<ApiLiveChannel>>("/api/v1/live-channels"),
    fetchJson<ApiCollection<ApiMenuItem>>("/api/v1/menu"),
    fetchJson<ApiCollection<ApiCarouselSlide>>("/api/v1/carousel"),
    fetchJson<ApiCollection<ApiHomeModule>>("/api/v1/modules"),
  ]);

  const apiVideos = videoResponse?.data?.map(mapVideo) ?? [];
  const apiLiveChannels = liveResponse?.data?.map(mapLiveChannel) ?? [];
  const apiMenu = menuResponse?.data ?? [];
  const apiHeroSlides = carouselResponse?.data?.map(mapCarouselSlide) ?? [];
  const apiModules = moduleResponse?.data?.map(mapHomeModule) ?? [];
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
    modules: apiModules,
    mostWatched: apiVideos.length > 0 ? apiVideos : mostWatched,
    liveChannels: apiLiveChannels.length > 0 ? apiLiveChannels : liveChannels,
    entertainment: apiVideos.length > 0 ? apiVideos.slice(0, 12) : entertainment,
  };
}
