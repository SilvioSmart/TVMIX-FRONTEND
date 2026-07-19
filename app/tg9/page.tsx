import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Tg9PublicPage, type PublicTg9Video } from "@/components/NewsPublicPages";
import { getHomeContent } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://api.tvmix.it";

export const metadata = {
  title: "TG9 | TVMIX",
  description: "Carousel video TG9 su TVMIX.",
};

export default async function Tg9Page() {
  const [content, videos] = await Promise.all([
    getHomeContent(),
    fetchNews<PublicTg9Video>("/api/v1/news/tg9"),
  ]);

  return (
    <main className="min-h-screen bg-[#020a13]">
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
