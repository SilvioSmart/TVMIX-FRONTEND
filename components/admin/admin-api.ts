export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { videos: number };
};

export type Video = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  vastUrl: string | null;
  sourceObjectKey: string | null;
  originalFileName: string | null;
  uploadedBy: string | null;
  processingStatus:
    | "PENDING"
    | "UPLOADING"
    | "UPLOADED"
    | "QUEUED"
    | "PROCESSING"
    | "READY"
    | "FAILED";
  processingError: string | null;
  duration: number | null;
  mediaFormat: string | null;
  videoQuality: string | null;
  audioTracks: unknown;
  convertedObjectKey: string | null;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  categoryId: string;
  category: Pick<Category, "id" | "name" | "slug">;
  season: CatalogSeason | null;
  seasonId: string | null;
  episodeNumber: number | null;
  episodeCode: string | null;
};

export type CatalogEpisode = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  published: boolean;
  processingStatus: Video["processingStatus"];
};

export type CatalogSeason = {
  id: string;
  number: number;
  title: string | null;
  programId: string;
  program?: Pick<CatalogProgram, "id" | "name" | "slug" | "categoryId">;
  episodes: CatalogEpisode[];
};

export type CatalogProgram = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  category?: Pick<Category, "id" | "name" | "slug">;
  seasons: CatalogSeason[];
};

export type CatalogCategory = Category & {
  programs: CatalogProgram[];
  _count: { videos: number; programs: number };
};

export type CatalogAvailableEpisode = {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  seasonId: string | null;
  category: { id: string; name: string };
};

export type NoticeArticle = {
  id: string;
  category: string;
  categoryId: string | null;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  imageUrl: string;
  imageObjectKey: string | null;
  vastUrl: string | null;
  sortOrder: number;
  published: boolean;
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  newsCategory?: NewsCategory | null;
};

export type NewsCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { notices: number };
};

export type Tg9Video = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  videoUrl: string;
  videoObjectKey: string | null;
  posterUrl: string | null;
  subtitlesUrl: string | null;
  sortOrder: number;
  published: boolean;
  publishedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { subclips: number };
};

export type Tg9Subclip = {
  id: string;
  tg9VideoId: string;
  title: string | null;
  slug: string | null;
  vastUrl: string | null;
  startTime: number;
  endTime: number;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LiveStream = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  streamType: "LIVE_STREAMING" | "PLAYLIST";
  hlsUrl: string;
  status: "OFFLINE" | "LIVE" | "SCHEDULED";
  posterUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
};

export type LiveEpgItem = {
  id: string;
  liveStreamId: string;
  videoId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  thumbnailUrl: string | null;
  video?: Pick<Video, "id" | "title" | "slug" | "thumbnailUrl" | "hlsUrl" | "vastUrl" | "duration" | "category"> | null;
  liveStream?: Pick<LiveStream, "id" | "name" | "slug">;
  createdAt: string;
  updatedAt: string;
};

export type PlatformUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "EDITOR" | "ADMIN";
  permissions: UserPermission[];
  emailVerifiedAt: string | null;
  emailVerificationExpires: string | null;
  passwordResetExpires: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserPermission =
  | "CONTENT_VIEW"
  | "CONTENT_MANAGE"
  | "CATALOG_MANAGE"
  | "LIVE_MANAGE"
  | "APPEARANCE_MANAGE"
  | "USERS_MANAGE"
  | "SETTINGS_MANAGE"
  | "HLS_MANAGE"
  | "VAST_MANAGE";

export type UserPermissionConfig = {
  data: { key: UserPermission; label: string }[];
  defaults: Record<PlatformUser["role"], UserPermission[]>;
};

export type AppearanceMenuKey = "logo-name" | "menu" | "carousel" | "modules" | "footer";

export type AppearanceMenuItem = {
  key: AppearanceMenuKey;
  label: string;
  description: string | null;
  sortOrder: number;
  enabled: boolean;
};

export type AppearanceBrandSettings = {
  id: string;
  platformName: string;
  logoUrl: string | null;
  logoObjectKey: string | null;
  faviconUrl: string | null;
  faviconObjectKey: string | null;
  defaultThumbnailUrl: string | null;
  defaultThumbnailObjectKey: string | null;
  defaultSignalUrl: string | null;
  defaultSignalObjectKey: string | null;
  accentColor: string;
  createdAt: string;
  updatedAt: string;
};

export type AppearanceBrandInput = Partial<
  Pick<
    AppearanceBrandSettings,
    | "platformName"
    | "logoUrl"
    | "logoObjectKey"
    | "faviconUrl"
    | "faviconObjectKey"
    | "defaultThumbnailUrl"
    | "defaultThumbnailObjectKey"
    | "defaultSignalUrl"
    | "defaultSignalObjectKey"
    | "accentColor"
  >
>;

export async function fetchAppearanceBrand(): Promise<AppearanceBrandSettings> {
  const response = await adminRequest<{ data: AppearanceBrandSettings }>("appearance/brand");
  return response.data;
}

export async function updateAppearanceBrand(input: AppearanceBrandInput): Promise<AppearanceBrandSettings> {
  const response = await adminRequest<{ data: AppearanceBrandSettings }>("appearance/brand", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return response.data;
}

export type HomeModuleType = "CAROUSEL_SLIDER" | "LIVE_EPG" | "POSTER_RAIL" | "PROMOTIONS";
export type HomeModuleQueryType = "LATEST" | "CATEGORY" | "PROGRAM" | "SEASON" | "MANUAL" | "LIVE";
export type HomeModuleSortMethod = "RECENT" | "OLDEST" | "TITLE_ASC";

export type HomeModule = {
  id: string;
  title: string;
  subtitle: string | null;
  type: HomeModuleType;
  queryType: HomeModuleQueryType;
  sortMethod: HomeModuleSortMethod;
  sortOrder: number;
  enabled: boolean;
  limit: number;
  categoryId: string | null;
  programId: string | null;
  seasonId: string | null;
  liveStreamId: string | null;
  category?: Pick<Category, "id" | "name" | "slug"> | null;
  program?: Pick<CatalogProgram, "id" | "name" | "slug"> | null;
  season?: Pick<CatalogSeason, "id" | "number" | "title"> | null;
  liveStream?: Pick<LiveStream, "id" | "name" | "slug"> | null;
};

export type FrontendMenuPlacement = "HEADER" | "FOOTER" | "MOBILE";

export type FrontendMenuItem = {
  id: string;
  label: string;
  url: string;
  placement: FrontendMenuPlacement;
  placements: FrontendMenuPlacement[];
  sortOrder: number;
  enabled: boolean;
  external: boolean;
  parentId: string | null;
  parent?: { id: string; label: string } | null;
  _count?: { children: number };
  createdAt: string;
  updatedAt: string;
};

export type HomepageCarouselSlide = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  sortOrder: number;
  published: boolean;
  startsAt: string | null;
  endsAt: string | null;
  videoId: string | null;
  video?: { id: string; title: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type ListResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type ApiError = {
  error?: string;
  details?: Record<string, string[]>;
};

export type PresignedUpload = {
  uploadId: string;
  objectKey: string;
  uploadUrl: string;
  expiresIn: number;
  requiredHeaders: Record<string, string>;
};

type MultipartCreateResponse = {
  uploadId: string;
  multipartUploadId: string;
  objectKey: string;
  partSize: number;
  totalParts: number;
  uploadedParts?: MultipartUploadedPart[];
  size?: number;
  resumable?: boolean;
};

type MultipartUploadedPart = {
  partNumber: number;
  etag: string;
  size?: number;
};

type MultipartCompleteResponse = {
  uploadId: string;
  objectKey: string;
  publicUrl: string;
  originalFileName: string;
};

export type MediaUploadSession = {
  id: string;
  logicalUploadId: string;
  multipartUploadId: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  size: number;
  partSize: number;
  totalParts: number;
  uploadedParts: Array<{ partNumber: number; etag: string; size?: number }>;
  status: "IN_PROGRESS" | "COMPLETED" | "ABORTED" | "FAILED";
  error: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  abortedAt: string | null;
};

export type RemoteMediaFile = {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number | null;
  supported: boolean;
  updatedAt: string;
};

export type TranscodeStatus = {
  videoId: string;
  processingStatus: Video["processingStatus"];
  processingError: string | null;
  duration: number | null;
  jobId: string | null;
  jobState: string | null;
  progress: unknown;
};

export type RouteConfig = {
  id: string;
  name: string;
  protocol: "SSH" | "SFTP" | "FTP" | "RSYNC" | "SSHFS" | "LOCAL" | "SMB" | "NFS";
  host: string | null;
  port: number | null;
  username: string | null;
  authMode: "KEY" | "PASSWORD" | "AGENT" | "MOUNT" | "NONE" | null;
  hasSecret?: boolean;
  remotePath: string | null;
  importPath: string;
  enabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RouteConfigInput = Omit<RouteConfig, "id" | "createdAt" | "updatedAt" | "hasSecret"> & {
  connectionUrl?: string;
  passwordSecret?: string | null;
};

const UPLOAD_API_URL = process.env.NEXT_PUBLIC_UPLOAD_API_URL?.replace(/\/$/, "");

function mediaContentType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (file.type) return file.type;
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  if (extension === "mkv") return "video/x-matroska";
  return "application/octet-stream";
}

function adminUploadUrl(path: string) {
  return `${UPLOAD_API_URL ?? ""}/api/admin/uploads/${path.replace(/^\//, "")}`;
}

async function multipartRequest<T>(
  action: "create" | "complete" | "abort" | "resume",
  body: unknown,
): Promise<T> {
  const response = await fetch(adminUploadUrl(`multipart/${action}`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    throw new Error((payload as ApiError | null)?.error ?? `Upload multipart non riuscito (${response.status})`);
  }

  return payload as T;
}

export async function listSuspendedUploads(): Promise<MediaUploadSession[]> {
  const response = await fetch(adminUploadUrl("multipart/sessions?status=IN_PROGRESS&limit=100"), {
    credentials: "include",
    headers: { accept: "application/json" },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload as ApiError).error ?? `Caricamento upload sospesi non riuscito (${response.status})`);
  }
  return (payload as { data: MediaUploadSession[] }).data;
}

export async function refreshMultipartUpload(logicalUploadId: string): Promise<MediaUploadSession> {
  const response = await multipartRequest<{ data: MediaUploadSession }>("resume", { logicalUploadId });
  return response.data;
}

export async function abortMultipartUpload(session: Pick<MediaUploadSession, "multipartUploadId" | "objectKey">): Promise<void> {
  await multipartRequest("abort", {
    uploadId: session.multipartUploadId,
    objectKey: session.objectKey,
  });
}

export async function registerOriginalMedia(input: {
  objectKey: string;
  fileName: string;
  contentType: string;
  size: number;
  duration?: number | null;
  mediaFormat?: string | null;
  videoQuality?: string | null;
  audioTracks?: unknown;
}): Promise<Video> {
  const response = await fetch(adminUploadUrl("register-original"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload as ApiError).error ?? `Registrazione originale non riuscita (${response.status})`);
  }
  return (payload as { data: Video }).data;
}

export async function listRemoteMediaFiles(path = ""): Promise<{ root: string; path: string; data: RemoteMediaFile[] }> {
  const params = new URLSearchParams({ path });
  const response = await fetch(adminUploadUrl(`remote-files?${params.toString()}`), {
    credentials: "include",
    headers: { accept: "application/json" },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload as ApiError).error ?? `Lettura cartella remota non riuscita (${response.status})`);
  }
  return payload as { root: string; path: string; data: RemoteMediaFile[] };
}

export async function importRemoteMedia(path: string): Promise<Video> {
  const response = await fetch(adminUploadUrl("remote-import"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload as ApiError).error ?? `Import remoto non riuscito (${response.status})`);
  }
  return (payload as { data: Video }).data;
}

export async function getTranscodeStatus(videoId: string): Promise<TranscodeStatus> {
  const payload = await adminRequest<{ data: TranscodeStatus }>(`videos/${videoId}/transcode-status`);
  return payload.data;
}

export async function listRouteConfigs(): Promise<RouteConfig[]> {
  const payload = await adminRequest<{ data: RouteConfig[] }>("route-configs");
  return payload.data;
}

export async function saveRouteConfig(input: RouteConfigInput, id?: string): Promise<RouteConfig> {
  const payload = await adminRequest<{ data: RouteConfig }>(id ? `route-configs/${id}` : "route-configs", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
  return payload.data;
}

export async function deleteRouteConfig(id: string): Promise<void> {
  await adminRequest(`route-configs/${id}`, { method: "DELETE" });
}

export async function listRouteFiles(routeId: string, path = ""): Promise<{ root: string; path: string; data: RemoteMediaFile[] }> {
  const params = new URLSearchParams({ path });
  return adminRequest<{ root: string; path: string; data: RemoteMediaFile[] }>(`route-configs/${routeId}/files?${params.toString()}`);
}

export async function importRouteFile(routeId: string, path: string): Promise<Video> {
  const payload = await adminRequest<{ data: Video }>(`route-configs/${routeId}/import`, {
    method: "POST",
    body: JSON.stringify({ path }),
  });
  return payload.data;
}

function uploadMultipartPart(
  file: File,
  start: number,
  end: number,
  partNumber: number,
  multipartUploadId: string,
  objectKey: string,
  onPartProgress: (loaded: number) => void,
): Promise<MultipartUploadedPart> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", adminUploadUrl("multipart/part"));
    request.withCredentials = true;
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.setRequestHeader("X-Multipart-Upload-Id", multipartUploadId);
    request.setRequestHeader("X-Object-Key", objectKey);
    request.setRequestHeader("X-Part-Number", String(partNumber));
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onPartProgress(event.loaded);
    };
    request.onload = () => {
      let payload: { error?: string; partNumber?: number; etag?: string };
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = {};
      }

      if (request.status >= 200 && request.status < 300 && payload.partNumber && payload.etag) {
        onPartProgress(end - start);
        resolve({ partNumber: payload.partNumber, etag: payload.etag });
      } else {
        reject(new Error(payload.error ?? `Upload parte ${partNumber} non riuscito (${request.status})`));
      }
    };
    request.onerror = () => reject(new Error(`Connessione interrotta durante la parte ${partNumber}`));
    request.send(file.slice(start, end));
  });
}

export async function uploadFileToR2(
  file: File,
  onProgress: (percentage: number) => void,
  videoId?: string,
  options?: {
    resumeSession?: MediaUploadSession;
    keepSessionOnFailure?: boolean;
    scope?: "video" | "tg9_video";
  },
): Promise<{ uploadId: string; objectKey: string; publicUrl?: string; originalFileName: string }> {
  if (options?.resumeSession) {
    if (options.resumeSession.fileName !== file.name) {
      throw new Error(`Seleziona lo stesso file originale: ${options.resumeSession.fileName}`);
    }
    if (options.resumeSession.size !== file.size) {
      throw new Error("Il file selezionato ha una dimensione diversa dall'upload sospeso");
    }
    if (options.resumeSession.contentType && mediaContentType(file) && options.resumeSession.contentType !== mediaContentType(file)) {
      throw new Error("Il file selezionato ha un formato diverso dall'upload sospeso");
    }
  }
  const contentType = mediaContentType(file);

  const logicalUploadId = videoId ?? options?.resumeSession?.logicalUploadId;
  const created = await multipartRequest<MultipartCreateResponse>("create", {
    fileName: file.name,
    contentType,
    size: file.size,
    scope: options?.scope ?? "video",
    ...(logicalUploadId ? { videoId: logicalUploadId } : {}),
  });
  const alreadyUploaded = new Map<number, MultipartUploadedPart>(
    (created.uploadedParts ?? options?.resumeSession?.uploadedParts ?? []).map((part) => [part.partNumber, part]),
  );

  const loadedByPart = new Map<number, number>();
  for (const [partNumber, part] of alreadyUploaded) {
    loadedByPart.set(partNumber, part.size ?? Math.min(created.partSize, Math.max(file.size - (partNumber - 1) * created.partSize, 0)));
  }
  const updateProgress = (partNumber: number, loaded: number) => {
    loadedByPart.set(partNumber, loaded);
    const totalLoaded = [...loadedByPart.values()].reduce((sum, value) => sum + value, 0);
    onProgress(Math.min(99, Math.round((totalLoaded / file.size) * 100)));
  };

  try {
    const parts: MultipartUploadedPart[] = [...alreadyUploaded.values()];
    if (parts.length) {
      const totalLoaded = [...loadedByPart.values()].reduce((sum, value) => sum + value, 0);
      onProgress(Math.min(99, Math.round((totalLoaded / file.size) * 100)));
    }
    for (let partNumber = 1; partNumber <= created.totalParts; partNumber += 1) {
      if (alreadyUploaded.has(partNumber)) continue;
      const start = (partNumber - 1) * created.partSize;
      const end = Math.min(start + created.partSize, file.size);
      parts.push(
        await uploadMultipartPart(
          file,
          start,
          end,
          partNumber,
          created.multipartUploadId,
          created.objectKey,
          (loaded) => updateProgress(partNumber, loaded),
        ),
      );
    }

    const completed = await multipartRequest<MultipartCompleteResponse>("complete", {
      uploadId: created.multipartUploadId,
      objectKey: created.objectKey,
      fileName: file.name,
      contentType,
      size: file.size,
      scope: options?.scope ?? "video",
      parts,
    });

    onProgress(100);
    return {
      uploadId: created.uploadId,
      objectKey: completed.objectKey,
      publicUrl: completed.publicUrl,
      originalFileName: completed.originalFileName,
    };
  } catch (error) {
    if (!options?.keepSessionOnFailure) {
      await multipartRequest("abort", {
        uploadId: created.multipartUploadId,
        objectKey: created.objectKey,
      }).catch(() => undefined);
    }
    throw error;
  }
}

export async function uploadMediaAssetToR2(
  file: File,
  onProgress: (percentage: number) => void,
  scope:
    | "slide"
    | "thumbnail"
    | "locandina"
    | "notice_slide"
    | "tg9_video"
    | "brand_logo"
    | "brand_favicon"
    | "brand_default_thumbnail"
    | "brand_default_signal",
): Promise<{ uploadId: string; objectKey: string; publicUrl: string; originalFileName: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", adminUploadUrl("file"));
    request.withCredentials = true;
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    request.setRequestHeader("X-Upload-Scope", scope);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let payload: {
        error?: string;
        uploadId?: string;
        objectKey?: string;
        publicUrl?: string;
        originalFileName?: string;
      };
      try {
        payload = JSON.parse(request.responseText);
      } catch {
        payload = {};
      }
      if (
        request.status >= 200 &&
        request.status < 300 &&
        payload.uploadId &&
        payload.objectKey &&
        payload.publicUrl &&
        payload.originalFileName
      ) {
        resolve({
          uploadId: payload.uploadId,
          objectKey: payload.objectKey,
          publicUrl: payload.publicUrl,
          originalFileName: payload.originalFileName,
        });
      } else {
        reject(new Error(payload.error ?? `Upload media ${scope} non riuscito (${request.status})`));
      }
    };
    request.onerror = () => reject(new Error("Connessione al servizio upload interrotta"));
    request.send(file);
  });
}

export async function uploadSlideMediaToR2(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<{ uploadId: string; objectKey: string; publicUrl: string; originalFileName: string }> {
  return uploadMediaAssetToR2(file, onProgress, "slide");
}

export async function uploadNoticeImageToR2(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<{ uploadId: string; objectKey: string; publicUrl: string; originalFileName: string }> {
  return uploadMediaAssetToR2(file, onProgress, "notice_slide");
}

export async function uploadBrandAssetToR2(
  file: File,
  onProgress: (percentage: number) => void,
  kind: "logo" | "favicon" | "default-thumbnail" | "default-signal",
): Promise<{ uploadId: string; objectKey: string; publicUrl: string; originalFileName: string }> {
  const scope =
    kind === "logo"
      ? "brand_logo"
      : kind === "favicon"
        ? "brand_favicon"
        : kind === "default-thumbnail"
          ? "brand_default_thumbnail"
          : "brand_default_signal";
  return uploadMediaAssetToR2(file, onProgress, scope);
}

export async function importNoticeImageFromUrl(
  url: string,
): Promise<{ uploadId: string; objectKey: string; publicUrl: string; originalFileName: string }> {
  const response = await fetch(adminUploadUrl("remote-image"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, scope: "notice_slide" }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error((payload as ApiError).error ?? `Import immagine remota non riuscito (${response.status})`);
  }
  return payload as { uploadId: string; objectKey: string; publicUrl: string; originalFileName: string };
}

export async function uploadTg9VideoToR2(
  file: File,
  onProgress: (percentage: number) => void,
): Promise<{ uploadId: string; objectKey: string; publicUrl: string; originalFileName: string }> {
  const uploaded = await uploadFileToR2(file, onProgress, undefined, { scope: "tg9_video" });
  if (!uploaded.publicUrl) throw new Error("Upload TG9 completato senza URL pubblico");
  return {
    uploadId: uploaded.uploadId,
    objectKey: uploaded.objectKey,
    publicUrl: uploaded.publicUrl,
    originalFileName: uploaded.originalFileName,
  };
}

export async function adminRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json();

  if (!response.ok) {
    if (response.status === 401) window.location.assign("/login");
    throw new Error((payload as ApiError | null)?.error ?? "Operazione non riuscita");
  }

  return payload as T;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
