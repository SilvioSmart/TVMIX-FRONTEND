import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { getHomeContent, getStaticPage, type StaticPageContent } from "@/lib/api";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.tvmix.it").replace(/\/$/, "");

export async function generateStaticInfoMetadata(slug: StaticPageContent["slug"]): Promise<Metadata> {
  const [content, page] = await Promise.all([getHomeContent(), getStaticPage(slug)]);
  if (!page) return {};

  const title = page.seoTitle || page.title;
  const description = page.seoDescription || page.subtitle || `${page.title} | ${content.brand.platformName}`;

  return {
    title: `${title} | ${content.brand.platformName}`,
    description,
    alternates: { canonical: `${SITE_URL}/${page.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/${page.slug}`,
      siteName: content.brand.platformName,
      type: "article",
    },
  };
}

export async function StaticInfoPage({ slug }: { slug: StaticPageContent["slug"] }) {
  const [content, page] = await Promise.all([getHomeContent(), getStaticPage(slug)]);
  if (!page) notFound();

  return (
    <main className="public-shell min-h-screen bg-[#020a13]">
      <Navbar links={content.headerMenu} brand={content.brand} />
      <section className="mx-auto max-w-5xl px-5 pt-28 sm:px-8 lg:px-12">
        <div
          className="rounded-[2rem] border bg-white/[0.035] p-6 shadow-2xl sm:p-10 lg:p-12"
          style={{ borderColor: `${content.brand.accentColor}33` }}
        >
          <p
            className="text-xs font-black uppercase tracking-[0.28em]"
            style={{ color: content.brand.accentColor }}
          >
            {content.brand.platformName}
          </p>
          <h1
            className="mt-4 font-black tracking-[-0.06em] text-white"
            style={{ fontSize: page.titleFontSize, textAlign: page.titleAlign }}
          >
            {page.title}
          </h1>
          {page.subtitle ? (
            <p
              className="mt-4 max-w-3xl leading-8 text-white/65"
              style={{ fontSize: page.subtitleFontSize, textAlign: page.subtitleAlign }}
            >
              {page.subtitle}
            </p>
          ) : null}
          {page.heroImageUrl ? (
            <img
              src={page.heroImageUrl}
              alt={page.title}
              className="mt-8 max-h-[440px] w-full rounded-[1.5rem] object-cover"
            />
          ) : null}
          {page.bodyHtml ? (
            <article
              className="mt-10 prose prose-invert max-w-none leading-8 text-white/72"
              style={{ fontSize: page.bodyFontSize, textAlign: page.bodyAlign }}
              dangerouslySetInnerHTML={{ __html: page.bodyHtml }}
            />
          ) : (
            <article
              className="mt-10 whitespace-pre-wrap leading-8 text-white/72"
              style={{ fontSize: page.bodyFontSize, textAlign: page.bodyAlign }}
            >
              {page.body}
            </article>
          )}
        </div>
      </section>
      <Footer links={content.footerMenu} brand={content.brand} />
    </main>
  );
}
