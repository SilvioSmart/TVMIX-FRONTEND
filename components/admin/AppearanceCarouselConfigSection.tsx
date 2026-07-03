"use client";

import {
  CalendarClock,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  adminRequest,
  formatDate,
  uploadSlideMediaToR2,
  type HomepageCarouselSlide,
  type ListResponse,
  type Video,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header, Input, SearchBox } from "./ContentSection";

type Props = {
  onNotify: (message: string) => void;
};

type SlideForm = {
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  sortOrder: string;
  published: boolean;
  startsAt: string;
  endsAt: string;
  videoId: string;
  mediaFile: File | null;
};

const blank: SlideForm = {
  eyebrow: "TVMIX ORIGINAL",
  title: "",
  subtitle: "",
  description: "",
  imageUrl: "/images/senza-filtri-hero.png",
  ctaLabel: "Guarda ora",
  ctaUrl: "#programmi",
  sortOrder: "10",
  published: true,
  startsAt: "",
  endsAt: "",
  videoId: "",
  mediaFile: null,
};

export function AppearanceCarouselConfigSection({ onNotify }: Props) {
  const [slides, setSlides] = useState<HomepageCarouselSlide[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<HomepageCarouselSlide | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (status === "PUBLISHED") params.set("published", "true");
      if (status === "DRAFT") params.set("published", "false");
      const [slideResult, videoResult] = await Promise.all([
        adminRequest<ListResponse<HomepageCarouselSlide>>(`carousel?${params.toString()}`),
        adminRequest<ListResponse<Video>>("videos?limit=100"),
      ]);
      setSlides(slideResult.data);
      setVideos(videoResult.data);
      setSelectedId((current) => current ?? slideResult.data[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Carousel non disponibile");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const published = slides.filter((slide) => slide.published).length;
    const scheduled = slides.filter((slide) => slide.startsAt || slide.endsAt).length;
    return { total: slides.length, published, scheduled };
  }, [slides]);

  const selected = slides.find((slide) => slide.id === selectedId) ?? slides[0] ?? null;

  async function remove(id: string) {
    try {
      await adminRequest(`carousel/${id}`, { method: "DELETE" });
      onNotify("Slide eliminata");
      setSelectedId(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita");
    }
  }

  async function toggle(slide: HomepageCarouselSlide) {
    try {
      await adminRequest(`carousel/${slide.id}`, {
        method: "PATCH",
        body: JSON.stringify({ published: !slide.published }),
      });
      onNotify(slide.published ? "Slide messa in bozza" : "Slide pubblicata");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aggiornamento non riuscito");
    }
  }

  async function move(slide: HomepageCarouselSlide, direction: -1 | 1) {
    const index = slides.findIndex((item) => item.id === slide.id);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= slides.length) return;
    const reordered = [...slides];
    const [item] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, item);
    setSlides(reordered.map((entry, orderIndex) => ({ ...entry, sortOrder: (orderIndex + 1) * 10 })));
    try {
      await adminRequest("carousel/reorder", {
        method: "PATCH",
        body: JSON.stringify({ ids: reordered.map((entry) => entry.id) }),
      });
      onNotify("Ordine carousel aggiornato");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Riordino non riuscito");
    }
  }

  return (
    <div className="space-y-5">
      <Header
        title="Aspetto · CAROUSELL"
        description="Configura hero e carousel homepage: slide, CTA, immagini, pubblicazione e ordine."
      >
        <button type="button" onClick={() => setEditing(null)} className="admin-primary-button">
          <Plus size={17} /> Nuova slide
        </button>
      </Header>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Slide configurate" value={stats.total} />
        <Metric label="Pubblicate" value={stats.published} tone="emerald" />
        <Metric label="Schedulate" value={stats.scheduled} tone="amber" />
      </div>

      <section className="admin-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cerca slide per titolo, sottotitolo o etichetta..." />
          <div className="flex flex-wrap gap-2">
            {(["ALL", "PUBLISHED", "DRAFT"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={[
                  "rounded-lg border px-3 py-2 text-xs font-bold transition",
                  status === value
                    ? "border-[#22bdf3] bg-[#10243a] text-[#22bdf3]"
                    : "border-[#24384e] text-slate-400 hover:bg-white/[0.04] hover:text-white",
                ].join(" ")}
              >
                {value === "ALL" ? "Tutte" : value === "PUBLISHED" ? "Pubblicate" : "Bozze"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ResourceState
        loading={loading}
        error={error}
        empty={!slides.length ? "Nessuna slide carousel configurata." : undefined}
      />

      {!loading && !error && slides.length ? (
        <div className="grid gap-5 xl:grid-cols-[0.52fr_0.48fr]">
          <section className="admin-panel overflow-hidden">
            <div className="hidden grid-cols-[72px_104px_1fr_120px_120px_130px] border-b border-[#1b2b3d] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 lg:grid">
              <span>Ordine</span>
              <span>Miniatura</span>
              <span>Slide</span>
              <span>Stato</span>
              <span>Periodo</span>
              <span className="text-right">Azioni</span>
            </div>
            <div className="divide-y divide-[#1b2b3d]">
              {slides.map((slide, index) => (
                <article
                  key={slide.id}
                  onClick={() => setSelectedId(slide.id)}
                  className={[
                    "grid cursor-pointer gap-4 px-4 py-4 transition lg:grid-cols-[72px_104px_1fr_120px_120px_130px] lg:items-center lg:px-5",
                    selected?.id === slide.id ? "bg-[#071b2b]" : "hover:bg-white/[0.025]",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
                    <GripVertical size={15} className="text-slate-500" />
                    {slide.sortOrder}
                  </div>
                  <div className="relative aspect-video overflow-hidden rounded-lg border border-[#203248] bg-[#06111d]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slide.imageUrl} alt="" className="size-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{slide.title}</h3>
                      {slide.eyebrow ? (
                        <span className="rounded-full bg-[#17293b] px-2 py-0.5 text-[10px] text-slate-400">
                          {slide.eyebrow}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{slide.subtitle ?? slide.description ?? "Senza descrizione"}</p>
                    {slide.video ? <p className="mt-1 text-[11px] text-[#22bdf3]">Contenuto: {slide.video.title}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void toggle(slide);
                    }}
                    className={[
                      "inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold",
                      slide.published
                        ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
                        : "border-slate-500/30 bg-slate-500/10 text-slate-400",
                    ].join(" ")}
                  >
                    {slide.published ? <Eye size={13} /> : <EyeOff size={13} />}
                    {slide.published ? "Pubblicata" : "Bozza"}
                  </button>
                  <div className="text-xs text-slate-500">
                    {slide.startsAt || slide.endsAt ? (
                      <span className="flex items-center gap-1"><CalendarClock size={13} /> Programmata</span>
                    ) : (
                      "Sempre"
                    )}
                  </div>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      aria-label={`Sposta su ${slide.title}`}
                      disabled={index === 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        void move(slide, -1);
                      }}
                      className="admin-icon-button disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Sposta giù ${slide.title}`}
                      disabled={index === slides.length - 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        void move(slide, 1);
                      }}
                      className="admin-icon-button disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      aria-label={`Modifica ${slide.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setEditing(slide);
                      }}
                      className="admin-icon-button"
                    >
                      <Pencil size={17} />
                    </button>
                    <ConfirmButton
                      label={`Elimina ${slide.title}`}
                      onConfirm={() => void remove(slide.id)}
                      className="admin-icon-button hover:text-red-400"
                    >
                      <Trash2 size={17} />
                    </ConfirmButton>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <CarouselPreview slide={selected} />
        </div>
      ) : null}

      {editing !== undefined ? (
        <SlideEditor
          slide={editing}
          videos={videos}
          saving={saving}
          uploadProgress={uploadProgress}
          onClose={() => setEditing(undefined)}
          onSave={async (form) => {
            setSaving(true);
            setUploadProgress(0);
            setError(null);
            try {
              const uploaded = form.mediaFile
                ? await uploadSlideMediaToR2(form.mediaFile, setUploadProgress)
                : null;
              await adminRequest(editing ? `carousel/${editing.id}` : "carousel", {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify({
                  eyebrow: form.eyebrow || null,
                  title: form.title,
                  subtitle: form.subtitle || null,
                  description: form.description || null,
                  imageUrl: uploaded?.publicUrl ?? form.imageUrl,
                  ctaLabel: form.ctaLabel || null,
                  ctaUrl: form.ctaUrl || null,
                  sortOrder: Number(form.sortOrder),
                  published: form.published,
                  startsAt: form.startsAt || null,
                  endsAt: form.endsAt || null,
                  videoId: form.videoId || null,
                }),
              });
              setEditing(undefined);
              onNotify(editing ? "Slide aggiornata" : "Slide creata");
              await load();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
            } finally {
              setSaving(false);
              setUploadProgress(0);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CarouselPreview({ slide }: { slide: HomepageCarouselSlide | null }) {
  return (
    <section className="admin-panel overflow-hidden">
      <div className="border-b border-[#203248] px-5 py-4">
        <div className="flex items-center gap-3">
          <ImageIcon className="text-[#22bdf3]" size={21} />
          <div>
            <h3 className="admin-section-title">Anteprima homepage</h3>
            <p className="mt-1 text-xs text-slate-500">Preview hero con immagine, copy e CTA.</p>
          </div>
        </div>
      </div>
      {slide ? (
        <div className="p-5">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[#203248] bg-[#071321]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={slide.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020a13] via-[#020a13]/65 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-[58%] flex-col justify-center p-6">
              {slide.eyebrow ? <p className="text-xs font-black uppercase tracking-[0.22em] text-[#22bdf3]">{slide.eyebrow}</p> : null}
              <h4 className="mt-3 text-3xl font-black leading-none text-white">{slide.title}</h4>
              {slide.subtitle ? <p className="mt-3 text-base font-bold text-white">{slide.subtitle}</p> : null}
              {slide.description ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{slide.description}</p> : null}
              {slide.ctaLabel ? (
                <span className="mt-5 inline-flex w-fit rounded-lg bg-[#22bdf3] px-4 py-2 text-sm font-black text-[#04101d]">
                  {slide.ctaLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-xs text-slate-500 sm:grid-cols-2">
            <p>Ultimo aggiornamento: {formatDate(slide.updatedAt)}</p>
            <p>CTA: {slide.ctaUrl ?? "non impostata"}</p>
          </div>
        </div>
      ) : (
        <div className="p-8 text-sm text-slate-500">Seleziona una slide per vedere l'anteprima.</div>
      )}
    </section>
  );
}

function SlideEditor({
  slide,
  videos,
  saving,
  uploadProgress,
  onClose,
  onSave,
}: {
  slide: HomepageCarouselSlide | null;
  videos: Video[];
  saving: boolean;
  uploadProgress: number;
  onClose: () => void;
  onSave: (form: SlideForm) => Promise<void>;
}) {
  const [form, setForm] = useState<SlideForm>(() =>
    slide
      ? {
          eyebrow: slide.eyebrow ?? "",
          title: slide.title,
          subtitle: slide.subtitle ?? "",
          description: slide.description ?? "",
          imageUrl: slide.imageUrl,
          ctaLabel: slide.ctaLabel ?? "",
          ctaUrl: slide.ctaUrl ?? "",
          sortOrder: slide.sortOrder.toString(),
          published: slide.published,
          startsAt: toDateTimeLocal(slide.startsAt),
          endsAt: toDateTimeLocal(slide.endsAt),
          videoId: slide.videoId ?? "",
          mediaFile: null,
        }
      : blank,
  );

  function field<K extends keyof SlideForm>(key: K, value: SlideForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <AdminModal title={slide ? "Modifica slide carousel" : "Nuova slide carousel"} onClose={onClose}>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void onSave(form);
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Input label="Etichetta superiore" value={form.eyebrow} onChange={(value) => field("eyebrow", value)} placeholder="TVMIX ORIGINAL" />
        <Input label="Ordine" type="number" value={form.sortOrder} onChange={(value) => field("sortOrder", value)} required />
        <Input label="Titolo slide" value={form.title} onChange={(value) => field("title", value)} required />
        <Input label="Sottotitolo" value={form.subtitle} onChange={(value) => field("subtitle", value)} />
        <label className="sm:col-span-2">
          <span className="admin-label">Descrizione</span>
          <textarea
            value={form.description}
            onChange={(event) => field("description", event.target.value)}
            className="admin-input mt-2 h-24 py-3"
          />
        </label>
        <div className="sm:col-span-2">
          <Input label="URL immagine hero" value={form.imageUrl} onChange={(value) => field("imageUrl", value)} required />
          <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-dashed border-[#31506b] bg-[#06111d] px-4 py-3 text-sm text-slate-400 hover:border-[#22bdf3]">
            <span className="flex items-center gap-3">
              <Upload size={19} className="text-[#22bdf3]" />
              <span>
                <span className="block font-semibold text-slate-200">
                  {form.mediaFile?.name ?? "Carica direttamente dall'archivio media"}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Salvataggio R2: tvmix/tvmix-media/slide/
                </span>
              </span>
            </span>
            <span className="rounded-md bg-[#10243a] px-3 py-1 text-xs font-bold text-[#22bdf3]">
              Seleziona
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                field("mediaFile", file);
                if (file) field("imageUrl", `In attesa di upload: ${file.name}`);
              }}
            />
          </label>
          {uploadProgress > 0 ? (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>Upload media slide</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#102238]">
                <div className="h-full bg-[#22bdf3] transition-[width]" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : null}
        </div>
        <label>
          <span className="admin-label">Contenuto associato</span>
          <select value={form.videoId} onChange={(event) => field("videoId", event.target.value)} className="admin-input mt-2">
            <option value="">Nessun contenuto</option>
            {videos.map((video) => (
              <option key={video.id} value={video.id}>{video.title}</option>
            ))}
          </select>
        </label>
        <Input label="Testo CTA" value={form.ctaLabel} onChange={(value) => field("ctaLabel", value)} placeholder="Guarda ora" />
        <Input label="URL CTA" value={form.ctaUrl} onChange={(value) => field("ctaUrl", value)} placeholder="#programmi o /contenuto" />
        <Input label="Inizio pubblicazione" type="datetime-local" value={form.startsAt} onChange={(value) => field("startsAt", value)} />
        <Input label="Fine pubblicazione" type="datetime-local" value={form.endsAt} onChange={(value) => field("endsAt", value)} />
        <label className="flex items-center gap-3 rounded-lg border border-[#26394d] bg-[#071321] px-3 py-3 text-sm text-slate-300">
          <input type="checkbox" checked={form.published} onChange={(event) => field("published", event.target.checked)} className="size-4 accent-[#16b9f4]" />
          Pubblica slide in homepage
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button>
          <button disabled={saving} className="admin-primary-button">
            <Save size={17} /> {saving ? "Salvataggio..." : "Salva slide"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}

function Metric({ label, value, tone = "blue" }: { label: string; value: number; tone?: "blue" | "emerald" | "amber" }) {
  const colors = { blue: "text-[#22bdf3]", emerald: "text-emerald-300", amber: "text-amber-300" };
  return (
    <section className="admin-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-black ${colors[tone]}`}>{value}</p>
    </section>
  );
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}
