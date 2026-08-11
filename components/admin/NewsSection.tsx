"use client";

import { DownloadCloud, Edit3, ImagePlus, Plus, RefreshCw, Scissors, Tag, Trash2, Upload, Video } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NewsSubnavKey } from "./admin-data";
import {
  adminRequest,
  formatDate,
  importNoticeImageFromUrl,
  type ListResponse,
  type NewsCategory,
  type NoticeArticle,
  type Tg9Subclip,
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
  categoryId: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  imageUrl: string;
  imageObjectKey: string;
  vastUrl: string;
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
  subtitlesUrl: string;
  sortOrder: string;
  published: boolean;
};

export function NewsSection({ activeSection, onNotify }: Props) {
  if (activeSection === "nwscfg") return <NewsConfigSection onNotify={onNotify} />;
  if (activeSection === "tg9") return <Tg9AdminSection onNotify={onNotify} />;
  return <NoticeAdminSection onNotify={onNotify} />;
}

function NoticeAdminSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [items, setItems] = useState<NoticeArticle[]>([]);
  const [categories, setCategories] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NoticeArticle | null | "new">(null);
  const [vastEditing, setVastEditing] = useState<NoticeArticle | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      const [response, categoryResponse] = await Promise.all([
        adminRequest<ListResponse<NoticeArticle>>(`news/notice?${params.toString()}`),
        adminRequest<ListResponse<NewsCategory>>("news/categories?limit=100"),
      ]);
      setItems(response.data);
      setCategories(categoryResponse.data.filter((category) => category.enabled));
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
                <th className="px-4 py-3">VAST</th>
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
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setVastEditing(item)}
                      className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] transition ${
                        item.vastUrl
                          ? "border-amber-300/80 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
                          : "border-slate-600 text-slate-500 hover:border-amber-300/60 hover:text-amber-200"
                      }`}
                    >
                      VAST
                    </button>
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
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            onNotify(editing === "new" ? "Notizia creata" : "Notizia aggiornata");
            await load();
          }}
        />
      ) : null}
      {vastEditing ? (
        <NoticeVastEditor
          item={vastEditing}
          onClose={() => setVastEditing(null)}
          onSaved={async () => {
            setVastEditing(null);
            onNotify("Configurazione VAST news salvata");
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function NoticeEditor({ item, categories, onClose, onSaved }: { item: NoticeArticle | null; categories: NewsCategory[]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<NoticeForm>({
    category: item?.category ?? "",
    categoryId: item?.categoryId ?? "",
    title: item?.title ?? "",
    slug: item?.slug ?? "",
    excerpt: item?.excerpt ?? "",
    body: item?.body ?? "",
    imageUrl: item?.imageUrl ?? "",
    imageObjectKey: item?.imageObjectKey ?? "",
    vastUrl: item?.vastUrl ?? "",
    sortOrder: String(item?.sortOrder ?? 0),
    published: item?.published ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [remoteImageUrl, setRemoteImageUrl] = useState("");
  const [remoteImporting, setRemoteImporting] = useState(false);
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

  async function importRemoteImage() {
    const url = remoteImageUrl.trim();
    if (!url) return;
    setRemoteImporting(true);
    setError(null);
    try {
      const uploaded = await importNoticeImageFromUrl(url);
      field("imageUrl", uploaded.publicUrl);
      field("imageObjectKey", uploaded.objectKey);
      setRemoteImageUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import immagine remota non riuscito");
    } finally {
      setRemoteImporting(false);
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
          categoryId: form.categoryId || null,
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt || null,
          body: form.body,
          imageUrl: form.imageUrl,
          imageObjectKey: form.imageObjectKey || null,
          vastUrl: form.vastUrl || null,
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
          <label>
            <span className="admin-label">Categoria</span>
            <select
              value={form.categoryId}
              onChange={(event) => {
                const category = categories.find((item) => item.id === event.target.value);
                field("categoryId", event.target.value);
                if (category) field("category", category.name);
              }}
              className="admin-input mt-2"
            >
              <option value="">Categoria manuale</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <Input label="Ordine" type="number" value={form.sortOrder} onChange={(value) => field("sortOrder", value)} />
        </div>
        <Input label="Categoria manuale / fallback" value={form.category} onChange={(value) => field("category", value)} required />
        <Input label="Titolo" value={form.title} onChange={(value) => field("title", value)} required />
        <Input label="Slug" value={form.slug} onChange={(value) => field("slug", value)} placeholder="automatico se vuoto" />
        <Textarea label="Prime righe / excerpt" value={form.excerpt} onChange={(value) => field("excerpt", value)} rows={3} />
        <Textarea label="Testo notizia" value={form.body} onChange={(value) => field("body", value)} rows={7} required />
        <Input label="VAST URL notizia" type="url" value={form.vastUrl} onChange={(value) => field("vastUrl", value)} placeholder="https://..." />
        <div>
          <span className="admin-label">Immagine notizia</span>
          <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input readOnly value={form.imageUrl} className="admin-input" placeholder="URL immagine R2" />
            <label className="admin-secondary-button cursor-pointer justify-center">
              <ImagePlus size={16} /> Upload
              <input type="file" accept="image/*" className="hidden" onChange={(event) => void uploadImage(event.target.files?.[0])} />
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="url"
              value={remoteImageUrl}
              onChange={(event) => setRemoteImageUrl(event.target.value)}
              className="admin-input"
              placeholder="https://server-esterno.it/immagine.jpg"
            />
            <button
              type="button"
              onClick={() => void importRemoteImage()}
              disabled={!remoteImageUrl.trim() || remoteImporting}
              className="admin-secondary-button justify-center disabled:opacity-45"
            >
              <DownloadCloud size={16} /> {remoteImporting ? "Import..." : "Importa da URL"}
            </button>
          </div>
          {uploading ? <p className="mt-2 text-xs text-[#22bdf3]">Upload {uploading}%</p> : null}
          {remoteImporting ? <p className="mt-2 text-xs text-[#22bdf3]">Acquisizione immagine dal server esterno...</p> : null}
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

function NoticeVastEditor({ item, onClose, onSaved }: { item: NoticeArticle; onClose: () => void; onSaved: () => Promise<void> }) {
  const [enabled, setEnabled] = useState(Boolean(item.vastUrl));
  const [vastUrl, setVastUrl] = useState(item.vastUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminRequest(`news/notice/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ vastUrl: enabled && vastUrl.trim() ? vastUrl.trim() : null }),
      });
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio VAST non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={`VAST config · ${item.title}`} onClose={onClose}>
      <div className="space-y-4">
        {error ? <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        <p className="text-sm leading-6 text-slate-400">
          Configura il link VAST associato alla notizia. Il pulsante VAST resta evidenziato quando il link è attivo.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="size-4 accent-[#22bdf3]" />
          Abilita annuncio VAST
        </label>
        <Input label="VAST URL" type="url" value={vastUrl} onChange={setVastUrl} placeholder="https://..." />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button>
          <button type="button" onClick={() => void save()} disabled={saving || (enabled && !vastUrl.trim())} className="admin-primary-button">
            {saving ? "Salvataggio..." : "Salva VAST"}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}

function NewsConfigSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [items, setItems] = useState<NewsCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<NewsCategory | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search.trim()) params.set("search", search.trim());
      const response = await adminRequest<ListResponse<NewsCategory>>(`news/categories?${params.toString()}`);
      setItems(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Categorie news non disponibili");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(item: NewsCategory) {
    await adminRequest(`news/categories/${item.id}`, { method: "DELETE" });
    onNotify("Categoria news eliminata");
    await load();
  }

  return (
    <div className="space-y-6">
      <Header title="News · NwsCFG" description="Crea e gestisci le categorie utilizzate dalle notizie 9notice.">
        <button type="button" onClick={() => setEditing("new")} className="admin-primary-button">
          <Plus size={16} /> Nuova categoria
        </button>
      </Header>

      <section className="admin-panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cerca categoria news..." />
          <button type="button" onClick={() => void load()} className="admin-secondary-button lg:ml-auto">
            <RefreshCw size={16} /> Aggiorna
          </button>
        </div>
      </section>

      <ResourceState loading={loading} error={error} empty={!items.length ? "Nessuna categoria news creata." : undefined} />

      {!loading && !error && items.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="admin-panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl border border-white/10" style={{ color: item.color ?? "#22bdf3" }}>
                    <Tag size={18} />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-100">{item.name}</p>
                    <p className="font-mono text-[11px] text-[#22bdf3]">/{item.slug}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.enabled ? "border-emerald-400 text-emerald-300" : "border-red-400 text-red-300"}`}>
                  {item.enabled ? "attiva" : "off"}
                </span>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">{item.description ?? "Nessuna descrizione"}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Ordine {item.sortOrder}</span>
                <span>{item._count?.notices ?? 0} notizie</span>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="admin-icon-button" onClick={() => setEditing(item)}><Edit3 size={16} /></button>
                <ConfirmButton label={`Elimina ${item.name}`} onConfirm={() => void remove(item)} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {editing ? (
        <NewsCategoryEditor
          item={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            onNotify(editing === "new" ? "Categoria news creata" : "Categoria news aggiornata");
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function NewsCategoryEditor({ item, onClose, onSaved }: { item: NewsCategory | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    name: item?.name ?? "",
    slug: item?.slug ?? "",
    description: item?.description ?? "",
    color: item?.color ?? "#22bdf3",
    sortOrder: String(item?.sortOrder ?? 0),
    enabled: item?.enabled ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function field<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminRequest(item ? `news/categories/${item.id}` : "news/categories", {
        method: item ? "PATCH" : "POST",
        body: JSON.stringify({
          name: form.name,
          slug: form.slug || undefined,
          description: form.description || null,
          color: form.color || null,
          sortOrder: Number(form.sortOrder || 0),
          enabled: form.enabled,
        }),
      });
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio categoria news non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={item ? "Modifica categoria news" : "Nuova categoria news"} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {error ? <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        <Input label="Nome categoria" value={form.name} onChange={(value) => field("name", value)} required />
        <Input label="Slug" value={form.slug} onChange={(value) => field("slug", value)} placeholder="automatico se vuoto" />
        <Textarea label="Descrizione" value={form.description} onChange={(value) => field("description", value)} rows={4} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Colore" type="color" value={form.color} onChange={(value) => field("color", value)} />
          <Input label="Ordine" type="number" value={form.sortOrder} onChange={(value) => field("sortOrder", value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.enabled} onChange={(event) => field("enabled", event.target.checked)} className="size-4 accent-[#22bdf3]" />
          Categoria attiva
        </label>
        <ModalButtons onClose={onClose} saving={saving} disabled={!form.name.trim()} />
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
  const [trimming, setTrimming] = useState<Tg9Video | null>(null);
  const [quickForm, setQuickForm] = useState<Tg9Form>(emptyTg9Form());
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickUploading, setQuickUploading] = useState(0);
  const [quickError, setQuickError] = useState<string | null>(null);

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

  function quickField<K extends keyof Tg9Form>(key: K, value: Tg9Form[K]) {
    setQuickForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "title" && !current.slug.trim()) next.slug = slugPreview(String(value));
      return next;
    });
  }

  async function quickUploadVideo(file?: File | null) {
    if (!file) return;
    setQuickError(null);
    try {
      const uploaded = await uploadTg9VideoToR2(file, setQuickUploading);
      const baseName = uploaded.originalFileName.replace(/\.[^.]+$/, "");
      setQuickForm((current) => ({
        ...current,
        title: current.title || baseName,
        slug: current.slug || slugPreview(baseName),
        videoUrl: uploaded.publicUrl,
        videoObjectKey: uploaded.objectKey,
      }));
    } catch (cause) {
      setQuickError(cause instanceof Error ? cause.message : "Upload video TG9 non riuscito");
    } finally {
      setQuickUploading(0);
    }
  }

  async function quickSubmit(event: FormEvent) {
    event.preventDefault();
    setQuickSaving(true);
    setQuickError(null);
    try {
      await adminRequest("news/tg9", {
        method: "POST",
        body: JSON.stringify(tg9Payload(quickForm)),
      });
      setQuickForm(emptyTg9Form());
      onNotify("Video TG9 caricato in archivio");
      await load();
    } catch (cause) {
      setQuickError(cause instanceof Error ? cause.message : "Salvataggio TG9 non riuscito");
    } finally {
      setQuickSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Header title="News · tg9" description="Gestisci il carousel video pubblico /tg9. I filmati vengono archiviati in tvmix/tvmix-media/news/tg9_video/." />
      <section className="admin-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <Video size={18} className="text-[#22bdf3]" />
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-200">Caricamento da storage</h3>
        </div>
        <form className="grid gap-4 xl:grid-cols-[minmax(280px,0.9fr)_minmax(420px,1.4fr)]" onSubmit={quickSubmit}>
          <div className="rounded-2xl border border-dashed border-[#24435c] bg-[#07111d]/70 p-4">
            <span className="admin-label">File TG9</span>
            <label className="mt-3 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-[#1d3044] bg-black/20 p-5 text-center transition hover:border-[#22bdf3]/60 hover:bg-[#22bdf3]/5">
              <Upload size={28} className="mb-3 text-[#22bdf3]" />
              <span className="text-sm font-semibold text-slate-100">Carica MP4, MOV o MKV dagli storage</span>
              <span className="mt-1 text-xs text-slate-500">Il file viene salvato su R2 e collegato al TG9.</span>
              <input type="file" accept="video/mp4,video/quicktime,video/x-matroska,.mp4,.mov,.mkv" className="hidden" onChange={(event) => void quickUploadVideo(event.target.files?.[0])} />
            </label>
            {quickUploading ? <div className="mt-3 h-2 overflow-hidden rounded-full border border-[#22bdf3]/40"><div className="h-full bg-[#22bdf3]" style={{ width: `${quickUploading}%` }} /></div> : null}
            {quickForm.videoUrl ? <p className="mt-3 break-all text-xs text-slate-500">{quickForm.videoUrl}</p> : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {quickError ? <p className="md:col-span-2 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{quickError}</p> : null}
            <Input label="Titolo" value={quickForm.title} onChange={(value) => quickField("title", value)} required />
            <Input label="Slug" value={quickForm.slug} onChange={(value) => quickField("slug", value)} placeholder="automatico dal titolo" />
            <Input label="Poster URL" value={quickForm.posterUrl} onChange={(value) => quickField("posterUrl", value)} placeholder="URL immagine poster" />
            <Input label="Ordine" type="number" value={quickForm.sortOrder} onChange={(value) => quickField("sortOrder", value)} />
            <Input label="Sottotitoli URL" value={quickForm.subtitlesUrl} onChange={(value) => quickField("subtitlesUrl", value)} placeholder="URL file VTT/SRT" />
            <label className="md:col-span-2 block">
              <span className="admin-label">Descrizione</span>
              <textarea value={quickForm.description} onChange={(event) => quickField("description", event.target.value)} rows={4} className="admin-input mt-2 py-3" />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={quickForm.published} onChange={(event) => quickField("published", event.target.checked)} className="size-4 accent-[#22bdf3]" />
              Pubblica su /tg9
            </label>
            <div className="flex justify-end">
              <button type="submit" disabled={quickSaving || !quickForm.title.trim() || !quickForm.videoUrl.trim()} className="admin-primary-button disabled:opacity-50">
                {quickSaving ? "Salvataggio..." : "Salva in TG9"}
              </button>
            </div>
          </div>
        </form>
      </section>
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
          <table className="min-w-[1120px] w-full text-left text-sm">
            <thead className="border-b border-[#1d3044] text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Video</th>
                <th className="px-4 py-3">Titolo</th>
                <th className="px-4 py-3">Inserimento</th>
                <th className="px-4 py-3">Pubblicazione</th>
                <th className="px-4 py-3">Sottotitoli</th>
                <th className="px-4 py-3">Sottoclip</th>
                <th className="px-4 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#102033]">
              {items.map((item) => {
                const created = formatDateParts(item.createdAt);
                return (
                <tr key={item.id} className="hover:bg-white/[0.025]">
                  <td className="px-4 py-3">
                    <video src={item.videoUrl} poster={item.posterUrl ?? undefined} className="h-16 w-28 rounded-lg bg-black object-cover" muted preload="metadata" />
                  </td>
                  <td className="max-w-lg px-4 py-3">
                    <p className="font-semibold text-slate-100">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description ?? "Nessuna descrizione"}</p>
                    <p className="mt-1 font-mono text-[11px] text-[#22bdf3]">/{item.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    <span>{created.date} {created.time}</span>
                    <span className="block">{item.createdBy ?? "***"}</span>
                  </td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.published ? "border-emerald-400 text-emerald-300" : "border-red-400 text-red-300"}`}>{item.published ? "pubblicato" : "bozza"}</span></td>
                  <td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${item.subtitlesUrl ? "border-emerald-400 text-emerald-300" : "border-red-400 text-red-300"}`}>SUB</span></td>
                  <td className="px-4 py-3 text-slate-200">{item._count?.subclips ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="admin-icon-button" onClick={() => setTrimming(item)} title="Modifica e trimming"><Scissors size={16} /></button>
                      <ConfirmButton label={`Elimina ${item.title}`} onConfirm={() => void remove(item)} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
                    </div>
                  </td>
                </tr>
                );
              })}
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
      {trimming ? (
        <Tg9TrimEditor
          item={trimming}
          onClose={() => setTrimming(null)}
          onSaved={async () => {
            setTrimming(null);
            onNotify("Video TG9 aggiornato");
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
    subtitlesUrl: item?.subtitlesUrl ?? "",
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
          subtitlesUrl: form.subtitlesUrl || null,
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
          <Input label="Sottotitoli URL" value={form.subtitlesUrl} onChange={(value) => field("subtitlesUrl", value)} />
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

function Tg9TrimEditor({ item, onClose, onSaved }: { item: Tg9Video; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState<Tg9Form>({
    title: item.title,
    slug: item.slug,
    description: item.description ?? "",
    videoUrl: item.videoUrl,
    videoObjectKey: item.videoObjectKey ?? "",
    posterUrl: item.posterUrl ?? "",
    subtitlesUrl: item.subtitlesUrl ?? "",
    sortOrder: String(item.sortOrder ?? 0),
    published: item.published,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subclips, setSubclips] = useState<Tg9Subclip[]>([]);
  const [editingSubclip, setEditingSubclip] = useState<Tg9Subclip | null>(null);
  const [subclipForm, setSubclipForm] = useState({ title: "", slug: "", vastUrl: "", startTime: "0", endTime: "0", sortOrder: "0" });
  const [markIn, setMarkIn] = useState<number | null>(null);
  const [markOut, setMarkOut] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const loadSubclips = useCallback(async () => {
    const response = await adminRequest<ListResponse<Tg9Subclip>>(`news/tg9/${item.id}/subclips`);
    setSubclips(response.data);
  }, [item.id]);

  useEffect(() => {
    void loadSubclips().catch((cause) => setError(cause instanceof Error ? cause.message : "Sottoclip TG9 non disponibili"));
  }, [loadSubclips]);

  function field<K extends keyof Tg9Form>(key: K, value: Tg9Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminRequest(`news/tg9/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify(tg9Payload(form)),
      });
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function createSubclip() {
    if (markIn === null || markOut === null || markOut <= markIn) {
      setError("Imposta mark-in e mark-out: il punto finale deve essere successivo a quello iniziale.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminRequest(`news/tg9/${item.id}/subclips`, {
        method: "POST",
        body: JSON.stringify({
          title: `${form.title} · clip ${subclips.length + 1}`,
          startTime: Math.floor(markIn),
          endTime: Math.floor(markOut),
          sortOrder: subclips.length,
        }),
      });
      setMarkIn(null);
      setMarkOut(null);
      await loadSubclips();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Creazione sottoclip non riuscita");
    } finally {
      setSaving(false);
    }
  }

  async function removeSubclip(subclip: Tg9Subclip) {
    await adminRequest(`news/tg9/${item.id}/subclips/${subclip.id}`, { method: "DELETE" });
    await loadSubclips();
  }

  function seekTo(seconds: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      void videoRef.current.play().catch(() => undefined);
    }
  }

  function stepFrame(direction: -1 | 1) {
    const player = videoRef.current;
    if (!player) return;
    const step = 1 / 25;
    player.pause();
    player.currentTime = Math.max(0, player.currentTime + direction * step);
    setCurrentTime(player.currentTime);
  }

  async function generatePoster() {
    const player = videoRef.current;
    if (!player || !player.videoWidth || !player.videoHeight) {
      setError("Avvia o posiziona il video prima di generare il poster.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = player.videoWidth;
      canvas.height = player.videoHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas non disponibile per generare il poster");
      context.drawImage(player, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
      const response = await adminRequest<{ data: { posterUrl: string } }>(`news/tg9/${item.id}/poster`, {
        method: "POST",
        body: JSON.stringify({ dataUrl, fileName: `${form.slug || item.slug}-poster-${Math.floor(currentTime)}.jpg` }),
      });
      field("posterUrl", response.data.posterUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generazione poster non riuscita");
    } finally {
      setSaving(false);
    }
  }

  function startEditSubclip(subclip: Tg9Subclip) {
    setEditingSubclip(subclip);
    setSubclipForm({
      title: subclip.title ?? "",
      slug: subclip.slug ?? "",
      vastUrl: subclip.vastUrl ?? "",
      startTime: String(subclip.startTime),
      endTime: String(subclip.endTime),
      sortOrder: String(subclip.sortOrder),
    });
  }

  async function saveSubclip(event: FormEvent) {
    event.preventDefault();
    if (!editingSubclip) return;
    setSaving(true);
    setError(null);
    try {
      await adminRequest(`news/tg9/${item.id}/subclips/${editingSubclip.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: subclipForm.title || null,
          slug: subclipForm.slug || undefined,
          vastUrl: subclipForm.vastUrl || null,
          startTime: Number(subclipForm.startTime || 0),
          endTime: Number(subclipForm.endTime || 0),
          sortOrder: Number(subclipForm.sortOrder || 0),
        }),
      });
      setEditingSubclip(null);
      await loadSubclips();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aggiornamento sottoclip non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title="Modifica TG9 · trimming sottoclip" onClose={onClose}>
      <div className="max-h-[82vh] space-y-5 overflow-y-auto pr-1">
        {error ? <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <div className="space-y-3">
            <video
              ref={videoRef}
              src={item.videoUrl}
              poster={item.posterUrl ?? undefined}
              controls
              className="aspect-video w-full rounded-2xl bg-black object-contain"
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            />
            <div className="grid gap-2 sm:grid-cols-4">
              <button type="button" className="admin-secondary-button justify-center" onClick={() => setMarkIn(Math.floor(currentTime))}>Mark-in {markIn !== null ? formatSeconds(markIn) : ""}</button>
              <button type="button" className="admin-secondary-button justify-center" onClick={() => setMarkOut(Math.floor(currentTime))}>Mark-out {markOut !== null ? formatSeconds(markOut) : ""}</button>
              <button type="button" className="admin-primary-button justify-center sm:col-span-2" onClick={() => void createSubclip()} disabled={saving}>Crea sottoclip</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <button type="button" className="admin-secondary-button justify-center" onClick={() => stepFrame(-1)}>◀ 1 frame</button>
              <button type="button" className="admin-secondary-button justify-center" onClick={() => stepFrame(1)}>1 frame ▶</button>
              <button type="button" className="admin-secondary-button justify-center" onClick={() => seekTo(Math.max(0, currentTime - 1))}>-1 sec</button>
              <button type="button" className="admin-secondary-button justify-center" onClick={() => seekTo(currentTime + 1)}>+1 sec</button>
            </div>
            <button type="button" className="admin-secondary-button justify-center" onClick={() => void generatePoster()} disabled={saving}>
              <ImagePlus size={16} /> Genera poster dal frame corrente
            </button>
            <p className="text-xs text-slate-500">Posizione player: {formatSeconds(currentTime)} · durata selezione: {markIn !== null && markOut !== null && markOut > markIn ? formatSeconds(markOut - markIn) : "--:--:--"}</p>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <Input label="Titolo" value={form.title} onChange={(value) => field("title", value)} required />
            <Input label="Slug" value={form.slug} onChange={(value) => field("slug", value)} />
            <Textarea label="Descrizione" value={form.description} onChange={(value) => field("description", value)} rows={4} />
            <Input label="Poster URL" value={form.posterUrl} onChange={(value) => field("posterUrl", value)} />
            <Input label="Sottotitoli URL" value={form.subtitlesUrl} onChange={(value) => field("subtitlesUrl", value)} />
            <Input label="Ordine carousel" type="number" value={form.sortOrder} onChange={(value) => field("sortOrder", value)} />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.published} onChange={(event) => field("published", event.target.checked)} className="size-4 accent-[#22bdf3]" />
              Pubblica su /tg9
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="admin-secondary-button">Chiudi</button>
              <button type="submit" disabled={saving || !form.title.trim() || !form.videoUrl.trim()} className="admin-primary-button disabled:opacity-55">
                {saving ? "Salvataggio..." : "Salva dati"}
              </button>
            </div>
          </form>
        </div>
        <section className="rounded-2xl border border-[#1d3044] bg-[#07111d]/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-black uppercase tracking-[0.14em] text-slate-200">Sottoclip generate</h4>
            <span className="rounded-full border border-[#22bdf3]/40 px-2.5 py-1 text-xs text-[#22bdf3]">{subclips.length} clip</span>
          </div>
          {editingSubclip ? (
            <form className="mb-4 grid gap-3 rounded-2xl border border-[#22bdf3]/25 bg-[#22bdf3]/5 p-4 md:grid-cols-3" onSubmit={saveSubclip}>
              <Input label="Titolo sottoclip" value={subclipForm.title} onChange={(value) => setSubclipForm((current) => ({ ...current, title: value }))} />
              <Input label="Slug sottoclip" value={subclipForm.slug} onChange={(value) => setSubclipForm((current) => ({ ...current, slug: value }))} />
              <Input label="VAST URL" value={subclipForm.vastUrl} onChange={(value) => setSubclipForm((current) => ({ ...current, vastUrl: value }))} />
              <Input label="Mark-in sec" type="number" value={subclipForm.startTime} onChange={(value) => setSubclipForm((current) => ({ ...current, startTime: value }))} />
              <Input label="Mark-out sec" type="number" value={subclipForm.endTime} onChange={(value) => setSubclipForm((current) => ({ ...current, endTime: value }))} />
              <Input label="Ordine" type="number" value={subclipForm.sortOrder} onChange={(value) => setSubclipForm((current) => ({ ...current, sortOrder: value }))} />
              <div className="flex justify-end gap-2 md:col-span-3">
                <button type="button" className="admin-secondary-button" onClick={() => setEditingSubclip(null)}>Annulla</button>
                <button type="submit" className="admin-primary-button" disabled={saving}>Salva sottoclip</button>
              </div>
            </form>
          ) : null}
          {subclips.length ? (
            <div className="space-y-2">
              {subclips.map((subclip) => (
                <div key={subclip.id} className="grid gap-2 rounded-xl border border-[#102033] bg-black/15 p-3 text-sm md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-100">{subclip.title ?? "Sottoclip TG9"}</p>
                    <p className="text-xs text-slate-500">{formatSeconds(subclip.startTime)} → {formatSeconds(subclip.endTime)} · {formatSeconds(subclip.endTime - subclip.startTime)}</p>
                  </div>
                  <button type="button" className="admin-secondary-button justify-center" onClick={() => seekTo(subclip.startTime)}>Anteprima</button>
                  <button type="button" className="admin-icon-button" onClick={() => startEditSubclip(subclip)}><Edit3 size={16} /></button>
                  <ConfirmButton label="Elimina sottoclip" onConfirm={() => void removeSubclip(subclip)} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nessuna sottoclip creata. Posiziona il player, marca ingresso e uscita, poi premi “Crea sottoclip”.</p>
          )}
        </section>
      </div>
    </AdminModal>
  );
}

function emptyTg9Form(): Tg9Form {
  return {
    title: "",
    slug: "",
    description: "",
    videoUrl: "",
    videoObjectKey: "",
    posterUrl: "",
    subtitlesUrl: "",
    sortOrder: "0",
    published: false,
  };
}

function tg9Payload(form: Tg9Form) {
  return {
    title: form.title,
    slug: form.slug || undefined,
    description: form.description || null,
    videoUrl: form.videoUrl,
    videoObjectKey: form.videoObjectKey || null,
    posterUrl: form.posterUrl || null,
    subtitlesUrl: form.subtitlesUrl || null,
    sortOrder: Number(form.sortOrder || 0),
    published: form.published,
  };
}

function slugPreview(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function formatDateParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "***", time: "***" };
  return {
    date: date.toLocaleDateString("it-IT"),
    time: date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
  };
}

function formatSeconds(value: number) {
  const safe = Math.max(0, Math.floor(value));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
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
