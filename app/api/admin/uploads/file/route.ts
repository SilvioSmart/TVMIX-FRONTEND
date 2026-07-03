import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL, SESSION_COOKIE } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type");
  const contentLength = request.headers.get("content-length");
  const fileName = request.headers.get("x-file-name");

  if (!request.body || !contentType || !contentLength || !fileName) {
    return NextResponse.json({ error: "Dati upload non validi" }, { status: 400 });
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

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Connessione al servizio upload non disponibile" },
      { status: 503 },
    );
  }
}
