"use client";

import Image from "next/image";
import { CheckCircle2, Clapperboard, FileVideo, Folder, Pencil, PlayCircle, Plus, Search, Trash2, Upload, Wand2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  adminRequest,
  formatDate,
  uploadFileToR2,
  type CatalogCategory,
  type CatalogProgram,
  type CatalogSeason,
  type Category,
  type ListResponse,
  type Video,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";

type Props = { onNotify: (message: string) => void };

type VideoForm = {
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  hlsUrl: string;
  duration: string;
  categoryId: string;
  programId: string;
  seasonId: string;
  episodeNumber: string;
  episodeCode: string;
  published: boolean;
  file: File | null;
};

const blank: VideoForm = {
  title: "",
  slug: "",
  description: "",
  thumbnailUrl: "",
  hlsUrl: "",
  duration: "",
  categoryId: "",
  programId: "",
  seasonId: "",
  episodeNumber: "1",
  episodeCode: "",
  published: false,
  file: null,
};

const processingLabels: Record<Video["processingStatus"], string> = {
  PENDING: "Da caricare",
  UPLOADING: "Upload",
  UPLOADED: "Caricato",
  QUEUED: "In coda HLS",
  PROCESSING: "Conversione",
  READY: "HLS pronto",
  FAILED: "Errore",
};

export function ContentSection({ onNotify }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Video | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcodingId, setTranscodingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const [videoResult, categoryResult, catalogResult] = await Promise.all([
        adminRequest<ListResponse<Video>>(`videos${query}`),
        adminRequest<ListResponse<Category>>("categories?limit=100"),
        adminRequest<{ data: CatalogCategory[] }>("catalog/tree"),
      ]);
      setVideos(videoResult.data);
      setCategories(categoryResult.data);
      setCatalog(catalogResult.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    try {
      await adminRequest(`videos/${id}`, { method: "DELETE" });
      onNotify("Video eliminato");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita");
    }
  }

  async function startTranscode(video: Video) {
    setTranscodingId(video.id);
    setError(null);
    try {
      await adminRequest(`videos/${video.id}/transcode`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      onNotify("Conversione HLS avviata");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Avvio conversione non riuscito");
    } finally {
      setTranscodingId(null);
    }
  }

  return (
    <div className="space-y-5">
      <Header title="Libreria contenuti" description="Gestisci video, catalogo, upload, conversione HLS e metadati tecnici.">
        <button type="button" onClick={() => setEditing(null)} className="admin-primary-button">
          <Plus size={17} /> Nuovo contenuto
        </button>
      </Header>

      <SearchBox value={search} onChange={setSearch} placeholder="Cerca per titolo, slug o codice episodio..." />
      <ResourceState loading={loading} error={error} empty={!videos.length ? "Nessun contenuto presente." : undefined} />

      {!loading && !error && videos.length ? (
        <section className="admin-panel divide-y divide-[#1b2b3d] overflow-hidden">
          {videos.map((video) => (
            <ContentCard
              key={video.id}
              video={video}
              transcoding={transcodingId === video.id}
              onEdit={() => setEditing(video)}
              onDelete={() => void remove(video.id)}
              onTranscode={() => void startTranscode(video)}
            />
          ))}
        </section>
      ) : null}

      {editing !== undefined ? (
        <VideoEditor
          video={editing}
          categories={categories}
          catalog={catalog}
          saving={saving}
          uploadProgress={uploadProgress}
          onClose={() => setEditing(undefined)}
          onSave={async (form) => {
            setSaving(true);
            setUploadProgress(0);
            try {
              const uploaded = form.file
                ? await uploadFileToR2(form.file, setUploadProgress, editing?.id)
                : null;
              const selectedSeason = findSeason(catalog, form.seasonId);
              const body = {
                ...(!editing && uploaded ? { id: uploaded.uploadId } : {}),
                title: form.title,
                slug: form.slug.replace(/^#/, ""),
                description: form.description || null,
                thumbnailUrl: form.thumbnailUrl || null,
                hlsUrl: form.hlsUrl || null,
                duration: form.duration ? Number(form.duration) : null,
                categoryId: selectedSeason?.program.categoryId ?? form.categoryId,
                seasonId: form.seasonId || null,
                episodeNumber: form.episodeNumber ? Number(form.episodeNumber) : null,
                episodeCode: form.episodeCode || null,
                published: form.published,
                ...(uploaded && {
                  sourceObjectKey: uploaded.objectKey,
                  originalFileName: uploaded.originalFileName,
                  processingStatus: "UPLOADED",
                  processingError: null,
                }),
              };
              await adminRequest(editing ? `videos/${editing.id}` : "videos", {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify(body),
              });
              setEditing(undefined);
              onNotify(editing ? "Video aggiornato" : "Video creato");
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

function ContentCard({
  video,
  transcoding,
  onEdit,
  onDelete,
  onTranscode,
}: {
  video: Video;
  transcoding: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTranscode: () => void;
}) {
  const ready = video.processingStatus === "READY" && Boolean(video.hlsUrl);
  const originalFolder = folderOf(video.sourceObjectKey);
  const convertedFolder = video.convertedObjectKey ? folderOf(video.convertedObjectKey) : folderFromUrl(video.hlsUrl);
  const audioSummary = summarizeAudio(video.audioTracks);

  return (
    <article className="grid gap-4 p-4 xl:grid-cols-[180px_1fr_auto] xl:items-start sm:px-5">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-[#102238]">
        {video.hlsUrl ? (
          <video src={video.hlsUrl} poster={video.thumbnailUrl ?? undefined} muted preload="metadata" className="h-full w-full object-cover" />
        ) : video.thumbnailUrl ? (
          <Image src={video.thumbnailUrl} alt="" fill sizes="180px" className="object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-slate-600">
            <FileVideo size={30} />
          </div>
        )}
        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
          Anteprima
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-white">{video.title}</h3>
          <StatusPill status={video.processingStatus} />
          {ready ? (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-400/40 px-2 py-0.5 text-[10px] text-emerald-300">
              <CheckCircle2 size={12} /> Convertito
            </span>
          ) : null}
          <span className={`rounded border px-2 py-0.5 text-[10px] ${video.published ? "border-emerald-400/40 text-emerald-400" : "border-[#31445a] text-slate-400"}`}>
            {video.published ? "Pubblicato" : "Bozza"}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-400">
          {video.category.name}
          {video.season ? ` · ${video.season.program?.name ?? video.season.programId} · ${video.season.title || `Stagione ${video.season.number}`}` : ""}
          {video.episodeCode ? ` · EP ${video.episodeCode}` : ""}
        </p>

        <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
          <Meta label="Slug" value={`#${video.slug}`} />
          <Meta label="Upload" value={formatDate(video.createdAt ?? video.updatedAt)} />
          <Meta label="Originale" value={video.originalFileName ?? "non caricato"} />
          <Meta label="Cartella originale" value={originalFolder ?? "non disponibile"} />
          <Meta label="Cartella HLS" value={convertedFolder ?? "non convertito"} />
          <Meta label="Durata" value={formatDuration(video.duration)} />
          <Meta label="Qualità" value={video.videoQuality ?? "non rilevata"} />
          <Meta label="Formato" value={video.mediaFormat ?? (video.hlsUrl ? "HLS" : "non rilevato")} />
          <Meta label="Tracce audio" value={audioSummary} />
        </div>
        {video.processingError ? <p className="mt-3 rounded border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{video.processingError}</p> : null}
      </div>

      <div className="flex flex-wrap gap-1 xl:justify-end">
        <button
          type="button"
          disabled={transcoding || !video.sourceObjectKey || ["QUEUED", "PROCESSING"].includes(video.processingStatus)}
          onClick={onTranscode}
          className="admin-secondary-button"
          title={!video.sourceObjectKey ? "Carica prima il file sorgente" : "Avvia conversione HLS"}
        >
          <PlayCircle size={16} />
          {transcoding ? "Avvio..." : "HLS"}
        </button>
        <button type="button" aria-label={`Modifica ${video.title}`} onClick={onEdit} className="admin-icon-button">
          <Pencil size={17} />
        </button>
        <ConfirmButton label={`Elimina ${video.title}`} onConfirm={onDelete} className="admin-icon-button hover:text-red-400">
          <Trash2 size={17} />
        </ConfirmButton>
      </div>
    </article>
  );
}

function VideoEditor({
  video,
  categories,
  catalog,
  saving,
  uploadProgress,
  onClose,
  onSave,
}: {
  video: Video | null;
  categories: Category[];
  catalog: CatalogCategory[];
  saving: boolean;
  uploadProgress: number;
  onClose: () => void;
  onSave: (form: VideoForm) => Promise<void>;
}) {
  const initialProgramId = video?.season?.programId ?? "";
  const [slugEdited, setSlugEdited] = useState(Boolean(video));
  const [form, setForm] = useState<VideoForm>(() => {
    const initialSeason = video?.seasonId ? findSeason(catalog, video.seasonId) : null;
    return video
      ? {
          title: video.title,
          slug: `#${video.slug}`,
          description: video.description ?? "",
          thumbnailUrl: video.thumbnailUrl ?? "",
          hlsUrl: video.hlsUrl ?? "",
          duration: video.duration?.toString() ?? "",
          categoryId: initialSeason?.program.categoryId ?? video.categoryId,
          programId: initialProgramId,
          seasonId: video.seasonId ?? "",
          episodeNumber: video.episodeNumber?.toString() ?? "1",
          episodeCode: video.episodeCode ?? "",
          published: video.published,
          file: null,
        }
      : { ...blank, categoryId: categories[0]?.id ?? "" };
  });

  const programs = useMemo(
    () => catalog.flatMap((category) => category.programs.map((program) => ({ ...program, category }))),
    [catalog],
  );
  const selectedProgram = programs.find((program) => program.id === form.programId);
  const seasons = selectedProgram?.seasons ?? [];
  const selectedSeason = findSeason(catalog, form.seasonId);

  useEffect(() => {
    if (!form.seasonId || !form.episodeNumber || !selectedSeason) {
      field("episodeCode", "");
      return;
    }
    field("episodeCode", createEpisodeCode(selectedSeason.programId, selectedSeason.number, Number(form.episodeNumber)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.seasonId, form.episodeNumber, selectedSeason?.id]);

  function field<K extends keyof VideoForm>(key: K, value: VideoForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugEdited ? current.slug : `#${slugify(value)}`,
    }));
  }

  function changeProgram(programId: string) {
    const program = programs.find((item) => item.id === programId);
    setForm((current) => ({
      ...current,
      programId,
      categoryId: program?.categoryId ?? current.categoryId,
      seasonId: "",
      episodeCode: "",
    }));
  }

  function changeSeason(seasonId: string) {
    const season = findSeason(catalog, seasonId);
    setForm((current) => ({
      ...current,
      seasonId,
      categoryId: season?.program.categoryId ?? current.categoryId,
    }));
  }

  return (
    <AdminModal title={video ? "Modifica contenuto" : "Nuovo contenuto"} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void onSave(form); }} className="grid gap-4 sm:grid-cols-2">
        <Input label="Titolo" value={form.title} onChange={changeTitle} required />
        <label>
          <span className="admin-label">Slug</span>
          <input
            required
            value={form.slug}
            onChange={(event) => {
              setSlugEdited(true);
              field("slug", event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`);
            }}
            className="admin-input mt-2 font-mono"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="admin-label">Descrizione</span>
          <textarea value={form.description} onChange={(event) => field("description", event.target.value)} className="admin-input mt-2 h-24 py-3" />
        </label>

        <label>
          <span className="admin-label">Categoria</span>
          <select value={form.categoryId} onChange={(event) => field("categoryId", event.target.value)} required className="admin-input mt-2">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          <span className="admin-label">Programma</span>
          <select value={form.programId} onChange={(event) => changeProgram(event.target.value)} className="admin-input mt-2">
            <option value="">Nessun programma</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.name} ({program.id})</option>)}
          </select>
        </label>
        <label>
          <span className="admin-label">Stagione / Serie</span>
          <select value={form.seasonId} onChange={(event) => changeSeason(event.target.value)} disabled={!form.programId} className="admin-input mt-2">
            <option value="">Nessuna stagione</option>
            {seasons.map((season) => <option key={season.id} value={season.id}>{season.title || `Stagione ${season.number}`} ({season.id})</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input label="N. episodio" type="number" value={form.episodeNumber} onChange={(value) => field("episodeNumber", value)} />
          <label>
            <span className="admin-label">ID episodio</span>
            <input readOnly value={form.episodeCode} placeholder="automatico" className="admin-input mt-2 font-mono tracking-[0.18em] text-[#22bdf3]" />
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="block">
            <span className="admin-label">File video sorgente</span>
            <span className="mt-2 flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#31506b] bg-[#06111d] px-4 py-3 text-sm text-slate-400 hover:border-[#22bdf3]">
              {form.file ? <FileVideo size={22} className="text-[#22bdf3]" /> : <Upload size={22} />}
              <span className="min-w-0">
                <span className="block truncate text-slate-200">
                  {form.file?.name ?? video?.originalFileName ?? "Seleziona MP4, MOV o MKV"}
                </span>
                <span className="mt-1 block text-xs text-slate-500">Upload diretto su Cloudflare R2 / originals</span>
              </span>
              <input type="file" accept="video/mp4,video/quicktime,video/x-matroska,.mkv" className="sr-only" onChange={(event) => field("file", event.target.files?.[0] ?? null)} />
            </span>
          </label>
          {uploadProgress > 0 ? <Progress value={uploadProgress} label="Upload R2" /> : null}
        </div>

        <Input label="URL HLS" type="url" value={form.hlsUrl} onChange={(value) => field("hlsUrl", value)} />
        <Input label="URL copertina" type="url" value={form.thumbnailUrl} onChange={(value) => field("thumbnailUrl", value)} />
        <Input label="Durata in secondi" type="number" value={form.duration} onChange={(value) => field("duration", value)} />
        <label className="flex items-center gap-3 pt-7">
          <input type="checkbox" disabled={!form.hlsUrl} checked={form.published} onChange={(event) => field("published", event.target.checked)} className="size-4 accent-[#16b9f4]" />
          <span className="text-sm">Pubblica nel catalogo</span>
        </label>

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button>
          <button disabled={saving} className="admin-primary-button">{saving ? "Salvataggio..." : "Salva"}</button>
        </div>
      </form>
    </AdminModal>
  );
}

function StatusPill({ status }: { status: Video["processingStatus"] }) {
  const ready = status === "READY";
  const failed = status === "FAILED";
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] ${ready ? "border-emerald-400/40 text-emerald-300" : failed ? "border-red-400/40 text-red-300" : "border-amber-300/30 text-amber-200"}`}>
      {processingLabels[status]}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <p className="truncate"><span className="text-slate-600">{label}:</span> <span className="text-slate-300">{value}</span></p>;
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-[#102238]"><div className="h-full bg-[#22bdf3]" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function Header({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>{children}</div>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="admin-panel relative block p-3"><Search size={17} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" /><input value={value} onChange={(event) => onChange(event.target.value)} className="admin-input pl-10" placeholder={placeholder} /></label>;
}

export function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label><span className="admin-label">{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="admin-input mt-2" /></label>;
}

function findSeason(catalog: CatalogCategory[], seasonId: string) {
  for (const category of catalog) {
    for (const program of category.programs) {
      const season = program.seasons.find((item) => item.id === seasonId);
      if (season) return { ...season, program: { ...program, categoryId: program.categoryId } };
    }
  }
  return null;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function createEpisodeCode(programId: string, seasonNumber: number, episodeNumber: number) {
  const id = programId.toUpperCase();
  return `${id[0] ?? "X"}${id.at(-1) ?? "X"}${twoDigitUnitsTens(seasonNumber)}${twoDigitUnitsTens(episodeNumber)}`;
}

function twoDigitUnitsTens(value: number) {
  const normalized = Math.abs(value) % 100;
  return `${normalized % 10}${Math.floor(normalized / 10)}`;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "non rilevata";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function folderOf(value: string | null) {
  if (!value) return null;
  const parts = value.split("/");
  parts.pop();
  return parts.join("/") || value;
}

function folderFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return folderOf(decodeURIComponent(new URL(value).pathname.replace(/^\/+/, "")));
  } catch {
    return folderOf(value);
  }
}

function summarizeAudio(value: unknown) {
  if (Array.isArray(value)) return value.length ? `${value.length} traccia/e` : "nessuna";
  if (value && typeof value === "object") return "disponibile";
  return "non rilevate";
}
