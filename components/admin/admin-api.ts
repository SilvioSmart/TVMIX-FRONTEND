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
  hlsUrl: string;
  status: "OFFLINE" | "LIVE" | "SCHEDULED";
  posterUrl: string | null;
  startedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
};

export type PlatformUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "EDITOR" | "ADMIN";
  createdAt: string;
  updatedAt: string;
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
  liveStreamId: string | null;
  category?: Pick<Category, "id" | "name" | "slug"> | null;
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

export async function uploadFileToR2(
  file: File,
  onProgress: (percentage: number) => void,
  videoId?: string,
): Promise<{ uploadId: string; objectKey: string; originalFileName: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/uploads/file");
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    if (videoId) request.setRequestHeader("X-Video-Id", videoId);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      let payload: { error?: string; uploadId?: string; objectKey?: string; originalFileName?: string };
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
        payload.originalFileName
      ) {
        resolve({
          uploadId: payload.uploadId,
          objectKey: payload.objectKey,
          originalFileName: payload.originalFileName,
        });
      } else {
        reject(new Error(payload.error ?? `Upload R2 non riuscito (${request.status})`));
      }
    };
    request.onerror = () => reject(new Error("Connessione al servizio upload interrotta"));
    request.send(file);
  });
}

export async function uploadMediaAssetToR2(
  file: File,
  onProgress: (percentage: number) => void,
  scope: "slide" | "thumbnail" | "locandina",
): Promise<{ uploadId: string; objectKey: string; publicUrl: string; originalFileName: string }> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/admin/uploads/file");
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
