"use client";

import { useState } from "react";
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

  const fallbackModules: HomeModule[] = [
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
  ];

  return (
    <>
      <Navbar links={content.headerMenu} />
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
      <Footer links={content.footerMenu} />
      <PlayerModal
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        title={selectedMedia.title}
        poster={selectedMedia.image}
        src={selectedMedia.hlsUrl}
        vastUrl={selectedMedia.vastUrl}
      />
    </>
  );
}
