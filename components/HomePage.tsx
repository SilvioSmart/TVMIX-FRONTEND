"use client";

import { useState } from "react";
import {
  entertainment,
  liveChannels,
  mostWatched,
  type MediaItem,
} from "@/lib/content";
import { ContentRail } from "./ContentRail";
import { Footer } from "./Footer";
import { HeroSlider } from "./HeroSlider";
import { Navbar } from "./Navbar";
import { PlayerModal } from "./PlayerModal";

const initialMedia: MediaItem = {
  id: "senza-filtri",
  title: "Senza Filtri",
  image: "/images/senza-filtri-hero.png",
};

export function HomePage() {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem>(initialMedia);
  const [playerOpen, setPlayerOpen] = useState(false);

  const openPlayer = (item: MediaItem) => {
    setSelectedMedia(item);
    setPlayerOpen(true);
  };

  return (
    <>
      <Navbar />
      <main>
        <HeroSlider onPlay={() => openPlayer(initialMedia)} />
        <div className="-mt-7 relative z-20 pb-4 sm:-mt-14">
          <ContentRail
            id="programmi"
            title="I più visti"
            items={mostWatched}
            onSelect={openPlayer}
          />
          <ContentRail
            id="live"
            title="Canali Live"
            items={liveChannels}
            onSelect={openPlayer}
          />
          <ContentRail
            id="categorie"
            title="Intrattenimento"
            items={entertainment}
            onSelect={openPlayer}
          />
        </div>
      </main>
      <Footer />
      <PlayerModal
        open={playerOpen}
        onClose={() => setPlayerOpen(false)}
        title={selectedMedia.title}
        poster={selectedMedia.image}
      />
    </>
  );
}
