"use client";

import Image from "next/image";
import { FileVideo, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  adminRequest,
  formatDate,
  uploadFileToR2,
  type Category,
  type ListResponse,
  type Video,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";

type Props = { onNotify: (message: string) => void };
type VideoForm = {
  title: string; slug: string; description: string; thumbnailUrl: string;
  hlsUrl: string; duration: string; categoryId: string; published: boolean;
  file: File | null;
};
const blank: VideoForm = {
  title: "", slug: "", description: "", thumbnailUrl: "", hlsUrl: "",
  duration: "", categoryId: "", published: false, file: null,
};

export function ContentSection({ onNotify }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Video | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const [videoResult, categoryResult] = await Promise.all([
        adminRequest<ListResponse<Video>>(`videos${query}`),
        adminRequest<ListResponse<Category>>("categories?limit=100"),
      ]);
      setVideos(videoResult.data); setCategories(categoryResult.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore di caricamento");
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  async function remove(id: string) {
    try {
      await adminRequest(`videos/${id}`, { method: "DELETE" });
      onNotify("Video eliminato"); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita"); }
  }

  return (
    <div className="space-y-5">
      <Header title="Libreria contenuti" description="Gestisci video, metadati, categorie e pubblicazione.">
        <button type="button" onClick={() => setEditing(null)} className="admin-primary-button">
          <Plus size={17} /> Nuovo contenuto
        </button>
      </Header>
      <SearchBox value={search} onChange={setSearch} placeholder="Cerca per titolo o slug..." />
      <ResourceState loading={loading} error={error} empty={!videos.length ? "Nessun contenuto presente." : undefined} />
      {!loading && !error && videos.length ? (
        <section className="admin-panel divide-y divide-[#1b2b3d] overflow-hidden">
          {videos.map((video) => (
            <div key={video.id} className="grid gap-4 p-4 sm:grid-cols-[120px_1fr_auto] sm:items-center sm:px-5">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-[#102238]">
                {video.thumbnailUrl ? <Image src={video.thumbnailUrl} alt="" fill sizes="120px" className="object-cover" /> : null}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-white">{video.title}</h3>
                  <span className={`rounded border px-2 py-0.5 text-[10px] ${video.published ? "border-emerald-400/40 text-emerald-400" : "border-[#31445a] text-slate-400"}`}>
                    {video.published ? "Pubblicato" : "Bozza"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{video.category.name} · {formatDate(video.updatedAt)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Sorgente: {video.originalFileName ?? "non caricato"} · Stato: {video.processingStatus}
                </p>
              </div>
              <div className="flex gap-1">
                <button type="button" aria-label={`Modifica ${video.title}`} onClick={() => setEditing(video)} className="admin-icon-button"><Pencil size={17} /></button>
                <ConfirmButton label={`Elimina ${video.title}`} onConfirm={() => void remove(video.id)} className="admin-icon-button hover:text-red-400"><Trash2 size={17} /></ConfirmButton>
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {editing !== undefined ? (
        <VideoEditor
          video={editing}
          categories={categories}
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
              const body = {
                ...(!editing && uploaded ? { id: uploaded.uploadId } : {}),
                title: form.title,
                slug: form.slug,
                description: form.description || null,
                thumbnailUrl: form.thumbnailUrl || null,
                hlsUrl: form.hlsUrl || null,
                duration: form.duration ? Number(form.duration) : null,
                categoryId: form.categoryId,
                published: form.published,
                ...(uploaded && {
                  sourceObjectKey: uploaded.objectKey,
                  originalFileName: uploaded.originalFileName,
                  processingStatus: "UPLOADED",
                  processingError: null,
                }),
              };
              await adminRequest(editing ? `videos/${editing.id}` : "videos", {
                method: editing ? "PATCH" : "POST", body: JSON.stringify(body),
              });
              setEditing(undefined); onNotify(editing ? "Video aggiornato" : "Video creato"); await load();
            } catch (cause) { setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito"); }
            finally { setSaving(false); setUploadProgress(0); }
          }}
        />
      ) : null}
    </div>
  );
}

function VideoEditor({ video, categories, saving, uploadProgress, onClose, onSave }: {
  video: Video | null; categories: Category[]; saving: boolean; uploadProgress: number; onClose: () => void;
  onSave: (form: VideoForm) => Promise<void>;
}) {
  const [form, setForm] = useState<VideoForm>(() => video ? {
    title: video.title, slug: video.slug, description: video.description ?? "",
    thumbnailUrl: video.thumbnailUrl ?? "", hlsUrl: video.hlsUrl ?? "",
    duration: video.duration?.toString() ?? "", categoryId: video.categoryId,
    published: video.published, file: null,
  } : { ...blank, categoryId: categories[0]?.id ?? "" });
  function field<K extends keyof VideoForm>(key: K, value: VideoForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  return (
    <AdminModal title={video ? "Modifica contenuto" : "Nuovo contenuto"} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void onSave(form); }} className="grid gap-4 sm:grid-cols-2">
        <Input label="Titolo" value={form.title} onChange={(v) => field("title", v)} required />
        <Input label="Slug" value={form.slug} onChange={(v) => field("slug", v)} required />
        <label className="sm:col-span-2"><span className="admin-label">Descrizione</span><textarea value={form.description} onChange={(e) => field("description", e.target.value)} className="admin-input mt-2 h-24 py-3" /></label>
        <div className="sm:col-span-2">
          <label className="block">
            <span className="admin-label">File video sorgente</span>
            <span className="mt-2 flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#31506b] bg-[#06111d] px-4 py-3 text-sm text-slate-400 hover:border-[#22bdf3]">
              {form.file ? <FileVideo size={22} className="text-[#22bdf3]" /> : <Upload size={22} />}
              <span className="min-w-0">
                <span className="block truncate text-slate-200">
                  {form.file?.name ?? video?.originalFileName ?? "Seleziona MP4, MOV o MKV"}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Il file sarà caricato direttamente su Cloudflare R2
                </span>
              </span>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/x-matroska,.mkv"
                className="sr-only"
                onChange={(event) => field("file", event.target.files?.[0] ?? null)}
              />
            </span>
          </label>
          {uploadProgress > 0 ? (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>Upload R2</span><span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#102238]">
                <div className="h-full bg-[#22bdf3] transition-[width]" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          ) : null}
        </div>
        <Input label="URL HLS (dopo transcodifica)" type="url" value={form.hlsUrl} onChange={(v) => field("hlsUrl", v)} />
        <Input label="URL copertina" type="url" value={form.thumbnailUrl} onChange={(v) => field("thumbnailUrl", v)} />
        <Input label="Durata in secondi" type="number" value={form.duration} onChange={(v) => field("duration", v)} />
        <label><span className="admin-label">Categoria</span><select value={form.categoryId} onChange={(e) => field("categoryId", e.target.value)} required className="admin-input mt-2">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="flex items-center gap-3 sm:col-span-2"><input type="checkbox" disabled={!form.hlsUrl} checked={form.published} onChange={(e) => field("published", e.target.checked)} className="size-4 accent-[#16b9f4]" /><span className="text-sm">Pubblica nel catalogo</span>{!form.hlsUrl ? <span className="text-xs text-slate-500">(disponibile dopo la creazione HLS)</span> : null}</label>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button><button disabled={saving} className="admin-primary-button">{saving ? "Salvataggio..." : "Salva"}</button></div>
      </form>
    </AdminModal>
  );
}

export function Header({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>{children}</div>;
}
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="admin-panel relative block p-3"><Search size={17} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" /><input value={value} onChange={(e) => onChange(e.target.value)} className="admin-input pl-10" placeholder={placeholder} /></label>;
}
export function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label><span className="admin-label">{label}</span><input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="admin-input mt-2" /></label>;
}
