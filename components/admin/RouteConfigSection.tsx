"use client";

import { CheckCircle2, Pencil, Plus, Route, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  deleteRouteConfig,
  listRouteConfigs,
  saveRouteConfig,
  type RouteConfig,
  type RouteConfigInput,
} from "./admin-api";
import { Header, Input } from "./ContentSection";
import { AdminModal, ResourceState } from "./AdminResourceUI";

type Props = { onNotify: (message: string) => void };

const blank: RouteConfigInput = {
  name: "",
  protocol: "FTP",
  connectionUrl: "",
  host: "",
  port: 21,
  username: "",
  authMode: "PASSWORD",
  passwordSecret: "",
  remotePath: "",
  importPath: "",
  enabled: true,
  notes: "",
};

export function RouteConfigSection({ onNotify }: Props) {
  const [routes, setRoutes] = useState<RouteConfig[]>([]);
  const [editing, setEditing] = useState<RouteConfig | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoutes(await listRouteConfigs());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Caricamento rotte non riuscito");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(route: RouteConfig) {
    if (!window.confirm(`Eliminare la rotta ${route.name}?`)) return;
    try {
      await deleteRouteConfig(route.id);
      onNotify("Rotta eliminata");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione rotta non riuscita");
    }
  }

  return (
    <div className="space-y-5">
      <Header title="ROUTE CFG" description="Configura rotte esterne FTP, SSH, SFTP, Rsync, mount locali e percorsi import usati da Loading.">
        <button type="button" className="admin-primary-button" onClick={() => setEditing(null)}>
          <Plus size={17} /> Nuova rotta
        </button>
      </Header>
      <ResourceState loading={loading} error={error} empty={!routes.length ? "Nessuna rotta configurata." : undefined} />
      <section className="grid gap-4 xl:grid-cols-2">
        {routes.map((route) => (
          <article key={route.id} className="admin-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 truncate text-lg font-bold text-white">
                  <Route size={18} className="text-[#22bdf3]" /> {route.name}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {route.protocol} · {route.username || "utente"}@{route.host || "host non impostato"}{route.port ? `:${route.port}` : ""}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${route.enabled ? "border-emerald-400/40 text-emerald-300" : "border-[#31445a] text-slate-400"}`}>
                <CheckCircle2 size={13} /> {route.enabled ? "Attiva" : "Disattiva"}
              </span>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
              <Meta label="Auth" value={route.authMode ?? "NONE"} />
              <Meta label="Secret" value={route.hasSecret ? "configurato" : "non configurato"} />
              <Meta label="Percorso remoto" value={route.remotePath || "—"} />
              <Meta label="Import path Loading" value={route.importPath} />
              <Meta label="Note" value={route.notes || "—"} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="admin-secondary-button text-xs" onClick={() => setEditing(route)}>
                <Pencil size={15} /> Modifica
              </button>
              <button type="button" className="admin-secondary-button text-xs text-red-300" onClick={() => void remove(route)}>
                <Trash2 size={15} /> Elimina
              </button>
            </div>
          </article>
        ))}
      </section>
      {editing !== undefined ? (
        <RouteEditor
          route={editing}
          onClose={() => setEditing(undefined)}
          onSave={async (input) => {
            try {
              await saveRouteConfig(input, editing?.id);
              onNotify(editing ? "Rotta aggiornata" : "Rotta creata");
              setEditing(undefined);
              await load();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Salvataggio rotta non riuscito");
            }
          }}
        />
      ) : null}
    </div>
  );
}

function RouteEditor({
  route,
  onClose,
  onSave,
}: {
  route: RouteConfig | null;
  onClose: () => void;
  onSave: (input: RouteConfigInput) => void;
}) {
  const [form, setForm] = useState<RouteConfigInput>(route ? {
    name: route.name,
    protocol: route.protocol,
    connectionUrl: "",
    host: route.host ?? "",
    port: route.port,
    username: route.username ?? "",
    authMode: route.authMode ?? "KEY",
    passwordSecret: "",
    remotePath: route.remotePath ?? "",
    importPath: route.importPath,
    enabled: route.enabled,
    notes: route.notes ?? "",
  } : blank);

  function field<K extends keyof RouteConfigInput>(key: K, value: RouteConfigInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      ...form,
      host: form.host || null,
      port: form.port ? Number(form.port) : null,
      username: form.username || null,
      authMode: form.authMode || "NONE",
      passwordSecret: form.passwordSecret || null,
      connectionUrl: form.connectionUrl || undefined,
      remotePath: form.remotePath || null,
      importPath: form.importPath || form.remotePath || ".",
      notes: form.notes || null,
    });
  }

  return (
    <AdminModal title={route ? "Modifica rotta" : "Nuova rotta"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Nome pulsante" value={form.name} onChange={(value) => field("name", value)} required />
          <Input
            label="URL connessione FTP"
            value={form.connectionUrl ?? ""}
            onChange={(value) => field("connectionUrl", value)}
            placeholder="ftp://utente:password@host/percorso/"
          />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">Protocollo</span>
            <select value={form.protocol} onChange={(event) => field("protocol", event.target.value as RouteConfigInput["protocol"])} className="h-11 w-full rounded-lg border border-[#26394d] bg-[#071321] px-3 text-sm text-white outline-none focus:border-[#22bdf3]">
              {["FTP", "SFTP", "SSH", "RSYNC", "SSHFS", "LOCAL", "SMB", "NFS"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <Input label="Host/IP" value={form.host ?? ""} onChange={(value) => field("host", value)} />
          <Input label="Porta" value={form.port ? String(form.port) : ""} onChange={(value) => field("port", value ? Number(value) : null)} />
          <Input label="Utente" value={form.username ?? ""} onChange={(value) => field("username", value)} />
          <Input
            label={route?.hasSecret ? "Password/secret (lascia vuoto per non cambiare)" : "Password/secret"}
            value={form.passwordSecret ?? ""}
            onChange={(value) => field("passwordSecret", value)}
            type="password"
          />
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-400">Autenticazione</span>
            <select value={form.authMode ?? "KEY"} onChange={(event) => field("authMode", event.target.value as RouteConfigInput["authMode"])} className="h-11 w-full rounded-lg border border-[#26394d] bg-[#071321] px-3 text-sm text-white outline-none focus:border-[#22bdf3]">
              {["KEY", "PASSWORD", "AGENT", "MOUNT", "NONE"].map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <Input label="Percorso remoto" value={form.remotePath ?? ""} onChange={(value) => field("remotePath", value)} placeholder="/public_html" />
          <Input label="Import path Loading" value={form.importPath} onChange={(value) => field("importPath", value)} placeholder="per FTP può coincidere col percorso remoto" />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={form.enabled} onChange={(event) => field("enabled", event.target.checked)} />
          Rotta attiva
        </label>
        <Input label="Note" value={form.notes ?? ""} onChange={(value) => field("notes", value)} />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button>
          <button type="submit" className="admin-primary-button">Salva</button>
        </div>
      </form>
    </AdminModal>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#203248] bg-[#071827] p-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-mono text-slate-200" title={value}>{value}</p>
    </div>
  );
}
