"use client";

import { useState } from "react";
import type { HomeContent } from "@/lib/api";
import type { MediaItem } from "@/lib/content";
import { ContentRail } from "./ContentRail";
import { Footer } from "./Footer";
import { HeroSlider } from "./HeroSlider";
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

  return (
    <>
      <Navbar links={content.headerMenu} />
      <main>
        <HeroSlider
          featured={content.featured}
          slides={content.heroSlides}
          onPlay={() => openPlayer(content.featured)}
        />
        <div className="-mt-7 relative z-20 pb-4 sm:-mt-14">
          <ContentRail
            id="programmi"
            title="I più visti"
            items={content.mostWatched}
            onSelect={openPlayer}
          />
          <ContentRail
            id="live"
            title="Canali Live"
            items={content.liveChannels}
            onSelect={openPlayer}
          />
          <ContentRail
            id="categorie"
            title="Intrattenimento"
            items={content.entertainment}
            onSelect={openPlayer}
          />
        </div>
      </main>
      <Footer links={content.footerMenu} />
      <PlayerModal
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        title={selectedMedia.title}
        poster={selectedMedia.image}
        src={selectedMedia.hlsUrl}
      />
    </>
  );
}
