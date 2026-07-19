"use client";

import { Edit3, ImagePlus, Plus, RefreshCw, Trash2, Upload, Video } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { NewsSubnavKey } from "./admin-data";
import {
  adminRequest,
  formatDate,
  type ListResponse,
  type NoticeArticle,
  type Tg9Video,
  uploadNoticeImageToR2,
  uploadTg9VideoToR2,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header, Input, SearchBox } from "./ContentSection";

type Props = {
  activeSection: NewsSubnavKey;
  onNotify: (message: string) => void;
};

type NoticeForm = {
  category: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  imageObjectKey: string;
  sortOrder: string;
  published: boolean;
};

type Tg9Form = {
  title: string;
  slug: string;
  description: string;
  videoUrl: string;
  videoObjectKey: string;
  posterUrl: string;
  sortOrder: string;
  published: boolean;
};

export function NewsSection({ activeSection, onNotify }: Props) {
  if (activeSection === "tg9") return <Tg9AdminSection onNotify={onNotify} />;
  return <NoticeAdminSection onNotify={onNotify} />;
}

function NoticeAdminSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [items, setItems] = useState<NoticeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NoticeArticle | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      const response = await adminRequest<ListResponse<NoticeArticle>>(`news/notice?${params.toString()}`);
      setItems(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Notizie 9notice non disponibili");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(item: NoticeArticle, deleteFiles: boolean) {
    await adminRequest(`news/notice/${item.id}?deleteFiles=${deleteFiles ? "true" : "false"}`, { method: "DELETE" });
    onNotify("Notizia eliminata");
    await load();
  }

  return (
    <div className="space-y-6">
      <Header title="News · 9notice" description="Gestisci le notizie pubblicate nella pagina frontend /9notice. Le immagini vengono archiviate in tvmix/tvmix-media/news/notice_slide/.">
        <button type="button" onClick={() => setEditing("new")} className="admin-primary-button">
          <Plus size={16} /> Nuova notizia
        </button>
      </Header>

      <section className="admin-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cerca categoria, titolo o testo..." />
          <button type="button" onClick={() => void load()} className="admin-secondary-button lg:ml-auto">
            <RefreshCw size={16} /> Aggiorna
          </button>
        </div>
      </section>

      <ResourceState loading={loading} error={error} empty={!items.length ? "Nessuna notizia 9notice creata." : undefined} />

      {!loading && !error && items.length ? (
        <section className="admin-panel overflow-x-auto">
          <table className="min-w-[1060px] w-full text-left text-sm">
            <thead className="border-b border-[#1d3044] text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Immagine</th>
                <th className="px-4 py-3">Notizia</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Ordine</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Inserimento</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102033]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.025]">
                  <td className="px-4 py-3">
                    <img src={item.imageUrl} alt={item.title} className="h-14 w-24 rounded-lg object-cover" />
                  </td>
                  <td className="max-w-md px-4 py-3">
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.excerpt || item.body}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#22bdf3]">/{item.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{item.category}</td>
                  <td className="px-4 py-3 text-slate-400">{item.sortOrder}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.published ? "border-emerald-400 text-emerald-300" : "border-red-400 text-red-300"}`}>
                      {item.published ? "pubblicata" : "bozza"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatDate(item.createdAt)}
                    <span className="block">{item.createdBy ?? "***"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="admin-icon-button" onClick={() => setEditing(item)}><Edit3 size={16} /></button>
                      <ConfirmButton label={`Elimina ${item.title}`} onConfirm={() => void remove(item, false)} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {editing ? (
        <NoticeEditor
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            onNotify(editing === "new" ? "Notizia creata" : "Notizia aggiornata");
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function NoticeEditor({ item, onClose, onSaved }: { item: NoticeArticle | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<NoticeForm>({
    category: item?.category ?? "",
    title: item?.title ?? "",
    slug: item?.slug ?? "",
    excerpt: item?.excerpt ?? "",
    body: item?.body ?? "",
    imageUrl: item?.imageUrl ?? "",
    imageObjectKey: item?.imageObjectKey ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    published: item?.published ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canSave = form.category.trim() && form.title.trim() && form.body.trim() && form.imageUrl.trim();

  function field<K extends keyof NoticeForm>(key: K, value: NoticeForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadImage(file?: File | null) {
    if (!file) return;
    setError(null);
    try {
      const uploaded = await uploadNoticeImageToR2(file, setUploading);
      field("imageUrl", uploaded.publicUrl);
      field("imageObjectKey", uploaded.objectKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload immagine non riuscito");
    } finally {
      setUploading(0);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminRequest(item ? `news/notice/${item.id}` : "news/notice", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify({
          category: form.category,
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt || null,
          body: form.body,
          imageUrl: form.imageUrl,
          imageObjectKey: form.imageObjectKey || null,
          sortOrder: Number(form.sortOrder || 0),
          published: form.published,
        }),
      });
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={item ? "Modifica notizia 9notice" : "Nuova notizia 9notice"} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Categoria" value={form.category} onChange={(value) => field("category", value)} required />
          <Input label="Ordine" type="number" value={form.sortOrder} onChange={(value) => field("sortOrder", value)} />
        </div>
        <Input label="Titolo" value={form.title} onChange={(value) => field("title", value)} required />
        <Input label="Slug" value={form.slug} onChange={(value) => field("slug", value)} placeholder="automatico se vuoto" />
        <Textarea label="Prime righe / excerpt" value={form.excerpt} onChange={(value) => field("excerpt", value)} rows={3} />
        <Textarea label="Testo notizia" value={form.body} onChange={(value) => field("body", value)} rows={7} required />
        <div>
          <span className="admin-label">Immagine notizia</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input readOnly value={form.imageUrl} className="admin-input" placeholder="URL immagine R2" />
            <label className="admin-secondary-button cursor-pointer justify-center">
              <ImagePlus size={16} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
            </label>
          </div>
          {uploading ? <p className="mt-2 text-xs text-[#22bdf3]">Upload {uploading}%</p> : null}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.published} onChange={(event) => field("published", event.target.checked)} className="size-4 accent-[#22bdf3]" />
          Pubblica su /9notice
        </label>
        <ModalButtons onClose={onClose} saving={saving} disabled={!canSave} />
      </form>
    </AdminModal>
  );
}

function Tg9AdminSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [items, setItems] = useState<Tg9Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Tg9Video | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      const response = await adminRequest<ListResponse<Tg9Video>>(`news/tg9?${params.toString()}`);
      setItems(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Video TG9 non disponibili");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(item: Tg9Video) {
    await adminRequest(`news/tg9/${item.id}?deleteFiles=false`, { method: "DELETE" });
    onNotify("Video TG9 eliminato");
    await load();
  }

  return (
    <div className="space-y-6">
      <Header title="News · tg9" description="Gestisci il carousel video pubblico /tg9. I filmati vengono archiviati in tvmix/tvmix-media/news/tg9_video/.">
        <button type="button" onClick={() => setEditing("new")} className="admin-primary-button">
          <Plus size={16} /> Nuovo video TG9
        </button>
      </Header>
      <section className="admin-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cerca video TG9..." />
          <button type="button" onClick={() => void load()} className="admin-secondary-button lg:ml-auto">
            <RefreshCw size={16} /> Aggiorna
          </button>
        </div>
      </section>
      <ResourceState loading={loading} error={error} empty={!items.length ? "Nessun video TG9 creato." : undefined} />
      {!loading && !error && items.length ? (
        <section className="admin-panel overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="border-b border-[#1d3044] text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Video</th>
                <th className="px-4 py-3">Titolo</th>
                <th className="px-4 py-3">Ordine</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Inserimento</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102033]">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.025]">
                  <td className="px-4 py-3">
                    <video src={item.videoUrl} poster={item.posterUrl ?? undefined} className="h-16 w-28 rounded-lg bg-black object-cover" muted preload="metadata" />
                  </td>
                  <td className="max-w-lg px-4 py-3">
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description ?? "Nessuna descrizione"}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#22bdf3]">/{item.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{item.sortOrder}</td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.published ? "border-emerald-400 text-emerald-300" : "border-red-400 text-red-300"}`}>{item.published ? "pubblicato" : "bozza"}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(item.createdAt)}<span className="block">{item.createdBy ?? "***"}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="admin-icon-button" onClick={() => setEditing(item)}><Edit3 size={16} /></button>
                      <ConfirmButton label={`Elimina ${item.title}`} onConfirm={() => void remove(item)} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
      {editing ? (
        <Tg9Editor
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            onNotify(editing === "new" ? "Video TG9 creato" : "Video TG9 aggiornato");
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function Tg9Editor({ item, onClose, onSaved }: { item: Tg9Video | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<Tg9Form>({
    title: item?.title ?? "",
    slug: item?.slug ?? "",
    description: item?.description ?? "",
    videoUrl: item?.videoUrl ?? "",
    videoObjectKey: item?.videoObjectKey ?? "",
    posterUrl: item?.posterUrl ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    published: item?.published ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const canSave = form.title.trim() && form.videoUrl.trim();

  function field<K extends keyof Tg9Form>(key: K, value: Tg9Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function uploadVideo(file?: File | null) {
    if (!file) return;
    setError(null);
    try {
      const uploaded = await uploadTg9VideoToR2(file, setUploading);
      field("videoUrl", uploaded.publicUrl);
      field("videoObjectKey", uploaded.objectKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload video TG9 non riuscito");
    } finally {
      setUploading(0);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminRequest(item ? `news/tg9/${item.id}` : "news/tg9", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify({
          title: form.title,
          slug: form.slug || undefined,
          description: form.description || null,
          videoUrl: form.videoUrl,
          videoObjectKey: form.videoObjectKey || null,
          posterUrl: form.posterUrl || null,
          sortOrder: Number(form.sortOrder || 0),
          published: form.published,
        }),
      });
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={item ? "Modifica video TG9" : "Nuovo video TG9"} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        <Input label="Titolo" value={form.title} onChange={(value) => field("title", value)} required />
        <Input label="Slug" value={form.slug} onChange={(value) => field("slug", value)} placeholder="automatico se vuoto" />
        <Textarea label="Descrizione" value={form.description} onChange={(value) => field("description", value)} rows={4} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Ordine carousel" type="number" value={form.sortOrder} onChange={(value) => field("sortOrder", value)} />
          <Input label="Poster URL opzionale" value={form.posterUrl} onChange={(value) => field("posterUrl", value)} />
        </div>
        <div>
          <span className="admin-label">Filmato TG9</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input readOnly value={form.videoUrl} className="admin-input" placeholder="URL video R2" />
            <label className="admin-secondary-button cursor-pointer justify-center">
              <Upload size={16} /> Upload
              <input type="file" accept="video/mp4,video/quicktime,video/x-matroska,.mp4,.mov,.mkv" className="hidden" onChange={(event) => void uploadVideo(event.target.files?.[0])} />
            </label>
          </div>
          {uploading ? <p className="mt-2 text-xs text-[#22bdf3]">Upload {uploading}%</p> : null}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.published} onChange={(event) => field("published", event.target.checked)} className="size-4 accent-[#22bdf3]" />
          Pubblica su /tg9
        </label>
        <ModalButtons onClose={onClose} saving={saving} disabled={!canSave} />
      </form>
    </AdminModal>
  );
}

function Textarea({ label, value, onChange, rows, required }: { label: string; value: string; onChange: (value: string) => void; rows: number; required?: boolean }) {
  return (
    <label className="block">
      <span className="admin-label">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} required={required} className="admin-input mt-2 py-3" />
    </label>
  );
}

function ModalButtons({ onClose, saving, disabled }: { onClose: () => void; saving: boolean; disabled?: boolean | string }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button>
      <button type="submit" disabled={saving || Boolean(disabled)} className="admin-primary-button disabled:opacity-55">
        {saving ? "Salvataggio..." : "Salva"}
      </button>
    </div>
  );
}
