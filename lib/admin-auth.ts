import "server-only";

import { cookies } from "next/headers";

export const SESSION_COOKIE = "tvmix_admin_session";
export const SESSION_COOKIE_DOMAIN =
  process.env.TVMIX_ADMIN_COOKIE_DOMAIN ??
  (process.env.NODE_ENV === "production" ? ".tvmix.it" : undefined);
export const API_BASE_URL =
  process.env.TVMIX_API_URL ?? "https://api.tvmix.it/api/v1";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "EDITOR" | "ADMIN";
};

export async function getAdminSession(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { user?: AdminUser };
    return payload.user?.role === "ADMIN" ? payload.user : null;
  } catch {
    return null;
  }
}
