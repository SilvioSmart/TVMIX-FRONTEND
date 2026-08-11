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
  vastUrl?: string | null;
  duration?: number | null;
  mediaFormat?: string | null;
  videoQuality?: string | null;
  audioTracks?: unknown;
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
    _count?: {
      episodes?: number;
    };
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

export type BrandSettings = {
  platformName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  defaultThumbnailUrl: string | null;
  defaultSignalUrl: string | null;
  accentColor: string;
};

export type StaticPageContent = {
  slug: "chi-siamo" | "contatti" | "assistenza" | "lavora-con-noi" | "privacy-policy" | "cookie";
  title: string;
  titleFontSize: number;
  titleAlign: "left" | "center" | "right" | "justify";
  subtitle?: string | null;
  subtitleFontSize: number;
  subtitleAlign: "left" | "center" | "right" | "justify";
  heroImageUrl?: string | null;
  body: string;
  bodyHtml?: string | null;
  bodyFontSize: number;
  bodyAlign: "left" | "center" | "right" | "justify";
  seoTitle?: string | null;
  seoDescription?: string | null;
  published: boolean;
  sortOrder: number;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ApiBrandSettings = BrandSettings & {
  id: string;
  logoObjectKey?: string | null;
  faviconObjectKey?: string | null;
  defaultThumbnailObjectKey?: string | null;
  defaultSignalObjectKey?: string | null;
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
  type: "CAROUSEL_SLIDER" | "LIVE_EPG" | "POSTER_RAIL" | "PROMOTIONS";
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
  children?: NavigationItem[];
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
  brand: BrandSettings;
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

export const fallbackBrand: BrandSettings = {
  platformName: "TVMIX",
  logoUrl: null,
  faviconUrl: null,
  defaultThumbnailUrl: null,
  defaultSignalUrl: null,
  accentColor: "#03A9F4",
};

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

export async function getBrandSettings(): Promise<BrandSettings> {
  const response = await fetchJson<{ data?: ApiBrandSettings }>("/api/v1/appearance/brand");
  return { ...fallbackBrand, ...(response?.data ?? {}) };
}

export async function getStaticPage(slug: StaticPageContent["slug"]): Promise<StaticPageContent | null> {
  const response = await fetchJson<{ data?: StaticPageContent }>(`/api/v1/pages/${slug}`);
  return response?.data ?? null;
}

function brandThumbnailFallback(brand: BrandSettings) {
  return brand.defaultThumbnailUrl || FALLBACK_POSTER;
}

function brandSignalFallback(brand: BrandSettings) {
  return brand.defaultSignalUrl || brand.defaultThumbnailUrl || FALLBACK_POSTER;
}

function mapVideo(video: ApiVideo, brand: BrandSettings = fallbackBrand): MediaItem {
  const seasonLabel = video.season
    ? [
        video.season.title || `Stagione ${video.season.number}`,
        video.episodeNumber ? `Ep. ${video.episodeNumber}` : null,
      ].filter(Boolean).join(" · ")
    : null;

  return {
    id: video.id,
    slug: video.slug,
    title: video.title,
    subtitle: video.category?.name ?? "On demand",
    description: video.description ?? undefined,
    image: video.thumbnailUrl || brandThumbnailFallback(brand),
    hlsUrl: proxyMediaUrl(video.hlsUrl),
    vastUrl: video.vastUrl ?? undefined,
    duration: video.duration ?? undefined,
    mediaFormat: video.mediaFormat ?? undefined,
    videoQuality: video.videoQuality ?? undefined,
    audioTracks: video.audioTracks ?? undefined,
    archiveLabel: seasonLabel ?? video.category?.name ?? "Archivio TVMIX",
    categoryName: video.category?.name ?? undefined,
    programName: video.season?.program?.name ?? undefined,
    seasonNumber: video.season?.number ?? undefined,
    seasonTitle: video.season?.title ?? undefined,
    episodeNumber: video.episodeNumber ?? undefined,
    episodeCode: video.episodeCode ?? undefined,
    seasonEpisodeCount: video.season?._count?.episodes ?? undefined,
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

function mapLiveChannel(channel: ApiLiveChannel, brand: BrandSettings = fallbackBrand): MediaItem {
  return {
    id: channel.id,
    title: channel.name,
    subtitle: channel.status === "LIVE" ? "In diretta" : channel.status,
    description: channel.description ?? undefined,
    image: channel.posterUrl || (channel.status === "LIVE" ? brandThumbnailFallback(brand) : brandSignalFallback(brand)),
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

function mapMenuTree(items: ApiMenuItem[], placement: "HEADER" | "FOOTER" | "MOBILE"): NavigationItem[] {
  const visible = items
    .filter((item) => hasPlacement(item, placement))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const childrenByParent = new Map<string, ApiMenuItem[]>();
  for (const item of visible) {
    if (!item.parentId) continue;
    childrenByParent.set(item.parentId, [...(childrenByParent.get(item.parentId) ?? []), item]);
  }
  return visible
    .filter((item) => !item.parentId)
    .map((item) => ({
      ...mapMenuItem(item),
      children: (childrenByParent.get(item.id) ?? []).map(mapMenuItem),
    }));
}

function hasPlacement(item: ApiMenuItem, placement: "HEADER" | "FOOTER" | "MOBILE"): boolean {
  return item.placements?.includes(placement) || item.placement === placement;
}

function mapCarouselSlide(slide: ApiCarouselSlide, brand: BrandSettings = fallbackBrand): HeroSlide {
  const media = slide.video ? mapVideo(slide.video, brand) : undefined;

  return {
    id: slide.id,
    eyebrow: slide.eyebrow ?? undefined,
    title: slide.title,
    subtitle: slide.subtitle ?? media?.subtitle,
    description: slide.description ?? media?.description,
    image: slide.imageUrl || media?.image || brandThumbnailFallback(brand),
    ctaLabel: slide.ctaLabel ?? "Guarda ora",
    ctaUrl: slide.ctaUrl ?? undefined,
    media,
  };
}

function mapHomeModule(module: ApiHomeModule, brand: BrandSettings = fallbackBrand): HomeModule {
  return {
    ...module,
    items: module.items?.map((item) => mapVideo(item, brand)) ?? [],
    epg: module.epg?.map((item) => ({
      ...item,
      video: item.video ? mapVideo(item.video, brand) : null,
    })) ?? [],
  };
}

export async function getHomeContent(): Promise<HomeContent> {
  const [brandResponse, videoResponse, liveResponse, menuResponse, carouselResponse, moduleResponse] = await Promise.all([
    fetchJson<{ data?: ApiBrandSettings }>("/api/v1/appearance/brand"),
    fetchJson<ApiCollection<ApiVideo>>("/api/v1/videos?limit=24"),
    fetchJson<ApiCollection<ApiLiveChannel>>("/api/v1/live-channels"),
    fetchJson<ApiCollection<ApiMenuItem>>("/api/v1/menu"),
    fetchJson<ApiCollection<ApiCarouselSlide>>("/api/v1/carousel"),
    fetchJson<ApiCollection<ApiHomeModule>>("/api/v1/modules"),
  ]);

  const brand = { ...fallbackBrand, ...(brandResponse?.data ?? {}) };
  const apiVideos = videoResponse?.data?.map((item) => mapVideo(item, brand)) ?? [];
  const apiLiveChannels = liveResponse?.data?.map((item) => mapLiveChannel(item, brand)) ?? [];
  const apiMenu = menuResponse?.data ?? [];
  const apiHeroSlides = carouselResponse?.data?.map((item) => mapCarouselSlide(item, brand)) ?? [];
  const apiModules = moduleResponse?.data?.map((item) => mapHomeModule(item, brand)) ?? [];
  const featured =
    apiHeroSlides.find((slide) => slide.media)?.media ??
    apiVideos[0] ??
    mostWatched[0] ??
    entertainment[0];

  return {
    brand,
    featured,
    heroSlides: apiHeroSlides,
    headerMenu: mapMenuTree(apiMenu, "HEADER"),
    footerMenu: mapMenuTree(apiMenu, "FOOTER"),
    modules: apiModules,
    mostWatched: apiVideos.length > 0 ? apiVideos : mostWatched,
    liveChannels: apiLiveChannels.length > 0 ? apiLiveChannels : liveChannels,
    entertainment: apiVideos.length > 0 ? apiVideos.slice(0, 12) : entertainment,
  };
}
