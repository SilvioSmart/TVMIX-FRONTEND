import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/admin-auth";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Servizio recupero password non disponibile" }, { status: 503 });
  }
}
