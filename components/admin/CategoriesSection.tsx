"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { adminRequest, type Category, type ListResponse } from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header, Input, SearchBox } from "./ContentSection";

export function CategoriesSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [data, setData] = useState<Category[]>([]);
  const [search, setSearch] = useState(""); const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); const [editing, setEditing] = useState<Category | null | undefined>(undefined);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData((await adminRequest<ListResponse<Category>>(`categories${search ? `?search=${encodeURIComponent(search)}` : ""}`)).data); }
    catch (e) { setError(e instanceof Error ? e.message : "Errore di caricamento"); } finally { setLoading(false); }
  }, [search]);
  useEffect(() => { void load(); }, [load]);
  async function remove(id: string) { try { await adminRequest(`categories/${id}`, { method: "DELETE" }); onNotify("Categoria eliminata"); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Eliminazione non riuscita"); } }
  return <div className="space-y-5">
    <Header title="Categorie" description="Organizza il catalogo e controlla i contenuti associati."><button onClick={() => setEditing(null)} className="admin-primary-button"><Plus size={17} /> Nuova categoria</button></Header>
    <SearchBox value={search} onChange={setSearch} placeholder="Cerca categoria..." />
    <ResourceState loading={loading} error={error} empty={!data.length ? "Nessuna categoria presente." : undefined} />
    {!loading && !error && data.length ? <section className="admin-panel overflow-hidden">
      <div className="hidden grid-cols-[1fr_auto_auto] bg-[#102238] px-5 py-3 text-[11px] font-bold uppercase text-slate-400 sm:grid"><span>Categoria</span><span className="w-24">Contenuti</span><span className="w-20 text-right">Azioni</span></div>
      <div className="divide-y divide-[#1b2b3d]">{data.map((item) => <div key={item.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:px-5"><div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="truncate text-xs text-slate-500">{item.slug}</p></div><span className="text-sm text-slate-400 sm:w-24">{item._count?.videos ?? 0} contenuti</span><div className="flex justify-end sm:w-20"><button aria-label={`Modifica ${item.name}`} onClick={() => setEditing(item)} className="admin-icon-button"><Pencil size={16} /></button><ConfirmButton label={`Elimina ${item.name}`} onConfirm={() => void remove(item.id)} className="admin-icon-button hover:text-red-400"><Trash2 size={16} /></ConfirmButton></div></div>)}</div>
    </section> : null}
    {editing !== undefined ? <CategoryEditor category={editing} onClose={() => setEditing(undefined)} onSave={async (body) => { try { await adminRequest(editing ? `categories/${editing.id}` : "categories", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) }); setEditing(undefined); onNotify(editing ? "Categoria aggiornata" : "Categoria creata"); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Salvataggio non riuscito"); } }} /> : null}
  </div>;
}

function CategoryEditor({ category, onClose, onSave }: { category: Category | null; onClose: () => void; onSave: (body: object) => Promise<void> }) {
  const [name, setName] = useState(category?.name ?? ""); const [slug, setSlug] = useState(category?.slug ?? ""); const [description, setDescription] = useState(category?.description ?? "");
  return <AdminModal title={category ? "Modifica categoria" : "Nuova categoria"} onClose={onClose}><form onSubmit={(e: FormEvent) => { e.preventDefault(); void onSave({ name, slug, description: description || null }); }} className="space-y-4"><Input label="Nome" value={name} onChange={setName} required /><Input label="Slug" value={slug} onChange={setSlug} required /><label><span className="admin-label">Descrizione</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} className="admin-input mt-2 h-24 py-3" /></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button><button className="admin-primary-button">Salva</button></div></form></AdminModal>;
}
