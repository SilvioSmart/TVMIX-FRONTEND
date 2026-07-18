"use client";

import Image from "next/image";
import Hls from "hls.js";
import { BadgeDollarSign, Camera, CheckCircle2, FileVideo, Info, Pause, Pencil, Play, PlayCircle, Plus, RotateCcw, RotateCw, Search, Trash2, Upload, X } from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminRequest,
  abortMultipartUpload,
  formatDate,
  listSuspendedUploads,
  refreshMultipartUpload,
  uploadFileToR2,
  type CatalogCategory,
  type CatalogProgram,
  type CatalogSeason,
  type Category,
  type ListResponse,
  type MediaUploadSession,
  type Video,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";

type Props = { onNotify: (message: string) => void };

type VideoForm = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  hlsUrl: string;
  duration: string;
  categoryId: string;
  programId: string;
  seasonId: string;
  episodeNumber: string;
  episodeCode: string;
  published: boolean;
  file: File | null;
};

type BackgroundUpload = {
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "failed";
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

const blank: VideoForm = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  thumbnailUrl: "",
  hlsUrl: "",
  duration: "",
  categoryId: "",
  programId: "",
  seasonId: "",
  episodeNumber: "1",
  episodeCode: "",
  published: false,
  file: null,
};

const processingLabels: Record<Video["processingStatus"], string> = {
  PENDING: "Da caricare",
  UPLOADING: "Upload",
  UPLOADED: "Caricato",
  QUEUED: "In coda HLS",
  PROCESSING: "Conversione",
  READY: "HLS pronto",
  FAILED: "Errore",
};

export function ContentSection({ onNotify }: Props) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalog, setCatalog] = useState<CatalogCategory[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Video | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transcodingId, setTranscodingId] = useState<string | null>(null);
  const [backgroundUploads, setBackgroundUploads] = useState<Record<string, BackgroundUpload>>({});
  const [suspendedUploads, setSuspendedUploads] = useState<MediaUploadSession[]>([]);
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);
  const [infoVideo, setInfoVideo] = useState<Video | null>(null);
  const [vastVideo, setVastVideo] = useState<Video | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const [videoResult, categoryResult, catalogResult, uploadSessions] = await Promise.all([
        adminRequest<ListResponse<Video>>(`videos${query}`),
        adminRequest<ListResponse<Category>>("categories?limit=100"),
        adminRequest<{ data: CatalogCategory[] }>("catalog/tree"),
        listSuspendedUploads().catch(() => []),
      ]);
      setVideos(videoResult.data);
      setCategories(categoryResult.data);
      setCatalog(catalogResult.data);
      setSuspendedUploads(uploadSessions);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(id: string) {
    try {
      await adminRequest(`videos/${id}`, { method: "DELETE" });
      onNotify("Video eliminato");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione non riuscita");
    }
  }

  async function startTranscode(video: Video) {
    setTranscodingId(video.id);
    setError(null);
    try {
      await adminRequest(`videos/${video.id}/transcode`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      onNotify("Conversione HLS avviata");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Avvio conversione non riuscito");
    } finally {
      setTranscodingId(null);
    }
  }

  async function refreshSuspendedUpload(session: MediaUploadSession) {
    try {
      const updated = await refreshMultipartUpload(session.logicalUploadId);
      setSuspendedUploads((current) => current.map((item) => item.id === updated.id ? updated : item));
      onNotify("Stato upload sospeso aggiornato da R2");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ripresa controllo upload non riuscita");
    }
  }

  async function abortSuspendedUpload(session: MediaUploadSession) {
    try {
      await abortMultipartUpload(session);
      onNotify("Tronconi upload cancellati dall'archivio");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Cancellazione tronconi non riuscita");
    }
  }

  function setBackgroundUpload(videoId: string, patch: Partial<BackgroundUpload>) {
    setBackgroundUploads((current) => ({
      ...current,
      [videoId]: {
        fileName: patch.fileName ?? current[videoId]?.fileName ?? "",
        progress: patch.progress ?? current[videoId]?.progress ?? 0,
        status: patch.status ?? current[videoId]?.status ?? "uploading",
      },
    }));
  }

  async function uploadInBackground(videoId: string, file: File) {
    setBackgroundUpload(videoId, { fileName: file.name, progress: 0, status: "uploading" });
    try {
      await adminRequest(`videos/${videoId}`, {
        method: "PATCH",
        body: JSON.stringify({ processingStatus: "UPLOADING", processingError: null }),
      });
      const uploaded = await uploadFileToR2(file, (progress) => {
        setBackgroundUpload(videoId, { progress, status: "uploading" });
      }, videoId, { keepSessionOnFailure: true });
      await adminRequest(`videos/${videoId}`, {
        method: "PATCH",
        body: JSON.stringify({
          sourceObjectKey: uploaded.objectKey,
          originalFileName: uploaded.originalFileName,
          processingStatus: "UPLOADED",
          processingError: null,
        }),
      });
      setBackgroundUpload(videoId, { progress: 100, status: "done" });
      onNotify("Upload completato in background");
      await load();
      window.setTimeout(() => {
        setBackgroundUploads((current) => {
          const next = { ...current };
          delete next[videoId];
          return next;
        });
      }, 3500);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Upload background non riuscito";
      await adminRequest(`videos/${videoId}`, {
        method: "PATCH",
        body: JSON.stringify({ processingStatus: "FAILED", processingError: message }),
      }).catch(() => undefined);
      setBackgroundUpload(videoId, { status: "failed" });
      setError(message);
      await load();
    }
  }

  async function resumeUploadForVideo(video: Video, session: MediaUploadSession, file: File) {
    setBackgroundUpload(video.id, { fileName: file.name, progress: 0, status: "uploading" });
    setError(null);
    try {
      const uploaded = await uploadFileToR2(file, (progress) => {
        setBackgroundUpload(video.id, { progress, status: "uploading" });
      }, video.id, { resumeSession: session, keepSessionOnFailure: true });
      await adminRequest(`videos/${video.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          sourceObjectKey: uploaded.objectKey,
          originalFileName: uploaded.originalFileName,
          processingStatus: "UPLOADED",
          processingError: null,
        }),
      });
      setBackgroundUpload(video.id, { progress: 100, status: "done" });
      onNotify("Caricamento ripreso e completato");
      await load();
      window.setTimeout(() => {
        setBackgroundUploads((current) => {
          const next = { ...current };
          delete next[video.id];
          return next;
        });
      }, 3500);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Ripresa caricamento non riuscita";
      setBackgroundUpload(video.id, { status: "failed" });
      setError(message);
      await load();
    }
  }

  return (
    <div className="space-y-5">
      <Header title="Libreria contenuti" description="Gestisci video, catalogo, upload, conversione HLS e metadati tecnici.">
        <button type="button" onClick={() => setEditing(null)} className="admin-primary-button">
          <Plus size={17} /> Nuovo contenuto
        </button>
      </Header>

      <SearchBox value={search} onChange={setSearch} placeholder="Cerca per titolo, slug o codice episodio..." />
      <ResourceState loading={loading} error={error} empty={!videos.length ? "Nessun contenuto presente." : undefined} />
      <SuspendedUploadsPanel
        sessions={suspendedUploads}
        onRefresh={refreshSuspendedUpload}
        onAbort={abortSuspendedUpload}
      />

      {!loading && !error && videos.length ? (
        <ContentTable
          videos={videos}
          backgroundUploads={backgroundUploads}
          suspendedUploads={suspendedUploads}
          transcodingId={transcodingId}
          onEdit={(video) => setEditing(video)}
          onDelete={(video) => void remove(video.id)}
          onTranscode={(video) => void startTranscode(video)}
          onResumeUpload={(video, session, file) => void resumeUploadForVideo(video, session, file)}
          onOpenPlayer={(video) => setPlayingVideo(video)}
          onInfo={(video) => setInfoVideo(video)}
          onVast={(video) => setVastVideo(video)}
        />
      ) : null}

      {editing !== undefined ? (
        <VideoEditor
          video={editing}
          categories={categories}
          catalog={catalog}
          saving={saving}
          uploadProgress={uploadProgress}
          onClose={() => setEditing(undefined)}
          onSave={async (form) => {
            setSaving(true);
            setUploadProgress(0);
            try {
              const selectedSeason = findSeason(catalog, form.seasonId);
              const body = {
                title: form.title,
                slug: form.slug.replace(/^#/, ""),
                shortDescription: form.shortDescription || null,
                description: form.description || null,
                thumbnailUrl: form.thumbnailUrl || null,
                hlsUrl: form.hlsUrl || null,
                duration: form.duration ? Number(form.duration) : null,
                categoryId: selectedSeason?.program.categoryId ?? form.categoryId,
                seasonId: form.seasonId || null,
                episodeNumber: form.episodeNumber ? Number(form.episodeNumber) : null,
                episodeCode: form.episodeCode || null,
                published: form.published,
                ...(form.file ? { processingStatus: "UPLOADING", processingError: null } : {}),
              };
              const saved = await adminRequest<{ data: Video }>(editing ? `videos/${editing.id}` : "videos", {
                method: editing ? "PATCH" : "POST",
                body: JSON.stringify(body),
              });
              setEditing(undefined);
              onNotify(form.file ? "Contenuto salvato, upload avviato in background" : editing ? "Video aggiornato" : "Video creato");
              await load();
              if (form.file) void uploadInBackground(saved.data.id, form.file);
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Salvataggio non riuscito");
            } finally {
              setSaving(false);
              setUploadProgress(0);
            }
          }}
        />
      ) : null}

      {playingVideo ? (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
          onNotify={onNotify}
          onUpdated={async (updated) => {
            setVideos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
            setPlayingVideo(updated);
            await load();
          }}
        />
      ) : null}

      {infoVideo ? <MediaInfoModal video={infoVideo} onClose={() => setInfoVideo(null)} /> : null}
      {vastVideo ? <VastConfigModal video={vastVideo} onClose={() => setVastVideo(null)} /> : null}
    </div>
  );
}

function SuspendedUploadsPanel({
  sessions,
  onRefresh,
  onAbort,
}: {
  sessions: MediaUploadSession[];
  onRefresh: (session: MediaUploadSession) => void;
  onAbort: (session: MediaUploadSession) => void;
}) {
  if (!sessions.length) return null;

  return (
    <section className="admin-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#203248] px-5 py-4">
        <div>
          <h3 className="admin-section-title">Upload sospesi</h3>
          <p className="mt-1 text-xs text-slate-500">
            Controllo database/R2 per riprendere il caricamento o cancellare i tronconi multipart.
          </p>
        </div>
      </div>
      <div className="divide-y divide-[#203248]">
        {sessions.map((session) => {
          const uploaded = session.uploadedParts.length;
          const progress = Math.round((uploaded / Math.max(session.totalParts, 1)) * 100);
          return (
            <article key={session.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-white">{session.fileName}</p>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-300">
                    sospeso
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-xs text-slate-500">{session.objectKey}</p>
                <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                  <span>{formatBytes(session.size)}</span>
                  <span>{uploaded}/{session.totalParts} parti</span>
                  <span>Aggiornato: {formatDate(session.updatedAt)}</span>
                </div>
                <Progress value={progress} label={`Parti caricate ${progress}%`} />
              </div>
              <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                <button type="button" className="admin-secondary-button" onClick={() => onRefresh(session)}>
                  <RotateCw size={15} /> Riprendi controllo
                </button>
                <ConfirmButton
                  label={`Cancellare i tronconi di ${session.fileName}?`}
                  onConfirm={() => onAbort(session)}
                  className="admin-secondary-button border-red-400/30 text-red-200 hover:bg-red-500/10"
                >
                  <Trash2 size={15} /> Cancella tronconi
                </ConfirmButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ContentTable({
  videos,
  backgroundUploads,
  suspendedUploads,
  transcodingId,
  onEdit,
  onDelete,
  onTranscode,
  onResumeUpload,
  onOpenPlayer,
  onInfo,
  onVast,
}: {
  videos: Video[];
  backgroundUploads: Record<string, BackgroundUpload>;
  suspendedUploads: MediaUploadSession[];
  transcodingId: string | null;
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
  onTranscode: (video: Video) => void;
  onResumeUpload: (video: Video, session: MediaUploadSession, file: File) => void;
  onOpenPlayer: (video: Video) => void;
  onInfo: (video: Video) => void;
  onVast: (video: Video) => void;
}) {
  const suspendedByVideoId = useMemo(
    () => new Map(suspendedUploads.map((session) => [session.logicalUploadId, session])),
    [suspendedUploads],
  );

  return (
    <section className="admin-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full border-collapse text-left text-sm">
          <thead className="bg-[#071827] text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="w-[390px] px-4 py-3 font-semibold">Media</th>
              <th className="px-4 py-3 font-semibold">Qualità / formato / durata</th>
              <th className="px-4 py-3 font-semibold">Tracce audio</th>
              <th className="px-4 py-3 font-semibold">Programma</th>
              <th className="px-4 py-3 font-semibold">Stagione / Serie</th>
              <th className="px-4 py-3 font-semibold">Episodio</th>
              <th className="w-[250px] px-4 py-3 text-right font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b2b3d]">
            {videos.map((video) => (
              <ContentTableRow
                key={video.id}
                video={video}
                backgroundUpload={backgroundUploads[video.id]}
                suspendedUpload={suspendedByVideoId.get(video.id)}
                transcoding={transcodingId === video.id}
                onEdit={() => onEdit(video)}
                onDelete={() => onDelete(video)}
                onTranscode={() => onTranscode(video)}
                onResumeUpload={(session, file) => onResumeUpload(video, session, file)}
                onOpenPlayer={() => onOpenPlayer(video)}
                onInfo={() => onInfo(video)}
                onVast={() => onVast(video)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CatalogDetails({ video, type }: { video: Video; type: "program" | "season" | "episode" }) {
  if (type === "program") {
    return (
      <div className="text-xs">
        <p className="font-semibold text-slate-200">{video.season?.program?.name ?? "â€”"}</p>
        <p className="mt-1 font-mono text-[11px] text-slate-500">{video.season?.programId ?? "â€”"}</p>
      </div>
    );
  }
  if (type === "season") {
    return (
      <div className="text-xs">
        <p className="font-semibold text-slate-200">{video.season?.title || (video.season ? `Stagione ${video.season.number}` : "â€”")}</p>
        <p className="mt-1 font-mono text-[11px] text-slate-500">{video.seasonId ?? "â€”"}</p>
      </div>
    );
  }
  return (
    <div className="text-xs">
      <p className="font-semibold text-slate-200">{video.episodeNumber ? `Episodio ${video.episodeNumber}` : "â€”"}</p>
      <p className="mt-1 font-mono text-[11px] text-slate-500">{video.episodeCode ?? "â€”"}</p>
    </div>
  );
}

function HlsStatePill({ video }: { video: Video }) {
  const state = video.processingStatus === "READY" && Boolean(video.hlsUrl)
    ? "on"
    : ["QUEUED", "PROCESSING"].includes(video.processingStatus)
      ? "queue"
      : "off";
  const className = state === "on"
    ? "border-emerald-400/40 text-emerald-300"
    : state === "queue"
      ? "border-amber-300/40 text-amber-200"
      : "border-[#31445a] text-slate-400";
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      HLS {state === "on" ? "ON" : state === "queue" ? "in coda" : "OFF"}
    </span>
  );
}

function ContentTableRow({
  video,
  backgroundUpload,
  suspendedUpload,
  transcoding,
  onEdit,
  onDelete,
  onTranscode,
  onResumeUpload,
  onOpenPlayer,
  onInfo,
  onVast,
}: {
  video: Video;
  backgroundUpload?: BackgroundUpload;
  suspendedUpload?: MediaUploadSession;
  transcoding: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTranscode: () => void;
  onResumeUpload: (session: MediaUploadSession, file: File) => void;
  onOpenPlayer: () => void;
  onInfo: () => void;
  onVast: () => void;
}) {
  const duration = describeDuration(video);
  const canResume = Boolean(suspendedUpload) && !backgroundUpload && ["UPLOADING", "FAILED", "PENDING"].includes(video.processingStatus);
  const cataloged = Boolean(video.seasonId || video.episodeNumber || video.episodeCode);

  return (
    <tr className="align-top transition hover:bg-[#071827]/70">
      <td className="px-4 py-4">
        <div className="flex min-w-0 gap-3">
          <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-[#102238]">
            <HoverVideoPreview video={video} onOpen={onOpenPlayer} />
            <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {playableAdminUrl(video) ? "Hover play Â· click" : "Anteprima"}
            </span>
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="max-w-[210px] truncate font-semibold text-white" title={video.title}>{video.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <HlsStatePill video={video} />
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${cataloged ? "border-emerald-400/40 text-emerald-300" : "border-[#31445a] text-slate-400"}`}>
                Catalogo {cataloged ? "ON" : "OFF"}
              </span>
              <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${video.published ? "border-[#22bdf3]/45 text-[#22bdf3]" : "border-[#31445a] text-slate-400"}`}>
                {video.published ? "Pubblicato" : "Non pubblicato"}
              </span>
            </div>
            <p className="mt-1 truncate font-mono text-xs text-slate-500">#{video.slug}</p>
            <p className="mt-1 text-xs text-slate-400">{video.category.name}</p>
            {video.processingError ? <p className="mt-2 line-clamp-2 rounded border border-red-400/25 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">{video.processingError}</p> : null}
            {backgroundUpload ? (
              <Progress
                value={backgroundUpload.progress}
                label={`${backgroundUpload.status === "failed" ? "Upload fallito" : "Upload background"} Â· ${backgroundUpload.fileName}`}
              />
            ) : null}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-xs">
        <p className="font-semibold text-slate-200">{video.videoQuality ?? "non rilevata"}</p>
        <p className="mt-1 text-slate-500">{video.mediaFormat ?? (video.hlsUrl ? "HLS" : "non rilevato")}</p>
        <p className="mt-1 text-slate-500">{duration.time} · {duration.fps}</p>
      </td>
      <td className="max-w-[170px] px-4 py-4 text-xs text-slate-300">
        {summarizeAudio(video.audioTracks)}
      </td>
      <td className="px-4 py-4 text-xs">
        <CatalogDetails video={video} type="program" />
      </td>
      <td className="px-4 py-4 text-xs">
        <CatalogDetails video={video} type="season" />
      </td>
      <td className="px-4 py-4 text-xs">
        <CatalogDetails video={video} type="episode" />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            disabled={transcoding || Boolean(backgroundUpload) || !video.sourceObjectKey || ["UPLOADING", "QUEUED", "PROCESSING"].includes(video.processingStatus)}
            onClick={onTranscode}
            className="admin-secondary-button px-2.5 py-2 text-xs"
            title={!video.sourceObjectKey ? "Carica prima il file sorgente" : "Avvia conversione HLS"}
          >
            <PlayCircle size={15} />
            {transcoding ? "Avvio..." : "HLS"}
          </button>
          {canResume && suspendedUpload ? (
            <ResumeUploadButton
              session={suspendedUpload}
              onSelect={(file) => onResumeUpload(suspendedUpload, file)}
            />
          ) : null}
          <button type="button" aria-label={`Modifica ${video.title}`} onClick={onEdit} className="admin-icon-button" title="Modifica">
            <Pencil size={16} />
          </button>
          <ConfirmButton label={`Elimina ${video.title}`} onConfirm={onDelete} className="admin-icon-button hover:text-red-400">
            <Trash2 size={16} />
          </ConfirmButton>
          <button type="button" aria-label={`Info media ${video.title}`} onClick={onInfo} className="admin-icon-button" title="Info media">
            <Info size={16} />
          </button>
          <button type="button" aria-label={`VAST config ${video.title}`} onClick={onVast} className="admin-icon-button" title="VAST config">
            <BadgeDollarSign size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CatalogIndicator({ video }: { video: Video }) {
  if (!video.seasonId || !video.season) {
    return (
      <span className="inline-flex rounded border border-[#31445a] px-2 py-1 text-[10px] font-semibold text-slate-400">
        Non catalogato
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <span className="inline-flex rounded border border-emerald-400/40 px-2 py-1 text-[10px] font-semibold text-emerald-300">
        In catalogo
      </span>
      <p className="text-slate-300">{video.season.program?.name ?? video.season.programId}</p>
      <p className="font-mono text-[11px] text-slate-500">
        SER {video.season.programId} Â· ST {video.seasonId}
        {video.episodeCode ? ` Â· EP ${video.episodeCode}` : video.episodeNumber ? ` Â· EP ${video.episodeNumber}` : ""}
      </p>
    </div>
  );
}

function ResumeUploadButton({
  session,
  onSelect,
}: {
  session: MediaUploadSession;
  onSelect: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadedParts = session.uploadedParts.length;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={session.contentType || "video/*"}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) onSelect(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="admin-secondary-button px-2.5 py-2 text-xs"
        title={`Riprendi ${session.fileName} dalle parti giÃ  caricate (${uploadedParts}/${session.totalParts})`}
      >
        <Upload size={15} />
        Riprendi upload
      </button>
    </>
  );
}

function HlsIndicator({ video }: { video: Video }) {
  const ready = video.processingStatus === "READY" && Boolean(video.hlsUrl);
  const failed = video.processingStatus === "FAILED";
  const active = ["UPLOADING", "QUEUED", "PROCESSING"].includes(video.processingStatus);

  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${
      ready
        ? "border-emerald-400/40 text-emerald-300"
        : failed
          ? "border-red-400/40 text-red-300"
          : active
            ? "border-amber-300/40 text-amber-200"
            : "border-[#31445a] text-slate-400"
    }`}>
      {ready ? <CheckCircle2 size={12} /> : null}
      {ready ? "Convertito HLS" : active ? processingLabels[video.processingStatus] : failed ? "Errore HLS" : "Non convertito"}
    </span>
  );
}

function MediaInfoModal({ video, onClose }: { video: Video; onClose: () => void }) {
  const hlsPath = video.convertedObjectKey ?? folderFromUrl(video.hlsUrl);
  const originalPath = video.sourceObjectKey ?? "non disponibile";

  return (
    <AdminModal title={`Info media Â· ${video.title}`} onClose={onClose}>
      <div className="grid gap-3 text-sm">
        <InfoRow label="Nome file originale" value={video.originalFileName ?? fileNameOf(video.sourceObjectKey) ?? "non caricato"} />
        <InfoRow label="Percorso file originale" value={originalPath} monospace />
        <InfoRow label="Nome file HLS" value={fileNameOf(video.convertedObjectKey) ?? fileNameOf(video.hlsUrl) ?? (video.hlsUrl ? "master.m3u8" : "non convertito")} />
        <InfoRow label="Percorso file HLS" value={hlsPath ?? "non convertito"} monospace />
        <InfoRow label="Codice operatore upload" value="non registrato" />
        <InfoRow label="Data e ora upload" value={formatDate(video.createdAt ?? video.updatedAt)} />
        <InfoRow label="Stato conversione" value={processingLabels[video.processingStatus]} />
        <InfoRow label="URL HLS pubblico" value={video.hlsUrl ?? "non disponibile"} monospace />
      </div>
    </AdminModal>
  );
}

function VastConfigModal({ video, onClose }: { video: Video; onClose: () => void }) {
  return (
    <AdminModal title={`VAST config Â· ${video.title}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="rounded border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          Pulsante predisposto. Per salvare una configurazione VAST persistente serve aggiungere il modello dati e le API backend dedicate.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Pre-roll VAST URL" value="" onChange={() => undefined} placeholder="https://..." />
          <Input label="Mid-roll VAST URL" value="" onChange={() => undefined} placeholder="https://..." />
          <Input label="Post-roll VAST URL" value="" onChange={() => undefined} placeholder="https://..." />
          <label className="flex items-center gap-3 pt-7 text-sm text-slate-300">
            <input type="checkbox" disabled className="size-4 accent-[#16b9f4]" />
            Abilita annunci per questo media
          </label>
        </div>
        <div className="flex justify-end">
          <button type="button" onClick={onClose} className="admin-secondary-button">Chiudi</button>
        </div>
      </div>
    </AdminModal>
  );
}

function InfoRow({ label, value, monospace }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div className="rounded-lg border border-[#1b2b3d] bg-[#06111d] p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-1 break-all text-slate-200 ${monospace ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function ContentCard({
  video,
  backgroundUpload,
  transcoding,
  onEdit,
  onDelete,
  onTranscode,
  onOpenPlayer,
}: {
  video: Video;
  backgroundUpload?: BackgroundUpload;
  transcoding: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTranscode: () => void;
  onOpenPlayer: () => void;
}) {
  const ready = video.processingStatus === "READY" && Boolean(video.hlsUrl);
  const originalFolder = folderOf(video.sourceObjectKey);
  const convertedFolder = video.convertedObjectKey ? folderOf(video.convertedObjectKey) : folderFromUrl(video.hlsUrl);
  const audioSummary = summarizeAudio(video.audioTracks);

  return (
    <article className="grid gap-4 p-4 xl:grid-cols-[180px_1fr_auto] xl:items-start sm:px-5">
      <div className="relative aspect-video overflow-hidden rounded-lg bg-[#102238]">
        <HoverVideoPreview video={video} onOpen={onOpenPlayer} />
        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
          {playableAdminUrl(video) ? "Hover play Â· Click player" : "Anteprima"}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-white">{video.title}</h3>
          <StatusPill status={video.processingStatus} />
          {backgroundUpload ? (
            <span className="rounded border border-[#22bdf3]/40 px-2 py-0.5 text-[10px] text-[#22bdf3]">
              Upload {backgroundUpload.progress}%
            </span>
          ) : null}
          {ready ? (
            <span className="inline-flex items-center gap-1 rounded border border-emerald-400/40 px-2 py-0.5 text-[10px] text-emerald-300">
              <CheckCircle2 size={12} /> Convertito
            </span>
          ) : null}
          <span className={`rounded border px-2 py-0.5 text-[10px] ${video.published ? "border-emerald-400/40 text-emerald-400" : "border-[#31445a] text-slate-400"}`}>
            {video.published ? "Pubblicato" : "Bozza"}
          </span>
        </div>

        <p className="mt-1 text-sm text-slate-400">
          {video.category.name}
          {video.season ? ` Â· ${video.season.program?.name ?? video.season.programId} Â· ${video.season.title || `Stagione ${video.season.number}`}` : ""}
          {video.episodeCode ? ` Â· EP ${video.episodeCode}` : ""}
        </p>

        <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
          <Meta label="Slug" value={`#${video.slug}`} />
          <Meta label="Upload" value={formatDate(video.createdAt ?? video.updatedAt)} />
          <Meta label="Originale" value={video.originalFileName ?? "non caricato"} />
          <Meta label="Cartella originale" value={originalFolder ?? "non disponibile"} />
          <Meta label="Cartella HLS" value={convertedFolder ?? "non convertito"} />
          <Meta label="Durata" value={formatDuration(video.duration)} />
          <Meta label="QualitÃ " value={video.videoQuality ?? "non rilevata"} />
          <Meta label="Formato" value={video.mediaFormat ?? (video.hlsUrl ? "HLS" : "non rilevato")} />
          <Meta label="Tracce audio" value={audioSummary} />
        </div>
        {video.processingError ? <p className="mt-3 rounded border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{video.processingError}</p> : null}
        {backgroundUpload ? (
          <div className="mt-3">
            <Progress
              value={backgroundUpload.progress}
              label={`${backgroundUpload.status === "failed" ? "Upload fallito" : "Upload in background"} Â· ${backgroundUpload.fileName}`}
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1 xl:justify-end">
        <button
          type="button"
          disabled={transcoding || Boolean(backgroundUpload) || !video.sourceObjectKey || ["UPLOADING", "QUEUED", "PROCESSING"].includes(video.processingStatus)}
          onClick={onTranscode}
          className="admin-secondary-button"
          title={!video.sourceObjectKey ? "Carica prima il file sorgente" : "Avvia conversione HLS"}
        >
          <PlayCircle size={16} />
          {transcoding ? "Avvio..." : "HLS"}
        </button>
        <button type="button" aria-label={`Modifica ${video.title}`} onClick={onEdit} className="admin-icon-button">
          <Pencil size={17} />
        </button>
        <ConfirmButton label={`Elimina ${video.title}`} onConfirm={onDelete} className="admin-icon-button hover:text-red-400">
          <Trash2 size={17} />
        </ConfirmButton>
      </div>
    </article>
  );
}

function attachHls(video: HTMLVideoElement, src: string): Hls | null {
  if (Hls.isSupported() && src.includes(".m3u8")) {
    video.crossOrigin = "anonymous";
    const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
    hls.loadSource(src);
    hls.attachMedia(video);
    return hls;
  }
  video.src = src;
  return null;
}

function mediaPublicBase(video: Video) {
  if (video.hlsUrl) {
    try {
      return new URL(video.hlsUrl).origin;
    } catch {
      return "https://media.tvmix.it";
    }
  }
  if (video.thumbnailUrl) {
    try {
      return new URL(video.thumbnailUrl).origin;
    } catch {
      return "https://media.tvmix.it";
    }
  }
  return "https://media.tvmix.it";
}

function originalPreviewUrl(video: Video) {
  if (!video.sourceObjectKey) return null;
  const extension = video.sourceObjectKey.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (!extension || !["mp4", "mov", "m4v", "webm"].includes(extension)) return null;
  return `${mediaPublicBase(video)}/${encodeURI(video.sourceObjectKey.replace(/^\/+/, ""))}`;
}

function playableAdminUrl(video: Video) {
  return originalPreviewUrl(video) ?? video.hlsUrl;
}

function HoverVideoPreview({ video, onOpen }: { video: Video; onOpen: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const previewUrl = playableAdminUrl(video);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !previewUrl) return;
    hlsRef.current = attachHls(element, previewUrl);
    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      element.removeAttribute("src");
      element.load();
    };
  }, [previewUrl]);

  function playPreview() {
    const element = videoRef.current;
    if (!element || !previewUrl) return;
    element.muted = true;
    void element.play().catch(() => undefined);
  }

  function pausePreview() {
    const element = videoRef.current;
    if (!element) return;
    element.pause();
  }

  if (previewUrl) {
    return (
      <button
        type="button"
        onClick={onOpen}
        onMouseEnter={playPreview}
        onMouseLeave={pausePreview}
        onFocus={playPreview}
        onBlur={pausePreview}
        className="group/preview block h-full w-full text-left"
        aria-label={`Apri player ${video.title}`}
      >
        <video
          ref={videoRef}
          poster={video.thumbnailUrl ?? undefined}
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover transition duration-300 group-hover/preview:scale-[1.03]"
        />
        <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-70" />
        <span className="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-black opacity-0 shadow-xl transition group-hover/preview:opacity-100 group-focus/preview:opacity-100">
          <Play size={18} fill="currentColor" />
        </span>
      </button>
    );
  }

  if (video.thumbnailUrl) {
    return (
      <button type="button" onClick={onOpen} className="block h-full w-full" aria-label={`Apri player ${video.title}`}>
        <Image src={video.thumbnailUrl} alt="" fill sizes="180px" className="object-cover" />
      </button>
    );
  }

  return (
    <button type="button" onClick={onOpen} className="grid h-full w-full place-items-center text-slate-600" aria-label={`Apri player ${video.title}`}>
      <FileVideo size={30} />
    </button>
  );
}

function VideoPlayerModal({
  video,
  onClose,
  onNotify,
  onUpdated,
}: {
  video: Video;
  onClose: () => void;
  onNotify: (message: string) => void;
  onUpdated: (video: Video) => Promise<void>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration ?? 0);
  const [grabbing, setGrabbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerUrl = playableAdminUrl(video);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !playerUrl) return;

    hlsRef.current = attachHls(element, playerUrl);
    const syncPlay = () => setPlaying(!element.paused);
    const syncTime = () => setCurrentTime(element.currentTime);
    const syncDuration = () => {
      if (Number.isFinite(element.duration)) setDuration(element.duration);
    };

    element.addEventListener("play", syncPlay);
    element.addEventListener("pause", syncPlay);
    element.addEventListener("timeupdate", syncTime);
    element.addEventListener("loadedmetadata", syncDuration);
    element.addEventListener("durationchange", syncDuration);

    return () => {
      element.pause();
      element.removeEventListener("play", syncPlay);
      element.removeEventListener("pause", syncPlay);
      element.removeEventListener("timeupdate", syncTime);
      element.removeEventListener("loadedmetadata", syncDuration);
      element.removeEventListener("durationchange", syncDuration);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      element.removeAttribute("src");
      element.load();
    };
  }, [playerUrl]);

  function seek(value: number) {
    const element = videoRef.current;
    if (!element) return;
    const next = Math.max(0, Math.min(value, duration || value));
    element.currentTime = next;
    setCurrentTime(next);
  }

  function togglePlay() {
    const element = videoRef.current;
    if (!element) return;
    if (element.paused) void element.play().catch(() => undefined);
    else element.pause();
  }

  async function grabFrame() {
    const element = videoRef.current;
    if (!element || !playerUrl) return;
    setError(null);
    setGrabbing(true);
    try {
      const saved = await adminRequest<{ data: Video }>(`videos/${video.id}/frame-grab`, {
        method: "POST",
        body: JSON.stringify({ time: element.currentTime }),
      });
      onNotify("Frame salvato su R2 e copertina aggiornata");
      await onUpdated(saved.data);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Frame grabber non riuscito";
      setError(message);
      onNotify(message);
    } finally {
      setGrabbing(false);
    }
  }

  return (
    <AdminModal title={`Player Â· ${video.title}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-[#203248] bg-black">
          {playerUrl ? (
            <video
              ref={videoRef}
              poster={video.thumbnailUrl ?? undefined}
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          ) : video.thumbnailUrl ? (
            <Image src={video.thumbnailUrl} alt="" fill sizes="80vw" className="object-contain" />
          ) : (
            <div className="grid h-full place-items-center text-slate-500">
              <FileVideo size={54} />
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/70 text-white backdrop-blur transition hover:bg-white hover:text-black"
            aria-label="Chiudi player"
          >
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl border border-[#203248] bg-[#06111d] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={togglePlay} disabled={!playerUrl} className="admin-primary-button">
              {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              {playing ? "Pausa" : "Play"}
            </button>
            <button type="button" onClick={() => seek(currentTime - 10)} disabled={!playerUrl} className="admin-secondary-button">
              <RotateCcw size={15} /> -10s
            </button>
            <button type="button" onClick={() => seek(currentTime + 10)} disabled={!playerUrl} className="admin-secondary-button">
              <RotateCw size={15} /> +10s
            </button>
            <button type="button" onClick={() => void grabFrame()} disabled={!playerUrl || grabbing || !video.sourceObjectKey} className="admin-secondary-button">
              <Camera size={16} />
              {grabbing ? "Salvataggio..." : "Cattura frame"}
            </button>
          </div>

          <div className="mt-4 grid gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(duration, 1)}
              step={0.05}
              value={Math.min(currentTime, Math.max(duration, 1))}
              onChange={(event) => seek(Number(event.target.value))}
              disabled={!playerUrl}
              className="w-full"
              aria-label="Scorri video avanti e indietro"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>{formatDuration(Math.round(currentTime))}</span>
              <span>{formatDuration(Math.round(duration))}</span>
            </div>
          </div>

          {grabbing ? <p className="mt-3 text-xs font-semibold text-[#22bdf3]">Genero il frame e lo salvo su Cloudflare R2...</p> : null}
          {error ? <p className="mt-3 rounded border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}
          {!playerUrl ? <p className="mt-3 text-xs text-slate-500">Carica prima un sorgente video MP4 o converti il media in HLS per usare il player.</p> : null}
          {playerUrl && !originalPreviewUrl(video) ? (
            <p className="mt-3 text-xs text-amber-200/80">
              Uso HLS come fallback: se il video non appare, configura CORS su media.tvmix.it oppure carica un originale MP4.
            </p>
          ) : null}
        </div>
      </div>
    </AdminModal>
  );
}

function VideoEditor({
  video,
  categories,
  catalog,
  saving,
  uploadProgress,
  onClose,
  onSave,
}: {
  video: Video | null;
  categories: Category[];
  catalog: CatalogCategory[];
  saving: boolean;
  uploadProgress: number;
  onClose: () => void;
  onSave: (form: VideoForm) => Promise<void>;
}) {
  const initialProgramId = video?.season?.programId ?? "";
  const [slugEdited, setSlugEdited] = useState(Boolean(video));
  const [form, setForm] = useState<VideoForm>(() => {
    const initialSeason = video?.seasonId ? findSeason(catalog, video.seasonId) : null;
    return video
      ? {
          title: video.title,
          slug: `#${video.slug}`,
          shortDescription: video.shortDescription ?? "",
          description: video.description ?? "",
          thumbnailUrl: video.thumbnailUrl ?? "",
          hlsUrl: video.hlsUrl ?? "",
          duration: video.duration?.toString() ?? "",
          categoryId: initialSeason?.program.categoryId ?? video.categoryId,
          programId: initialProgramId,
          seasonId: video.seasonId ?? "",
          episodeNumber: video.episodeNumber?.toString() ?? "1",
          episodeCode: video.episodeCode ?? "",
          published: video.published,
          file: null,
        }
      : { ...blank, categoryId: categories[0]?.id ?? "" };
  });

  const programs = useMemo(
    () => catalog.flatMap((category) => category.programs.map((program) => ({ ...program, category }))),
    [catalog],
  );
  const selectedProgram = programs.find((program) => program.id === form.programId);
  const seasons = selectedProgram?.seasons ?? [];
  const selectedSeason = findSeason(catalog, form.seasonId);

  useEffect(() => {
    if (!form.seasonId || !form.episodeNumber || !selectedSeason) {
      field("episodeCode", "");
      return;
    }
    field("episodeCode", createEpisodeCode(selectedSeason.programId, selectedSeason.number, Number(form.episodeNumber)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.seasonId, form.episodeNumber, selectedSeason?.id]);

  function field<K extends keyof VideoForm>(key: K, value: VideoForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function changeTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugEdited ? current.slug : `#${slugify(value)}`,
    }));
  }

  function changeProgram(programId: string) {
    const program = programs.find((item) => item.id === programId);
    setForm((current) => ({
      ...current,
      programId,
      categoryId: program?.categoryId ?? current.categoryId,
      seasonId: "",
      episodeCode: "",
    }));
  }

  function changeSeason(seasonId: string) {
    const season = findSeason(catalog, seasonId);
    setForm((current) => ({
      ...current,
      seasonId,
      categoryId: season?.program.categoryId ?? current.categoryId,
    }));
  }

  return (
    <AdminModal title={video ? "Modifica contenuto" : "Nuovo contenuto"} onClose={onClose}>
      <form onSubmit={(event: FormEvent) => { event.preventDefault(); void onSave(form); }} className="grid gap-4 sm:grid-cols-2">
        <Input label="Titolo" value={form.title} onChange={changeTitle} required />
        <label>
          <span className="admin-label">Slug</span>
          <input
            required
            value={form.slug}
            onChange={(event) => {
              setSlugEdited(true);
              field("slug", event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`);
            }}
            className="admin-input mt-2 font-mono"
          />
        </label>

        <label className="sm:col-span-2">
          <span className="admin-label">Sinossi breve</span>
          <textarea value={form.shortDescription} onChange={(event) => field("shortDescription", event.target.value)} maxLength={500} className="admin-input mt-2 h-20 py-3" />
          <span className="mt-1 block text-[11px] text-slate-500">Massimo 500 caratteri, usata per card, slider e preview.</span>
        </label>

        <label className="sm:col-span-2">
          <span className="admin-label">Sinossi lunga</span>
          <textarea value={form.description} onChange={(event) => field("description", event.target.value)} className="admin-input mt-2 h-28 py-3" />
        </label>

        <label>
          <span className="admin-label">Categoria</span>
          <select value={form.categoryId} onChange={(event) => field("categoryId", event.target.value)} required className="admin-input mt-2">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>
          <span className="admin-label">Programma</span>
          <select value={form.programId} onChange={(event) => changeProgram(event.target.value)} className="admin-input mt-2">
            <option value="">Nessun programma</option>
            {programs.map((program) => <option key={program.id} value={program.id}>{program.name} ({program.id})</option>)}
          </select>
          <span className="mt-1 block font-mono text-[11px] text-slate-500">ID programma: {form.programId || "â€”"}</span>
        </label>
        <label>
          <span className="admin-label">Stagione / Serie</span>
          <select value={form.seasonId} onChange={(event) => changeSeason(event.target.value)} disabled={!form.programId} className="admin-input mt-2">
            <option value="">Nessuna stagione</option>
            {seasons.map((season) => <option key={season.id} value={season.id}>{season.title || `Stagione ${season.number}`} ({season.id})</option>)}
          </select>
          <span className="mt-1 block font-mono text-[11px] text-slate-500">ID stagione/serie: {form.seasonId || "â€”"}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Input label="N. episodio" type="number" value={form.episodeNumber} onChange={(value) => field("episodeNumber", value)} />
          <label>
            <span className="admin-label">ID episodio</span>
            <input readOnly value={form.episodeCode} placeholder="automatico" className="admin-input mt-2 font-mono tracking-[0.18em] text-[#22bdf3]" />
            <span className="mt-1 block text-[11px] text-slate-500">Codice generato da ID programma + stagione + episodio.</span>
          </label>
        </div>

        <div className="sm:col-span-2">
          <label className="block">
            <span className="admin-label">File video sorgente</span>
            <span className="mt-2 flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[#31506b] bg-[#06111d] px-4 py-3 text-sm text-slate-400 hover:border-[#22bdf3]">
              {form.file ? <FileVideo size={22} className="text-[#22bdf3]" /> : <Upload size={22} />}
              <span className="min-w-0">
                <span className="block truncate text-slate-200">
                  {form.file?.name ?? video?.originalFileName ?? "Seleziona MP4, MOV o MKV"}
                </span>
                <span className="mt-1 block text-xs text-slate-500">Upload diretto su Cloudflare R2 / originals</span>
              </span>
              <input type="file" accept="video/mp4,video/quicktime,video/x-matroska,.mkv" className="sr-only" onChange={(event) => field("file", event.target.files?.[0] ?? null)} />
            </span>
          </label>
          {uploadProgress > 0 ? <Progress value={uploadProgress} label="Upload R2" /> : null}
        </div>

        <Input label="URL HLS" type="url" value={form.hlsUrl} onChange={(value) => field("hlsUrl", value)} />
        <Input label="URL copertina" type="url" value={form.thumbnailUrl} onChange={(value) => field("thumbnailUrl", value)} />
        <Input label="Durata in secondi" type="number" value={form.duration} onChange={(value) => field("duration", value)} />
        <label className="flex items-center gap-3 pt-7">
          <input type="checkbox" disabled={!form.hlsUrl} checked={form.published} onChange={(event) => field("published", event.target.checked)} className="size-4 accent-[#16b9f4]" />
          <span className="text-sm">Pubblica nel catalogo</span>
        </label>

        <div className="flex justify-end gap-2 sm:col-span-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">Annulla</button>
          <button disabled={saving} className="admin-primary-button">{saving ? "Salvataggio..." : "Salva"}</button>
        </div>
      </form>
    </AdminModal>
  );
}

function StatusPill({ status }: { status: Video["processingStatus"] }) {
  const ready = status === "READY";
  const failed = status === "FAILED";
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] ${ready ? "border-emerald-400/40 text-emerald-300" : failed ? "border-red-400/40 text-red-300" : "border-amber-300/30 text-amber-200"}`}>
      {processingLabels[status]}
    </span>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return <p className="truncate"><span className="text-slate-600">{label}:</span> <span className="text-slate-300">{value}</span></p>;
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex justify-between text-xs text-slate-400"><span>{label}</span><span>{value}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-[#102238]"><div className="h-full bg-[#22bdf3]" style={{ width: `${value}%` }} /></div>
    </div>
  );
}

export function Header({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-bold text-white">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>{children}</div>;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="admin-panel relative block p-3"><Search size={17} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" /><input value={value} onChange={(event) => onChange(event.target.value)} className="admin-input pl-10" placeholder={placeholder} /></label>;
}

export function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return <label><span className="admin-label">{label}</span><input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="admin-input mt-2" /></label>;
}

function findSeason(catalog: CatalogCategory[], seasonId: string) {
  for (const category of catalog) {
    for (const program of category.programs) {
      const season = program.seasons.find((item) => item.id === seasonId);
      if (season) return { ...season, program: { ...program, categoryId: program.categoryId } };
    }
  }
  return null;
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function createEpisodeCode(programId: string, seasonNumber: number, episodeNumber: number) {
  const id = programId.toUpperCase();
  return `${id[0] ?? "X"}${id.at(-1) ?? "X"}${twoDigitUnitsTens(seasonNumber)}${twoDigitUnitsTens(episodeNumber)}`;
}

function twoDigitUnitsTens(value: number) {
  const normalized = Math.abs(value) % 100;
  return `${normalized % 10}${Math.floor(normalized / 10)}`;
}

function describeDuration(video: Video) {
  return {
    time: formatDuration(video.duration),
    fps: extractFps(video) ?? "fps non rilevati",
  };
}

function extractFps(video: Video) {
  const candidates = [video.videoQuality, video.mediaFormat, stringifyMetadata(video.audioTracks)];
  for (const candidate of candidates) {
    const match = candidate?.match(/(\d+(?:[.,]\d+)?)\s*(?:fps|frames\/s|frame_rate)/i);
    if (match?.[1]) return `${match[1].replace(",", ".")} fps`;
  }
  return null;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "non rilevata";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function folderOf(value: string | null) {
  if (!value) return null;
  const parts = value.split("/");
  parts.pop();
  return parts.join("/") || value;
}

function folderFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return folderOf(decodeURIComponent(new URL(value).pathname.replace(/^\/+/, "")));
  } catch {
    return folderOf(value);
  }
}

function fileNameOf(value: string | null) {
  if (!value) return null;
  try {
    const pathname = value.startsWith("http") ? new URL(value).pathname : value;
    const clean = decodeURIComponent(pathname.split("?")[0] ?? "").replace(/\/+$/, "");
    return clean.split("/").pop() || null;
  } catch {
    return value.split("?")[0]?.split("/").pop() || null;
  }
}

function summarizeAudio(value: unknown) {
  if (Array.isArray(value)) {
    if (!value.length) return "nessuna";
    const tracks = value.map((track, index) => summarizeAudioTrack(track, index + 1)).filter(Boolean);
    return tracks.length ? tracks.join(" Â· ") : `${value.length} traccia/e`;
  }
  if (value && typeof value === "object") return summarizeAudioTrack(value, 1) || "disponibile";
  return "non rilevate";
}

function summarizeAudioTrack(value: unknown, index: number) {
  if (!value || typeof value !== "object") return `Traccia ${index}`;
  const data = value as Record<string, unknown>;
  const rawChannels = data.channels ?? data.channelCount ?? data.audioChannels;
  const channels = typeof rawChannels === "number" ? rawChannels : typeof rawChannels === "string" ? Number(rawChannels) : null;
  const layout = typeof data.channelLayout === "string" ? data.channelLayout : typeof data.layout === "string" ? data.layout : null;
  const mode = layout?.toLowerCase().includes("mono")
    ? "mono"
    : layout?.toLowerCase().includes("stereo")
      ? "stereo"
      : channels === 1
        ? "mono"
        : channels === 2
          ? "stereo"
          : channels
            ? `${channels} canali`
            : null;
  const codec = firstString(data.codec, data.codecName, data.format, data.formatName, data.profile);
  const language = firstString(data.language, data.lang);
  return [`T${index}`, mode, codec, language].filter(Boolean).join(" / ");
}

function stringifyMetadata(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
}


