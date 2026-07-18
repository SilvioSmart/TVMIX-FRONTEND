import {
  CircleUserRound,
  Clapperboard,
  FolderOpen,
  Home,
  Palette,
  Radio,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { AppearanceMenuKey, LiveStream } from "./admin-api";

export type AdminSection =
  | "overview"
  | "content"
  | "live"
  | "catalog"
  | "users"
  | "appearance"
  | "settings";

export type ContentSubnavKey = "loading" | "route-cfg" | "library";
export type ContentSubnavItem = {
  key: ContentSubnavKey;
  label: string;
  description?: string | null;
};

export type AppearanceSubnavItem = {
  key: AppearanceMenuKey;
  label: string;
  description?: string | null;
};

export type LiveSubnavKey = LiveStream["streamType"];
export type LiveSubnavItem = {
  key: LiveSubnavKey;
  label: string;
  description?: string | null;
};

export type NavItem = {
  id: AdminSection;
  label: string;
  icon: LucideIcon;
  children?: Array<AppearanceSubnavItem | ContentSubnavItem | LiveSubnavItem>;
};

export const fallbackAppearanceMenu: AppearanceSubnavItem[] = [
  { key: "logo-name", label: "LOGO/NAME", description: "Identità visiva, logo e nome piattaforma" },
  { key: "menu", label: "MENU'", description: "Navigazione e voci menu del frontend" },
  { key: "carousel", label: "CAROUSELL", description: "Carousel, hero e contenuti in evidenza" },
  { key: "modules", label: "MODULI", description: "Blocchi homepage e sezioni editoriali" },
  { key: "footer", label: "FOOTER", description: "Footer, link legali e contatti" },
];

export const liveMenu: LiveSubnavItem[] = [
  { key: "LIVE_STREAMING", label: "LIVE STREAM", description: "Canali con sorgente HLS esterna" },
  { key: "PLAYLIST", label: "PLAYLIST", description: "Canali generati da sequenze di clip" },
];

export const contentMenu: ContentSubnavItem[] = [
  { key: "loading", label: "LOADING", description: "Caricamento file originali e import remoto" },
  { key: "library", label: "LIBRERIA", description: "Archivio contenuti, catalogo e conversioni" },
  { key: "route-cfg", label: "ROUTE CFG", description: "Rotte SSH, SFTP, Rsync e mount per import esterni" },
];

export const navigation: NavItem[] = [
  { id: "overview", label: "Panoramica", icon: Home },
  { id: "content", label: "Contenuti", icon: Clapperboard, children: contentMenu },
  { id: "live", label: "Dirette TV", icon: Radio, children: liveMenu },
  { id: "catalog", label: "Catalogo", icon: FolderOpen },
  { id: "users", label: "Utenti", icon: CircleUserRound },
  { id: "appearance", label: "Aspetto", icon: Palette, children: fallbackAppearanceMenu },
  { id: "settings", label: "Impostazioni", icon: Settings },
];

export const videos = [
  {
    title: "Senza Filtri",
    category: "Attualità",
    status: "Pubblicato",
    updated: "Oggi, 15:42",
    image: "/images/senza-filtri-hero.png",
  },
  {
    title: "Highlights Serie A",
    category: "Sport",
    status: "Pubblicato",
    updated: "Oggi, 11:08",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=280&q=80",
  },
  {
    title: "TG Lombardia",
    category: "News",
    status: "In diretta",
    updated: "Oggi, 10:55",
    image:
      "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=280&q=80",
  },
  {
    title: "Rotte Segrete — Sicilia",
    category: "Documentari",
    status: "Bozza",
    updated: "Ieri, 22:17",
    image:
      "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=280&q=80",
  },
  {
    title: "Notte Italiana",
    category: "Musica",
    status: "Pianificato",
    updated: "Ieri, 18:42",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=280&q=80",
  },
];

export const categories = [
  { name: "Attualità", contents: 18, color: "#16b9f4" },
  { name: "News", contents: 42, color: "#ff6b63" },
  { name: "Sport", contents: 26, color: "#f8c14b" },
  { name: "Documentari", contents: 14, color: "#8e7cff" },
  { name: "Intrattenimento", contents: 31, color: "#4bd39b" },
];

export const users = [
  { name: "Marco Rossi", email: "marco.rossi@email.it", role: "Utente", status: "Attivo" },
  { name: "Giulia Bianchi", email: "giulia.bianchi@email.it", role: "Editor", status: "Attivo" },
  { name: "Luca Conti", email: "luca.conti@email.it", role: "Utente", status: "Sospeso" },
  { name: "Anna Verdi", email: "anna.verdi@email.it", role: "Admin", status: "Attivo" },
];
