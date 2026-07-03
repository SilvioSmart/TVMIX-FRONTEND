"use client";

import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Link2,
  MonitorSmartphone,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import {
  type DragEvent,
  type FormEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  adminRequest,
  type FrontendMenuItem,
  type FrontendMenuPlacement,
  type ListResponse,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header, Input, SearchBox } from "./ContentSection";

type Props = {
  onNotify: (message: string) => void;
};

type MenuForm = {
  label: string;
  url: string;
  placements: FrontendMenuPlacement[];
  sortOrder: string;
  enabled: boolean;
  external: boolean;
  parentId: string;
};

const placements: FrontendMenuPlacement[] = ["HEADER", "MOBILE", "FOOTER"];

const placementLabels: Record<FrontendMenuPlacement, string> = {
  HEADER: "Header",
  FOOTER: "Footer",
  MOBILE: "Mobile",
};

const blank: MenuForm = {
  label: "",
  url: "",
  placements: ["HEADER"],
  sortOrder: "10",
  enabled: true,
  external: false,
  parentId: "",
};

export function AppearanceMenuConfigSection({ onNotify }: Props) {
  const [items, setItems] = useState<FrontendMenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [placement, setPlacement] = useState<FrontendMenuPlacement | "ALL">("ALL");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FrontendMenuItem | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const draggedIdRef = useRef<string | null>(null);
  const originalPreviewOrderRef = useRef<string[]>([]);
  const currentPreviewOrderRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (placement !== "ALL") params.set("placement", placement);
      const result = await adminRequest<ListResponse<FrontendMenuItem>>(
        `frontend-menu?${params.toString()}`,
      );
      setItems(normalizeItems(result.data));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Menu non disponibile");
    } finally {
      setLoading(false);
    }
  }, [placement, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const active = items.filter((item) => item.enabled).length;
    const external = items.filter((item) => item.external).length;
    return { total: items.length, active, external };
  }, [items]);

  const rootItems = useMemo(() => items.filter((item) => !item.parentId), [items]);
  const childrenByParent = useMemo(() => {
    const map: Record<string, FrontendMenuItem[]> = {};
    for (const item of items) {
      if (!item.parentId) continue;
      map[item.parentId] = [...(map[item.parentId] ?? []), item];
    }
    return map;
  }, [items]);

  const headerPreviewItems = useMemo(
    () =>
      rootItems.filter(
        (item) => item.enabled && item.placements.includes("HEADER"),
      ),
    [rootItems],
  );

  useEffect(() => {
    currentPreviewOrderRef.current = headerPreviewItems.map((item) => item.id);
  }, [headerPreviewItems]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const sourceId = draggedIdRef.current;
      if (!sourceId) return;
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-preview-menu-id]");
      const targetId = target?.dataset.previewMenuId;
      if (targetId && targetId !== sourceId) movePreviewItem(sourceId, targetId);
    }

    function handleMouseUp() {
      if (!draggedIdRef.current) return;
      handlePreviewPointerEnd();
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  async function remove(id: string) {
    try {
      await adminRequest(`frontend-menu/${id}`, { method: "DELETE" });
      onNotify("Voce menu eliminata");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita");
    }
  }

  async function toggle(item: FrontendMenuItem) {
    try {
      await adminRequest(`frontend-menu/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !item.enabled }),
      });
      onNotify(item.enabled ? "Voce menu disattivata" : "Voce menu attivata");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Aggiornamento non riuscito");
    }
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const ids = movePreviewItem(draggedId, targetId);
    void savePreviewOrder(ids);
  }

  function handlePreviewPointerStart(itemId: string) {
    draggedIdRef.current = itemId;
    originalPreviewOrderRef.current = currentPreviewOrderRef.current;
    setDraggedId(itemId);
  }

  function handlePreviewPointerEnter(targetId: string) {
    const sourceId = draggedIdRef.current;
    if (!sourceId || sourceId === targetId) return;
    movePreviewItem(sourceId, targetId);
  }

  function handlePreviewPointerEnd() {
    const ids = currentPreviewOrderRef.current;
    const original = originalPreviewOrderRef.current;
    const changed = ids.join("|") !== original.join("|");
    draggedIdRef.current = null;
    setDraggedId(null);
    if (changed) void savePreviewOrder(ids);
  }

  function movePreviewItem(sourceId: string, targetId: string) {
    const current = currentPreviewOrderRef.current
      .map((id) => headerPreviewItems.find((item) => item.id === id))
      .filter((item): item is FrontendMenuItem => Boolean(item));
    const sourceIndex = current.findIndex((item) => item.id === sourceId);
    const to = current.findIndex((item) => item.id === targetId);
    if (sourceIndex < 0 || to < 0) return currentPreviewOrderRef.current;
    const reordered = [...current];
    const [moved] = reordered.splice(sourceIndex, 1);
    reordered.splice(to, 0, moved);
    const ids = reordered.map((item) => item.id);
    currentPreviewOrderRef.current = ids;
    setItems((value) =>
      value.map((item) => {
        const index = ids.indexOf(item.id);
        return index >= 0 ? { ...item, sortOrder: (index + 1) * 10 } : item;
      }),
    );
    return ids;
  }

  async function savePreviewOrder(ids: string[]) {
    setReordering(true);
    try {
      await adminRequest("frontend-menu/reorder/HEADER", {
        method: "PATCH",
        body: JSON.stringify({ ids }),
      });
      onNotify("Ordine menu aggiornato");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Riordino non riuscito");
    } finally {
      setDraggedId(null);
      setReordering(false);
    }
  }

  return (
    <div className="space-y-5">
      <Header
        title="Aspetto · MENU'"
        description="Configura le voci di navigazione del frontend. Puoi riordinare l'header trascinando le voci nell'anteprima."
      >
        <button type="button" onClick={() => setEditing(null)} className="admin-primary-button">
          <Plus size={17} /> Nuova voce
        </button>
      </Header>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Voci configurate" value={stats.total} />
        <Metric label="Voci attive" value={stats.active} tone="emerald" />
        <Metric label="Link esterni" value={stats.external} tone="amber" />
      </div>

      <section className="admin-panel p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Cerca voce o URL menu..." />
          <div className="flex flex-wrap gap-2">
            {(["ALL", "HEADER", "MOBILE", "FOOTER"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPlacement(value)}
                className={[
                  "rounded-lg border px-3 py-2 text-xs font-bold transition",
                  placement === value
                    ? "border-[#22bdf3] bg-[#10243a] text-[#22bdf3]"
                    : "border-[#24384e] text-slate-400 hover:bg-white/[0.04] hover:text-white",
                ].join(" ")}
              >
                {value === "ALL" ? "Tutti" : placementLabels[value]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <ResourceState
        loading={loading}
        error={error}
        empty={!items.length ? "Nessuna voce menu configurata." : undefined}
      />

      {!loading && !error && items.length ? (
        <section className="admin-panel overflow-hidden">
          <div className="hidden grid-cols-[80px_1fr_180px_110px_100px_120px] border-b border-[#1b2b3d] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 lg:grid">
            <span>Ordine</span>
            <span>Voce</span>
            <span>Area</span>
            <span>Stato</span>
            <span>Target</span>
            <span className="text-right">Azioni</span>
          </div>
          <div className="divide-y divide-[#1b2b3d]">
            {rootItems.map((item) => (
              <TreeRow
                key={item.id}
                item={item}
                childrenItems={childrenByParent[item.id] ?? []}
                expanded={expanded[item.id] ?? true}
                onToggleExpanded={() =>
                  setExpanded((value) => ({ ...value, [item.id]: !(value[item.id] ?? true) }))
                }
                onEdit={setEditing}
                onRemove={remove}
                onToggle={toggle}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="admin-panel p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <MonitorSmartphone className="text-[#22bdf3]" size={21} />
            <div>
              <h3 className="admin-section-title">Anteprima navigazione drag&drop</h3>
              <p className="mt-1 text-xs text-slate-500">
                Trascina le voci Header per aggiornare direttamente l'ordine pubblico.
              </p>
            </div>
          </div>
          {reordering ? <span className="text-xs font-semibold text-[#22bdf3]">Salvataggio ordine...</span> : null}
        </div>
        <div className="mt-5 rounded-xl border border-[#203248] bg-[#071321] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-3 text-lg font-black text-white">
              TV<span className="text-[#22bdf3]">MIX</span>
            </span>
            {headerPreviewItems.map((item) => (
              <button
                key={item.id}
                data-preview-menu-id={item.id}
                type="button"
                draggable
                onDragStart={() => setDraggedId(item.id)}
                onDragOver={(event: DragEvent<HTMLButtonElement>) => event.preventDefault()}
                onDrop={() => handleDrop(item.id)}
                onDragEnd={() => setDraggedId(null)}
                onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
                  handlePreviewPointerStart(item.id);
                }}
                onMouseDown={() => handlePreviewPointerStart(item.id)}
                onPointerEnter={() => handlePreviewPointerEnter(item.id)}
                onPointerUp={handlePreviewPointerEnd}
                onPointerCancel={() => {
                  draggedIdRef.current = null;
                  setDraggedId(null);
                }}
                className={[
                  "inline-flex cursor-grab items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold text-slate-200 transition active:cursor-grabbing",
                  draggedId === item.id
                    ? "border-[#22bdf3] bg-[#10243a]"
                    : "border-white/10 bg-white/[0.06] hover:border-[#22bdf3]/60",
                ].join(" ")}
                title="Trascina per modificare l'ordine"
              >
                <GripVertical size={13} />
                {item.label}
                {item.external ? <ExternalLink size={11} /> : null}
              </button>
            ))}
          </div>
        </div>
      </section>

      {editing !== undefined ? (
        <MenuEditor
          item={editing}
          items={items}
          saving={saving}
          onClose={() => setEditing(undefined)}
          onSave={async (form) => {
            setSaving(true);
            setError(null);
            try {
              await adminRequest(editing ? `frontend-menu/${editing.id}` : "frontend-menu", {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify({
                  label: form.label,
                  url: form.url,
                  placement: form.placements[0] ?? "HEADER",
                  placements: form.placements,
                  sortOrder: Number(form.sortOrder),
                  enabled: form.enabled,
                  external: form.external,
                  parentId: form.parentId || null,
                }),
              });
              setEditing(undefined);
              onNotify(editing ? "Voce menu aggiornata" : "Voce menu creata");
              await load();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function normalizeItems(items: FrontendMenuItem[]) {
  return items.map((item) => ({
    ...item,
    placements: item.placements?.length ? item.placements : [item.placement],
  }));
}

function TreeRow({
  item,
  childrenItems,
  expanded,
  onToggleExpanded,
  onEdit,
  onRemove,
  onToggle,
}: {
  item: FrontendMenuItem;
  childrenItems: FrontendMenuItem[];
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: (item: FrontendMenuItem) => void;
  onRemove: (id: string) => void;
  onToggle: (item: FrontendMenuItem) => void;
}) {
  return (
    <div>
      <MenuRow
        item={item}
        depth={0}
        hasChildren={childrenItems.length > 0}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onEdit={onEdit}
        onRemove={onRemove}
        onToggle={onToggle}
      />
      {expanded && childrenItems.length ? (
        <div className="border-t border-[#112236] bg-[#04101d]/70">
          {childrenItems.map((child) => (
            <MenuRow
              key={child.id}
              item={child}
              depth={1}
              hasChildren={false}
              expanded={false}
              onToggleExpanded={() => undefined}
              onEdit={onEdit}
              onRemove={onRemove}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MenuRow({
  item,
  depth,
  hasChildren,
  expanded,
  onToggleExpanded,
  onEdit,
  onRemove,
  onToggle,
}: {
  item: FrontendMenuItem;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onEdit: (item: FrontendMenuItem) => void;
  onRemove: (id: string) => void;
  onToggle: (item: FrontendMenuItem) => void;
}) {
  return (
    <article className="grid gap-4 px-4 py-4 lg:grid-cols-[80px_1fr_180px_110px_100px_120px] lg:items-center lg:px-5">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
        <GripVertical size={15} className="text-slate-500" />
        {item.sortOrder}
      </div>
      <div className="min-w-0" style={{ paddingLeft: depth ? 22 : 0 }}>
        <div className="flex flex-wrap items-center gap-2">
          {hasChildren ? (
            <button type="button" onClick={onToggleExpanded} className="grid size-6 place-items-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white">
              {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : depth ? (
            <span className="size-6 rounded-md border border-[#203248]" />
          ) : null}
          <h3 className="font-semibold text-white">{item.label}</h3>
          {hasChildren ? (
            <span className="rounded-full bg-[#17293b] px-2 py-0.5 text-[10px] text-slate-400">
              sottovoci
            </span>
          ) : null}
        </div>
        <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-slate-500">
          <Link2 size={13} /> {item.url}
        </p>
        {item.parent ? <p className="mt-1 text-[11px] text-slate-500">Sotto: {item.parent.label}</p> : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {item.placements.map((value) => (
          <Badge key={value}>{placementLabels[value]}</Badge>
        ))}
      </div>
      <button
        type="button"
        onClick={() => void onToggle(item)}
        className={[
          "inline-flex w-fit items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-bold",
          item.enabled
            ? "border-emerald-400/35 bg-emerald-400/10 text-emerald-300"
            : "border-slate-500/30 bg-slate-500/10 text-slate-400",
        ].join(" ")}
      >
        {item.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
        {item.enabled ? "Attiva" : "Nascosta"}
      </button>
      <Badge>{item.external ? "Esterno" : "Interno"}</Badge>
      <div className="flex justify-end gap-1">
        <button type="button" aria-label={`Modifica ${item.label}`} onClick={() => onEdit(item)} className="admin-icon-button">
          <Pencil size={17} />
        </button>
        <ConfirmButton label={`Elimina ${item.label}`} onConfirm={() => void onRemove(item.id)} className="admin-icon-button hover:text-red-400">
          <Trash2 size={17} />
        </ConfirmButton>
      </div>
    </article>
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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full border border-[#26394d] bg-[#071321] px-2.5 py-1 text-xs font-bold text-slate-300">
      {children}
    </span>
  );
}

function MenuEditor({
  item,
  items,
  saving,
  onClose,
  onSave,
}: {
  item: FrontendMenuItem | null;
  items: FrontendMenuItem[];
  saving: boolean;
  onClose: () => void;
  onSave: (form: MenuForm) => Promise<void>;
}) {
  const [form, setForm] = useState<MenuForm>(() =>
    item
      ? {
          label: item.label,
          url: item.url,
          placements: item.placements?.length ? item.placements : [item.placement],
          sortOrder: item.sortOrder.toString(),
          enabled: item.enabled,
          external: item.external,
          parentId: item.parentId ?? "",
        }
      : blank,
  );

  function field<K extends keyof MenuForm>(key: K, value: MenuForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function togglePlacement(value: FrontendMenuPlacement) {
    field(
      "placements",
      form.placements.includes(value)
        ? form.placements.filter((item) => item !== value)
        : [...form.placements, value],
    );
  }

  const parentOptions = items.filter((candidate) => candidate.id !== item?.id && !candidate.parentId);
  const canSave = form.placements.length > 0;

  return (
    <AdminModal title={item ? "Modifica voce menu" : "Nuova voce menu"} onClose={onClose}>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          if (canSave) void onSave(form);
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Input label="Etichetta" value={form.label} onChange={(value) => field("label", value)} required />
        <Input label="URL" value={form.url} onChange={(value) => field("url", value)} placeholder="/programmi o #live" required />
        <Input label="Ordine" type="number" value={form.sortOrder} onChange={(value) => field("sortOrder", value)} required />
        <fieldset>
          <legend className="admin-label">Area</legend>
          <div className="mt-2 grid gap-2">
            {placements.map((value) => (
              <label key={value} className="flex items-center gap-3 rounded-lg border border-[#26394d] bg-[#071321] px-3 py-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={form.placements.includes(value)}
                  onChange={() => togglePlacement(value)}
                  className="size-4 accent-[#16b9f4]"
                />
                {placementLabels[value]}
              </label>
            ))}
          </div>
          {!canSave ? <p className="mt-2 text-xs text-red-300">Seleziona almeno un'area.</p> : null}
        </fieldset>
        <label className="sm:col-span-2">
          <span className="admin-label">Voce padre</span>
          <select value={form.parentId} onChange={(event) => field("parentId", event.target.value)} className="admin-input mt-2">
            <option value="">Nessuna voce padre</option>
            {parentOptions.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-[#26394d] bg-[#071321] px-3 py-3 text-sm text-slate-300">
          <input type="checkbox" checked={form.enabled} onChange={(event) => field("enabled", event.target.checked)} className="size-4 accent-[#16b9f4]" />
          Voce visibile
        </label>
        <label className="flex items-center gap-3 rounded-lg border border-[#26394d] bg-[#071321] px-3 py-3 text-sm text-slate-300">
          <input type="checkbox" checked={form.external} onChange={(event) => field("external", event.target.checked)} className="size-4 accent-[#16b9f4]" />
          Link esterno
        </label>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button>
          <button disabled={saving || !canSave} className="admin-primary-button">
            <Save size={17} /> {saving ? "Salvataggio..." : "Salva voce"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
