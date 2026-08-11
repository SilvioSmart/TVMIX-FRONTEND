import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Tg9PublicPage, type PublicTg9Video } from "@/components/NewsPublicPages";
import { getHomeContent } from "@/lib/api";
import type { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.tvmix.it";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tvmix.it").replace(/\/$/, "");
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/images/senza-filtri-hero.png`;

type Tg9SearchParams = Record<string, string | string[] | undefined>;
type Tg9PageProps = {
  searchParams?: Promise<Tg9SearchParams>;
};

export async function generateMetadata({ searchParams }: Tg9PageProps): Promise<Metadata> {
  const params = await searchParams;
  const videos = await fetchNews<PublicTg9Video>("/api/v1/news/tg9");
  const target = findTg9Target(videos, params);
  const video = target.video ?? videos[0];
  const subclip = target.subclip;
  const title = subclip?.title || video?.title || "TG9";
  const description = video?.description || "Video TG9 su TVMIX.";
  const slug = subclip?.slug || video?.slug || "";
  const url = slug ? `${SITE_URL}/tg9?clip=${encodeURIComponent(slug)}` : `${SITE_URL}/tg9`;
  const image = absoluteUrl(video?.posterUrl || DEFAULT_SHARE_IMAGE);

  return {
    title: `${title} | TG9 | TVMIX`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "TVMIX",
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

export default async function Tg9Page() {
  const [content, videos] = await Promise.all([
    getHomeContent(),
    fetchNews<PublicTg9Video>("/api/v1/news/tg9"),
  ]);

  return (
    <main className="public-shell min-h-screen bg-[#020a13]">
      <Navbar links={content.headerMenu} />
      <Tg9PublicPage videos={videos} />
      <Footer links={content.footerMenu} />
    </main>
  );
}

async function fetchNews<T>(path: string): Promise<T[]> {
  try {
    const response = await fetch(`${API_URL}${path}`, { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) return [];
    const payload = (await response.json()) as { data?: T[] };
    return payload.data ?? [];
  } catch {
    return [];
  }
}

function findTg9Target(videos: PublicTg9Video[], params?: Tg9SearchParams) {
  const requested = firstParam(params?.clip) || firstParam(params?.video);
  if (!requested) return { video: videos[0] ?? null, subclip: null };

  const directVideo = videos.find((video) => video.slug === requested);
  if (directVideo) return { video: directVideo, subclip: null };

  for (const video of videos) {
    const subclip = video.subclips?.find((item) => item.slug === requested);
    if (subclip) return { video, subclip };
  }

  return { video: videos[0] ?? null, subclip: null };
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function absoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}
