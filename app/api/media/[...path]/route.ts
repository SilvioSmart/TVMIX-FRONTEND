import { type NextRequest } from "next/server";

const MEDIA_ORIGIN = "https://media.tvmix.it";

const passthroughHeaders = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const upstreamPath = path.map((part) => encodeURIComponent(part)).join("/");
  const upstreamUrl = `${MEDIA_ORIGIN}/${upstreamPath}${request.nextUrl.search}`;
  const range = request.headers.get("range");

  const upstream = await fetch(upstreamUrl, {
    headers: {
      ...(range ? { range } : {}),
      accept: request.headers.get("accept") ?? "*/*",
    },
    cache: "no-store",
  });

  const headers = new Headers();
  for (const header of passthroughHeaders) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  headers.set("Access-Control-Allow-Origin", "*");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
