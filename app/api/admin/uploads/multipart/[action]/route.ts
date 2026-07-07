import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL, SESSION_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ action: string }>;
};

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
  const headers = new Headers({ Vary: "Origin" });

  if (origin && allowedUploadOrigins().includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      [
        "Content-Type",
        "Content-Length",
        "X-Multipart-Upload-Id",
        "X-Object-Key",
        "X-Part-Number",
      ].join(", "),
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

export async function POST(request: Request, context: RouteContext) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return jsonWithCors(request, { error: "Sessione non valida" }, { status: 401 });
  }

  const { action } = await context.params;
  if (!["create", "part", "complete", "abort"].includes(action)) {
    return jsonWithCors(request, { error: "Azione multipart non valida" }, { status: 404 });
  }

  try {
    const headers = new Headers({
      Authorization: `Bearer ${token}`,
    });
    let body: BodyInit | null;

    if (action === "part") {
      const contentLength = request.headers.get("content-length");
      const uploadId = request.headers.get("x-multipart-upload-id");
      const objectKey = request.headers.get("x-object-key");
      const partNumber = request.headers.get("x-part-number");

      if (!request.body || !uploadId || !objectKey || !partNumber) {
        return jsonWithCors(request, { error: "Dati parte multipart non validi" }, { status: 400 });
      }

      headers.set("Content-Type", "application/octet-stream");
      if (contentLength) headers.set("Content-Length", contentLength);
      headers.set("X-Multipart-Upload-Id", uploadId);
      headers.set("X-Object-Key", objectKey);
      headers.set("X-Part-Number", partNumber);
      body = request.body;
    } else {
      headers.set("Content-Type", "application/json");
      body = await request.text();
    }

    const response = await fetch(`${API_BASE_URL}/admin/uploads/multipart/${action}`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
      duplex: action === "part" ? "half" : undefined,
    } as RequestInit & { duplex?: "half" });

    const responseHeaders = uploadCorsHeaders(request);
    const contentType = response.headers.get("content-type");
    if (contentType) responseHeaders.set("Content-Type", contentType);

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return jsonWithCors(
      request,
      { error: "Connessione al servizio upload multipart non disponibile" },
      { status: 503 },
    );
  }
}
