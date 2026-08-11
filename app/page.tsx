import { HomePage } from "@/components/HomePage";
import { getHomeContent, type HomeContent } from "@/lib/api";
import type { MediaItem } from "@/lib/content";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tvmix.it").replace(/\/$/, "");
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/images/senza-filtri-hero.png`;

type HomeSearchParams = Record<string, string | string[] | undefined>;
type HomePageProps = {
  searchParams?: Promise<HomeSearchParams>;
};

export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const params = await searchParams;
  const mediaKey = firstParam(params?.media);
  const content = await getHomeContent();
  const media = mediaKey ? findMedia(content, mediaKey) : null;

  if (!media) {
    return {
      title: `${content.brand.platformName} | Streaming e contenuti TV`,
      description: "Guarda i contenuti video e i canali live su TVMIX.",
      openGraph: {
        title: content.brand.platformName,
        description: "Guarda i contenuti video e i canali live su TVMIX.",
        url: SITE_URL,
        siteName: content.brand.platformName,
        images: [{ url: absoluteUrl(content.featured.image || DEFAULT_SHARE_IMAGE), width: 1200, height: 630 }],
      },
    };
  }

  const url = `${SITE_URL}/?media=${encodeURIComponent(media.slug || media.id)}`;
  const title = media.title || content.brand.platformName;
  const description = media.description || media.subtitle || "Guarda questo contenuto su TVMIX.";
  const image = absoluteUrl(media.image || DEFAULT_SHARE_IMAGE);

  return {
    title: `${title} | ${content.brand.platformName}`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: content.brand.platformName,
      type: "video.other",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function Page() {
  const content = await getHomeContent();

  return <HomePage content={content} />;
}

function findMedia(content: HomeContent, mediaKey: string) {
  const media = new Map<string, MediaItem>();
  const add = (item?: MediaItem | null) => {
    if (!item) return;
    media.set(item.id, item);
    if (item.slug) media.set(item.slug, item);
  };

  add(content.featured);
  content.heroSlides.forEach((slide) => add(slide.media));
  content.modules.forEach((module) => {
    module.items.forEach(add);
    module.epg.forEach((item) => add(item.video));
  });
  content.mostWatched.forEach(add);
  content.liveChannels.forEach(add);
  content.entertainment.forEach(add);

  return media.get(mediaKey) ?? null;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}
