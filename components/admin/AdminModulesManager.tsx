"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutDashboard, Pencil, Plus, Trash2 } from "lucide-react";
import { Logo } from "@/components/Logo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

type ModuleType = "CAROUSEL_SLIDER" | "LIVE_EPG" | "POSTER_RAIL";
type QueryType = "LATEST" | "CATEGORY" | "LIVE";
type SortMethod = "RECENT" | "OLDEST" | "TITLE_ASC";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type LiveStream = {
  id: string;
  name: string;
  slug: string;
  status: "OFFLINE" | "LIVE" | "SCHEDULED";
};

type HomeModule = {
  id: string;
  title: string;
  subtitle?: string | null;
  type: ModuleType;
  queryType: QueryType | "PROGRAM" | "SEASON" | "MANUAL";
  sortMethod?: SortMethod;
  sortOrder: number;
  enabled: boolean;
  limit: number;
  categoryId?: string | null;
  liveStreamId?: string | null;
  category?: Category | null;
  liveStream?: LiveStream | null;
};

type ModuleForm = {
  id?: string;
  title: string;
  subtitle: string;
  type: ModuleType;
  categoryId: string;
  liveStreamId: string;
  sortMethod: SortMethod;
  sortOrder: number;
  enabled: boolean;
  limit: number;
};

const emptyForm: ModuleForm = {
  title: "",
  subtitle: "",
  type: "CAROUSEL_SLIDER",
  categoryId: "",
  liveStreamId: "",
  sortMethod: "RECENT",
  sortOrder: 10,
  enabled: true,
  limit: 12,
};

const moduleTypeLabels: Record<ModuleType, string> = {
  CAROUSEL_SLIDER: "Carusel slider",
  LIVE_EPG: "Live con EPG",
  POSTER_RAIL: "Locandine",
};

const sortLabels: Record<SortMethod, string> = {
  RECENT: "Più recente",
  OLDEST: "Meno recente",
  TITLE_ASC: "Titolo A-Z",
};

function getToken() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("tvmix_admin_token") ?? "";
}

function nextPosition(modules: HomeModule[]) {
  const max = modules.reduce((value, module) => Math.max(value, module.sortOrder), 0);
  return max + 10;
}

export function AdminModulesManager() {
  const [token, setToken] = useState("");
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [form, setForm] = useState<ModuleForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [modules],
  );

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || getToken()}`,
        ...init.headers,
      },
    });

    if (response.status === 401) {
      window.localStorage.removeItem("tvmix_admin_token");
      window.location.href = "/login";
      throw new Error("Sessione scaduta");
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Operazione non riuscita");
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [modulesResponse, categoriesResponse, liveResponse] = await Promise.all([
        request<{ data: HomeModule[] }>("/api/v1/admin/appearance/modules?limit=100"),
        request<{ data: Category[] }>("/api/v1/admin/categories?limit=100"),
        request<{ data: LiveStream[] }>("/api/v1/admin/live-streams?limit=100"),
      ]);

      setModules(modulesResponse.data ?? []);
      setCategories(categoriesResponse.data ?? []);
      setLiveStreams(liveResponse.data ?? []);
      setForm((current) => (current.id ? current : { ...current, sortOrder: nextPosition(modulesResponse.data ?? []) }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Caricamento non riuscito");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const storedToken = getToken();
    if (!storedToken) {
      window.location.href = "/login";
      return;
    }
    setToken(storedToken);
  }, []);

  useEffect(() => {
    if (token) void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function editModule(module: HomeModule) {
    setForm({
      id: module.id,
      title: module.title,
      subtitle: module.subtitle ?? "",
      type: module.type,
      categoryId: module.categoryId ?? "",
      liveStreamId: module.liveStreamId ?? "",
      sortMethod: module.sortMethod ?? "RECENT",
      sortOrder: module.sortOrder,
      enabled: module.enabled,
      limit: module.limit,
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm({ ...emptyForm, sortOrder: nextPosition(modules) });
    setMessage(null);
    setError(null);
  }

  async function saveModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const isLive = form.type === "LIVE_EPG";
    const payload = {
      title: form.title,
      subtitle: form.subtitle || null,
      type: form.type,
      queryType: (isLive ? "LIVE" : form.categoryId ? "CATEGORY" : "LATEST") satisfies QueryType,
      sortMethod: form.sortMethod,
      sortOrder: Number(form.sortOrder),
      enabled: form.enabled,
      limit: Number(form.limit),
      categoryId: isLive ? null : form.categoryId || null,
      liveStreamId: isLive ? form.liveStreamId || null : null,
    };

    try {
      if (form.id) {
        await request(`/api/v1/admin/appearance/modules/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setMessage("Modulo aggiornato.");
      } else {
        await request("/api/v1/admin/appearance/modules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setMessage("Modulo creato.");
      }
      resetForm();
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function toggleModule(module: HomeModule) {
    await request(`/api/v1/admin/appearance/modules/${module.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !module.enabled }),
    });
    await loadData();
  }

  async function deleteModule(module: HomeModule) {
    if (!window.confirm(`Eliminare il modulo "${module.title}"?`)) return;
    await request(`/api/v1/admin/appearance/modules/${module.id}`, { method: "DELETE" });
    await loadData();
  }

  async function moveModule(index: number, direction: -1 | 1) {
    const next = [...orderedModules];
    const targetIndex = index + direction;
    if (!next[index] || !next[targetIndex]) return;
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

    await request("/api/v1/admin/appearance/modules/reorder", {
      method: "PATCH",
      body: JSON.stringify({ ids: next.map((module) => module.id) }),
    });
    await loadData();
  }

  function logout() {
    window.localStorage.removeItem("tvmix_admin_token");
    window.localStorage.removeItem("tvmix_admin_user");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#020711] text-white">
      <header className="border-b border-white/10 bg-[#05101c]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <Logo />
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan/70">Admin / Aspetto / Moduli</p>
          </div>
          <button type="button" className="admin-secondary-button" onClick={logout}>
            Esci
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[390px_1fr]">
        <section className="admin-panel h-max p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-cyan/10 text-cyan">
              <LayoutDashboard size={20} />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-[-0.03em]">{form.id ? "Modifica modulo" : "Nuovo modulo"}</h1>
              <p className="text-sm text-slate-400">Componi le sezioni del blocco main.</p>
            </div>
          </div>

          <form onSubmit={saveModule} className="space-y-4">
            <label className="admin-label">
              Tipologia modulo
              <select className="admin-input mt-2" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ModuleType })}>
                <option value="CAROUSEL_SLIDER">Carusel slider</option>
                <option value="LIVE_EPG">Live con EPG</option>
                <option value="POSTER_RAIL">Locandine</option>
              </select>
            </label>

            <label className="admin-label">
              Titolo
              <input className="admin-input mt-2" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </label>

            <label className="admin-label">
              Sottotitolo
              <input className="admin-input mt-2" value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
            </label>

            {form.type === "LIVE_EPG" ? (
              <label className="admin-label">
                Canale live
                <select className="admin-input mt-2" value={form.liveStreamId} onChange={(event) => setForm({ ...form, liveStreamId: event.target.value })}>
                  <option value="">Nessun canale selezionato</option>
                  {liveStreams.map((stream) => (
                    <option key={stream.id} value={stream.id}>
                      {stream.name} ({stream.status})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="admin-label">
                Categoria
                <select className="admin-input mt-2" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                  <option value="">Tutte le categorie</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="admin-label">
                Metodo ordine
                <select className="admin-input mt-2" value={form.sortMethod} onChange={(event) => setForm({ ...form, sortMethod: event.target.value as SortMethod })}>
                  <option value="RECENT">Più recente</option>
                  <option value="OLDEST">Meno recente</option>
                  <option value="TITLE_ASC">Titolo A-Z</option>
                </select>
              </label>
              <label className="admin-label">
                Posizione
                <input className="admin-input mt-2" type="number" min={0} max={9999} value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="admin-label">
                Numero contenuti
                <input className="admin-input mt-2" type="number" min={1} max={48} value={form.limit} onChange={(event) => setForm({ ...form, limit: Number(event.target.value) })} />
              </label>
              <label className="admin-label flex h-full items-end gap-2 rounded-lg border border-[#31445a] bg-[#06111d] px-3 py-2">
                <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
                <span>Attivo</span>
              </label>
            </div>

            {message ? <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{message}</p> : null}
            {error ? <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button className="admin-primary-button" disabled={saving}>
                <Plus size={16} />
                {saving ? "Salvataggio..." : form.id ? "Salva modifiche" : "Inserisci modulo"}
              </button>
              {form.id ? (
                <button type="button" className="admin-secondary-button" onClick={resetForm}>
                  Annulla
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="admin-panel overflow-hidden">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-black tracking-[-0.03em]">Moduli nella sezione main</h2>
            <p className="mt-1 text-sm text-slate-400">L’ordine qui sotto determina la posizione reale in home page.</p>
          </div>

          {loading ? (
            <p className="p-5 text-sm text-slate-400">Caricamento moduli...</p>
          ) : orderedModules.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">Nessun modulo configurato.</p>
          ) : (
            <div className="divide-y divide-white/10">
              {orderedModules.map((module, index) => (
                <article key={module.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan/10 px-2.5 py-1 text-xs font-bold text-cyan">{moduleTypeLabels[module.type]}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${module.enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>
                        {module.enabled ? "Attivo" : "Disattivo"}
                      </span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">Posizione {module.sortOrder}</span>
                    </div>
                    <h3 className="text-lg font-black tracking-[-0.02em]">{module.title}</h3>
                    {module.subtitle ? <p className="mt-1 text-sm text-slate-400">{module.subtitle}</p> : null}
                    <p className="mt-3 text-sm text-slate-300">
                      Categoria: <span className="text-white">{module.category?.name ?? "Tutte"}</span>
                      <span className="px-2 text-slate-600">/</span>
                      Ordine: <span className="text-white">{sortLabels[module.sortMethod ?? "RECENT"]}</span>
                      {module.liveStream ? (
                        <>
                          <span className="px-2 text-slate-600">/</span>
                          Live: <span className="text-white">{module.liveStream.name}</span>
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                    <button type="button" className="admin-icon-button" title="Sposta su" onClick={() => moveModule(index, -1)} disabled={index === 0}>
                      <ArrowUp size={17} />
                    </button>
                    <button type="button" className="admin-icon-button" title="Sposta giù" onClick={() => moveModule(index, 1)} disabled={index === orderedModules.length - 1}>
                      <ArrowDown size={17} />
                    </button>
                    <button type="button" className="admin-icon-button" title={module.enabled ? "Disattiva" : "Attiva"} onClick={() => toggleModule(module)}>
                      {module.enabled ? <Eye size={17} /> : <EyeOff size={17} />}
                    </button>
                    <button type="button" className="admin-icon-button" title="Modifica" onClick={() => editModule(module)}>
                      <Pencil size={17} />
                    </button>
                    <button type="button" className="admin-icon-button text-red-300 hover:text-red-200" title="Elimina" onClick={() => deleteModule(module)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
