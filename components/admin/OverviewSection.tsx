"use client";

import Image from "next/image";
import {
  Activity,
  Check,
  Copy,
  Database,
  Eye,
  MoreHorizontal,
  Pencil,
  Play,
  Radio,
  RefreshCw,
  Save,
  Send,
  Server,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { videos } from "./admin-data";

type OverviewSectionProps = {
  onNotify: (message: string) => void;
};

const serviceStatus = [
  { title: "Backend operativo", detail: "Tempo di attività: 99,9%", icon: Server },
  { title: "Database connesso", detail: "Ultimo backup: 08:15", icon: Database },
  { title: "Streaming online", detail: "Tutti i servizi attivi", icon: Radio },
];

export function OverviewSection({ onNotify }: OverviewSectionProps) {
  const [live, setLive] = useState(true);
  const [platformName, setPlatformName] = useState("TVMIX");
  const [domain, setDomain] = useState("www.tvmix.it");
  const [hlsUrl, setHlsUrl] = useState("https://live.tvmix.it/live/stream.m3u8");

  return (
    <div className="space-y-4">
      <section className="admin-panel p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="admin-section-title">Stato piattaforma</h2>
          <button
            type="button"
            onClick={() => onNotify("Modifiche pubblicate sulla piattaforma")}
            className="admin-primary-button hidden sm:flex"
          >
            <Send size={17} />
            Pubblica modifiche
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {serviceStatus.map(({ title, detail, icon: Icon }) => (
            <div
              key={title}
              className="flex items-center gap-4 border-[#203248] py-2 lg:border-r lg:last:border-r-0"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full border border-[#1dbcf3] text-[#1dbcf3]">
                <Icon size={22} strokeWidth={1.7} />
              </span>
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  {title}
                </p>
                <p className="mt-1 text-xs text-slate-400">{detail}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onNotify("Modifiche pubblicate sulla piattaforma")}
          className="admin-primary-button mt-4 w-full sm:hidden"
        >
          <Send size={17} />
          Pubblica modifiche
        </button>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#203248] px-4 py-4 sm:px-5">
            <h2 className="admin-section-title">Contenuti recenti</h2>
            <button type="button" className="admin-text-button">
              Visualizza tutti
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left">
              <thead className="bg-[#102238] text-[11px] uppercase tracking-[0.08em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold sm:px-5">Anteprima</th>
                  <th className="px-3 py-3 font-semibold">Titolo</th>
                  <th className="px-3 py-3 font-semibold">Categoria</th>
                  <th className="px-3 py-3 font-semibold">Stato</th>
                  <th className="px-3 py-3 font-semibold">Aggiornato</th>
                  <th className="px-3 py-3 font-semibold">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {videos.map((video) => (
                  <tr key={video.title} className="border-t border-[#1b2b3d] text-sm">
                    <td className="px-4 py-2.5 sm:px-5">
                      <div className="relative h-11 w-[78px] overflow-hidden rounded-md bg-[#102238]">
                        <Image src={video.image} alt="" fill sizes="78px" className="object-cover" />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-100">{video.title}</td>
                    <td className="px-3 py-2.5 text-slate-400">{video.category}</td>
                    <td className="px-3 py-2.5">
                      <StatusLabel status={video.status} />
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-400">{video.updated}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 text-slate-400">
                        <IconButton label={`Visualizza ${video.title}`} icon={Eye} />
                        <IconButton label={`Modifica ${video.title}`} icon={Pencil} />
                        <IconButton label={`Altre azioni per ${video.title}`} icon={MoreHorizontal} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="admin-section-title">Diretta TV</h2>
            <button
              type="button"
              aria-pressed={live}
              onClick={() => setLive((value) => !value)}
              className="flex h-8 w-[174px] rounded-full border border-[#31445a] bg-[#08131f] p-0.5 text-[10px] font-bold tracking-[0.12em]"
            >
              <span
                className={[
                  "grid flex-1 place-items-center rounded-full transition",
                  live ? "bg-[#ff6b63] text-white" : "text-slate-500",
                ].join(" ")}
              >
                LIVE
              </span>
              <span
                className={[
                  "grid flex-1 place-items-center rounded-full transition",
                  live ? "text-slate-500" : "bg-slate-600 text-white",
                ].join(" ")}
              >
                OFFLINE
              </span>
            </button>
          </div>

          <label className="admin-label" htmlFor="hls-url">
            URL stream HLS
          </label>
          <div className="mt-2 flex">
            <input
              id="hls-url"
              value={hlsUrl}
              onChange={(event) => setHlsUrl(event.target.value)}
              className="admin-input rounded-r-none"
            />
            <button
              type="button"
              aria-label="Copia URL stream"
              onClick={() => {
                void navigator.clipboard?.writeText(hlsUrl);
                onNotify("URL HLS copiato");
              }}
              className="grid w-11 place-items-center rounded-r-lg border border-l-0 border-[#31445a] text-slate-400 hover:text-white"
            >
              <Copy size={17} />
            </button>
          </div>

          <p className="admin-label mt-4">Anteprima</p>
          <div className="relative mt-2 aspect-video overflow-hidden rounded-lg border border-[#203248] bg-[#04101d]">
            <Image
              src="https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1100&q=85"
              alt="Anteprima della diretta TVMIX"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 35vw"
              className="object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#020711] via-transparent to-transparent" />
            <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded bg-red-600 px-2 py-1 text-[10px] font-extrabold">
              <span className="size-1.5 rounded-full bg-white" />
              {live ? "LIVE" : "OFFLINE"}
            </span>
            <div className="absolute inset-x-3 bottom-3 flex items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-white text-[#04101d]">
                <Play size={14} fill="currentColor" />
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded bg-white/25">
                <div className="h-full w-3/4 bg-[#ff6b63]" />
              </div>
              <span className="text-[10px] font-bold">00:38:24</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNotify("Configurazione della diretta aggiornata")}
            className="admin-primary-button mt-4 w-full"
          >
            <RefreshCw size={17} />
            Aggiorna diretta
          </button>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section className="admin-panel p-4 sm:p-5">
          <h2 className="admin-section-title">Configurazione rapida</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nome piattaforma" hint="Nome visualizzato sulla piattaforma">
              <input
                value={platformName}
                onChange={(event) => setPlatformName(event.target.value)}
                className="admin-input"
              />
            </Field>
            <Field label="Dominio" hint="Dominio principale del sito">
              <input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                className="admin-input"
              />
            </Field>
            <Field label="Colore principale" hint="Colore accent dell’interfaccia">
              <div className="admin-input flex items-center gap-3">
                <span className="size-5 rounded bg-[#16b9f4]" />
                <span>#16B9F4</span>
              </div>
            </Field>
            <Field label="Logo" hint="PNG o SVG, max 2 MB">
              <button type="button" className="admin-secondary-button w-full">
                <Upload size={16} />
                Carica nuovo
              </button>
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => onNotify("Configurazione generale salvata")}
              className="admin-primary-button"
            >
              <Save size={17} />
              Salva modifiche
            </button>
          </div>
        </section>

        <section className="admin-panel p-4 sm:p-5">
          <h2 className="admin-section-title">Attività recente</h2>
          <div className="mt-4 divide-y divide-[#1b2b3d]">
            {[
              ["Contenuto “TG Lombardia” pubblicato", "2 minuti fa"],
              ["Backup database completato", "Oggi, 08:15"],
              ["Nuovo utente registrato", "Oggi, 07:42"],
              ["Impostazioni piattaforma aggiornate", "Ieri, 18:33"],
            ].map(([title, time], index) => (
              <div key={title} className="flex gap-3 py-3 first:pt-0">
                <span
                  className={[
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border",
                    index === 1
                      ? "border-[#1dbcf3]/50 bg-[#1dbcf3]/10 text-[#1dbcf3]"
                      : "border-emerald-400/50 bg-emerald-400/10 text-emerald-400",
                  ].join(" ")}
                >
                  {index === 1 ? <Activity size={15} /> : <Check size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">{title}</p>
                  <p className="mt-1 text-xs text-slate-500">Admin · {time}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusLabel({ status }: { status: string }) {
  const className =
    status === "Pubblicato"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-400"
      : status === "In diretta"
        ? "border-[#ff6b63]/50 bg-[#ff6b63]/10 text-[#ff7a73]"
        : "border-[#1dbcf3]/40 bg-[#1dbcf3]/10 text-[#1dbcf3]";

  return (
    <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${className}`}>
      {status}
    </span>
  );
}

function IconButton({
  label,
  icon: Icon,
}: {
  label: string;
  icon: typeof Eye;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-8 place-items-center rounded-md hover:bg-white/5 hover:text-white"
    >
      <Icon size={16} />
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <label>
      <span className="admin-label">{label}</span>
      <span className="mt-2 block">{children}</span>
      <span className="mt-1.5 block text-[11px] text-slate-500">{hint}</span>
    </label>
  );
}
