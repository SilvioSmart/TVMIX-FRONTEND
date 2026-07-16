"use client";

import { Bell, Check, LogOut, Menu, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import {
  fallbackAppearanceMenu,
  navigation,
  type AdminSection,
  type AppearanceSubnavItem,
  type ContentSubnavKey,
  type LiveSubnavKey,
  type NavItem,
} from "./admin-data";
import { OverviewSection } from "./OverviewSection";
import { PlatformSections } from "./PlatformSections";
import type { AdminUser } from "@/lib/admin-auth";
import { adminRequest, type AppearanceMenuItem, type AppearanceMenuKey } from "./admin-api";

const roleLabels: Record<AdminUser["role"], string> = {
  ADMIN: "Amministratore",
  EDITOR: "Editor",
  USER: "Operatore",
};

function canUseSection(user: AdminUser, section: AdminSection) {
  if (user.role === "ADMIN") return true;
  if (section === "overview") return true;
  if (section === "users") return user.permissions.includes("USERS_MANAGE");
  if (section === "content") {
    return user.permissions.includes("CONTENT_VIEW") || user.permissions.includes("CONTENT_MANAGE");
  }
  if (section === "catalog") return user.permissions.includes("CATALOG_MANAGE");
  if (section === "live") return user.permissions.includes("LIVE_MANAGE");
  if (section === "appearance") return user.permissions.includes("APPEARANCE_MANAGE");
  if (section === "settings") return user.permissions.includes("SETTINGS_MANAGE");
  return false;
}

export function AdminDashboard({ user }: { user: AdminUser }) {
  const [active, setActive] = useState<AdminSection>("overview");
  const [activeContent, setActiveContent] = useState<ContentSubnavKey>("loading");
  const [activeAppearance, setActiveAppearance] = useState<AppearanceMenuKey>("logo-name");
  const [activeLive, setActiveLive] = useState<LiveSubnavKey>("LIVE_STREAMING");
  const [appearanceMenu, setAppearanceMenu] =
    useState<AppearanceSubnavItem[]>(fallbackAppearanceMenu);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const availableNavigation = useMemo(
    () => navigation.filter((item) => canUseSection(user, item.id)) as NavItem[],
    [user],
  );

  const activeLabel = availableNavigation.find((item) => item.id === active)?.label ?? "Panoramica";
  const activeAppearanceLabel =
    appearanceMenu.find((item) => item.key === activeAppearance)?.label ?? "LOGO/NAME";
  const initials = (user.name ?? user.email)
    .split(/[ .@_-]+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  useEffect(() => {
    if (!availableNavigation.some((item) => item.id === active)) {
      setActive("overview");
    }
  }, [active, availableNavigation]);

  useEffect(() => {
    if (!notification) return;
    const timeout = window.setTimeout(() => setNotification(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [notification]);

  useEffect(() => {
    let activeRequest = true;
    adminRequest<{ data: AppearanceMenuItem[] }>("appearance/menu")
      .then((response) => {
        if (!activeRequest) return;
        const items = response.data.map((item) => ({
          key: item.key,
          label: item.label,
          description: item.description,
        }));
        if (items.length > 0) setAppearanceMenu(items);
      })
      .catch(() => {
        if (activeRequest) setAppearanceMenu(fallbackAppearanceMenu);
      });

    return () => {
      activeRequest = false;
    };
  }, []);

  function toggleSidebar() {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      setMobileOpen((value) => !value);
      return;
    }
    setCollapsed((value) => !value);
  }

  return (
    <main className="min-h-screen bg-[#020a13] text-white">
      <AdminSidebar
        active={active}
        activeAppearance={activeAppearance}
        activeContent={activeContent}
        activeLive={activeLive}
        appearanceMenu={appearanceMenu}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCollapse={toggleSidebar}
        onMobileClose={() => setMobileOpen(false)}
        onSelect={setActive}
        onSelectAppearance={(section) => {
          setActive("appearance");
          setActiveAppearance(section);
        }}
        onSelectContent={(section) => {
          setActive("content");
          setActiveContent(section);
        }}
        onSelectLive={(section) => {
          setActive("live");
          setActiveLive(section);
        }}
        items={availableNavigation}
      />

      <div
        className={[
          "min-h-screen transition-[padding] duration-300",
          collapsed ? "lg:pl-[82px]" : "lg:pl-[246px]",
        ].join(" ")}
      >
        <header className="sticky top-0 z-30 flex min-h-16 items-center border-b border-[#1d3044] bg-[#020a13]/90 px-3 backdrop-blur-xl sm:min-h-[84px] sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Apri menu"
            onClick={() => setMobileOpen(true)}
            className="mr-3 grid size-10 shrink-0 place-items-center rounded-lg border border-[#26394d] text-slate-300 lg:hidden"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-[-0.025em] sm:text-[22px]">
              {active === "overview"
                ? "Configurazione piattaforma"
                : active === "appearance"
                  ? `Aspetto · ${activeAppearanceLabel}`
                  : activeLabel}
            </h1>
            <p className="mt-1 hidden text-xs text-slate-500 sm:block">
              Gestisci impostazioni, contenuti e streaming della piattaforma TVMIX
            </p>
          </div>

          <label className="relative mx-5 hidden w-full max-w-[355px] xl:block">
            <Search
              size={17}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              aria-label="Cerca nel pannello"
              placeholder="Cerca contenuti, utenti, impostazioni..."
              className="h-10 w-full rounded-lg border border-[#26394d] bg-[#071321] px-3.5 pr-10 text-xs text-white placeholder:text-slate-500 focus:border-[#22bdf3] focus:outline-none"
            />
          </label>

          <div className="flex shrink-0 items-center gap-1 sm:gap-4">
            <button
              type="button"
              aria-label="Notifiche"
              className="relative grid size-10 place-items-center rounded-lg text-slate-300 hover:bg-white/5"
            >
              <Bell size={19} />
              <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-[#ff6b63] text-[9px] font-extrabold">
                3
              </span>
            </button>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                title="Esci dal pannello"
                className="flex items-center gap-2 rounded-lg p-1.5 text-left hover:bg-white/5"
              >
                <span className="grid size-9 place-items-center rounded-full bg-[#17304a] text-xs font-bold text-[#22bdf3]">
                  {initials || "AD"}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-28 truncate text-xs font-semibold">
                    {user.name ?? user.email}
                  </span>
                  <span className="block text-[10px] text-slate-500">{roleLabels[user.role]}</span>
                </span>
                <LogOut size={14} className="hidden text-slate-500 sm:block" />
              </button>
            </form>
          </div>
        </header>

        <div className="mx-auto max-w-[1500px] overflow-x-clip p-3 sm:p-6 lg:p-7">
          {active === "overview" ? (
            <OverviewSection onNotify={setNotification} />
          ) : (
            <PlatformSections
              section={active}
              activeContent={activeContent}
              activeLive={activeLive}
              onSelectLive={setActiveLive}
              appearanceSection={activeAppearance}
              appearanceMenu={appearanceMenu}
              onNotify={setNotification}
            />
          )}
        </div>

        <footer className="mx-auto flex max-w-[1500px] flex-col gap-2 border-t border-[#17293b] px-4 py-5 text-[11px] text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>© 2026 TVMIX. Tutti i diritti riservati.</span>
          <span className="flex flex-wrap items-center gap-2">
            Versione 1.0.0
            <span className="size-2 rounded-full bg-emerald-400" />
            Tutti i sistemi operativi
          </span>
        </footer>
      </div>

      {notification ? (
        <div
          role="status"
          className="fixed bottom-4 left-3 right-3 z-[70] flex items-center gap-3 rounded-lg border border-emerald-400/25 bg-[#092119] px-4 py-3 text-sm font-semibold text-emerald-300 shadow-2xl sm:left-auto sm:right-5 sm:max-w-[calc(100vw-2.5rem)]"
        >
          <Check size={17} />
          {notification}
        </div>
      ) : null}
    </main>
  );
}
