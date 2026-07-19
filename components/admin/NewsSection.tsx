"use client";

import { CalendarClock, ImageIcon, Newspaper } from "lucide-react";
import { useMemo, useState } from "react";
import type { NewsSubnavKey } from "./admin-data";
import { Header } from "./ContentSection";

type Props = {
  activeSection: NewsSubnavKey;
  onNotify: (message: string) => void;
};

type Notice = {
  id: string;
  category: string;
  title: string;
  body: string;
  imageUrl: string;
  insertedAt: string;
};

const notices: Notice[] = [
  {
    id: "n9-001",
    category: "Attualità",
    title: "La piattaforma TVMIX apre una nuova finestra sull'informazione locale",
    insertedAt: "19/07/2026 18:42",
    imageUrl: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80",
    body: "Una nuova area editoriale raccoglie aggiornamenti, approfondimenti e storie dal territorio. La redazione potrà valorizzare le notizie più recenti con una scheda principale e una griglia dinamica di contenuti selezionabili.",
  },
  {
    id: "n9-002",
    category: "Cronaca",
    title: "Nuovi servizi digitali per cittadini e imprese",
    insertedAt: "19/07/2026 17:15",
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
    body: "Sportelli online, notifiche in tempo reale e nuove procedure semplificate entrano nella quotidianità dei territori. Il percorso coinvolge amministrazioni, operatori e associazioni locali.",
  },
  {
    id: "n9-003",
    category: "Cultura",
    title: "Estate di eventi tra musica, teatro e mostre",
    insertedAt: "19/07/2026 16:06",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    body: "Il calendario culturale si arricchisce di appuntamenti serali, rassegne all'aperto e percorsi museali. Le iniziative puntano a coinvolgere pubblico locale e visitatori.",
  },
  {
    id: "n9-004",
    category: "Sport",
    title: "Le società sportive preparano la nuova stagione",
    insertedAt: "19/07/2026 14:30",
    imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
    body: "Allenamenti, calendari e nuove iscrizioni segnano l'avvio della programmazione sportiva. Le squadre lavorano alla preparazione atletica e alla definizione degli organici.",
  },
  {
    id: "n9-005",
    category: "Ambiente",
    title: "Monitoraggio ambientale, dati aggiornati in tempo reale",
    insertedAt: "19/07/2026 12:18",
    imageUrl: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=80",
    body: "Sensori, mappe e report territoriali aiutano a leggere l'evoluzione degli indicatori ambientali. Il sistema punta a rendere più accessibili le informazioni ai cittadini.",
  },
  {
    id: "n9-006",
    category: "Economia",
    title: "Imprese locali, focus su innovazione e formazione",
    insertedAt: "18/07/2026 19:55",
    imageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=80",
    body: "Nuovi programmi formativi sostengono le competenze digitali e la crescita delle piccole imprese. Il confronto coinvolge professionisti, enti e realtà produttive del territorio.",
  },
];

export function NewsSection({ activeSection, onNotify }: Props) {
  if (activeSection === "tg9") {
    return <Tg9Section onNotify={onNotify} />;
  }

  return <NineNoticeSection />;
}

function NineNoticeSection() {
  const latestNotice = useMemo(() => notices[0], []);
  const [selectedId, setSelectedId] = useState(latestNotice.id);
  const selectedNotice = notices.find((notice) => notice.id === selectedId) ?? latestNotice;

  return (
    <div className="space-y-6">
      <Header
        title="News · 9notice"
        description="Organizza le notizie in una griglia editoriale: l'ultima notizia è in evidenza, oppure seleziona una cella per visualizzarla nella scheda grande."
      />

      <section className="admin-panel overflow-hidden">
        <article className="grid min-h-[320px] gap-0 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
          <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#22bdf3]">
              <span className="rounded-full border border-[#22bdf3]/35 bg-[#22bdf3]/10 px-3 py-1">{selectedNotice.category}</span>
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <CalendarClock size={13} />
                {selectedNotice.insertedAt}
              </span>
            </div>
            <h2 className="max-w-3xl text-2xl font-black tracking-[-0.045em] text-white sm:text-4xl">
              {selectedNotice.title}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">
              {selectedNotice.body}
            </p>
          </div>

          <div className="relative min-h-[240px] overflow-hidden bg-[#071321] lg:min-h-full">
            <img
              src={selectedNotice.imageUrl}
              alt={selectedNotice.title}
              className="h-full min-h-[240px] w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#050c16]/35 via-transparent to-transparent" />
          </div>
        </article>
      </section>

      <section className="admin-panel p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="admin-section-title">Griglia notizie</h3>
            <p className="mt-1 text-xs text-slate-500">Seleziona una notizia per portarla nella scheda principale.</p>
          </div>
          <span className="rounded-full border border-[#26394d] px-3 py-1 text-[11px] font-semibold text-slate-400">
            {notices.length} notizie
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {notices.map((notice) => {
            const selected = notice.id === selectedNotice.id;
            return (
              <button
                key={notice.id}
                type="button"
                onClick={() => setSelectedId(notice.id)}
                className={[
                  "group overflow-hidden rounded-2xl border bg-[#071321] text-left transition",
                  selected
                    ? "border-[#22bdf3] shadow-[0_0_0_1px_rgba(34,189,243,0.35),0_18px_55px_rgba(34,189,243,0.12)]"
                    : "border-[#1d3044] hover:border-[#22bdf3]/45 hover:bg-[#0a1727]",
                ].join(" ")}
              >
                <div className="relative aspect-[16/9] overflow-hidden bg-[#0b1624]">
                  <img
                    src={notice.imageUrl}
                    alt={notice.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <span className="text-[#22bdf3]">{notice.category}</span>
                    <span>·</span>
                    <span>{notice.insertedAt}</span>
                  </div>
                  <h4 className="line-clamp-2 text-sm font-bold leading-5 text-slate-100">{notice.title}</h4>
                  <p className="line-clamp-3 text-xs leading-5 text-slate-500">{notice.body}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Tg9Section({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className="space-y-6">
      <Header
        title="News · tg9"
        description="Area predisposta per scalette, servizi video e gestione redazionale TG9."
      >
        <button type="button" onClick={() => onNotify("Sezione TG9 predisposta")} className="admin-secondary-button">
          <Newspaper size={16} />
          Predisposta
        </button>
      </Header>

      <section className="admin-panel p-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#26394d] bg-[#071321]/70 p-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-[#102238] text-[#22bdf3]">
            <ImageIcon size={24} />
          </span>
          <h2 className="mt-4 text-lg font-bold text-white">Pagina TG9 pronta per la configurazione</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Il sottomenù è attivo. La struttura editoriale TG9 potrà essere collegata a scalette, clip e notizie video dedicate.
          </p>
        </div>
      </section>
    </div>
  );
}
