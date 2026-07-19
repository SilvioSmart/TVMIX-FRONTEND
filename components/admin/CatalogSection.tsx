"use client";

import {
  ChevronRight,
  Clapperboard,
  FolderOpen,
  FolderTree,
  Layers3,
  Pencil,
  Plus,
  Search,
  Trash2,
  Tv,
  Unlink,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from "react";
import {
  adminRequest,
  type CatalogAvailableEpisode,
  type CatalogCategory,
  type CatalogProgram,
  type CatalogSeason,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header, Input } from "./ContentSection";

type Editor =
  | { kind: "category"; value: CatalogCategory | null }
  | { kind: "program"; categoryId: string; value: CatalogProgram | null }
  | { kind: "season"; programId: string; value: CatalogSeason | null };

type CatalogRowTone = "category" | "program" | "season" | "episode";

type Props = { onNotify: (message: string) => void };

export function CatalogSection({ onNotify }: Props) {
  const [tree, setTree] = useState<CatalogCategory[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [assigning, setAssigning] = useState<CatalogSeason | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = deferredSearch
        ? `?search=${encodeURIComponent(deferredSearch)}`
        : "";
      const result = await adminRequest<{ data: CatalogCategory[] }>(
        `catalog/tree${query}`,
      );
      setTree(result.data);
      if (deferredSearch) {
        setExpanded(
          new Set(
            result.data.flatMap((category) => [
              `category:${category.id}`,
              ...category.programs.flatMap((program) => [
                `program:${program.id}`,
                ...program.seasons.map((season) => `season:${season.id}`),
              ]),
            ]),
          ),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Catalogo non disponibile");
    } finally {
      setLoading(false);
    }
  }, [deferredSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function remove(path: string, message: string) {
    try {
      await adminRequest(path, { method: "DELETE" });
      onNotify(message);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita");
    }
  }

  return (
    <div className="space-y-5">
      <Header
        title="Catalogo"
        description="Organizza gli episodi nella gerarchia categoria, programma e stagione."
      >
        <button
          type="button"
          onClick={() => setEditor({ kind: "category", value: null })}
          className="admin-primary-button"
        >
          <Plus size={17} /> Nuova categoria
        </button>
      </Header>

      <label className="admin-panel relative block p-3">
        <Search
          size={17}
          className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="admin-input pl-10"
          placeholder="Cerca categorie, programmi o episodi..."
        />
      </label>

      <ResourceState
        loading={loading}
        error={error}
        empty={!tree.length ? "Il catalogo è vuoto." : undefined}
      />

      {!loading && !error && tree.length ? (
        <section className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#203248] bg-[#0b1b2c] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
            <span>Struttura catalogo</span>
            <span>{tree.length} categorie</span>
          </div>
          <div className="divide-y divide-[#17283a]">
            {tree.map((category) => (
              <CategoryNode
                key={category.id}
                category={category}
                expanded={expanded}
                onToggle={toggle}
                onEdit={setEditor}
                onAssign={setAssigning}
                onRemove={remove}
              />
            ))}
          </div>
        </section>
      ) : null}

      {editor ? (
        <CatalogEditor
          editor={editor}
          categories={tree}
          onClose={() => setEditor(null)}
          onSaved={async (message) => {
            setEditor(null);
            onNotify(message);
            await load();
          }}
        />
      ) : null}

      {assigning ? (
        <EpisodeAssignment
          season={assigning}
          onClose={() => setAssigning(null)}
          onSaved={async () => {
            setAssigning(null);
            onNotify("Episodi aggiunti alla stagione");
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function CategoryNode({
  category,
  expanded,
  onToggle,
  onEdit,
  onAssign,
  onRemove,
}: {
  category: CatalogCategory;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onEdit: (editor: Editor) => void;
  onAssign: (season: CatalogSeason) => void;
  onRemove: (path: string, message: string) => Promise<void>;
}) {
  const key = `category:${category.id}`;
  const open = expanded.has(key);
  const seasonCount = category.programs.reduce(
    (total, program) => total + program.seasons.length,
    0,
  );
  const episodeCount = category.programs.reduce(
    (total, program) =>
      total + program.seasons.reduce((seasonTotal, season) => seasonTotal + season.episodes.length, 0),
    0,
  );
  return (
    <div>
      <TreeRow
        level={0}
        tone="category"
        open={open}
        expandable
        icon={<FolderOpen size={18} />}
        title={category.name}
        subtitle={`${category.programs.length} programmi · ${seasonCount} stagioni · ${episodeCount} episodi`}
        onToggle={() => onToggle(key)}
        actions={
          <>
            <Action label={`Nuovo programma in ${category.name}`} onClick={() => onEdit({ kind: "program", categoryId: category.id, value: null })}><Plus size={16} /></Action>
            <Action label={`Modifica ${category.name}`} onClick={() => onEdit({ kind: "category", value: category })}><Pencil size={16} /></Action>
            <ConfirmButton label={`Elimina ${category.name}`} onConfirm={() => void onRemove(`categories/${category.id}`, "Categoria eliminata")} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
          </>
        }
      />
      {open ? (
        <div className="border-t border-[#132436] bg-[#06111d]/55">
          {category.programs.length ? category.programs.map((program) => (
            <ProgramNode
              key={program.id}
              program={program}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onAssign={onAssign}
              onRemove={onRemove}
            />
          )) : <EmptyBranch level={1} label="Nessun programma in questa categoria" />}
        </div>
      ) : null}
    </div>
  );
}

function ProgramNode({
  program,
  expanded,
  onToggle,
  onEdit,
  onAssign,
  onRemove,
}: {
  program: CatalogProgram;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onEdit: (editor: Editor) => void;
  onAssign: (season: CatalogSeason) => void;
  onRemove: (path: string, message: string) => Promise<void>;
}) {
  const key = `program:${program.id}`;
  const open = expanded.has(key);
  return (
    <div>
      <TreeRow
        level={1}
        tone="program"
        open={open}
        expandable
        icon={<Tv size={17} />}
        title={program.name}
        subtitle={`${program.id} · ${program.seasons.length} stagioni`}
        onToggle={() => onToggle(key)}
        actions={
          <>
            <Action label={`Nuova stagione per ${program.name}`} onClick={() => onEdit({ kind: "season", programId: program.id, value: null })}><Plus size={16} /></Action>
            <Action label={`Modifica ${program.name}`} onClick={() => onEdit({ kind: "program", categoryId: program.categoryId, value: program })}><Pencil size={16} /></Action>
            <ConfirmButton label={`Elimina ${program.name}`} onConfirm={() => void onRemove(`catalog/programs/${program.id}`, "Programma eliminato")} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
          </>
        }
      />
      {open ? (
        <div className="border-t border-[#132436]">
          {program.seasons.length ? program.seasons.map((season) => (
            <SeasonNode
              key={season.id}
              season={season}
              expanded={expanded}
              onToggle={onToggle}
              onEdit={onEdit}
              onAssign={onAssign}
              onRemove={onRemove}
            />
          )) : <EmptyBranch level={2} label="Nessuna stagione creata" />}
        </div>
      ) : null}
    </div>
  );
}

function SeasonNode({
  season,
  expanded,
  onToggle,
  onEdit,
  onAssign,
  onRemove,
}: {
  season: CatalogSeason;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onEdit: (editor: Editor) => void;
  onAssign: (season: CatalogSeason) => void;
  onRemove: (path: string, message: string) => Promise<void>;
}) {
  const key = `season:${season.id}`;
  const open = expanded.has(key);
  return (
    <div>
      <TreeRow
        level={2}
        tone="season"
        open={open}
        expandable
        icon={<Layers3 size={16} />}
        title={season.title || `Stagione ${season.number}`}
        subtitle={`${season.id} · ${season.episodes.length} episodi`}
        onToggle={() => onToggle(key)}
        actions={
          <>
            <Action label={`Aggiungi episodi a ${season.id}`} onClick={() => onAssign(season)}><Plus size={16} /></Action>
            <Action label={`Modifica ${season.id}`} onClick={() => onEdit({ kind: "season", programId: season.programId, value: season })}><Pencil size={16} /></Action>
            <ConfirmButton label={`Elimina ${season.id}`} onConfirm={() => void onRemove(`catalog/seasons/${season.id}`, "Stagione eliminata")} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton>
          </>
        }
      />
      {open ? (
        <div className="border-t border-[#132436]">
          {season.episodes.length ? season.episodes.map((episode) => (
            <div key={episode.id} className={`${catalogRowToneClasses.episode.row} group flex min-h-14 items-center gap-3 border-b py-2.5 pl-12 pr-3 last:border-b-0 sm:pl-[116px] sm:pr-4`}>
              <span className={`grid size-8 shrink-0 place-items-center rounded-md ${catalogRowToneClasses.episode.icon}`}><Clapperboard size={15} /></span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${catalogRowToneClasses.episode.title}`}>{episode.title}</p>
                <p className={`truncate text-[11px] ${catalogRowToneClasses.episode.subtitle}`}>{episode.slug} · {episode.published ? "Pubblicato" : "Bozza"}</p>
              </div>
              <ConfirmButton label={`Rimuovi ${episode.title} dalla stagione`} onConfirm={() => void onRemove(`catalog/seasons/${season.id}/episodes/${episode.id}`, "Episodio rimosso dalla stagione")} className="admin-icon-button opacity-60 hover:text-amber-300 group-hover:opacity-100"><Unlink size={15} /></ConfirmButton>
            </div>
          )) : <EmptyBranch level={3} label="Nessun episodio assegnato" />}
        </div>
      ) : null}
    </div>
  );
}

function TreeRow({
  level,
  tone,
  open,
  expandable,
  icon,
  title,
  subtitle,
  onToggle,
  actions,
}: {
  level: number;
  tone: CatalogRowTone;
  open: boolean;
  expandable: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onToggle: () => void;
  actions: React.ReactNode;
}) {
  const toneClasses = catalogRowToneClasses[tone];
  return (
    <div
      className={`${toneClasses.row} group flex min-h-16 items-start gap-2 px-3 py-2.5 sm:items-center sm:px-4`}
      style={{ paddingLeft: `${16 + level * 28}px` }}
    >
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Comprimi" : "Espandi"} ${title}`} className="grid size-8 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-white/5 hover:text-white">
        {expandable ? <ChevronRight size={17} className={`transition-transform ${open ? "rotate-90" : ""}`} /> : null}
      </button>
      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClasses.icon}`}>{icon}</span>
      <button type="button" onClick={onToggle} className="min-w-0 flex-1 pt-1 text-left sm:pt-0">
        <span className={`block truncate text-sm font-semibold ${toneClasses.title}`}>{title}</span>
        <span className={`block truncate text-[11px] ${toneClasses.subtitle}`}>{subtitle}</span>
      </button>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5 opacity-80 group-hover:opacity-100">{actions}</div>
    </div>
  );
}

function Action({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className="admin-icon-button">{children}</button>;
}

const catalogRowToneClasses: Record<CatalogRowTone, { row: string; icon: string; title: string; subtitle: string }> = {
  category: {
    row: "border-l-4 border-cyan-400/80 bg-cyan-400/[0.075] hover:bg-cyan-400/[0.12]",
    icon: "border border-cyan-300/35 bg-cyan-400/15 text-cyan-200",
    title: "text-cyan-50",
    subtitle: "text-cyan-200/65",
  },
  program: {
    row: "border-l-4 border-violet-400/80 bg-violet-400/[0.07] hover:bg-violet-400/[0.11]",
    icon: "border border-violet-300/35 bg-violet-400/15 text-violet-200",
    title: "text-violet-50",
    subtitle: "text-violet-200/65",
  },
  season: {
    row: "border-l-4 border-amber-400/80 bg-amber-400/[0.065] hover:bg-amber-400/[0.105]",
    icon: "border border-amber-300/35 bg-amber-400/15 text-amber-200",
    title: "text-amber-50",
    subtitle: "text-amber-200/65",
  },
  episode: {
    row: "border-l-4 border-emerald-400/70 border-b-emerald-400/15 bg-emerald-400/[0.045] hover:bg-emerald-400/[0.085]",
    icon: "border border-emerald-300/30 bg-emerald-400/15 text-emerald-200",
    title: "text-emerald-50",
    subtitle: "text-emerald-200/60",
  },
};

function EmptyBranch({ level, label }: { level: number; label: string }) {
  return <div className="flex min-h-14 items-center gap-3 py-3 text-xs text-slate-600" style={{ paddingLeft: `${52 + level * 28}px` }}><FolderTree size={15} />{label}</div>;
}

function CatalogEditor({
  editor,
  categories,
  onClose,
  onSaved,
}: {
  editor: Editor;
  categories: CatalogCategory[];
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  if (editor.kind === "category") {
    return <CategoryEditor value={editor.value} onClose={onClose} onSaved={onSaved} />;
  }
  if (editor.kind === "program") {
    return <ProgramEditor editor={editor} categories={categories} onClose={onClose} onSaved={onSaved} />;
  }
  return <SeasonEditor editor={editor} onClose={onClose} onSaved={onSaved} />;
}

function CategoryEditor({ value, onClose, onSaved }: { value: CatalogCategory | null; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [name, setName] = useState(value?.name ?? "");
  const [slug, setSlug] = useState(value?.slug ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function changeName(nextName: string) {
    setName(nextName);
    if (!slugEdited) setSlug(slugify(nextName));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminRequest(value ? `categories/${value.id}` : "categories", {
        method: value ? "PATCH" : "POST",
        body: JSON.stringify({ name, slug, description: description || null }),
      });
      await onSaved(value ? "Categoria aggiornata" : "Categoria creata");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={value ? "Modifica categoria" : "Nuova categoria"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Input label="Nome" value={name} onChange={changeName} required />
        <label>
          <span className="admin-label">Slug</span>
          <input
            required
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            className="admin-input mt-2"
          />
          <span className="mt-1.5 block text-xs text-slate-500">
            Generato automaticamente dal nome; puoi modificarlo.
          </span>
        </label>
        <TextArea label="Descrizione" value={description} onChange={setDescription} />
        <EditorError message={error} />
        <ModalActions onClose={onClose} saving={saving} />
      </form>
    </AdminModal>
  );
}

function ProgramEditor({ editor, categories, onClose, onSaved }: { editor: Extract<Editor, { kind: "program" }>; categories: CatalogCategory[]; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [name, setName] = useState(editor.value?.name ?? "");
  const [slug, setSlug] = useState(editor.value?.slug ?? "");
  const [description, setDescription] = useState(editor.value?.description ?? "");
  const [categoryId, setCategoryId] = useState(editor.value?.categoryId ?? editor.categoryId);
  const [slugEdited, setSlugEdited] = useState(Boolean(editor.value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = createProgramId(name);

  function changeName(nextName: string) {
    setName(nextName);
    if (!slugEdited) setSlug(slugify(nextName));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminRequest(
        editor.value ? `catalog/programs/${editor.value.id}` : "catalog/programs",
        {
          method: editor.value ? "PATCH" : "POST",
          body: JSON.stringify({
            name,
            slug,
            description: description || null,
            categoryId,
          }),
        },
      );
      await onSaved(
        editor.value ? "Programma aggiornato" : `Programma ${preview} creato`,
      );
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Salvataggio non riuscito";
      setError(
        !editor.value && message.includes("Esiste già")
          ? `L'ID programma ${preview} è già utilizzato. Scegli un nome con consonanti iniziali differenti.`
          : message,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={editor.value ? "Modifica programma" : "Nuovo programma"} onClose={onClose}>
      <form className="space-y-4" onSubmit={(event) => void submit(event)}>
        <Input label="Nome programma" value={name} onChange={changeName} required />
        <div>
          <span className="admin-label">ID programma</span>
          <div className="mt-2 rounded-lg border border-[#26394d] bg-[#071321] px-3.5 py-3 font-mono text-sm tracking-[0.18em] text-[#22bdf3]">{editor.value?.id ?? preview}</div>
          <p className="mt-1.5 text-xs text-slate-500">Generato dalle prime cinque consonanti del nome.</p>
        </div>
        <label>
          <span className="admin-label">Slug</span>
          <input
            required
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
            className="admin-input mt-2"
          />
          <span className="mt-1.5 block text-xs text-slate-500">
            Generato automaticamente dal nome; puoi modificarlo.
          </span>
        </label>
        <label><span className="admin-label">Categoria</span><select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="admin-input mt-2">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <TextArea label="Descrizione" value={description} onChange={setDescription} />
        <EditorError message={error} />
        <ModalActions onClose={onClose} saving={saving} />
      </form>
    </AdminModal>
  );
}

function SeasonEditor({ editor, onClose, onSaved }: { editor: Extract<Editor, { kind: "season" }>; onClose: () => void; onSaved: (message: string) => Promise<void> }) {
  const [number, setNumber] = useState(editor.value?.number.toString() ?? "1");
  const [title, setTitle] = useState(editor.value?.title ?? "");
  const preview = createSeasonId(editor.programId, Number(number));
  return <AdminModal title={editor.value ? "Modifica stagione" : "Nuova stagione"} onClose={onClose}><form className="space-y-4" onSubmit={(event: FormEvent) => { event.preventDefault(); void (async () => { await adminRequest(editor.value ? `catalog/seasons/${editor.value.id}` : "catalog/seasons", { method: editor.value ? "PATCH" : "POST", body: JSON.stringify(editor.value ? { title: title || null } : { number: Number(number), title: title || null, programId: editor.programId }) }); await onSaved(editor.value ? "Stagione aggiornata" : `Stagione ${preview} creata`); })(); }}>{!editor.value ? <Input label="Numero stagione" type="number" value={number} onChange={setNumber} required /> : null}<div><span className="admin-label">ID stagione</span><div className="mt-2 rounded-lg border border-[#26394d] bg-[#071321] px-3.5 py-3 font-mono text-sm tracking-[0.18em] text-[#22bdf3]">{editor.value?.id ?? preview}</div><p className="mt-1.5 text-xs text-slate-500">Posizioni 1, 3 e 5 del programma + S + numero a due cifre.</p></div><Input label="Titolo opzionale" value={title} onChange={setTitle} /><ModalActions onClose={onClose} /></form></AdminModal>;
}

function EpisodeAssignment({ season, onClose, onSaved }: { season: CatalogSeason; onClose: () => void; onSaved: () => Promise<void> }) {
  const [episodes, setEpisodes] = useState<CatalogAvailableEpisode[]>([]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void adminRequest<{ data: CatalogAvailableEpisode[] }>("catalog/episodes?unassigned=true")
      .then((result) => setEpisodes(result.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Contenuti non disponibili"))
      .finally(() => setLoading(false));
  }, []);
  return <AdminModal title={`Aggiungi episodi a ${season.id}`} onClose={onClose}><div className="space-y-4"><p className="text-sm text-slate-400">Seleziona i contenuti non ancora catalogati. La categoria verrà allineata automaticamente al programma.</p><ResourceState loading={loading} error={error} empty={!episodes.length ? "Non ci sono contenuti da catalogare." : undefined} />{!loading && !error && episodes.length ? <div className="max-h-80 divide-y divide-[#1b2b3d] overflow-y-auto rounded-lg border border-[#26394d]">{episodes.map((episode) => <label key={episode.id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-white/[0.03]"><input type="checkbox" checked={selected.has(episode.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(episode.id); else next.delete(episode.id); return next; })} className="size-4 accent-[#16b9f4]" /><span className="min-w-0"><span className="block truncate text-sm font-medium">{episode.title}</span><span className="block truncate text-xs text-slate-500">{episode.category.name} · {episode.slug}</span></span></label>)}</div> : null}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button><button type="button" disabled={!selected.size} onClick={() => void (async () => { await adminRequest(`catalog/seasons/${season.id}/episodes`, { method: "POST", body: JSON.stringify({ videoIds: [...selected] }) }); await onSaved(); })()} className="admin-primary-button">Aggiungi {selected.size || ""} episodi</button></div></div></AdminModal>;
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label><span className="admin-label">{label}</span><textarea value={value} onChange={(event) => onChange(event.target.value)} className="admin-input mt-2 h-24 py-3" /></label>;
}

function EditorError({ message }: { message: string | null }) {
  return message ? (
    <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-3.5 py-3 text-sm text-red-300">
      {message}
    </div>
  ) : null;
}

function ModalActions({ onClose, saving = false }: { onClose: () => void; saving?: boolean }) {
  return <div className="flex justify-end gap-2"><button type="button" disabled={saving} onClick={onClose} className="admin-secondary-button">Annulla</button><button disabled={saving} className="admin-primary-button">{saving ? "Salvataggio..." : "Salva"}</button></div>;
}

function createProgramId(name: string) {
  const vowels = new Set(["A", "E", "I", "O", "U"]);
  const letters = name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().replace(/[^A-Z]/g, "");
  return [...letters].filter((letter) => !vowels.has(letter)).slice(0, 5).join("").padEnd(5, "X");
}

function createSeasonId(programId: string, number: number) {
  const safeNumber = Number.isInteger(number) && number > 0 ? number : 1;
  return `${programId[0] ?? "X"}${programId[2] ?? "X"}${programId[4] ?? "X"}S${String(safeNumber).padStart(2, "0").slice(-2)}`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
