import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_COOKIE_DOMAIN } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: SESSION_COOKIE_DOMAIN,
    maxAge: 0,
  });
  return response;
}
