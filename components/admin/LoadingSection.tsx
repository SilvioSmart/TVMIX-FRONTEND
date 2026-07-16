"use client";

import { Folder, FolderOpen, PlayCircle, RefreshCw, RotateCw, Upload, Video } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminRequest,
  formatDate,
  getTranscodeStatus,
  importRemoteMedia,
  listRemoteMediaFiles,
  listSuspendedUploads,
  registerOriginalMedia,
  uploadFileToR2,
  type ListResponse,
  type MediaUploadSession,
  type RemoteMediaFile,
  type TranscodeStatus,
  type Video as AdminVideo,
} from "./admin-api";
import { Header, Input } from "./ContentSection";
import { ResourceState } from "./AdminResourceUI";

type Props = { onNotify: (message: string) => void };

type UploadState = {
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "failed";
  error?: string;
};

const supportedAccept = ".mp4,.mov,.mkv,video/mp4,video/quicktime,video/x-matroska";

function formatBytes(value: number | null | undefined) {
  if (!value || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function mediaContentType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type) return file.type;
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "mkv") return "video/x-matroska";
  return "application/octet-stream";
}

function localMetadata(file: File): Promise<{
  duration: number | null;
  mediaFormat: string;
  videoQuality: string | null;
  audioTracks: unknown;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: Number.isFinite(video.duration) ? Math.round(video.duration) : null,
        mediaFormat: file.name.split(".").pop()?.toUpperCase() ?? mediaContentType(file),
        videoQuality: video.videoWidth && video.videoHeight ? `${video.videoWidth}x${video.videoHeight}` : null,
        audioTracks: [],
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: null,
        mediaFormat: file.name.split(".").pop()?.toUpperCase() ?? mediaContentType(file),
        videoQuality: null,
        audioTracks: [],
      });
    };
    video.src = url;
  });
}

function transcodePercent(status: TranscodeStatus | undefined) {
  if (!status) return 0;
  if (status.processingStatus === "READY") return 100;
  const progress = status.progress as { percent?: number; seconds?: number; phase?: string } | number | null;
  if (typeof progress === "number") return Math.max(5, Math.min(99, progress));
  if (progress?.percent) return Math.max(5, Math.min(100, progress.percent));
  if (progress?.seconds && status.duration) return Math.max(10, Math.min(95, Math.round((progress.seconds / status.duration) * 100)));
  if (progress?.phase === "uploading-r2") return 92;
  if (progress?.phase === "webhook") return 98;
  if (progress?.phase) return 20;
  return status.processingStatus === "QUEUED" ? 8 : status.processingStatus === "PROCESSING" ? 35 : 0;
}

export function LoadingSection({ onNotify }: Props) {
  const [videos, setVideos] = useState<AdminVideo[]>([]);
  const [sessions, setSessions] = useState<MediaUploadSession[]>([]);
  const [remotePath, setRemotePath] = useState("");
  const [remoteRoot, setRemoteRoot] = useState("");
  const [remoteFiles, setRemoteFiles] = useState<RemoteMediaFile[]>([]);
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [transcodes, setTranscodes] = useState<Record<string, TranscodeStatus>>({});
  const [importing, setImporting] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [videoResult, uploadSessions, remoteResult] = await Promise.all([
        adminRequest<ListResponse<AdminVideo>>("videos?source=originals&limit=100"),
        listSuspendedUploads().catch(() => []),
        listRemoteMediaFiles(remotePath).catch(() => null),
      ]);
      setVideos(videoResult.data);
      setSessions(uploadSessions);
      if (remoteResult) {
        setRemoteRoot(remoteResult.root);
        setRemoteFiles(remoteResult.data);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Caricamento Loading non riuscito");
    } finally {
      setLoading(false);
    }
  }, [remotePath]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const active = videos.filter((video) => ["QUEUED", "PROCESSING"].includes(video.processingStatus));
    if (!active.length) return;
    let closed = false;
    const tick = async () => {
      const entries = await Promise.all(active.map(async (video) => [video.id, await getTranscodeStatus(video.id).catch(() => null)] as const));
      if (closed) return;
      setTranscodes((current) => {
        const next = { ...current };
        for (const [id, status] of entries) if (status) next[id] = status;
        return next;
      });
    };
    void tick();
    const interval = window.setInterval(() => void tick(), 4000);
    return () => {
      closed = true;
      window.clearInterval(interval);
    };
  }, [videos]);

  const uploadedNames = useMemo(() => new Set(videos.map((video) => video.originalFileName).filter(Boolean)), [videos]);

  async function uploadAndRegister(file: File, resumeSession?: MediaUploadSession) {
    if (uploadedNames.has(file.name)) {
      setError(`File già presente in archivio: ${file.name}`);
      return;
    }
    const key = resumeSession?.logicalUploadId ?? file.name;
    setUploads((current) => ({ ...current, [key]: { fileName: file.name, progress: 0, status: "uploading" } }));
    try {
      const metadata = await localMetadata(file);
      const uploaded = await uploadFileToR2(
        file,
        (progress) => setUploads((current) => ({ ...current, [key]: { fileName: file.name, progress, status: "uploading" } })),
        undefined,
        { resumeSession, keepSessionOnFailure: true },
      );
      await registerOriginalMedia({
        objectKey: uploaded.objectKey,
        fileName: uploaded.originalFileName,
        contentType: mediaContentType(file),
        size: file.size,
        ...metadata,
      });
      setUploads((current) => ({ ...current, [key]: { fileName: file.name, progress: 100, status: "done" } }));
      onNotify("File caricato in originals");
      await load();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Upload non riuscito";
      setUploads((current) => ({ ...current, [key]: { fileName: file.name, progress: current[key]?.progress ?? 0, status: "failed", error: message } }));
      setError(message);
      await load();
    }
  }

  async function startTranscode(video: AdminVideo) {
    try {
      await adminRequest(`videos/${video.id}/transcode`, { method: "POST", body: JSON.stringify({}) });
      onNotify("Conversione HLS avviata");
      const status = await getTranscodeStatus(video.id).catch(() => null);
      if (status) setTranscodes((current) => ({ ...current, [video.id]: status }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Avvio conversione non riuscito");
    }
  }

  async function importRemote(file: RemoteMediaFile) {
    setImporting(file.path);
    setError(null);
    try {
      await importRemoteMedia(file.path);
      onNotify("File remoto importato in originals");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Import remoto non riuscito");
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="space-y-5">
      <Header title="Loading" description="Carica file MP4, MOV e MKV in archivio originals, controlla doppioni e avvia la conversione HLS.">
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={supportedAccept}
          className="hidden"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.currentTarget.value = "";
            void files.reduce((chain, file) => chain.then(() => uploadAndRegister(file)), Promise.resolve());
          }}
        />
        <button type="button" onClick={() => fileInput.current?.click()} className="admin-primary-button">
          <Upload size={17} /> Carica dal computer
        </button>
      </Header>

      <ResourceState loading={loading} error={error} empty={!videos.length ? "Nessun file originale caricato." : undefined} />

      <section className="admin-panel p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <Input label="Cartella remota" value={remotePath} onChange={setRemotePath} placeholder="Percorso relativo dentro MEDIA_IMPORT_ROOT" />
          <button type="button" onClick={() => void load()} className="admin-secondary-button">
            <RefreshCw size={16} /> Aggiorna remoto
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Root remoto server: <span className="font-mono">{remoteRoot || "non disponibile"}</span></p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {remoteFiles.map((file) => (
            <div key={file.path} className="rounded-xl border border-[#203248] bg-[#071827] p-3">
              <div className="flex items-start gap-2">
                {file.type === "directory" ? <Folder className="mt-0.5 text-[#22bdf3]" size={18} /> : <Video className="mt-0.5 text-slate-400" size={18} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white" title={file.name}>{file.name}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{file.type === "file" ? formatBytes(file.size) : "cartella"} · {formatDate(file.updatedAt)}</p>
                </div>
              </div>
              {file.type === "directory" ? (
                <button type="button" className="admin-secondary-button mt-3 w-full justify-center text-xs" onClick={() => setRemotePath(file.path)}>
                  <FolderOpen size={14} /> Apri
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!file.supported || importing === file.path || uploadedNames.has(file.name)}
                  className="admin-secondary-button mt-3 w-full justify-center text-xs disabled:opacity-45"
                  onClick={() => void importRemote(file)}
                >
                  <Upload size={14} /> {uploadedNames.has(file.name) ? "Già presente" : importing === file.path ? "Import..." : "Importa"}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {sessions.length ? (
        <section className="admin-panel p-5">
          <h3 className="admin-section-title">Caricamenti sospesi</h3>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {sessions.map((session) => (
              <SuspendedUploadCard key={session.id} session={session} onResume={(file) => void uploadAndRegister(file, session)} />
            ))}
          </div>
        </section>
      ) : null}

      {Object.values(uploads).length ? (
        <section className="admin-panel p-5">
          <h3 className="admin-section-title">Upload in corso</h3>
          <div className="mt-3 space-y-3">
            {Object.entries(uploads).map(([key, upload]) => (
              <ProgressRow key={key} label={upload.fileName} value={upload.progress} color="blue" caption={upload.error ?? upload.status} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {videos.map((video) => {
          const status = transcodes[video.id];
          const percent = transcodePercent(status);
          return (
            <article key={video.id} className="admin-panel overflow-hidden">
              <div className="aspect-video bg-[#071827] p-5">
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#29425b] text-slate-500">
                  <Video size={42} />
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="truncate font-semibold text-white" title={video.originalFileName ?? video.title}>{video.originalFileName ?? video.title}</h3>
                  <p className="mt-1 truncate font-mono text-[11px] text-slate-500" title={video.sourceObjectKey ?? ""}>{video.sourceObjectKey}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                  <Meta label="Durata" value={formatDuration(video.duration)} />
                  <Meta label="Risoluzione" value={video.videoQuality ?? "—"} />
                  <Meta label="Formato" value={video.mediaFormat ?? "—"} />
                  <Meta label="Audio" value={summarizeAudio(video.audioTracks)} />
                </div>
                {["QUEUED", "PROCESSING", "READY"].includes(video.processingStatus) ? (
                  <ProgressRow label="Conversione HLS" value={percent} color="yellow" caption={status?.jobState ?? video.processingStatus} />
                ) : null}
                <button
                  type="button"
                  disabled={!video.sourceObjectKey || ["QUEUED", "PROCESSING"].includes(video.processingStatus)}
                  onClick={() => void startTranscode(video)}
                  className="admin-secondary-button w-full justify-center disabled:opacity-45"
                >
                  <PlayCircle size={16} /> Avvia conversione
                </button>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function SuspendedUploadCard({ session, onResume }: { session: MediaUploadSession; onResume: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const progress = session.totalParts ? Math.round((session.uploadedParts.length / session.totalParts) * 100) : 0;
  return (
    <div className="rounded-xl border border-[#203248] bg-[#071827] p-4">
      <input
        ref={inputRef}
        type="file"
        accept={supportedAccept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.currentTarget.value = "";
          if (file) onResume(file);
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-white">{session.fileName}</p>
          <p className="mt-1 text-xs text-slate-500">{formatBytes(session.size)} · parti {session.uploadedParts.length}/{session.totalParts}</p>
        </div>
        <button type="button" className="admin-secondary-button text-xs" onClick={() => inputRef.current?.click()}>
          <RotateCw size={14} /> Riprendi
        </button>
      </div>
      <ProgressRow label="Upload sospeso" value={progress} color="blue" caption="seleziona lo stesso file locale" />
    </div>
  );
}

function ProgressRow({ label, value, color, caption }: { label: string; value: number; color: "blue" | "yellow"; caption?: string }) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#132438]">
        <div
          className={["h-full rounded-full transition-all", color === "blue" ? "bg-[#22bdf3]" : "bg-[#f8c14b]"].join(" ")}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {caption ? <p className="mt-1 text-[11px] text-slate-500">{caption}</p> : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#203248] bg-[#071827] p-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-200" title={value}>{value}</p>
    </div>
  );
}

function summarizeAudio(value: unknown) {
  if (!Array.isArray(value) || !value.length) return "—";
  return value.map((track, index) => {
    if (!track || typeof track !== "object") return `Traccia ${index + 1}`;
    const item = track as { codec?: string; channels?: number; layout?: string };
    return [item.codec, item.channels ? `${item.channels}ch` : item.layout].filter(Boolean).join(" ");
  }).join(", ");
}
