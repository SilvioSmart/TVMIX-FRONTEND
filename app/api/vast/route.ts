import { type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const source = request.nextUrl.searchParams.get("url");

  if (!source) {
    return Response.json({ error: "Parametro url mancante" }, { status: 400 });
  }

  let vastUrl: URL;
  try {
    vastUrl = new URL(source);
  } catch {
    return Response.json({ error: "URL VAST non valido" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(vastUrl.protocol)) {
    return Response.json({ error: "Protocollo VAST non supportato" }, { status: 400 });
  }

  try {
    const upstream = await fetch(vastUrl, {
      headers: {
        accept: "application/xml,text/xml,*/*",
        "user-agent": "TVMIX-VAST-Proxy/1.0",
      },
      cache: "no-store",
    });
    const body = await upstream.text();
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      "Content-Type": upstream.headers.get("content-type") ?? "application/xml; charset=utf-8",
    });

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch {
    return Response.json({ error: "Adserver VAST non raggiungibile" }, { status: 502 });
  }
}
