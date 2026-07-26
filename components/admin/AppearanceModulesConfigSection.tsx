"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Boxes, Eye, EyeOff, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Header } from "./ContentSection";
import {
  adminRequest,
  type CatalogCategory,
  type Category,
  type HomeModule,
  type HomeModuleSortMethod,
  type HomeModuleType,
  type ListResponse,
  type LiveStream,
} from "./admin-api";

type ModuleForm = {
  id?: string;
  title: string;
  subtitle: string;
  type: HomeModuleType;
  categoryId: string;
  programId: string;
  seasonId: string;
  liveStreamId: string;
  sortMethod: HomeModuleSortMethod;
  sortOrder: number;
  enabled: boolean;
  limit: number;
};

const baseForm: ModuleForm = {
  title: "",
  subtitle: "",
  type: "CAROUSEL_SLIDER",
  categoryId: "",
  programId: "",
  seasonId: "",
  liveStreamId: "",
  sortMethod: "RECENT",
  sortOrder: 10,
  enabled: true,
  limit: 12,
};

const moduleTypeLabels: Record<HomeModuleType, string> = {
  CAROUSEL_SLIDER: "Carusel slider",
  LIVE_EPG: "Live con EPG",
  POSTER_RAIL: "Locandine",
  PROMOTIONS: "Promozioni",
};

const sortLabels: Record<HomeModuleSortMethod, string> = {
  RECENT: "Più recente",
  OLDEST: "Meno recente",
  TITLE_ASC: "Titolo A-Z",
};

function nextSortOrder(modules: HomeModule[]) {
  return modules.reduce((max, module) => Math.max(max, module.sortOrder), 0) + 10;
}

export function AppearanceModulesConfigSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [modules, setModules] = useState<HomeModule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [form, setForm] = useState<ModuleForm>(baseForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)),
    [modules],
  );
  const availablePrograms = useMemo(
    () =>
      catalog
        .filter((category) => !form.categoryId || category.id === form.categoryId)
        .flatMap((category) => category.programs.map((program) => ({ ...program, category }))),
    [catalog, form.categoryId],
  );
  const availableSeasons = useMemo(
    () => availablePrograms.find((program) => program.id === form.programId)?.seasons ?? [],
    [availablePrograms, form.programId],
  );

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [moduleResponse, categoryResponse, catalogResponse, liveResponse] = await Promise.all([
        adminRequest<ListResponse<HomeModule>>("appearance/modules?limit=100"),
        adminRequest<ListResponse<Category>>("categories?limit=100"),
        adminRequest<{ data: CatalogCategory[] }>("catalog/tree"),
        adminRequest<ListResponse<LiveStream>>("live-streams?limit=100"),
      ]);

      setModules(moduleResponse.data ?? []);
      setCategories(categoryResponse.data ?? []);
      setCatalog(catalogResponse.data ?? []);
      setLiveStreams(liveResponse.data ?? []);
      setForm((current) =>
        current.id ? current : { ...current, sortOrder: nextSortOrder(moduleResponse.data ?? []) },
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Caricamento moduli non riuscito");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setForm({ ...baseForm, sortOrder: nextSortOrder(modules) });
    setError(null);
  }

  function editModule(module: HomeModule) {
    setForm({
      id: module.id,
      title: module.title,
      subtitle: module.subtitle ?? "",
      type: module.type,
      categoryId: module.categoryId ?? "",
      programId: module.programId ?? "",
      seasonId: module.seasonId ?? "",
      liveStreamId: module.liveStreamId ?? "",
      sortMethod: module.sortMethod ?? "RECENT",
      sortOrder: module.sortOrder,
      enabled: module.enabled,
      limit: module.limit,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveModule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const liveModule = form.type === "LIVE_EPG";
    const queryType = liveModule
      ? "LIVE"
      : form.seasonId
        ? "SEASON"
        : form.programId
          ? "PROGRAM"
          : form.categoryId
            ? "CATEGORY"
            : "LATEST";
    const payload = {
      title: form.title,
      subtitle: form.subtitle || null,
      type: form.type,
      queryType,
      sortMethod: form.sortMethod,
      sortOrder: Number(form.sortOrder),
      enabled: form.enabled,
      limit: Number(form.limit),
      categoryId: liveModule ? null : form.categoryId || null,
      programId: liveModule ? null : form.programId || null,
      seasonId: liveModule ? null : form.seasonId || null,
      liveStreamId: liveModule ? form.liveStreamId || null : null,
    };

    try {
      if (form.id) {
        await adminRequest(`appearance/modules/${form.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        onNotify("Modulo aggiornato");
      } else {
        await adminRequest("appearance/modules", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        onNotify("Modulo inserito nella sezione main");
      }
      resetForm();
      await loadData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Salvataggio modulo non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function toggleModule(module: HomeModule) {
    await adminRequest(`appearance/modules/${module.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !module.enabled }),
    });
    onNotify(module.enabled ? "Modulo disattivato" : "Modulo attivato");
    await loadData();
  }

  async function deleteModule(module: HomeModule) {
    if (!window.confirm(`Eliminare il modulo "${module.title}" dalla sezione main?`)) return;
    await adminRequest(`appearance/modules/${module.id}`, { method: "DELETE" });
    onNotify("Modulo eliminato");
    await loadData();
  }

  async function moveModule(index: number, direction: -1 | 1) {
    const next = [...orderedModules];
    const target = index + direction;
    if (!next[index] || !next[target]) return;
    [next[index], next[target]] = [next[target], next[index]];

    await adminRequest("appearance/modules/reorder", {
      method: "PATCH",
      body: JSON.stringify({ ids: next.map((module) => module.id) }),
    });
    onNotify("Posizione moduli aggiornata");
    await loadData();
  }

  return (
    <div className="space-y-5">
      <Header
        title="Aspetto · Moduli"
        description="Componi la sezione main della home con carusel slider, live con EPG e locandine, leggendo contenuti e categorie dal database."
      />

      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
        <section className="admin-panel h-max p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
              <Boxes size={20} />
            </span>
            <div>
              <h3 className="admin-section-title">{form.id ? "Modifica modulo" : "Inserisci modulo"}</h3>
              <p className="mt-1 text-xs text-slate-500">Ogni modulo viene renderizzato nel blocco main.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={saveModule}>
            <label className="admin-label">
              Tipo modulo
              <select
                className="admin-input mt-2"
                value={form.type}
                onChange={(event) =>
                  setForm({
                    ...form,
                    type: event.target.value as HomeModuleType,
                    ...(event.target.value === "LIVE_EPG"
                      ? { categoryId: "", programId: "", seasonId: "" }
                      : { liveStreamId: "" }),
                  })
                }
              >
                <option value="CAROUSEL_SLIDER">Carusel slider</option>
                <option value="LIVE_EPG">Live con EPG</option>
                <option value="POSTER_RAIL">Locandine</option>
                <option value="PROMOTIONS">Promozioni</option>
              </select>
            </label>

            <label className="admin-label">
              Titolo
              <input
                className="admin-input mt-2"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            </label>

            <label className="admin-label">
              Sottotitolo
              <input
                className="admin-input mt-2"
                value={form.subtitle}
                onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
                placeholder="Testo descrittivo opzionale"
              />
            </label>

            {form.type === "LIVE_EPG" ? (
              <label className="admin-label">
                Diretta da collegare
                <select
                  className="admin-input mt-2"
                  value={form.liveStreamId}
                  onChange={(event) => setForm({ ...form, liveStreamId: event.target.value })}
                >
                  <option value="">Nessuna diretta selezionata</option>
                  {liveStreams.map((stream) => (
                    <option key={stream.id} value={stream.id}>
                      {stream.name} ({stream.status})
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="space-y-3 rounded-xl border border-[#203248] bg-[#071321]/55 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Selezione contenuti da mostrare
                </p>
                <label className="admin-label">
                  Categoria
                  <select
                    className="admin-input mt-2"
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        categoryId: event.target.value,
                        programId: "",
                        seasonId: "",
                      })
                    }
                  >
                    <option value="">Tutte le categorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-label">
                  Programma
                  <select
                    className="admin-input mt-2"
                    value={form.programId}
                    onChange={(event) => {
                      const program = availablePrograms.find((item) => item.id === event.target.value);
                      setForm({
                        ...form,
                        programId: event.target.value,
                        categoryId: program?.categoryId ?? form.categoryId,
                        seasonId: "",
                      });
                    }}
                  >
                    <option value="">Tutti i programmi</option>
                    {availablePrograms.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({program.id})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="admin-label">
                  Stagione / serie
                  <select
                    className="admin-input mt-2"
                    value={form.seasonId}
                    disabled={!form.programId}
                    onChange={(event) => setForm({ ...form, seasonId: event.target.value })}
                  >
                    <option value="">Tutte le stagioni</option>
                    {availableSeasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.title || `Stagione ${season.number}`} ({season.id})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="admin-label">
                Metodo ordine
                <select
                  className="admin-input mt-2"
                  value={form.sortMethod}
                  onChange={(event) => setForm({ ...form, sortMethod: event.target.value as HomeModuleSortMethod })}
                >
                  <option value="RECENT">Più recente</option>
                  <option value="OLDEST">Meno recente</option>
                  <option value="TITLE_ASC">Titolo A-Z</option>
                </select>
              </label>
              <label className="admin-label">
                Posizione
                <input
                  className="admin-input mt-2"
                  type="number"
                  min={0}
                  max={9999}
                  value={form.sortOrder}
                  onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="admin-label">
                Numero contenuti
                <input
                  className="admin-input mt-2"
                  type="number"
                  min={1}
                  max={48}
                  value={form.limit}
                  onChange={(event) => setForm({ ...form, limit: Number(event.target.value) })}
                />
              </label>
              <label className="admin-label flex h-full items-end gap-2 rounded-lg border border-[#31445a] bg-[#06111d] px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
                />
                <span>Rendere attivo</span>
              </label>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}

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
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#203248] px-5 py-4">
            <div>
              <h3 className="admin-section-title">Moduli nella sezione main</h3>
              <p className="mt-1 text-xs text-slate-500">L’ordine determina la posizione in pagina.</p>
            </div>
            <button type="button" className="admin-secondary-button" onClick={loadData}>
              <RefreshCw size={15} /> Aggiorna
            </button>
          </div>

          {loading ? (
            <p className="p-5 text-sm text-slate-400">Caricamento moduli...</p>
          ) : orderedModules.length === 0 ? (
            <p className="p-5 text-sm text-slate-400">Nessun modulo configurato.</p>
          ) : (
            <div className="divide-y divide-[#203248]">
              {orderedModules.map((module, index) => (
                <article key={module.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_auto]">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#16b9f4]/10 px-2.5 py-1 text-xs font-bold text-[#22bdf3]">
                        {moduleTypeLabels[module.type]}
                      </span>
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-bold",
                          module.enabled ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400",
                        ].join(" ")}
                      >
                        {module.enabled ? "Attivo" : "Disattivo"}
                      </span>
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300">
                        Posizione {module.sortOrder}
                      </span>
                    </div>
                    <h4 className="text-lg font-black tracking-[-0.02em]">{module.title}</h4>
                    {module.subtitle ? <p className="mt-1 text-sm text-slate-400">{module.subtitle}</p> : null}
                    <p className="mt-3 text-sm text-slate-300">
                      Categoria: <span className="text-white">{module.category?.name ?? "Tutte"}</span>
                      <span className="px-2 text-slate-600">/</span>
                      Programma: <span className="text-white">{module.program?.name ?? "Tutti"}</span>
                      <span className="px-2 text-slate-600">/</span>
                      Stagione: <span className="text-white">{module.season ? module.season.title || `Stagione ${module.season.number}` : "Tutte"}</span>
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
    </div>
  );
}
