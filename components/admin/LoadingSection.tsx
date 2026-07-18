"use client";

import Hls from "hls.js";
import {
  CheckCircle2,
  FileVideo,
  Folder,
  FolderOpen,
  Play,
  PlayCircle,
  RefreshCw,
  RotateCw,
  ServerCog,
  Trash2,
  Upload,
  Video,
  XCircle,
} from "lucide-react";
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
import { AdminModal, ResourceState } from "./AdminResourceUI";

type Props = { onNotify: (message: string) => void };

type UploadState = {
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "failed";
  error?: string;
};

type RemoteServerConfig = {
  protocol: "sftp" | "sshfs" | "rsync" | "local-mount";
  host: string;
  port: string;
  user: string;
  remoteBasePath: string;
  importRoot: string;
};

const supportedAccept = ".mp4,.mov,.mkv,video/mp4,video/quicktime,video/x-matroska";
const remoteConfigStorageKey = "tvmix-loading-remote-config";

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

function defaultRemoteConfig(): RemoteServerConfig {
  return {
    protocol: "sftp",
    host: "",
    port: "22",
    user: "",
    remoteBasePath: "",
    importRoot: "/srv/tvmix/imports",
  };
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

function mediaPublicBase(video: AdminVideo) {
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

function originalPreviewUrl(video: AdminVideo) {
  if (!video.sourceObjectKey) return null;
  const extension = video.sourceObjectKey.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (!extension || !["mp4", "mov", "m4v", "webm"].includes(extension)) return null;
  return `${mediaPublicBase(video)}/${encodeURI(video.sourceObjectKey.replace(/^\/+/, ""))}`;
}

function playablePreviewUrl(video: AdminVideo) {
  return originalPreviewUrl(video) ?? video.hlsUrl;
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
  const [deleteCandidate, setDeleteCandidate] = useState<AdminVideo | null>(null);
  const [infoVideo, setInfoVideo] = useState<AdminVideo | null>(null);
  const [deleteStorageFiles, setDeleteStorageFiles] = useState(true);
  const [remoteConfig, setRemoteConfig] = useState<RemoteServerConfig>(() => {
    if (typeof window === "undefined") return defaultRemoteConfig();
    try {
      return { ...defaultRemoteConfig(), ...JSON.parse(window.localStorage.getItem(remoteConfigStorageKey) ?? "{}") };
    } catch {
      return defaultRemoteConfig();
    }
  });
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
        setRemoteConfig((current) => current.importRoot === remoteResult.root ? current : { ...current, importRoot: remoteResult.root });
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

  function saveRemoteConfig(next: RemoteServerConfig) {
    setRemoteConfig(next);
    window.localStorage.setItem(remoteConfigStorageKey, JSON.stringify(next));
    onNotify("Parametri server remoto salvati");
  }

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

  async function deleteMedia(video: AdminVideo, deleteFiles: boolean) {
    try {
      await adminRequest(`videos/${video.id}?deleteFiles=${deleteFiles ? "true" : "false"}`, { method: "DELETE" });
      setDeleteCandidate(null);
      onNotify(deleteFiles ? "Media e file storage eliminati" : "Media eliminato dal database");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Eliminazione media non riuscita");
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

      <RemoteServerConfigPanel value={remoteConfig} remoteRoot={remoteRoot} onSave={saveRemoteConfig} />

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

      <LoadingMediaTable
        videos={videos}
        uploads={uploads}
        sessions={sessions}
        transcodes={transcodes}
        onTranscode={startTranscode}
        onInfo={setInfoVideo}
        onDelete={(video) => {
          setDeleteStorageFiles(true);
          setDeleteCandidate(video);
        }}
      />
      {infoVideo ? <LoadingMediaInfoModal video={infoVideo} onClose={() => setInfoVideo(null)} /> : null}
      {deleteCandidate ? (
        <DeleteMediaModal
          video={deleteCandidate}
          deleteFiles={deleteStorageFiles}
          onChangeDeleteFiles={setDeleteStorageFiles}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={() => void deleteMedia(deleteCandidate, deleteStorageFiles)}
        />
      ) : null}
    </div>
  );
}

function RemoteServerConfigPanel({
  value,
  remoteRoot,
  onSave,
}: {
  value: RemoteServerConfig;
  remoteRoot: string;
  onSave: (value: RemoteServerConfig) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function field<K extends keyof RemoteServerConfig>(key: K, next: RemoteServerConfig[K]) {
    setDraft((current) => ({ ...current, [key]: next }));
  }

  return (
    <section className="admin-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="admin-section-title flex items-center gap-2">
            <ServerCog size={18} /> Configurazione server remoto
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Parametri operativi per collegare o sincronizzare un server remoto verso la cartella import letta dal backend.
          </p>
        </div>
        <button type="button" className="admin-primary-button" onClick={() => onSave(draft)}>
          Salva parametri
        </button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-400">Protocollo</span>
          <select
            value={draft.protocol}
            onChange={(event) => field("protocol", event.target.value as RemoteServerConfig["protocol"])}
            className="h-11 w-full rounded-lg border border-[#26394d] bg-[#071321] px-3 text-sm text-white outline-none focus:border-[#22bdf3]"
          >
            <option value="sftp">SFTP</option>
            <option value="sshfs">SSHFS mount</option>
            <option value="rsync">Rsync</option>
            <option value="local-mount">Mount locale</option>
          </select>
        </label>
        <Input label="Host/IP" value={draft.host} onChange={(next) => field("host", next)} placeholder="es. 10.0.0.12" />
        <Input label="Porta" value={draft.port} onChange={(next) => field("port", next)} placeholder="22" />
        <Input label="Utente" value={draft.user} onChange={(next) => field("user", next)} placeholder="media" />
        <Input label="Percorso remoto" value={draft.remoteBasePath} onChange={(next) => field("remoteBasePath", next)} placeholder="/mnt/media/incoming" />
        <Input label="Root import backend" value={draft.importRoot} onChange={(next) => field("importRoot", next)} placeholder={remoteRoot || "/srv/tvmix/imports"} />
      </div>
      <div className="mt-3 rounded-xl border border-[#203248] bg-[#071827] p-3 text-xs text-slate-400">
        Root effettivo letto ora dal backend: <span className="font-mono text-slate-200">{remoteRoot || "non disponibile"}</span>.
        Per l’accesso reale ai server remoti, monta/sincronizza il percorso remoto dentro questo root oppure configura `MEDIA_IMPORT_ROOT` sul server backend.
      </div>
    </section>
  );
}

function LoadingMediaTable({
  videos,
  uploads,
  sessions,
  transcodes,
  onTranscode,
  onInfo,
  onDelete,
}: {
  videos: AdminVideo[];
  uploads: Record<string, UploadState>;
  sessions: MediaUploadSession[];
  transcodes: Record<string, TranscodeStatus>;
  onTranscode: (video: AdminVideo) => void;
  onInfo: (video: AdminVideo) => void;
  onDelete: (video: AdminVideo) => void;
}) {
  const sessionsByFile = useMemo(
    () => new Map(sessions.map((session) => [session.fileName, session])),
    [sessions],
  );

  return (
    <section className="admin-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[1420px] w-full border-collapse text-left text-sm">
          <thead className="bg-[#071827] text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="w-[330px] px-4 py-3 font-semibold">Media originale</th>
              <th className="px-4 py-3 font-semibold">Durata / fps</th>
              <th className="px-4 py-3 font-semibold">Risoluzione / formato</th>
              <th className="px-4 py-3 font-semibold">Audio</th>
              <th className="w-[170px] px-4 py-3 font-semibold">Upload</th>
              <th className="w-[210px] px-4 py-3 font-semibold">Conversione</th>
              <th className="w-[170px] px-4 py-3 font-semibold">HLS</th>
              <th className="px-4 py-3 font-semibold">Catalogo</th>
              <th className="w-[150px] px-4 py-3 text-right font-semibold">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b2b3d]">
            {videos.map((video) => {
              const upload = uploads[video.originalFileName ?? video.title];
              const session = video.originalFileName ? sessionsByFile.get(video.originalFileName) : undefined;
              const uploadPercent = upload?.progress ?? (session ? Math.round((session.uploadedParts.length / Math.max(session.totalParts, 1)) * 100) : video.sourceObjectKey ? 100 : 0);
              const status = transcodes[video.id];
              const conversionPercent = transcodePercent(status) || (video.processingStatus === "READY" ? 100 : 0);
              const converted = Boolean(video.hlsUrl || video.convertedObjectKey || video.processingStatus === "READY");
              return (
                <tr key={video.id} className="align-middle transition hover:bg-[#071827]/70">
                  <td className="px-4 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-[#102238]">
                        <LoadingPreview video={video} />
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <h3 className="max-w-[190px] truncate font-semibold text-white" title={video.originalFileName ?? video.title}>
                          {video.originalFileName ?? video.title}
                        </h3>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatDate(video.createdAt)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {video.uploadedBy ?? "utente non rilevato"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <p className="font-semibold text-slate-200">{formatDuration(video.duration)}</p>
                    <p className="mt-1 text-slate-500">{fpsFromQuality(video.videoQuality)}</p>
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <p className="font-semibold text-slate-200">{resolutionFromQuality(video.videoQuality)}</p>
                    <p className="mt-1 text-slate-500">{video.mediaFormat ?? "—"}</p>
                  </td>
                  <td className="max-w-[170px] px-4 py-4 text-xs text-slate-300">
                    {summarizeAudio(video.audioTracks)}
                  </td>
                  <td className="px-4 py-4">
                    <UploadPresenceIndicator
                      uploaded={Boolean(video.sourceObjectKey) && !session && upload?.status !== "failed"}
                      suspended={Boolean(session)}
                      failed={upload?.status === "failed"}
                      caption={upload?.error ?? (session ? `parti ${session.uploadedParts.length}/${session.totalParts}` : `${Math.round(uploadPercent)}%`)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <ConversionProgress
                      value={conversionPercent}
                      active={["QUEUED", "PROCESSING"].includes(video.processingStatus)}
                      ready={converted}
                      caption={status?.jobState ?? video.processingStatus}
                    />
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <HlsActionButton
                      converted={converted}
                      disabled={!video.sourceObjectKey || ["QUEUED", "PROCESSING"].includes(video.processingStatus)}
                      onClick={() => onTranscode(video)}
                    />
                  </td>
                  <td className="px-4 py-4 text-xs">
                    <CatalogPresenceIndicator video={video} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onInfo(video)}
                        className="admin-secondary-button px-2.5 py-2 text-xs"
                      >
                        Info
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(video)}
                        className="admin-secondary-button px-2.5 py-2 text-xs text-red-300 hover:border-red-400/40 hover:text-red-200"
                      >
                        <Trash2 size={15} /> Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LoadingPreview({ video }: { video: AdminVideo }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const previewUrl = playablePreviewUrl(video);

  useEffect(() => {
    const element = videoRef.current;
    if (!element || !previewUrl) return;
    if (previewUrl.includes(".m3u8") && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(previewUrl);
      hls.attachMedia(element);
      hlsRef.current = hls;
    } else {
      element.src = previewUrl;
    }
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

  if (!previewUrl) {
    return (
      <div className="grid h-full w-full place-items-center text-slate-600">
        <FileVideo size={24} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onMouseEnter={playPreview}
      onMouseLeave={pausePreview}
      onFocus={playPreview}
      onBlur={pausePreview}
      className="group/preview block h-full w-full"
      title="Passa il mouse per vedere l’anteprima"
    >
      <video
        ref={videoRef}
        poster={video.thumbnailUrl ?? undefined}
        muted
        playsInline
        preload="metadata"
        className="h-full w-full object-cover transition duration-300 group-hover/preview:scale-[1.04]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-70" />
      <span className="absolute left-1/2 top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white opacity-0 transition group-hover/preview:opacity-100">
        <Play size={14} fill="currentColor" />
      </span>
    </button>
  );
}

function UploadPresenceIndicator({
  uploaded,
  suspended,
  failed,
  caption,
}: {
  uploaded: boolean;
  suspended: boolean;
  failed: boolean;
  caption?: string;
}) {
  const state = failed
    ? { label: "Errore upload", className: "border-red-400/35 text-red-300", icon: <XCircle size={13} /> }
    : suspended
      ? { label: "Sospeso", className: "border-amber-300/35 text-amber-200", icon: <RotateCw size={13} /> }
      : uploaded
        ? { label: "Caricato", className: "border-emerald-400/40 text-emerald-300", icon: <CheckCircle2 size={13} /> }
        : { label: "Non caricato", className: "border-[#31445a] text-slate-400", icon: <XCircle size={13} /> };
  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${state.className}`}>
        {state.icon}
        {state.label}
      </span>
      {caption ? <p className="max-w-[160px] truncate text-[11px] text-slate-500">{caption}</p> : null}
    </div>
  );
}

function ConversionProgress({
  value,
  active,
  ready,
  caption,
}: {
  value: number;
  active: boolean;
  ready: boolean;
  caption?: string;
}) {
  const displayValue = ready ? 100 : active ? value : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>Conversione</span>
        <span>{ready ? "100%" : active ? `${Math.round(value)}%` : "in attesa"}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-[#f8c14b]/70 bg-transparent">
        <div
          className="h-full rounded-full bg-[#f8c14b] transition-all"
          style={{ width: `${Math.max(0, Math.min(100, displayValue))}%` }}
        />
      </div>
      <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{ready ? "READY" : active ? caption : "non avviata"}</p>
    </div>
  );
}

function HlsActionButton({
  converted,
  disabled,
  onClick,
}: {
  converted: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || converted}
      onClick={onClick}
      className={`admin-secondary-button w-full justify-center px-2.5 py-2 text-xs disabled:opacity-70 ${
        converted ? "border-emerald-400/40 text-emerald-300" : "border-[#f8c14b]/45 text-[#f8c14b]"
      }`}
      title={converted ? "File HLS già convertito" : "Avvia conversione HLS"}
    >
      {converted ? <CheckCircle2 size={15} /> : <PlayCircle size={15} />}
      {converted ? "Convertito" : "Converti"}
    </button>
  );
}

function CatalogPresenceIndicator({ video }: { video: AdminVideo }) {
  const cataloged = Boolean(video.seasonId || video.episodeCode || video.episodeNumber);
  return (
    <div className="space-y-1">
      <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${cataloged ? "border-[#22bdf3]/45 text-[#22bdf3]" : "border-[#31445a] text-slate-400"}`}>
        {cataloged ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
        {cataloged ? "In catalogo" : "Non in catalogo"}
      </span>
      <p className="max-w-[180px] truncate font-mono text-[11px] text-slate-500">
        {cataloged ? "dettagli in Info" : "nessuna serie/puntata"}
      </p>
    </div>
  );
}

function LoadingMediaInfoModal({ video, onClose }: { video: AdminVideo; onClose: () => void }) {
  return (
    <AdminModal title="Info media Loading" onClose={onClose}>
      <div className="space-y-4 text-sm text-slate-300">
        <div>
          <h4 className="font-semibold text-white">{video.originalFileName ?? video.title}</h4>
          <p className="mt-1 text-xs text-slate-500">{formatDate(video.createdAt)}</p>
          <p className="mt-0.5 text-xs text-slate-500">{video.uploadedBy ?? "utente non rilevato"}</p>
        </div>
        <div className="grid gap-2">
          <InfoRow label="Percorso originale" value={video.sourceObjectKey ?? "non disponibile"} />
          <InfoRow label="Percorso HLS/master" value={video.convertedObjectKey ?? video.hlsUrl ?? "non convertito"} />
          <InfoRow label="ID stagione/serie" value={video.seasonId ?? "non catalogato"} />
          <InfoRow label="Numero episodio" value={video.episodeNumber ? String(video.episodeNumber) : "non assegnato"} />
          <InfoRow label="Codice episodio" value={video.episodeCode ?? "non assegnato"} />
          <InfoRow label="Categoria" value={video.category?.name ?? video.categoryId} />
          <InfoRow label="Slug" value={`#${video.slug}`} />
        </div>
      </div>
    </AdminModal>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#203248] bg-[#071827] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-all font-mono text-xs text-slate-200">{value}</p>
    </div>
  );
}

function DeleteMediaModal({
  video,
  deleteFiles,
  onChangeDeleteFiles,
  onClose,
  onConfirm,
}: {
  video: AdminVideo;
  deleteFiles: boolean;
  onChangeDeleteFiles: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AdminModal title="Elimina media" onClose={onClose}>
      <div className="space-y-4 text-sm text-slate-300">
        <p>
          Confermi l’eliminazione di <span className="font-semibold text-white">{video.originalFileName ?? video.title}</span>?
        </p>
        <label className="flex items-start gap-3 rounded-xl border border-[#203248] bg-[#071827] p-3">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(event) => onChangeDeleteFiles(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block font-semibold text-white">Cancella anche il file nello storage</span>
            <span className="mt-1 block text-xs text-slate-500">
              Se attivo, vengono rimossi originale, HLS/master e thumbnail collegati. Se disattivo, viene cancellato solo il record dal database.
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="admin-secondary-button">
            Annulla
          </button>
          <button type="button" onClick={onConfirm} className="admin-primary-button bg-red-500 hover:bg-red-400">
            Elimina
          </button>
        </div>
      </div>
    </AdminModal>
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

function ProgressRow({
  label,
  value,
  color,
  caption,
  compact,
}: {
  label: string;
  value: number;
  color: "blue" | "yellow";
  caption?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "mt-3"}>
      <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
        <span>{label}</span>
        <span>{Math.round(value)}%</span>
      </div>
      <div className={`${compact ? "h-1.5" : "h-2"} overflow-hidden rounded-full bg-[#132438]`}>
        <div
          className={["h-full rounded-full transition-all", color === "blue" ? "bg-[#22bdf3]" : "bg-[#f8c14b]"].join(" ")}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {caption ? <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{caption}</p> : null}
    </div>
  );
}

function resolutionFromQuality(value: string | null) {
  if (!value) return "—";
  return value.split("·")[0]?.trim() || value;
}

function fpsFromQuality(value: string | null) {
  if (!value?.includes("fps")) return "fps non rilevato";
  return value.split("·").find((part) => part.includes("fps"))?.trim() ?? "fps non rilevato";
}

function summarizeAudio(value: unknown) {
  if (!Array.isArray(value) || !value.length) return "—";
  return value.map((track, index) => {
    if (!track || typeof track !== "object") return `Traccia ${index + 1}`;
    const item = track as { codec?: string; channels?: number; layout?: string };
    return [item.codec, item.channels ? `${item.channels}ch` : item.layout].filter(Boolean).join(" ");
  }).join(", ");
}
