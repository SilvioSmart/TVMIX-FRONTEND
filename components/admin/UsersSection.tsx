"use client";

import { Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { adminRequest, type ListResponse, type PlatformUser } from "./admin-api";
import { ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header } from "./ContentSection";

export function UsersSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [data, setData] = useState<PlatformUser[]>([]); const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setData((await adminRequest<ListResponse<PlatformUser>>(`users${search ? `?search=${encodeURIComponent(search)}` : ""}`)).data); } catch (e) { setError(e instanceof Error ? e.message : "Errore di caricamento"); } finally { setLoading(false); } }, [search]);
  useEffect(() => { void load(); }, [load]);
  async function role(user: PlatformUser, nextRole: PlatformUser["role"]) { try { await adminRequest(`users/${user.id}`, { method: "PATCH", body: JSON.stringify({ role: nextRole }) }); onNotify(`Ruolo di ${user.email} aggiornato`); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Aggiornamento non riuscito"); } }
  async function remove(id: string) { try { await adminRequest(`users/${id}`, { method: "DELETE" }); onNotify("Utente eliminato"); await load(); } catch (e) { setError(e instanceof Error ? e.message : "Eliminazione non riuscita"); } }
  return <div className="space-y-5"><Header title="Utenti" description="Controlla account e ruoli di accesso alla piattaforma." />
    <label className="admin-panel relative block p-3"><Search size={17} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="admin-input pl-10" placeholder="Cerca nome o email..." /></label>
    <ResourceState loading={loading} error={error} empty={!data.length ? "Nessun utente presente." : undefined} />
    {!loading && !error && data.length ? <section className="admin-panel overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-[#102238] text-[11px] uppercase text-slate-400"><tr><th className="px-5 py-3">Utente</th><th className="px-4 py-3">Ruolo</th><th className="px-4 py-3">Registrato</th><th className="px-5 py-3 text-right">Azioni</th></tr></thead><tbody>{data.map((user) => <tr key={user.id} className="border-t border-[#1b2b3d]"><td className="px-5 py-4"><p className="font-semibold">{user.name ?? "Senza nome"}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="px-4 py-4"><select aria-label={`Ruolo di ${user.email}`} value={user.role} onChange={(e) => void role(user, e.target.value as PlatformUser["role"])} className="h-9 rounded-lg border border-[#31445a] bg-[#06111d] px-3 text-xs"><option>USER</option><option>EDITOR</option><option>ADMIN</option></select></td><td className="px-4 py-4 text-sm text-slate-400">{new Date(user.createdAt).toLocaleDateString("it-IT")}</td><td className="px-5 py-4 text-right"><ConfirmButton label={`Elimina ${user.email}`} onConfirm={() => void remove(user.id)} className="admin-icon-button ml-auto hover:text-red-400"><Trash2 size={17} /></ConfirmButton></td></tr>)}</tbody></table></section> : null}
  </div>;
}
