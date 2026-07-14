import { NextResponse } from "next/server";
import {
  API_BASE_URL,
  SESSION_COOKIE,
  SESSION_COOKIE_DOMAIN,
  canAccessAdminPanel,
  type AdminUser,
} from "@/lib/admin-auth";

type LoginPayload = {
  user?: AdminUser;
  accessToken?: string;
  error?: string;
};

export async function POST(request: Request) {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  }

  try {
    const apiResponse = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });
    const payload = (await apiResponse.json()) as LoginPayload;

    if (!apiResponse.ok || !payload.accessToken || !payload.user) {
      return NextResponse.json(
        { error: payload.error ?? "Accesso non riuscito" },
        { status: apiResponse.status || 401 },
      );
    }

    if (!canAccessAdminPanel(payload.user)) {
      return NextResponse.json(
        { error: "Questo account non dispone dei permessi per accedere al pannello" },
        { status: 403 },
      );
    }

    const response = NextResponse.json({ user: payload.user });
    response.cookies.set(SESSION_COOKIE, payload.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      domain: SESSION_COOKIE_DOMAIN,
      maxAge: 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Il servizio di autenticazione non è raggiungibile" },
      { status: 503 },
    );
  }
}
