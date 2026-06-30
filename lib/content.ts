export type MediaItem = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  description?: string;
  hlsUrl?: string;
  live?: boolean;
  progress?: number;
};

export const heroSlides = [
  {
    id: "senza-filtri",
    title: "SENZA\nFILTRI",
    subtitle: "Storie vere, domande dirette.",
    description:
      "Un confronto senza scorciatoie con i protagonisti del nostro tempo. Nuove puntate ogni domenica.",
    image: "/images/senza-filtri-hero.png",
  },
  {
    id: "notte-italiana",
    title: "NOTTE\nITALIANA",
    subtitle: "La musica accende la città.",
    description:
      "Artisti, performance e incontri inattesi nel nuovo grande show del venerdì sera.",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=2200&q=90",
  },
  {
    id: "orizzonti",
    title: "ORIZZONTI",
    subtitle: "L'Italia come non l'hai mai vista.",
    description:
      "Un viaggio spettacolare tra paesaggi, persone e storie che meritano di essere raccontate.",
    image:
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=2200&q=90",
  },
] as const;

export const mostWatched: MediaItem[] = [
  {
    id: "inchiesta",
    title: "Linea d'Inchiesta",
    subtitle: "Nuova puntata",
    image:
      "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=80",
    progress: 68,
  },
  {
    id: "master",
    title: "Chef d'Italia",
    subtitle: "Sfida finale",
    image:
      "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "viaggio",
    title: "Rotte Segrete",
    subtitle: "Sicilia",
    image:
      "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80",
    progress: 34,
  },
  {
    id: "studio",
    title: "Punto e a Capo",
    subtitle: "Attualità",
    image:
      "https://images.unsplash.com/photo-1586899028174-e7098604235b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "crime",
    title: "Ombre",
    subtitle: "Episodio 4",
    image:
      "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80",
  },
];

export const liveChannels: MediaItem[] = [
  {
    id: "tvmix-1",
    title: "TVMIX Uno",
    subtitle: "Senza Filtri",
    image:
      "https://images.unsplash.com/photo-1598387993281-cecf8b71a8f8?auto=format&fit=crop&w=900&q=80",
    live: true,
  },
  {
    id: "tvmix-news",
    title: "TVMIX News",
    subtitle: "TG Giorno",
    image:
      "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=900&q=80",
    live: true,
  },
  {
    id: "tvmix-sport",
    title: "TVMIX Sport",
    subtitle: "Studio Live",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
    live: true,
  },
  {
    id: "tvmix-doc",
    title: "TVMIX Doc",
    subtitle: "Meraviglie d'Italia",
    image:
      "https://images.unsplash.com/photo-1533676802871-eca1ae998cd5?auto=format&fit=crop&w=900&q=80",
    live: true,
  },
];

export const entertainment: MediaItem[] = [
  {
    id: "risate",
    title: "Tutta un'altra storia",
    subtitle: "Comedy show",
    image:
      "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "talent",
    title: "La Voce che Hai",
    subtitle: "Talent",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "late",
    title: "Fuori Orario",
    subtitle: "Late night",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "quiz",
    title: "Il Grande Quiz",
    subtitle: "Game show",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "backstage",
    title: "Dietro le Quinte",
    subtitle: "Original",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
  },
];
