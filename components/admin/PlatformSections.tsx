"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  Boxes,
  FileText,
  GalleryHorizontalEnd,
  LayoutList,
  MenuSquare,
  Palette,
  PanelBottom,
  Save,
  Upload,
} from "lucide-react";
import type { AdminSection, AppearanceSubnavItem, ContentSubnavKey, LiveSubnavKey, NewsSubnavKey } from "./admin-data";
import { CatalogSection } from "./CatalogSection";
import { ContentSection, Header, Input } from "./ContentSection";
import { ResourceState } from "./AdminResourceUI";
import { LoadingSection } from "./LoadingSection";
import { RouteConfigSection } from "./RouteConfigSection";
import { AppearanceCarouselConfigSection } from "./AppearanceCarouselConfigSection";
import { AppearanceMenuConfigSection } from "./AppearanceMenuConfigSection";
import { AppearanceModulesConfigSection } from "./AppearanceModulesConfigSection";
import { LiveSection } from "./LiveSection";
import { NewsSection } from "./NewsSection";
import { UsersSection } from "./UsersSection";
import {
  fetchAppearanceBrand,
  fetchStaticPages,
  adminRequest,
  updateAppearanceBrand,
  updateStaticPage,
  uploadBrandAssetToR2,
  type AppearanceBrandSettings,
  type AppearanceMenuKey,
  type StaticPageContent,
  type StaticPageSlug,
  type ListResponse,
  type Video,
} from "./admin-api";

type Props = {
  section: Exclude<AdminSection, "overview">;
  activeContent: ContentSubnavKey;
  appearanceSection: AppearanceMenuKey;
  activeLive: LiveSubnavKey;
  activeNews: NewsSubnavKey;
  appearanceMenu: AppearanceSubnavItem[];
  onSelectLive: (section: LiveSubnavKey) => void;
  onNotify: (message: string) => void;
};

export function PlatformSections({ section, activeContent, appearanceSection, activeLive, activeNews, appearanceMenu, onSelectLive, onNotify }: Props) {
  if (section === "content") {
    if (activeContent === "loading") return <LoadingSection onNotify={onNotify} />;
    if (activeContent === "route-cfg") return <RouteConfigSection onNotify={onNotify} />;
    return <ContentSection onNotify={onNotify} />;
  }
  if (section === "live") return <LiveSection activeMode={activeLive} onModeChange={onSelectLive} onNotify={onNotify} />;
  if (section === "news") return <NewsSection activeSection={activeNews} onNotify={onNotify} />;
  if (section === "catalog") return <CatalogSection onNotify={onNotify} />;
  if (section === "users") return <UsersSection onNotify={onNotify} />;
  if (section === "appearance") {
    return (
      <AppearanceSection
        activeSection={appearanceSection}
        menu={appearanceMenu}
        onNotify={onNotify}
      />
    );
  }
  return <SettingsSection onNotify={onNotify} />;
}

const appearanceCopy: Record<
  AppearanceMenuKey,
  {
    title: string;
    description: string;
    icon: typeof Palette;
    fields: string[];
    action: string;
  }
> = {
  "logo-name": {
    title: "LOGO/NAME/COLOR",
    description: "Configura nome piattaforma, logo principale, favicon, grafiche default e colore brand.",
    icon: Palette,
    fields: ["Nome piattaforma", "Logo desktop", "Logo mobile", "Favicon"],
    action: "Identità visiva salvata",
  },
  menu: {
    title: "MENU'",
    description: "Gestisci le voci di navigazione visibili nel frontend pubblico.",
    icon: MenuSquare,
    fields: ["Voce menu", "URL destinazione", "Ordine visualizzazione", "Stato voce"],
    action: "Configurazione menu salvata",
  },
  carousel: {
    title: "CAROUSELL",
    description: "Organizza hero, carousel e contenuti editoriali in evidenza.",
    icon: GalleryHorizontalEnd,
    fields: ["Titolo slide", "Contenuto associato", "Immagine hero", "Periodo pubblicazione"],
    action: "Carousel salvato",
  },
  modules: {
    title: "MODULI",
    description: "Attiva e ordina i moduli della homepage e delle pagine editoriali.",
    icon: Boxes,
    fields: ["Nome modulo", "Tipo modulo", "Regola contenuti", "Ordine modulo"],
    action: "Moduli salvati",
  },
  footer: {
    title: "FOOTER",
    description: "Modifica link footer, informazioni societarie, legali e contatti.",
    icon: PanelBottom,
    fields: ["Testo footer", "Link legale", "Contatto", "Social network"],
    action: "Footer salvato",
  },
};

function AppearanceSection({
  activeSection,
  menu,
  onNotify,
}: {
  activeSection: AppearanceMenuKey;
  menu: AppearanceSubnavItem[];
  onNotify: (message: string) => void;
}) {
  const current = appearanceCopy[activeSection] ?? appearanceCopy["logo-name"];
  const Icon = current.icon;
  const dbLabel = menu.find((item) => item.key === activeSection)?.label ?? current.title;

  if (activeSection === "logo-name") {
    return <BrandIdentitySection title={dbLabel} onNotify={onNotify} />;
  }
  if (activeSection === "menu") {
    return <AppearanceMenuConfigSection onNotify={onNotify} />;
  }
  if (activeSection === "carousel") {
    return <AppearanceCarouselConfigSection onNotify={onNotify} />;
  }
  if (activeSection === "modules") {
    return <AppearanceModulesConfigSection onNotify={onNotify} />;
  }

  return (
    <div className="space-y-5">
      <Header
        title={`Aspetto · ${dbLabel}`}
        description="Personalizza identità visiva, navigazione e composizione frontend con sezioni lette dal database."
      />

      <div className="grid gap-5 xl:grid-cols-[0.34fr_0.66fr]">
        <section className="admin-panel p-5">
          <div className="flex items-center gap-3">
            <LayoutList className="text-[#22bdf3]" size={21} />
            <h3 className="admin-section-title">Sottomenu da database</h3>
          </div>
          <div className="mt-5 space-y-2">
            {menu.map((item) => (
              <div
                key={item.key}
                className={[
                  "rounded-lg border px-3 py-3",
                  item.key === activeSection
                    ? "border-[#22bdf3]/45 bg-[#0b2437]"
                    : "border-[#203248] bg-[#071321]",
                ].join(" ")}
              >
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel overflow-hidden">
          <div className="border-b border-[#203248] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
                <Icon size={19} />
              </span>
              <div>
                <h3 className="admin-section-title">{current.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{current.description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              {current.fields.map((field, index) => (
                <Input
                  key={field}
                  label={field}
                  value=""
                  placeholder={`Configura ${field.toLowerCase()}`}
                  onChange={() => undefined}
                />
              ))}
              <button
                onClick={() => onNotify(current.action)}
                className="admin-primary-button w-full"
              >
                <Save size={17} /> Salva configurazione
              </button>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Anteprima frontend
              </p>
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[#203248]">
                <Image
                  src="/images/senza-filtri-hero.png"
                  alt="Anteprima TVMIX"
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020a13] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-lg font-black">{current.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{current.description}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

const defaultBrand: AppearanceBrandSettings = {
  id: "default",
  platformName: "TVMIX",
  logoUrl: null,
  logoObjectKey: null,
  faviconUrl: null,
  faviconObjectKey: null,
  defaultThumbnailUrl: null,
  defaultThumbnailObjectKey: null,
  defaultSignalUrl: null,
  defaultSignalObjectKey: null,
  accentColor: "#16b9f4",
  createdAt: "",
  updatedAt: "",
};

function BrandIdentitySection({ title, onNotify }: { title: string; onNotify: (message: string) => void }) {
  const [brand, setBrand] = useState<AppearanceBrandSettings>(defaultBrand);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const [faviconProgress, setFaviconProgress] = useState(0);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [signalProgress, setSignalProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchAppearanceBrand()
      .then((data) => {
        if (active) setBrand(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Caricamento identità visiva non riuscito");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const field = <K extends keyof AppearanceBrandSettings>(key: K, value: AppearanceBrandSettings[K]) => {
    setBrand((current) => ({ ...current, [key]: value }));
  };

  async function uploadBrandFile(kind: "logo" | "favicon" | "default-thumbnail" | "default-signal", file?: File | null) {
    if (!file) return;
    setError(null);
    const setProgress =
      kind === "logo"
        ? setLogoProgress
        : kind === "favicon"
          ? setFaviconProgress
          : kind === "default-thumbnail"
            ? setThumbnailProgress
            : setSignalProgress;
    setProgress(1);
    try {
      const uploaded = await uploadBrandAssetToR2(file, setProgress, kind);
      setBrand((current) => ({
        ...current,
        ...(kind === "logo"
          ? { logoUrl: uploaded.publicUrl, logoObjectKey: uploaded.objectKey }
          : kind === "favicon"
            ? { faviconUrl: uploaded.publicUrl, faviconObjectKey: uploaded.objectKey }
            : kind === "default-thumbnail"
              ? { defaultThumbnailUrl: uploaded.publicUrl, defaultThumbnailObjectKey: uploaded.objectKey }
              : { defaultSignalUrl: uploaded.publicUrl, defaultSignalObjectKey: uploaded.objectKey }),
      }));
      onNotify(`${brandAssetLabel(kind)} caricato su R2`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload non riuscito");
    } finally {
      window.setTimeout(() => setProgress(0), 900);
    }
  }

  function clearBrandAsset(kind: "logo" | "favicon" | "default-thumbnail" | "default-signal") {
    setBrand((current) => ({
      ...current,
      ...(kind === "logo"
        ? { logoUrl: null, logoObjectKey: null }
        : kind === "favicon"
          ? { faviconUrl: null, faviconObjectKey: null }
          : kind === "default-thumbnail"
            ? { defaultThumbnailUrl: null, defaultThumbnailObjectKey: null }
            : { defaultSignalUrl: null, defaultSignalObjectKey: null }),
    }));
    onNotify(`${brandAssetLabel(kind)} eliminato dalla configurazione`);
  }

  async function saveBrand() {
    setSaving(true);
    setError(null);
    try {
      const saved = await updateAppearanceBrand({
        platformName: brand.platformName,
        logoUrl: brand.logoUrl,
        logoObjectKey: brand.logoObjectKey,
        faviconUrl: brand.faviconUrl,
        faviconObjectKey: brand.faviconObjectKey,
        defaultThumbnailUrl: brand.defaultThumbnailUrl,
        defaultThumbnailObjectKey: brand.defaultThumbnailObjectKey,
        defaultSignalUrl: brand.defaultSignalUrl,
        defaultSignalObjectKey: brand.defaultSignalObjectKey,
        accentColor: brand.accentColor,
      });
      setBrand(saved);
      onNotify("Identità visiva salvata");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio identità visiva non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Header
        title={`Aspetto · ${title}`}
        description="Configura logo piattaforma, favicon, nome pubblico e colore principale del sito."
      />

      <section className="admin-panel overflow-hidden">
        <div className="border-b border-[#203248] px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg" style={{ backgroundColor: `${brand.accentColor}1f`, color: brand.accentColor }}>
              <Palette size={19} />
            </span>
            <div>
              <h3 className="admin-section-title">Identità piattaforma</h3>
              <p className="mt-1 text-xs text-slate-500">
                Carica gli asset grafici e definisci il colore di caratterizzazione del frontend.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[0.55fr_0.45fr]">
          <div className="space-y-5">
            {error ? <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
            {loading ? <p className="text-sm text-slate-400">Caricamento configurazione...</p> : null}

            <Input
              label="Nome piattaforma"
              value={brand.platformName}
              placeholder="TVMIX"
              onChange={(value) => field("platformName", value)}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <AssetUploadBox
                label="Logo piattaforma"
                hint="PNG, JPG, WebP o GIF"
                value={brand.logoUrl}
                progress={logoProgress}
                accentColor={brand.accentColor}
                onClear={brand.logoUrl ? () => clearBrandAsset("logo") : undefined}
                onFile={(file) => void uploadBrandFile("logo", file)}
              />
              <AssetUploadBox
                label="Favicon"
                hint="Consigliato formato quadrato"
                value={brand.faviconUrl}
                progress={faviconProgress}
                accentColor={brand.accentColor}
                compact
                onClear={brand.faviconUrl ? () => clearBrandAsset("favicon") : undefined}
                onFile={(file) => void uploadBrandFile("favicon", file)}
              />
            </div>

            <div>
              <div className="mb-3">
                <h4 className="text-sm font-black uppercase tracking-[0.14em]" style={{ color: brand.accentColor }}>
                  Grafiche di default
                </h4>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Carica le immagini fallback usate quando non esiste una miniatura o quando il segnale non è disponibile.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <AssetUploadBox
                  label="Assenza miniatura"
                  hint="Fallback per contenuti senza thumbnail"
                  value={brand.defaultThumbnailUrl}
                  progress={thumbnailProgress}
                  accentColor={brand.accentColor}
                  onClear={brand.defaultThumbnailUrl ? () => clearBrandAsset("default-thumbnail") : undefined}
                  onFile={(file) => void uploadBrandFile("default-thumbnail", file)}
                />
                <AssetUploadBox
                  label="Assenza segnale"
                  hint="Fallback per streaming offline/non disponibile"
                  value={brand.defaultSignalUrl}
                  progress={signalProgress}
                  accentColor={brand.accentColor}
                  onClear={brand.defaultSignalUrl ? () => clearBrandAsset("default-signal") : undefined}
                  onFile={(file) => void uploadBrandFile("default-signal", file)}
                />
              </div>
            </div>

            <div>
              <span className="admin-label">Colore caratterizzazione sito</span>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <input
                  type="color"
                  value={brand.accentColor}
                  onChange={(event) => field("accentColor", event.target.value)}
                  className="h-11 w-16 cursor-pointer rounded-lg border border-[#26394d] bg-[#071321] p-1"
                  aria-label="Scegli colore principale"
                />
                <input
                  value={brand.accentColor}
                  onChange={(event) => field("accentColor", event.target.value)}
                  className="admin-input max-w-[160px]"
                  placeholder="#16b9f4"
                />
                <span
                  className="rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.16em]"
                  style={{ borderColor: brand.accentColor, color: brand.accentColor }}
                >
                  Anteprima colore
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void saveBrand()}
              disabled={saving || loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-black transition disabled:cursor-not-allowed disabled:opacity-55"
              style={{ backgroundColor: brand.accentColor }}
            >
              <Save size={17} /> {saving ? "Salvataggio..." : "Salva logo/name/color"}
            </button>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Anteprima brand
            </p>
            <div className="overflow-hidden rounded-xl border border-[#203248] bg-[#030b14]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <BrandPreviewImage url={brand.logoUrl} name={brand.platformName} accentColor={brand.accentColor} />
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black tracking-[-0.04em] text-white">{brand.platformName || "TVMIX"}</p>
                    <p className="text-xs text-slate-500">Navbar / login / admin</p>
                  </div>
                </div>
                <span className="size-4 rounded-full" style={{ backgroundColor: brand.accentColor }} />
              </div>
              <div className="p-4">
                <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(34,189,243,0.2),transparent_35%),#06111d]">
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <BrandPreviewImage url={brand.faviconUrl} name="Favicon" accentColor={brand.accentColor} small />
                    <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: brand.accentColor }}>Favicon</span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-2xl font-black uppercase tracking-[-0.06em] text-white">{brand.platformName || "TVMIX"}</p>
                    <button
                      type="button"
                      className="mt-3 rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black"
                      style={{ backgroundColor: brand.accentColor }}
                    >
                      Guarda ora
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <DefaultGraphicPreview label="Assenza miniatura" url={brand.defaultThumbnailUrl} accentColor={brand.accentColor} />
                  <DefaultGraphicPreview label="Assenza segnale" url={brand.defaultSignalUrl} accentColor={brand.accentColor} />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Gli asset vengono salvati su Cloudflare R2 nella cartella <span className="text-slate-300">brand</span>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function AssetUploadBox({
  label,
  hint,
  value,
  progress,
  accentColor,
  compact,
  onClear,
  onFile,
}: {
  label: string;
  hint: string;
  value: string | null;
  progress: number;
  accentColor: string;
  compact?: boolean;
  onClear?: () => void;
  onFile: (file?: File | null) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="admin-label">{label}</span>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition hover:bg-white/5"
            style={{ borderColor: `${accentColor}88`, color: accentColor }}
          >
            Elimina
          </button>
        ) : null}
      </div>
      <label
        className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-[#071321] p-4 text-center transition hover:bg-white/[0.025]"
        style={{ borderColor: `${accentColor}55` }}
      >
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
        <div className={compact ? "size-16" : "h-20 w-40"}>
          {value ? (
            <img src={value} alt={label} className="h-full w-full rounded-lg object-contain" />
          ) : (
            <div className="grid h-full w-full place-items-center rounded-lg bg-white/[0.04]" style={{ color: accentColor }}>
              <Upload size={22} />
            </div>
          )}
        </div>
        <span className="mt-3 text-sm font-bold" style={{ color: value ? "white" : accentColor }}>Carica {label.toLowerCase()}</span>
        <span className="mt-1 text-xs text-slate-500">{hint}</span>
      </label>
      {progress > 0 ? (
        <div className="mt-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-1.5 transition-[width]" style={{ width: `${progress}%`, backgroundColor: accentColor }} />
        </div>
      ) : null}
    </div>
  );
}

function BrandPreviewImage({ url, name, accentColor, small }: { url: string | null; name: string; accentColor: string; small?: boolean }) {
  if (url) {
    return <img src={url} alt={name} className={`${small ? "size-8" : "size-11"} shrink-0 rounded-lg object-contain`} />;
  }
  return (
    <span
      className={`${small ? "size-8 text-xs" : "size-11 text-sm"} grid shrink-0 place-items-center rounded-lg font-black`}
      style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
    >
      {(name || "T").slice(0, 1).toUpperCase()}
    </span>
  );
}

function DefaultGraphicPreview({ label, url, accentColor }: { label: string; url: string | null; accentColor: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-black/20" style={{ borderColor: `${accentColor}44` }}>
      <div className="relative aspect-video bg-white/[0.035]">
        {url ? (
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Upload size={24} style={{ color: accentColor }} />
          </div>
        )}
      </div>
      <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: accentColor }}>
        {label}
      </p>
    </div>
  );
}

function brandAssetLabel(kind: "logo" | "favicon" | "default-thumbnail" | "default-signal") {
  if (kind === "logo") return "Logo";
  if (kind === "favicon") return "Favicon";
  if (kind === "default-thumbnail") return "Grafica assenza miniatura";
  return "Grafica assenza segnale";
}

function SettingsSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [pages, setPages] = useState<StaticPageContent[]>([]);
  const [archive, setArchive] = useState<Video[]>([]);
  const [activeSlug, setActiveSlug] = useState<StaticPageSlug>("chi-siamo");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activePage = pages.find((page) => page.slug === activeSlug) ?? pages[0] ?? null;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      fetchStaticPages(),
      adminRequest<ListResponse<Video>>("videos?limit=100"),
    ])
      .then(([data, videos]) => {
        if (!mounted) return;
        setPages(data);
        setArchive(videos.data.filter((video) => video.thumbnailUrl));
        if (data.length) setActiveSlug(data[0].slug);
        setError(null);
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : "Impossibile caricare le pagine");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const updateField = <K extends keyof StaticPageContent>(key: K, value: StaticPageContent[K]) => {
    if (!activePage) return;
    setPages((current) =>
      current.map((page) => (page.slug === activePage.slug ? { ...page, [key]: value } : page)),
    );
  };

  async function savePage() {
    if (!activePage) return;
    setSaving(true);
    try {
      const updated = await updateStaticPage(activePage.slug, {
        title: activePage.title,
        titleFontSize: activePage.titleFontSize,
        titleAlign: activePage.titleAlign,
        subtitle: activePage.subtitle || null,
        subtitleFontSize: activePage.subtitleFontSize,
        subtitleAlign: activePage.subtitleAlign,
        heroImageUrl: activePage.heroImageUrl || null,
        body: activePage.body,
        bodyHtml: activePage.bodyHtml || null,
        bodyFontSize: activePage.bodyFontSize,
        bodyAlign: activePage.bodyAlign,
        seoTitle: activePage.seoTitle || null,
        seoDescription: activePage.seoDescription || null,
        published: activePage.published,
        sortOrder: activePage.sortOrder,
      });
      setPages((current) => current.map((page) => (page.slug === updated.slug ? updated : page)));
      onNotify(`Pagina "${updated.title}" salvata`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Header title="Impostazioni" description="Gestisci i contenuti delle pagine istituzionali del frontend." />
      <ResourceState loading={loading} error={error} empty={!pages.length ? "Nessuna pagina configurata." : undefined} />
      {!loading && !error && activePage ? (
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <section className="admin-panel p-4">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
                <FileText size={18} />
              </span>
              <div>
                <h3 className="font-semibold">Pagine</h3>
                <p className="text-xs text-slate-500">Seleziona il modulo da modificare.</p>
              </div>
            </div>
            <div className="space-y-2">
              {pages.map((page) => (
                <button
                  key={page.slug}
                  type="button"
                  onClick={() => setActiveSlug(page.slug)}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                    activePage.slug === page.slug
                      ? "border-[#16b9f4] bg-[#16b9f4]/10 text-[#22bdf3]"
                      : "border-[#26394d] bg-white/[0.02] text-slate-300 hover:border-[#16b9f4]/50"
                  }`}
                >
                  <span className="block text-sm font-black">{page.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">/{page.slug}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="admin-panel p-5">
            <div className="flex flex-col gap-3 border-b border-[#1b2b3d] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#22bdf3]">/{activePage.slug}</p>
                <h3 className="mt-1 text-lg font-bold text-white">{activePage.title}</h3>
              </div>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={activePage.published}
                  onChange={(event) => updateField("published", event.target.checked)}
                  className="size-4 accent-[#16b9f4]"
                />
                Pubblicata
              </label>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <Input label="Titolo pagina" value={activePage.title} onChange={(value) => updateField("title", value)} required />
              <Input label="Ordine" type="number" value={String(activePage.sortOrder)} onChange={(value) => updateField("sortOrder", Number(value) || 0)} />
              <BlockStyleControls
                label="Stile titolo"
                fontSize={activePage.titleFontSize}
                align={activePage.titleAlign}
                onFontSize={(value) => updateField("titleFontSize", value)}
                onAlign={(value) => updateField("titleAlign", value)}
              />
              <div />
              <Input label="Sottotitolo" value={activePage.subtitle ?? ""} onChange={(value) => updateField("subtitle", value)} />
              <Input label="SEO title" value={activePage.seoTitle ?? ""} onChange={(value) => updateField("seoTitle", value)} />
              <BlockStyleControls
                label="Stile sottotitolo"
                fontSize={activePage.subtitleFontSize}
                align={activePage.subtitleAlign}
                onFontSize={(value) => updateField("subtitleFontSize", value)}
                onAlign={(value) => updateField("subtitleAlign", value)}
              />
              <div />
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="admin-label">Immagine dopo il sottotitolo</span>
                  {activePage.heroImageUrl ? (
                    <button type="button" className="admin-secondary-button !px-3 !py-1.5 text-xs" onClick={() => updateField("heroImageUrl", null)}>
                      Rimuovi immagine
                    </button>
                  ) : null}
                </div>
                {activePage.heroImageUrl ? (
                  <img src={activePage.heroImageUrl} alt={activePage.title} className="mt-3 max-h-56 w-full rounded-xl object-cover" />
                ) : null}
                <div className="mt-3 grid max-h-64 gap-3 overflow-y-auto rounded-xl border border-[#26394d] bg-[#06111f] p-3 sm:grid-cols-2 lg:grid-cols-4">
                  {archive.length ? archive.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => updateField("heroImageUrl", video.thumbnailUrl)}
                      className={`group overflow-hidden rounded-xl border text-left transition ${
                        activePage.heroImageUrl === video.thumbnailUrl ? "border-[#16b9f4]" : "border-[#26394d] hover:border-[#16b9f4]/60"
                      }`}
                    >
                      <img src={video.thumbnailUrl ?? ""} alt={video.title} className="aspect-video w-full object-cover transition group-hover:scale-105" />
                      <span className="block truncate px-2 py-2 text-xs font-semibold text-slate-300">{video.title}</span>
                    </button>
                  )) : (
                    <p className="col-span-full text-sm text-slate-500">Nessuna miniatura disponibile nell'archivio.</p>
                  )}
                </div>
              </div>
              <label className="lg:col-span-2">
                <span className="admin-label">SEO description</span>
                <textarea
                  value={activePage.seoDescription ?? ""}
                  onChange={(event) => updateField("seoDescription", event.target.value)}
                  className="admin-input mt-2 h-20 py-3"
                  maxLength={320}
                />
              </label>
              <div className="lg:col-span-2">
                <BlockStyleControls
                  label="Stile corpo pagina"
                  fontSize={activePage.bodyFontSize}
                  align={activePage.bodyAlign}
                  onFontSize={(value) => updateField("bodyFontSize", value)}
                  onAlign={(value) => updateField("bodyAlign", value)}
                />
                <RichTextEditor
                  value={activePage.bodyHtml || activePage.body}
                  onChange={(html, text) => {
                    updateField("bodyHtml", html);
                    updateField("body", text || " ");
                  }}
                />
              </div>
              <label className="lg:col-span-2">
                <span className="admin-label">Corpo pagina (testo semplice)</span>
                <textarea
                  value={activePage.body}
                  onChange={(event) => updateField("body", event.target.value)}
                  className="admin-input mt-2 min-h-[360px] py-3 leading-7"
                  placeholder="Inserisci qui il testo che sarà pubblicato nel frontend."
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => void savePage()} disabled={saving} className="admin-primary-button">
                {saving ? "Salvataggio..." : "Salva pagina"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type TextAlignValue = "left" | "center" | "right" | "justify";

function BlockStyleControls({
  label,
  fontSize,
  align,
  onFontSize,
  onAlign,
}: {
  label: string;
  fontSize: number;
  align: TextAlignValue;
  onFontSize: (value: number) => void;
  onAlign: (value: TextAlignValue) => void;
}) {
  return (
    <div>
      <span className="admin-label">{label}</span>
      <div className="mt-2 grid gap-2 sm:grid-cols-[120px_minmax(0,1fr)]">
        <input
          type="number"
          min={10}
          max={96}
          value={fontSize}
          onChange={(event) => onFontSize(Number(event.target.value) || 16)}
          className="admin-input"
          aria-label={`${label} grandezza carattere`}
        />
        <div className="grid grid-cols-4 gap-2">
          {[
            ["left", "SX"],
            ["center", "Centro"],
            ["right", "DX"],
            ["justify", "Giust."],
          ].map(([value, text]) => (
            <button
              key={value}
              type="button"
              onClick={() => onAlign(value as TextAlignValue)}
              className={`rounded-lg border px-2 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                align === value
                  ? "border-[#16b9f4] text-[#22bdf3]"
                  : "border-[#26394d] text-slate-400 hover:border-[#16b9f4]/60"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string, text: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const command = (name: string, argument?: string) => {
    ref.current?.focus();
    document.execCommand(name, false, argument);
    emitChange();
  };

  const emitChange = () => {
    const element = ref.current;
    if (!element) return;
    onChange(element.innerHTML, element.innerText);
  };

  return (
    <div className="mt-4">
      <span className="admin-label">Corpo pagina - editor formattato</span>
      <div className="mt-2 flex flex-wrap gap-2 rounded-t-xl border border-[#26394d] bg-[#06111f] p-2">
        <EditorButton label="Grassetto" onClick={() => command("bold")} />
        <EditorButton label="Corsivo" onClick={() => command("italic")} />
        <EditorButton label="Sottolinea" onClick={() => command("underline")} />
        <EditorButton label="Titolo" onClick={() => command("formatBlock", "h2")} />
        <EditorButton label="Paragrafo" onClick={() => command("formatBlock", "p")} />
        <EditorButton label="Elenco" onClick={() => command("insertUnorderedList")} />
        <EditorButton label="Numerato" onClick={() => command("insertOrderedList")} />
        <EditorButton
          label="Link"
          onClick={() => {
            const url = window.prompt("Inserisci URL del link");
            if (url) command("createLink", url);
          }}
        />
        <EditorButton label="Pulisci" onClick={() => command("removeFormat")} />
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        className="min-h-[320px] rounded-b-xl border-x border-b border-[#26394d] bg-[#071321] px-4 py-4 leading-7 text-slate-200 outline-none focus:border-[#16b9f4]"
      />
    </div>
  );
}

function EditorButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="admin-secondary-button !px-3 !py-1.5 text-xs">
      {label}
    </button>
  );
}
