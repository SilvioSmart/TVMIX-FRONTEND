import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { NoticePublicPage, type PublicNoticeArticle } from "@/components/NewsPublicPages";
import { getHomeContent } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.tvmix.it";

export const metadata = {
  title: "9notice | TVMIX",
  description: "Notizie, aggiornamenti e contenuti editoriali TVMIX.",
};

export default async function NineNoticePage() {
  const [content, notices] = await Promise.all([
    getHomeContent(),
    fetchNews<PublicNoticeArticle>("/api/v1/news/notice"),
  ]);

  return (
    <main className="min-h-screen bg-[#020a13]">
      <Navbar links={content.headerMenu} />
      <NoticePublicPage notices={notices} />
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
