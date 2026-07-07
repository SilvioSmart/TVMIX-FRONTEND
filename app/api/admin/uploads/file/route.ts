import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL, SESSION_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_UPLOAD_ORIGINS = [
  "https://api.tvmix.it",
  "https://www.tvmix.it",
  "https://upload.tvmix.it",
];

function allowedUploadOrigins() {
  return (
    process.env.TVMIX_UPLOAD_CORS_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? DEFAULT_UPLOAD_ORIGINS
  );
}

function uploadCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    Vary: "Origin",
  });

  if (origin && allowedUploadOrigins().includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Content-Length, X-File-Name, X-Video-Id, X-Upload-Scope",
    );
    headers.set("Access-Control-Max-Age", "86400");
  }

  return headers;
}

function jsonWithCors(request: Request, body: unknown, init: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: uploadCorsHeaders(request),
  });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: uploadCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return jsonWithCors(request, { error: "Sessione non valida" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type");
  const contentLength = request.headers.get("content-length");
  const fileName = request.headers.get("x-file-name");

  if (!request.body || !contentType || !contentLength || !fileName) {
    return jsonWithCors(request, { error: "Dati upload non validi" }, { status: 400 });
  }

  try {
    const response = await fetch(`${API_BASE_URL}/admin/uploads/file`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": contentType,
        "Content-Length": contentLength,
        "X-File-Name": fileName,
        ...(request.headers.get("x-video-id")
          ? { "X-Video-Id": request.headers.get("x-video-id")! }
          : {}),
        ...(request.headers.get("x-upload-scope")
          ? { "X-Upload-Scope": request.headers.get("x-upload-scope")! }
          : {}),
      },
      body: request.body,
      // Necessario in Node.js per inoltrare un ReadableStream senza buffering.
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const headers = uploadCorsHeaders(request);
    headers.set(
      "Content-Type",
      response.headers.get("content-type") ?? "application/json",
    );

    return new NextResponse(await response.text(), {
      status: response.status,
      headers,
    });
  } catch {
    return jsonWithCors(
      request,
      { error: "Connessione al servizio upload non disponibile" },
      { status: 503 },
    );
  }
}
