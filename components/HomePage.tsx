"use client";

import { useEffect, useMemo, useState } from "react";
import type { HomeContent, HomeModule } from "@/lib/api";
import type { MediaItem } from "@/lib/content";
import { Footer } from "./Footer";
import { HeroSlider } from "./HeroSlider";
import { HomeModules } from "./HomeModules";
import { Navbar } from "./Navbar";
import { PlayerModal } from "./PlayerModal";

type HomePageProps = {
  content: HomeContent;
};

export function HomePage({ content }: HomePageProps) {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem>(content.featured);
  const [playerOpen, setPlayerOpen] = useState(false);

  const openPlayer = (item: MediaItem) => {
    setSelectedMedia(item);
    setPlayerOpen(true);
  };

  const fallbackModules: HomeModule[] = useMemo(() => [
    {
      id: "programmi",
      title: "I più visti",
      type: "CAROUSEL_SLIDER",
      queryType: "LATEST",
      sortOrder: 10,
      items: content.mostWatched,
      epg: [],
    },
    {
      id: "live",
      title: "Canali Live",
      type: "LIVE_EPG",
      queryType: "LIVE",
      sortOrder: 20,
      items: [],
      liveStream: content.liveChannels[0]
        ? {
            id: content.liveChannels[0].id,
            name: content.liveChannels[0].title,
            slug: content.liveChannels[0].id,
            hlsUrl: content.liveChannels[0].hlsUrl ?? "",
            posterUrl: content.liveChannels[0].image,
            status: content.liveChannels[0].live ? "LIVE" : "OFFLINE",
          }
        : null,
      epg: [],
    },
    {
      id: "categorie",
      title: "Locandine",
      type: "POSTER_RAIL",
      queryType: "LATEST",
      sortOrder: 30,
      items: content.entertainment,
      epg: [],
    },
  ], [content.entertainment, content.liveChannels, content.mostWatched]);

  const linkableMedia = useMemo(() => {
    const map = new Map<string, MediaItem>();
    const add = (item?: MediaItem | null) => {
      if (!item) return;
      map.set(item.id, item);
      if (item.slug) map.set(item.slug, item);
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
    fallbackModules.forEach((module) => {
      module.items.forEach(add);
      module.epg.forEach((item) => add(item.video));
    });
    return map;
  }, [content, fallbackModules]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const mediaKey = params.get("media");
    if (!mediaKey) return;
    const media = linkableMedia.get(mediaKey);
    if (!media) return;
    setSelectedMedia(media);
    setPlayerOpen(true);
  }, [linkableMedia]);

  return (
    <div className="public-shell">
      <Navbar links={content.headerMenu} brand={content.brand} />
      <main>
        <HeroSlider
          featured={content.featured}
          slides={content.heroSlides}
          onPlay={openPlayer}
        />
        <HomeModules
          modules={content.modules}
          fallbackModules={fallbackModules}
          onSelect={openPlayer}
        />
      </main>
      <Footer links={content.footerMenu} brand={content.brand} />
      <PlayerModal
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        title={selectedMedia.title}
        poster={selectedMedia.image}
        src={selectedMedia.hlsUrl}
        vastUrl={selectedMedia.vastUrl}
      />
    </div>
  );
}
