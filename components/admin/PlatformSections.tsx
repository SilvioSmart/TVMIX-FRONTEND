"use client";

import Image from "next/image";
import {
  Archive,
  Boxes,
  GalleryHorizontalEnd,
  KeyRound,
  LayoutList,
  MenuSquare,
  Palette,
  PanelBottom,
  Save,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { AdminSection, AppearanceSubnavItem } from "./admin-data";
import { CatalogSection } from "./CatalogSection";
import { ContentSection, Header, Input } from "./ContentSection";
import { AppearanceCarouselConfigSection } from "./AppearanceCarouselConfigSection";
import { AppearanceMenuConfigSection } from "./AppearanceMenuConfigSection";
import { AppearanceModulesConfigSection } from "./AppearanceModulesConfigSection";
import { LiveSection } from "./LiveSection";
import { UsersSection } from "./UsersSection";
import type { AppearanceMenuKey } from "./admin-api";

type Props = {
  section: Exclude<AdminSection, "overview">;
  appearanceSection: AppearanceMenuKey;
  appearanceMenu: AppearanceSubnavItem[];
  onNotify: (message: string) => void;
};

export function PlatformSections({ section, appearanceSection, appearanceMenu, onNotify }: Props) {
  if (section === "content") return <ContentSection onNotify={onNotify} />;
  if (section === "live") return <LiveSection onNotify={onNotify} />;
  if (section === "catalog") return <CatalogSection onNotify={onNotify} />;
  if (section === "users") return <UsersSection onNotify={onNotify} />;
  if (section === "appearance") {
    return (
      <AppearanceSection
        activeSection={appearanceSection}
        menu={appearanceMenu}
        onNotify={onNotify}
      />
    );
  }
  return <SettingsSection onNotify={onNotify} />;
}

const appearanceCopy: Record<
  AppearanceMenuKey,
  {
    title: string;
    description: string;
    icon: typeof Palette;
    fields: string[];
    action: string;
  }
> = {
  "logo-name": {
    title: "LOGO/NAME",
    description: "Configura nome piattaforma, logo principale, favicon e varianti brand.",
    icon: Palette,
    fields: ["Nome piattaforma", "Logo desktop", "Logo mobile", "Favicon"],
    action: "Identità visiva salvata",
  },
  menu: {
    title: "MENU'",
    description: "Gestisci le voci di navigazione visibili nel frontend pubblico.",
    icon: MenuSquare,
    fields: ["Voce menu", "URL destinazione", "Ordine visualizzazione", "Stato voce"],
    action: "Configurazione menu salvata",
  },
  carousel: {
    title: "CAROUSELL",
    description: "Organizza hero, carousel e contenuti editoriali in evidenza.",
    icon: GalleryHorizontalEnd,
    fields: ["Titolo slide", "Contenuto associato", "Immagine hero", "Periodo pubblicazione"],
    action: "Carousel salvato",
  },
  modules: {
    title: "MODULI",
    description: "Attiva e ordina i moduli della homepage e delle pagine editoriali.",
    icon: Boxes,
    fields: ["Nome modulo", "Tipo modulo", "Regola contenuti", "Ordine modulo"],
    action: "Moduli salvati",
  },
  footer: {
    title: "FOOTER",
    description: "Modifica link footer, informazioni societarie, legali e contatti.",
    icon: PanelBottom,
    fields: ["Testo footer", "Link legale", "Contatto", "Social network"],
    action: "Footer salvato",
  },
};

function AppearanceSection({
  activeSection,
  menu,
  onNotify,
}: {
  activeSection: AppearanceMenuKey;
  menu: AppearanceSubnavItem[];
  onNotify: (message: string) => void;
}) {
  const current = appearanceCopy[activeSection] ?? appearanceCopy["logo-name"];
  const Icon = current.icon;
  const dbLabel = menu.find((item) => item.key === activeSection)?.label ?? current.title;

  if (activeSection === "menu") {
    return <AppearanceMenuConfigSection onNotify={onNotify} />;
  }
  if (activeSection === "carousel") {
    return <AppearanceCarouselConfigSection onNotify={onNotify} />;
  }
  if (activeSection === "modules") {
    return <AppearanceModulesConfigSection onNotify={onNotify} />;
  }

  return (
    <div className="space-y-5">
      <Header
        title={`Aspetto · ${dbLabel}`}
        description="Personalizza identità visiva, navigazione e composizione frontend con sezioni lette dal database."
      />

      <div className="grid gap-5 xl:grid-cols-[0.34fr_0.66fr]">
        <section className="admin-panel p-5">
          <div className="flex items-center gap-3">
            <LayoutList className="text-[#22bdf3]" size={21} />
            <h3 className="admin-section-title">Sottomenu da database</h3>
          </div>
          <div className="mt-5 space-y-2">
            {menu.map((item) => (
              <div
                key={item.key}
                className={[
                  "rounded-lg border px-3 py-3",
                  item.key === activeSection
                    ? "border-[#22bdf3]/45 bg-[#0b2437]"
                    : "border-[#203248] bg-[#071321]",
                ].join(" ")}
              >
                <p className="text-sm font-bold text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel overflow-hidden">
          <div className="border-b border-[#203248] px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
                <Icon size={19} />
              </span>
              <div>
                <h3 className="admin-section-title">{current.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{current.description}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              {current.fields.map((field, index) => (
                <Input
                  key={field}
                  label={field}
                  value={index === 0 && activeSection === "logo-name" ? "TVMIX" : ""}
                  placeholder={`Configura ${field.toLowerCase()}`}
                  onChange={() => undefined}
                />
              ))}
              {activeSection === "logo-name" ? (
                <button className="admin-secondary-button w-full">
                  <Upload size={16} /> Carica logo
                </button>
              ) : null}
              <button
                onClick={() => onNotify(current.action)}
                className="admin-primary-button w-full"
              >
                <Save size={17} /> Salva configurazione
              </button>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Anteprima frontend
              </p>
              <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-[#203248]">
                <Image
                  src="/images/senza-filtri-hero.png"
                  alt="Anteprima TVMIX"
                  fill
                  sizes="50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020a13] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-lg font-black">{current.title}</p>
                  <p className="mt-1 text-xs text-slate-300">{current.description}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsSection({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className="space-y-5">
      <Header title="Impostazioni" description="Configura sicurezza, API e manutenzione." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel icon={ShieldCheck} title="Sicurezza">
          <p className="text-sm text-slate-400">
            Sessioni amministrative protette con JWT in cookie HttpOnly.
          </p>
        </Panel>
        <Panel icon={KeyRound} title="API">
          <Input label="Backend API" value="https://api.tvmix.it/api/v1" onChange={() => undefined} />
        </Panel>
        <Panel icon={Archive} title="Backup">
          <button onClick={() => onNotify("Backup manuale richiesto")} className="admin-secondary-button w-full">
            Avvia backup ora
          </button>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-panel p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
          <Icon size={19} />
        </span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
