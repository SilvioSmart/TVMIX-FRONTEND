import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL, SESSION_COOKIE } from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxy(request: Request, context: RouteContext) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Sessione non valida" }, { status: 401 });
  }

  const { path } = await context.params;
  const sourceUrl = new URL(request.url);
  const targetUrl = `${API_BASE_URL}/admin/${path.join("/")}${sourceUrl.search}`;
  const method = request.method;
  const body = method === "GET" || method === "DELETE" ? undefined : await request.text();

  try {
    const response = await fetch(targetUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
    });
    const responseBody = await response.text();

    if (response.status === 401) {
      const expired = NextResponse.json(
        { error: "Sessione scaduta. Effettua nuovamente l'accesso." },
        { status: 401 },
      );
      expired.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return expired;
    }

    return new NextResponse(responseBody || null, {
      status: response.status,
      headers: responseBody
        ? { "Content-Type": response.headers.get("Content-Type") ?? "application/json" }
        : undefined,
    });
  } catch {
    return NextResponse.json(
      { error: "API amministrativa non raggiungibile" },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
