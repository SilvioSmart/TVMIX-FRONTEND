"use client";

import Image from "next/image";
import { Pencil, Plus, Radio, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { adminRequest, type ListResponse, type LiveStream } from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header, Input, SearchBox } from "./ContentSection";

export function LiveSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [data, setData] = useState<LiveStream[]>([]); const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LiveStream | null | undefined>(undefined);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setData((await adminRequest<ListResponse<LiveStream>>(`live-streams${search ? `?search=${encodeURIComponent(search)}` : ""}`)).data); } catch (e) { setError(e instanceof Error ? e.message : "Errore di caricamento"); } finally { setLoading(false); } }, [search]);
  useEffect(() => { void load(); }, [load]);
  async function remove(id: string) { try { await adminRequest(`live-streams/${id}`, { method: "DELETE" }); onNotify("Canale eliminato"); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Eliminazione non riuscita"); } }
  return <div className="space-y-5">
    <Header title="Dirette TV" description="Configura i canali lineari e lo stato degli stream."><button onClick={() => setEditing(null)} className="admin-primary-button"><Plus size={17} /> Nuovo canale</button></Header>
    <SearchBox value={search} onChange={setSearch} placeholder="Cerca canale..." />
    <ResourceState loading={loading} error={error} empty={!data.length ? "Nessun canale live presente." : undefined} />
    {!loading && !error && data.length ? <div className="grid gap-4 lg:grid-cols-2">{data.map((stream) => <section key={stream.id} className="admin-panel overflow-hidden"><div className="relative aspect-video bg-[#04101d]">{stream.posterUrl ? <Image src={stream.posterUrl} alt="" fill sizes="50vw" className="object-cover opacity-75" /> : <div className="grid h-full place-items-center text-[#22bdf3]"><Radio size={42} /></div>}<span className={`absolute right-3 top-3 rounded px-2 py-1 text-[10px] font-bold ${stream.status === "LIVE" ? "bg-red-600" : "bg-slate-700"}`}>{stream.status}</span></div><div className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><h3 className="font-semibold">{stream.name}</h3><p className="truncate text-xs text-slate-500">{stream.hlsUrl}</p></div><div className="flex"><button aria-label={`Modifica ${stream.name}`} onClick={() => setEditing(stream)} className="admin-icon-button"><Pencil size={17} /></button><ConfirmButton label={`Elimina ${stream.name}`} onConfirm={() => void remove(stream.id)} className="admin-icon-button hover:text-red-400"><Trash2 size={17} /></ConfirmButton></div></div></section>)}</div> : null}
    {editing !== undefined ? <LiveEditor stream={editing} onClose={() => setEditing(undefined)} onSave={async (body) => { try { await adminRequest(editing ? `live-streams/${editing.id}` : "live-streams", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) }); setEditing(undefined); onNotify(editing ? "Canale aggiornato" : "Canale creato"); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Salvataggio non riuscito"); } }} /> : null}
  </div>;
}
function LiveEditor({ stream, onClose, onSave }: { stream: LiveStream | null; onClose: () => void; onSave: (body: object) => Promise<void> }) {
  const [name, setName] = useState(stream?.name ?? ""); const [slug, setSlug] = useState(stream?.slug ?? ""); const [hlsUrl, setHlsUrl] = useState(stream?.hlsUrl ?? ""); const [posterUrl, setPosterUrl] = useState(stream?.posterUrl ?? ""); const [status, setStatus] = useState(stream?.status ?? "OFFLINE");
  return <AdminModal title={stream ? "Modifica canale" : "Nuovo canale"} onClose={onClose}><form onSubmit={(e: FormEvent) => { e.preventDefault(); void onSave({ name, slug, hlsUrl, posterUrl: posterUrl || null, status }); }} className="grid gap-4 sm:grid-cols-2"><Input label="Nome" value={name} onChange={setName} required /><Input label="Slug" value={slug} onChange={setSlug} required /><div className="sm:col-span-2"><Input label="URL HLS" type="url" value={hlsUrl} onChange={setHlsUrl} required /></div><div className="sm:col-span-2"><Input label="URL copertina" type="url" value={posterUrl} onChange={setPosterUrl} /></div><label><span className="admin-label">Stato</span><select value={status} onChange={(e) => setStatus(e.target.value as LiveStream["status"])} className="admin-input mt-2"><option>OFFLINE</option><option>SCHEDULED</option><option>LIVE</option></select></label><div className="flex items-end justify-end gap-2"><button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button><button className="admin-primary-button">Salva</button></div></form></AdminModal>;
}
