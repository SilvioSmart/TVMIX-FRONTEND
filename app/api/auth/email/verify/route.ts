import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/admin-auth";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token mancante" }, { status: 400 });

  try {
    const response = await fetch(`${API_BASE_URL}/auth/email/verify/${encodeURIComponent(token)}`, {
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Servizio verifica email non disponibile" }, { status: 503 });
  }
}
