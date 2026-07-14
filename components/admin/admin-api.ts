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
  description: string | null;
  thumbnailUrl: string | null;
  hlsUrl: string | null;
  sourceObjectKey: string | null;
  originalFileName: string | null;
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
  video?: Pick<Video, "id" | "title" | "slug" | "thumbnailUrl" | "hlsUrl" | "duration" | "category"> | null;
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

export type HomeModuleType = "CAROUSEL_SLIDER" | "LIVE_EPG" | "POSTER_RAIL";
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
};

type MultipartUploadedPart = {
  partNumber: number;
  etag: string;
};

type MultipartCompleteResponse = {
  uploadId: string;
  objectKey: string;
  originalFileName: string;
};

const UPLOAD_API_URL = process.env.NEXT_PUBLIC_UPLOAD_API_URL?.replace(/\/$/, "");

function adminUploadUrl(path: string) {
  return `${UPLOAD_API_URL ?? ""}/api/admin/uploads/${path.replace(/^\//, "")}`;
}

async function multipartRequest<T>(
  action: "create" | "complete" | "abort",
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
): Promise<{ uploadId: string; objectKey: string; originalFileName: string }> {
  const created = await multipartRequest<MultipartCreateResponse>("create", {
    fileName: file.name,
    contentType: file.type,
    size: file.size,
    ...(videoId ? { videoId } : {}),
  });

  const loadedByPart = new Map<number, number>();
  const updateProgress = (partNumber: number, loaded: number) => {
    loadedByPart.set(partNumber, loaded);
    const totalLoaded = [...loadedByPart.values()].reduce((sum, value) => sum + value, 0);
    onProgress(Math.min(99, Math.round((totalLoaded / file.size) * 100)));
  };

  try {
    const parts: MultipartUploadedPart[] = [];
    for (let partNumber = 1; partNumber <= created.totalParts; partNumber += 1) {
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
      contentType: file.type,
      size: file.size,
      parts,
    });

    onProgress(100);
    return {
      uploadId: created.uploadId,
      objectKey: completed.objectKey,
      originalFileName: completed.originalFileName,
    };
  } catch (error) {
    await multipartRequest("abort", {
      uploadId: created.multipartUploadId,
      objectKey: created.objectKey,
    }).catch(() => undefined);
    throw error;
  }
}

export async function uploadMediaAssetToR2(
  file: File,
  onProgress: (percentage: number) => void,
  scope: "slide" | "thumbnail" | "locandina",
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
