import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { NoticePublicPage, type PublicNoticeArticle } from "@/components/NewsPublicPages";
import { getHomeContent } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.tvmix.it";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tvmix.it";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const notice = await fetchNoticeBySlug(slug);
  if (!notice) {
    return {
      title: "9notice | TVMIX",
      description: "Notizia non trovata.",
    };
  }

  const description = notice.excerpt || notice.body.slice(0, 180);
  const url = `${SITE_URL}/9notice/${notice.slug}`;
  return {
    title: `${notice.title} | 9notice`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: notice.title,
      description,
      url,
      siteName: "TVMIX",
      publishedTime: notice.publishedAt ?? notice.createdAt,
      images: [{ url: notice.imageUrl, alt: notice.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: notice.title,
      description,
      images: [notice.imageUrl],
    },
  };
}

export default async function NineNoticeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [content, notices, selected] = await Promise.all([
    getHomeContent(),
    fetchNews<PublicNoticeArticle>("/api/v1/news/notice"),
    fetchNoticeBySlug(slug),
  ]);

  if (!selected) notFound();
  const mergedNotices = notices.some((notice) => notice.id === selected.id) ? notices : [selected, ...notices];

  return (
    <main className="min-h-screen bg-[#020a13]">
      <Navbar links={content.headerMenu} />
      <NoticePublicPage notices={mergedNotices} initialSlug={selected.slug} />
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

async function fetchNoticeBySlug(slug: string): Promise<PublicNoticeArticle | null> {
  try {
    const response = await fetch(`${API_URL}/api/v1/news/notice/${encodeURIComponent(slug)}`, { cache: "no-store", headers: { accept: "application/json" } });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: PublicNoticeArticle };
    return payload.data ?? null;
  } catch {
    return null;
  }
}
