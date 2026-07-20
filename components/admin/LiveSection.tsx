"use client";

import {
  CalendarClock,
  Clock,
  GripVertical,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Save,
  ListVideo,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { type DragEvent, type FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "../VideoPlayer";
import {
  adminRequest,
  type Category,
  type ListResponse,
  type LiveEpgItem,
  type LiveStream,
  type Video,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header, Input, SearchBox } from "./ContentSection";

const isoLocal = (value: Date) => {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const durationMinutes = (item: Pick<LiveEpgItem, "startsAt" | "endsAt">) =>
  Math.max(1, Math.round((new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()) / 60000));

const dayStart = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const minutesFromDayStart = (date: Date, start = dayStart(date)) =>
  Math.max(0, Math.round((date.getTime() - start.getTime()) / 60000));

const dateAtMinute = (start: Date, minute: number) =>
  new Date(start.getTime() + Math.max(0, Math.min(1440, minute)) * 60000);

const clipDurationMinutes = (item: LiveEpgItem) =>
  Math.max(1, Math.ceil((item.video?.duration ?? durationMinutes(item) * 60) / 60));

const videoDurationMinutes = (video: Video) =>
  Math.max(1, Math.ceil((video.duration ?? 1800) / 60));

const formatMinuteOfDay = (minute: number) =>
  `${String(Math.floor(Math.max(0, minute) / 60)).padStart(2, "0")}:${String(Math.max(0, minute) % 60).padStart(2, "0")}`;

const streamTypeLabels: Record<LiveStream["streamType"], string> = {
  LIVE_STREAMING: "Live streaming",
  PLAYLIST: "Playlist",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function playlistHlsUrl(slug: string) {
  return `https://api.tvmix.it/api/v1/playlists/${slug || "playlist"}/master.m3u8`;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

const emptyEpgForm = (stream: LiveStream) => {
  const starts = new Date();
  starts.setMinutes(Math.ceil(starts.getMinutes() / 15) * 15, 0, 0);
  const ends = new Date(starts.getTime() + 30 * 60000);
  return {
    id: "",
    videoId: "",
    title: "",
    description: "",
    startsAt: isoLocal(starts),
    endsAt: isoLocal(ends),
    thumbnailUrl: stream.posterUrl ?? "",
  };
};

type EpgForm = ReturnType<typeof emptyEpgForm>;
type LiveMode = LiveStream["streamType"];

export function LiveSection({
  activeMode,
  onModeChange,
  onNotify,
}: {
  activeMode: LiveMode;
  onModeChange: (mode: LiveMode) => void;
  onNotify: (message: string) => void;
}) {
  const [data, setData] = useState<LiveStream[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<LiveStream | null | undefined>(undefined);
  const [epgStream, setEpgStream] = useState<LiveStream | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminRequest<ListResponse<LiveStream>>(
        `live-streams${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      );
      setData(response.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    try {
      await adminRequest(`live-streams/${id}`, { method: "DELETE" });
      onNotify("Canale eliminato");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Eliminazione non riuscita");
    }
  }

  return (
    <div className="space-y-5">
      <Header title="Dirette TV" description="Configura i canali lineari, verifica lo streaming e componi la guida EPG.">
        <button onClick={() => setEditing(null)} className="admin-primary-button">
          <Plus size={17} /> {activeMode === "PLAYLIST" ? "Nuova playlist" : "Nuovo canale"}
        </button>
      </Header>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#203248] bg-[#071321] p-2">
        {(["LIVE_STREAMING", "PLAYLIST"] as LiveMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={[
              "rounded-lg px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition",
              activeMode === mode ? "bg-[#16b9f4] text-black" : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
            ].join(" ")}
          >
            {mode === "PLAYLIST" ? "PLAYLIST" : "LIVE STREAM"}
          </button>
        ))}
      </div>

      <SearchBox value={search} onChange={setSearch} placeholder="Cerca canale..." />
      <ResourceState loading={loading} error={error} empty={!data.length ? "Nessun canale live presente." : undefined} />

      {!loading && !error && data.filter((stream) => (stream.streamType ?? "LIVE_STREAMING") === activeMode).length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.filter((stream) => (stream.streamType ?? "LIVE_STREAMING") === activeMode).map((stream) => (
            <LiveStreamCard
              key={stream.id}
              stream={stream}
              onEdit={() => setEditing(stream)}
              onEpg={() => setEpgStream(stream)}
              onRemove={() => void remove(stream.id)}
            />
          ))}
        </div>
      ) : !loading && !error ? (
        <p className="rounded-xl border border-dashed border-[#31445a] p-5 text-sm text-slate-400">
          Nessun elemento nella sezione {activeMode === "PLAYLIST" ? "Playlist" : "Live Stream"}.
        </p>
      ) : null}

      {editing !== undefined ? (
        <LiveEditor
          stream={editing}
          streamType={editing?.streamType ?? activeMode}
          onClose={() => setEditing(undefined)}
          onSave={async (body) => {
            try {
              await adminRequest(editing ? `live-streams/${editing.id}` : "live-streams", {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify(body),
              });
              setEditing(undefined);
              onNotify(editing ? "Canale aggiornato" : "Canale creato");
              await load();
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Salvataggio non riuscito");
            }
          }}
        />
      ) : null}

      {epgStream ? (
        <EpgEditor stream={epgStream} onClose={() => setEpgStream(null)} onNotify={onNotify} />
      ) : null}
    </div>
  );
}

function LiveStreamCard({
  stream,
  onEdit,
  onEpg,
  onRemove,
}: {
  stream: LiveStream;
  onEdit: () => void;
  onEpg: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="admin-panel overflow-hidden">
      <div className="grid gap-4 p-4 md:grid-cols-[240px_1fr]">
        <div className="relative">
          <VideoPlayer
            src={stream.hlsUrl}
            poster={stream.posterUrl ?? undefined}
            title={stream.name}
            className="rounded-xl border border-[#203248] shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
          />
          <span
            className={[
              "absolute right-2 top-2 rounded px-2 py-1 text-[10px] font-bold shadow-lg",
              stream.status === "LIVE" ? "bg-red-600 text-white" : "bg-slate-700 text-slate-100",
            ].join(" ")}
          >
            {stream.status}
          </span>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
                <Radio size={18} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{stream.name}</h3>
                <p className="truncate text-xs text-slate-500">
                  {streamTypeLabels[stream.streamType ?? "LIVE_STREAMING"]} · {stream.hlsUrl}
                </p>
              </div>
            </div>
            {stream.posterUrl ? <p className="mt-3 truncate text-xs text-slate-500">Copertina: {stream.posterUrl}</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEpg} className="admin-secondary-button">
              <CalendarClock size={16} /> {stream.streamType === "PLAYLIST" ? "MEDIALIST" : "Guida EPG"}
            </button>
            <button aria-label={`Modifica ${stream.name}`} onClick={onEdit} className="admin-icon-button">
              <Pencil size={17} />
            </button>
            <ConfirmButton label={`Elimina ${stream.name}`} onConfirm={onRemove} className="admin-icon-button hover:text-red-400">
              <Trash2 size={17} />
            </ConfirmButton>
          </div>
        </div>
      </div>
      <InlineEpgRail stream={stream} onOpenEditor={onEpg} />
    </section>
  );
}

function LiveEditor({
  stream,
  streamType,
  onClose,
  onSave,
}: {
  stream: LiveStream | null;
  streamType: LiveMode;
  onClose: () => void;
  onSave: (body: object) => Promise<void>;
}) {
  const [name, setName] = useState(stream?.name ?? "");
  const [slug, setSlug] = useState(stream?.slug ?? "");
  const [hlsUrl, setHlsUrl] = useState(stream?.hlsUrl ?? (streamType === "PLAYLIST" ? playlistHlsUrl("") : ""));
  const [posterUrl, setPosterUrl] = useState(stream?.posterUrl ?? "");
  const [status, setStatus] = useState(stream?.status ?? "OFFLINE");
  const generatedSlug = slugify(name);
  const effectiveSlug = streamType === "PLAYLIST" ? generatedSlug : slug;

  return (
    <AdminModal title={stream ? "Modifica canale" : "Nuovo canale"} onClose={onClose}>
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          void onSave({
            name,
            slug: effectiveSlug,
            streamType,
            hlsUrl: streamType === "PLAYLIST" ? playlistHlsUrl(effectiveSlug) : hlsUrl,
            posterUrl: posterUrl || null,
            status,
          });
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Input label={streamType === "PLAYLIST" ? "Nome playlist" : "Nome"} value={name} onChange={setName} required />
        {streamType === "PLAYLIST" ? (
          <div className="rounded-lg border border-[#203248] bg-[#071321] px-3.5 py-3">
            <span className="admin-label">Slug generato</span>
            <p className="mt-1 break-all font-mono text-sm text-[#22bdf3]">{generatedSlug || "inserisci-il-nome"}</p>
          </div>
        ) : (
          <Input label="Slug" value={slug} onChange={setSlug} required />
        )}
        <div className="rounded-lg border border-[#203248] bg-[#071321] px-3.5 py-3">
          <span className="admin-label">Tipo canale</span>
          <p className="mt-1 text-sm font-semibold text-white">{streamTypeLabels[streamType]}</p>
        </div>
        <label>
          <span className="admin-label">Stato</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as LiveStream["status"])} className="admin-input mt-2">
            <option>OFFLINE</option>
            <option>SCHEDULED</option>
            <option>LIVE</option>
          </select>
        </label>
        {streamType === "LIVE_STREAMING" ? (
          <div className="sm:col-span-2">
            <Input label="URL HLS" type="url" value={hlsUrl} onChange={setHlsUrl} required />
          </div>
        ) : (
          <div className="sm:col-span-2 rounded-lg border border-[#203248] bg-[#071321] px-3.5 py-3">
            <span className="admin-label">Output playlist sincronizzato</span>
            <p className="mt-1 break-all font-mono text-xs text-slate-400">{playlistHlsUrl(effectiveSlug)}</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <Input label="URL copertina" type="url" value={posterUrl} onChange={setPosterUrl} />
        </div>
        <div className="flex items-end justify-end gap-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">
            Annulla
          </button>
          <button className="admin-primary-button">Salva</button>
        </div>
      </form>
    </AdminModal>
  );
}

function InlineEpgRail({ stream, onOpenEditor }: { stream: LiveStream; onOpenEditor: () => void }) {
  const [items, setItems] = useState<LiveEpgItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminRequest<ListResponse<LiveEpgItem>>(
        `epg?liveStreamId=${stream.id}&limit=12`,
      );
      setItems(
        [...response.data].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      );
    } finally {
      setLoading(false);
    }
  }, [stream.id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="border-t border-[#203248] bg-[#06111d]/80 px-4 py-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          <ListVideo size={15} className="text-[#22bdf3]" />
          {stream.streamType === "PLAYLIST" ? "MEDIALIST" : "Programmi EPG"}
        </div>
        <button type="button" onClick={onOpenEditor} className="text-xs font-bold text-[#22bdf3] hover:text-white">
          Gestisci
        </button>
      </div>

      {loading ? <p className="text-xs text-slate-500">Caricamento programmi...</p> : null}
      {!loading && !items.length ? (
        <button
          type="button"
          onClick={onOpenEditor}
          className="w-full rounded-lg border border-dashed border-[#31445a] px-3 py-4 text-left text-xs text-slate-500 hover:border-[#22bdf3]/60 hover:text-slate-300"
        >
          Nessun programma configurato. Apri la gestione per comporre {stream.streamType === "PLAYLIST" ? "la MEDIALIST" : "la guida"}.
        </button>
      ) : null}
      {!loading && items.length ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={onOpenEditor}
              className="min-w-[220px] rounded-xl border border-[#203248] bg-[#071321] p-3 text-left transition hover:border-[#22bdf3]/60"
            >
              <p className="truncate text-sm font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#22bdf3]">
                {formatDateTime(item.startsAt)} · {durationMinutes(item)} min
              </p>
              {item.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.description}</p> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EpgEditor({
  stream,
  onClose,
  onNotify,
}: {
  stream: LiveStream;
  onClose: () => void;
  onNotify: (message: string) => void;
}) {
  const [items, setItems] = useState<LiveEpgItem[]>([]);
  const [form, setForm] = useState<EpgForm>(() => emptyEpgForm(stream));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminRequest<ListResponse<LiveEpgItem>>(
        `epg?liveStreamId=${stream.id}&limit=100`,
      );
      setItems(
        [...response.data].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Caricamento EPG non riuscito");
    } finally {
      setLoading(false);
    }
  }, [stream.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function editItem(item: LiveEpgItem) {
    setForm({
      id: item.id,
      videoId: item.videoId ?? "",
      title: item.title,
      description: item.description ?? "",
      startsAt: isoLocal(new Date(item.startsAt)),
      endsAt: isoLocal(new Date(item.endsAt)),
      thumbnailUrl: item.thumbnailUrl ?? stream.posterUrl ?? "",
    });
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      liveStreamId: stream.id,
      videoId: form.videoId || null,
      title: form.title,
      description: form.description || null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      thumbnailUrl: form.thumbnailUrl || null,
    };
    try {
      await adminRequest(form.id ? `epg/${form.id}` : "epg", {
        method: form.id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setForm(emptyEpgForm(stream));
      onNotify(form.id ? "Evento EPG aggiornato" : "Evento EPG creato");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Salvataggio EPG non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(file: File) {
    setSaving(true);
    setError(null);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      if (!lines.length) throw new Error("CSV vuoto");
      const first = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
      const hasHeader = first.includes("title") || first.includes("titolo");
      const rows = hasHeader ? lines.slice(1) : lines;
      const header = hasHeader ? first : ["title", "description", "startsat", "endsat", "thumbnailurl"];
      let created = 0;
      for (const row of rows) {
        const columns = parseCsvLine(row);
        const get = (...keys: string[]) => {
          const index = header.findIndex((name) => keys.includes(name));
          return index >= 0 ? columns[index] : "";
        };
        const title = get("title", "titolo");
        const startsAt = get("startsat", "inizio", "start");
        const endsAt = get("endsat", "fine", "end");
        if (!title || !startsAt || !endsAt) continue;
        await adminRequest("epg", {
          method: "POST",
          body: JSON.stringify({
            liveStreamId: stream.id,
            videoId: null,
            title,
            description: get("description", "descrizione") || null,
            startsAt: new Date(startsAt).toISOString(),
            endsAt: new Date(endsAt).toISOString(),
            thumbnailUrl: get("thumbnailurl", "thumbnail", "copertina") || null,
          }),
        });
        created += 1;
      }
      onNotify(`Import CSV completato: ${created} programmi`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Import CSV non riuscito");
    } finally {
      setSaving(false);
    }
  }

  function validatePlaylistSlot(starts: Date, ends: Date, ignoreId?: string) {
    const base = dayStart(starts);
    const dayEnd = new Date(base.getTime() + 1440 * 60000);
    if (starts < base || ends > dayEnd) {
      throw new Error("Il media deve rimanere dentro la timeline giornaliera 00:00-24:00");
    }
    const collision = items.find((item) => {
      if (item.id === ignoreId) return false;
      const itemStart = new Date(item.startsAt);
      const itemEnd = new Date(item.endsAt);
      return starts < itemEnd && ends > itemStart;
    });
    if (collision) {
      throw new Error(`Sovrapposizione non consentita con "${collision.title}"`);
    }
  }

  async function placeVideoOnPlaylist(video: Video, startsAt: Date) {
    const starts = new Date(startsAt);
    starts.setSeconds(0, 0);
    const minutes = videoDurationMinutes(video);
    const ends = new Date(starts.getTime() + minutes * 60000);
    try {
      validatePlaylistSlot(starts, ends);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Posizione non valida");
      return;
    }
    setError(null);
    try {
      await adminRequest("epg", {
        method: "POST",
        body: JSON.stringify({
          liveStreamId: stream.id,
          videoId: video.id,
          title: video.title,
          description: video.description ?? null,
          startsAt: starts.toISOString(),
          endsAt: ends.toISOString(),
          thumbnailUrl: video.thumbnailUrl ?? null,
        }),
      });
      onNotify(`Clip posizionata in MEDIALIST alle ${formatMinuteOfDay(minutesFromDayStart(starts))}`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Inserimento media non riuscito");
    }
  }

  async function movePlaylistItem(item: LiveEpgItem, startsAt: Date) {
    const starts = new Date(startsAt);
    starts.setSeconds(0, 0);
    const minutes = clipDurationMinutes(item);
    const ends = new Date(starts.getTime() + minutes * 60000);
    try {
      validatePlaylistSlot(starts, ends, item.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Spostamento non valido");
      return;
    }
    setError(null);
    try {
      await adminRequest(`epg/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          startsAt: starts.toISOString(),
          endsAt: ends.toISOString(),
        }),
      });
      onNotify(`Media riposizionato alle ${formatMinuteOfDay(minutesFromDayStart(starts))}`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Spostamento media non riuscito");
    }
  }

  async function removeItem(item: LiveEpgItem) {
    await adminRequest(`epg/${item.id}`, { method: "DELETE" });
    onNotify("Evento EPG eliminato");
    await load();
  }

  function dropOn(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const current = items;
    const from = current.findIndex((item) => item.id === draggingId);
    const to = current.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setDraggingId(null);
  }

  async function saveDragOrder() {
    if (!items.length) return;
    setSaving(true);
    setError(null);
    try {
      let cursor = new Date(items[0].startsAt).getTime();
      await Promise.all(
        items.map((item) => {
          const minutes = durationMinutes(item);
          const startsAt = new Date(cursor);
          const endsAt = new Date(cursor + minutes * 60000);
          cursor = endsAt.getTime();
          return adminRequest(`epg/${item.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
            }),
          });
        }),
      );
      onNotify(stream.streamType === "PLAYLIST" ? "Ordine MEDIALIST salvato" : "Ordine guida EPG salvato");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Riordino EPG non riuscito");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminModal title={`${stream.streamType === "PLAYLIST" ? "MEDIALIST" : "Guida EPG"} · ${stream.name}`} onClose={onClose} size={stream.streamType === "PLAYLIST" ? "fullscreen" : "default"}>
      <div className={`grid gap-5 overflow-y-auto ${stream.streamType === "PLAYLIST" ? "max-h-[calc(100svh-8.5rem)] xl:grid-cols-[420px_1fr]" : "max-h-[78vh] xl:grid-cols-[360px_1fr]"}`}>
        {stream.streamType === "LIVE_STREAMING" || form.id ? (
        <form onSubmit={saveItem} className="space-y-4 rounded-xl border border-[#203248] bg-[#071321]/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="admin-section-title">{form.id ? (stream.streamType === "PLAYLIST" ? "Modifica media" : "Modifica programma") : "Nuovo programma EPG"}</h3>
            {form.id ? (
              <button type="button" className="admin-icon-button" onClick={() => setForm(emptyEpgForm(stream))}>
                <X size={16} />
              </button>
            ) : null}
          </div>
          <Input label="Titolo" value={form.title} onChange={(value) => setForm({ ...form, title: value })} required />
          <label>
            <span className="admin-label">Descrizione</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="admin-input mt-2 h-24 py-3"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Inizio" type="datetime-local" value={form.startsAt} onChange={(value) => setForm({ ...form, startsAt: value })} required />
            <Input label="Fine" type="datetime-local" value={form.endsAt} onChange={(value) => setForm({ ...form, endsAt: value })} required />
          </div>
          <Input label="Thumbnail programma" type="url" value={form.thumbnailUrl} onChange={(value) => setForm({ ...form, thumbnailUrl: value })} />
          {error ? <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          <button className="admin-primary-button w-full justify-center" disabled={saving}>
            <Save size={16} /> {saving ? "Salvataggio..." : form.id ? "Salva modifiche" : "Aggiungi alla guida"}
          </button>
          {stream.streamType === "LIVE_STREAMING" ? (
            <label className="admin-secondary-button w-full cursor-pointer justify-center">
              <Upload size={16} /> Importa CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importCsv(file);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          ) : null}
        </form>
        ) : null}

        <section className={`rounded-xl border border-[#203248] bg-[#071321]/70 ${stream.streamType === "PLAYLIST" && !form.id ? "xl:col-span-2" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#203248] p-4">
            <div>
              <h3 className="admin-section-title">{stream.streamType === "PLAYLIST" ? "Timeline MEDIALIST 24 ore" : "Timeline programmi"}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {stream.streamType === "PLAYLIST"
                  ? "Trascina le clip dell'archivio sulla timeline: verranno incollate in sequenza usando la durata reale del media."
                  : "Trascina le righe per cambiare ordine; il salvataggio ricrea la sequenza oraria mantenendo le durate."}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="admin-secondary-button" onClick={load}>
                <RefreshCw size={15} /> Aggiorna
              </button>
              {stream.streamType !== "PLAYLIST" ? (
                <button type="button" className="admin-primary-button" onClick={saveDragOrder} disabled={saving || items.length < 2}>
                  <Save size={15} /> Salva ordine
                </button>
              ) : null}
            </div>
          </div>

          {error ? <p className="mx-4 mt-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}
          {loading ? <p className="p-4 text-sm text-slate-400">Caricamento guida...</p> : null}
          {!loading && stream.streamType === "PLAYLIST" ? (
            <PlaylistTimeline
              items={items}
              draggingId={draggingId}
              onDragItem={setDraggingId}
              onDropVideo={placeVideoOnPlaylist}
              onMoveItem={movePlaylistItem}
              onEdit={editItem}
              onRemove={removeItem}
            />
          ) : null}
          {!loading && stream.streamType !== "PLAYLIST" && !items.length ? <p className="p-4 text-sm text-slate-400">Nessun programma EPG per questo canale.</p> : null}
          {!loading && stream.streamType !== "PLAYLIST" && items.length ? (
            <div className="divide-y divide-[#203248]">
              {items.map((item) => (
                <article
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggingId(item.id)}
                  onDragOver={(event: DragEvent) => event.preventDefault()}
                  onDrop={() => dropOn(item.id)}
                  className={[
                    "grid cursor-grab gap-3 p-4 transition hover:bg-white/[0.03] md:grid-cols-[auto_120px_1fr_auto]",
                    draggingId === item.id ? "bg-[#16b9f4]/10 opacity-70" : "",
                  ].join(" ")}
                >
                  <span className="mt-1 text-slate-500"><GripVertical size={18} /></span>
                  <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#22bdf3]">
                    <p>{formatDateTime(item.startsAt)}</p>
                    <p className="mt-1 text-slate-500">{durationMinutes(item)} min</p>
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate font-semibold">{item.title}</h4>
                    {item.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-400">{item.description}</p> : null}
                    <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={13} /> {formatDateTime(item.startsAt)} — {formatDateTime(item.endsAt)}
                    </p>
                  </div>
                  <div className="flex items-start justify-end gap-2">
                    <button type="button" className="admin-icon-button" onClick={() => editItem(item)}>
                      <Pencil size={16} />
                    </button>
                    <ConfirmButton label={`Elimina ${item.title}`} onConfirm={() => void removeItem(item)} className="admin-icon-button hover:text-red-400">
                      <Trash2 size={16} />
                    </ConfirmButton>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
        {stream.streamType === "PLAYLIST" ? (
          <ArchiveClipPicker />
        ) : null}
      </div>
    </AdminModal>
  );
}

function PlaylistTimeline({
  items,
  draggingId,
  onDragItem,
  onDropVideo,
  onMoveItem,
  onEdit,
  onRemove,
}: {
  items: LiveEpgItem[];
  draggingId: string | null;
  onDragItem: (id: string | null) => void;
  onDropVideo: (video: Video, startsAt: Date) => Promise<void>;
  onMoveItem: (item: LiveEpgItem, startsAt: Date) => Promise<void>;
  onEdit: (item: LiveEpgItem) => void;
  onRemove: (item: LiveEpgItem) => Promise<void>;
}) {
  const [dropActive, setDropActive] = useState(false);
  const [playheadMinute, setPlayheadMinute] = useState(() => minutesFromDayStart(new Date()));
  const [playingTimeline, setPlayingTimeline] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const pixelsPerMinute = 6;
  const timelineWidth = 1440 * pixelsPerMinute;
  const sortedItems = useMemo(
    () => [...items].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [items],
  );
  const start = dayStart(items[0] ? new Date(items[0].startsAt) : new Date());
  const hourMarks = Array.from({ length: 25 }, (_, index) => index);
  const activeItem = sortedItems.find((item) => {
    const itemStart = minutesFromDayStart(new Date(item.startsAt), start);
    const itemEnd = minutesFromDayStart(new Date(item.endsAt), start);
    return playheadMinute >= itemStart && playheadMinute < itemEnd;
  }) ?? null;
  const activeItemStartMinute = activeItem ? minutesFromDayStart(new Date(activeItem.startsAt), start) : 0;
  const activeSeekSeconds = activeItem ? Math.max(0, (playheadMinute - activeItemStartMinute) * 60) : undefined;

  useEffect(() => {
    if (!playingTimeline) return;
    const timer = window.setInterval(() => {
      setPlayheadMinute((minute) => (minute + 1) % 1440);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playingTimeline]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const playheadX = playheadMinute * pixelsPerMinute;
    const target = Math.max(0, playheadX - timeline.clientWidth / 2);
    timeline.scrollTo({ left: target, behavior: "smooth" });
  }, [playheadMinute]);

  function minuteFromPointer(event: DragEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left + event.currentTarget.scrollLeft, 0), timelineWidth);
    return Math.max(0, Math.min(1439, Math.round(x / pixelsPerMinute)));
  }

  function startsAtFromPointer(event: DragEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) {
    return dateAtMinute(start, minuteFromPointer(event));
  }

  function dropVideo(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropActive(false);
    const itemId = event.dataTransfer.getData("application/x-tvmix-epg-item");
    if (itemId) {
      const item = sortedItems.find((candidate) => candidate.id === itemId);
      if (item) void onMoveItem(item, startsAtFromPointer(event));
      onDragItem(null);
      return;
    }
    const raw = event.dataTransfer.getData("application/x-tvmix-video-json");
    if (!raw) return;
    try {
      void onDropVideo(JSON.parse(raw) as Video, startsAtFromPointer(event));
    } catch {
      return;
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <div className="overflow-hidden rounded-xl border border-[#203248] bg-[#020a13]">
          {activeItem?.video?.hlsUrl ? (
            <VideoPlayer
              key={`${activeItem.id}-${activeItem.video.hlsUrl}`}
              src={activeItem.video.hlsUrl}
              poster={activeItem.thumbnailUrl ?? activeItem.video.thumbnailUrl ?? undefined}
              title={activeItem.title}
              autoPlay={playingTimeline}
              seekTo={activeSeekSeconds}
              seekKey={`${activeItem.id}-${playheadMinute}`}
              className="rounded-none"
            />
          ) : (
            <div className="grid aspect-video place-items-center bg-black text-center text-sm text-slate-500">
              <div>
                <p className="font-semibold text-slate-300">Nessun media in play</p>
                <p className="mt-1 text-xs">Sposta il playhead su un clip della MEDIALIST.</p>
              </div>
            </div>
          )}
          <div className="border-t border-[#203248] p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#22bdf3]">
              Playhead {formatMinuteOfDay(playheadMinute)}
            </p>
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">{activeItem?.title ?? "Timeline vuota in questo punto"}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#203248] bg-[#06111d] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-white">Controllo timeline</h4>
              <p className="mt-1 text-xs text-slate-500">
                La barra evidenziatrice indica l'orario usato come input del player. L'anteprima scorre a 1 minuto/sec.
              </p>
            </div>
            <button type="button" onClick={() => setPlayingTimeline((value) => !value)} className="admin-primary-button">
              {playingTimeline ? "Pausa timeline" : "Play timeline"}
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={1439}
            value={playheadMinute}
            onChange={(event) => setPlayheadMinute(Number(event.target.value))}
            className="mt-5 w-full accent-[#22bdf3]"
            aria-label="Posizione playhead MEDIALIST"
          />
          <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-500">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </div>
      <div
        ref={timelineRef}
        onDragOver={(event) => {
          event.preventDefault();
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={dropVideo}
        onClick={(event) => setPlayheadMinute(minuteFromPointer(event))}
        className={[
          "relative overflow-x-auto rounded-xl border bg-[#020a13] p-4",
          dropActive ? "border-[#22bdf3] shadow-[0_0_0_1px_rgba(34,189,243,0.35)]" : "border-[#203248]",
        ].join(" ")}
      >
        <div className="relative h-[300px]" style={{ minWidth: `${timelineWidth}px` }}>
          <div className="absolute inset-x-0 top-0 grid text-[10px] font-bold text-slate-500" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
            {hourMarks.slice(0, 24).map((hour) => (
              <span key={hour} className="border-l border-white/10 pl-1">
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
          <div className="absolute inset-x-0 top-7 h-px bg-white/10" />
          {hourMarks.map((hour) => (
            <span key={hour} className="absolute bottom-0 top-7 w-px bg-white/5" style={{ left: `${(hour / 24) * 100}%` }} />
          ))}
          <div
            className="absolute bottom-0 top-7 z-20 w-0.5 bg-[#ffcc33] shadow-[0_0_18px_rgba(255,204,51,0.75)]"
            style={{ left: `${playheadMinute * pixelsPerMinute}px` }}
          >
            <span className="absolute -left-8 -top-6 rounded bg-[#ffcc33] px-2 py-0.5 text-[10px] font-black text-black">
              {formatMinuteOfDay(playheadMinute)}
            </span>
          </div>
          {!items.length ? (
            <div className="absolute inset-x-0 top-14 rounded-xl border border-dashed border-[#31445a] px-4 py-12 text-center text-sm text-slate-500">
              Trascina qui una clip dall'archivio e rilasciala sull'orario desiderato. I video non possono sovrapporsi.
            </div>
          ) : null}
          {sortedItems.map((item) => {
            const startMinutes = Math.max(0, (new Date(item.startsAt).getTime() - start.getTime()) / 60000);
            const widthMinutes = Math.min(1440, clipDurationMinutes(item));
            return (
              <article
                key={item.id}
                draggable
                onDragStart={(event) => {
                  onDragItem(item.id);
                  event.dataTransfer.setData("application/x-tvmix-epg-item", item.id);
                }}
                onDragEnd={() => onDragItem(null)}
                onDragOver={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  setPlayheadMinute(minutesFromDayStart(new Date(item.startsAt), start));
                }}
                className={[
                  "absolute top-14 flex h-36 cursor-grab flex-col overflow-hidden rounded-xl border border-[#22bdf3]/30 bg-[#071321] p-3 shadow-xl transition hover:border-[#22bdf3]",
                  activeItem?.id === item.id ? "ring-2 ring-[#ffcc33]/80" : "",
                  draggingId === item.id ? "opacity-60" : "",
                ].join(" ")}
                style={{
                  left: `${startMinutes * pixelsPerMinute}px`,
                  width: `${Math.max(1, widthMinutes) * pixelsPerMinute}px`,
                }}
              >
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#22bdf3]">
                  <GripVertical size={14} />
                  {new Date(item.startsAt).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </div>
                <h4 className="mt-2 line-clamp-2 text-sm font-semibold text-white">{item.title}</h4>
                <p className="mt-auto text-[11px] text-slate-500">{clipDurationMinutes(item)} min</p>
                <div className="mt-2 flex gap-1">
                  <button type="button" className="admin-icon-button size-7" onClick={() => onEdit(item)}>
                    <Pencil size={13} />
                  </button>
                  <ConfirmButton label={`Elimina ${item.title}`} onConfirm={() => void onRemove(item)} className="admin-icon-button size-7 hover:text-red-400">
                    <Trash2 size={13} />
                  </ConfirmButton>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ArchiveClipPicker() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void adminRequest<ListResponse<Category>>("categories?limit=100").then((response) => setCategories(response.data));
  }, []);

  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ limit: "100", published: "true" });
      if (categoryId) query.set("categoryId", categoryId);
      const response = await adminRequest<ListResponse<Video>>(`videos?${query.toString()}`);
      setVideos(response.data.filter((video) => Boolean(video.hlsUrl)));
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  return (
    <section className="rounded-xl border border-[#203248] bg-[#071321]/70 xl:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#203248] p-4">
        <div>
          <h3 className="admin-section-title">Archivio clip per playlist</h3>
          <p className="mt-1 text-xs text-slate-500">Trascina una clip dalla griglia alla timeline 24 ore sopra.</p>
        </div>
        <select className="admin-input max-w-xs" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="">Tutte le categorie</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      {loading ? <p className="px-4 pb-4 text-sm text-slate-500">Caricamento clip...</p> : null}
      {!loading ? (
        <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2 xl:grid-cols-4">
          {videos.map((video) => (
            <article
              key={video.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-tvmix-video", video.id);
                event.dataTransfer.setData("application/x-tvmix-video-json", JSON.stringify(video));
              }}
              className="cursor-grab overflow-hidden rounded-xl border border-[#203248] bg-[#06111d] transition hover:border-[#22bdf3]/60"
            >
              <div className="aspect-video bg-[#020a13]">
                {video.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-sm font-semibold text-white">{video.title}</p>
                <p className="mt-1 text-xs text-slate-500">{video.category?.name ?? "Archivio"} · {Math.ceil((video.duration ?? 0) / 60) || "?"} min</p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
