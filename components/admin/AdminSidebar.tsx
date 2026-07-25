"use client";

import { ChevronDown, ChevronLeft, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { navigation, type AdminSection, type AppearanceSubnavItem, type ContentSubnavKey, type LiveSubnavKey, type NavItem, type NewsSubnavKey } from "./admin-data";
import type { AppearanceMenuKey } from "./admin-api";

type AdminSidebarProps = {
  active: AdminSection;
  activeAppearance: AppearanceMenuKey;
  activeContent: ContentSubnavKey;
  activeLive: LiveSubnavKey;
  activeNews: NewsSubnavKey;
  appearanceMenu: AppearanceSubnavItem[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onMobileClose: () => void;
  onSelect: (section: AdminSection) => void;
  onSelectAppearance: (section: AppearanceMenuKey) => void;
  onSelectContent: (section: ContentSubnavKey) => void;
  onSelectLive: (section: LiveSubnavKey) => void;
  onSelectNews: (section: NewsSubnavKey) => void;
  items?: NavItem[];
};

export function AdminSidebar({
  active,
  activeAppearance,
  activeContent,
  activeLive,
  activeNews,
  appearanceMenu,
  collapsed,
  mobileOpen,
  onCollapse,
  onMobileClose,
  onSelect,
  onSelectAppearance,
  onSelectContent,
  onSelectLive,
  onSelectNews,
  items = navigation,
}: AdminSidebarProps) {
  const appearanceOpen = active === "appearance";
  const liveOpen = active === "live";
  const newsOpen = active === "news";
  const contentOpen = active === "content";

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Chiudi navigazione"
          className="fixed inset-0 z-40 bg-black/65 lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#1d3044] bg-[#04101d] transition-[width,transform] duration-300",
          collapsed ? "w-[82px]" : "w-[min(246px,88vw)]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="flex h-[84px] items-center justify-between border-b border-[#16283a] px-5">
          <Logo className={collapsed ? "text-[1.18rem] sm:text-[1.18rem]" : ""} />
          {!collapsed ? (
            <button
              type="button"
              aria-label="Chiudi navigazione"
              onClick={onMobileClose}
              className="grid size-9 place-items-center rounded-lg text-white/60 hover:bg-white/5 hover:text-white lg:hidden"
            >
              <X size={19} />
            </button>
          ) : null}
        </div>

        <nav aria-label="Amministrazione TVMIX" className="flex-1 space-y-2 overflow-y-auto px-3 py-5">
          {items.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            const isAppearance = item.id === "appearance";
            const isContent = item.id === "content";
            const isLive = item.id === "live";
            const isNews = item.id === "news";
            const children = isAppearance ? appearanceMenu : item.children;

            return (
              <div key={item.id}>
                <button
                  type="button"
                  title={collapsed ? item.label : undefined}
                  aria-expanded={children?.length ? selected : undefined}
                  aria-selected={selected}
                  onClick={() => {
                    onSelect(item.id);
                    if (!isAppearance && !isLive && !isContent && !isNews) onMobileClose();
                  }}
                  className={[
                    "relative flex h-12 w-full items-center rounded-lg text-sm font-semibold transition",
                    collapsed ? "justify-center px-0" : "gap-3 px-3.5",
                    selected
                      ? "brand-selected-button"
                      : "text-slate-300 hover:bg-white/[0.045] hover:text-white",
                  ].join(" ")}
                >
                  {selected ? (
                    <span className="absolute inset-y-2 left-[-12px] w-1 rounded-r-full bg-[#020711]" />
                  ) : null}
                  <Icon size={20} strokeWidth={1.8} />
                  {!collapsed ? (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {children?.length ? (
                        <ChevronDown
                          size={15}
                          className={selected ? "rotate-180 transition" : "transition"}
                        />
                      ) : null}
                    </>
                  ) : null}
                </button>

                {!collapsed && ((isAppearance && appearanceOpen) || (isLive && liveOpen) || (isContent && contentOpen) || (isNews && newsOpen)) && children?.length ? (
                  <div className="ml-4 mt-2 space-y-1 border-l border-[#1d3044] pl-3">
                    {children.map((child) => {
                      const childSelected = isAppearance
                        ? activeAppearance === child.key
                        : isContent
                          ? activeContent === child.key
                          : isLive
                            ? activeLive === child.key
                            : activeNews === child.key;
                      return (
                        <button
                          key={child.key}
                          type="button"
                          aria-selected={childSelected}
                          onClick={() => {
                            if (isAppearance) onSelectAppearance(child.key as AppearanceMenuKey);
                            if (isContent) onSelectContent(child.key as ContentSubnavKey);
                            if (isLive) onSelectLive(child.key as LiveSubnavKey);
                            if (isNews) onSelectNews(child.key as NewsSubnavKey);
                            onMobileClose();
                          }}
                          className={[
                            "flex w-full items-center rounded-md px-3 py-2 text-left text-[12px] font-semibold transition",
                            childSelected
                              ? "brand-selected-button"
                              : "text-slate-400 hover:bg-white/[0.04] hover:text-white",
                          ].join(" ")}
                        >
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onCollapse}
          className="m-3 hidden h-11 items-center justify-center gap-2 rounded-lg border border-[#1d3044] text-xs font-semibold text-slate-400 transition hover:bg-white/5 hover:text-white lg:flex"
        >
          <ChevronLeft
            size={17}
            className={collapsed ? "rotate-180 transition" : "transition"}
          />
          {!collapsed ? "Riduci menu" : null}
        </button>
      </aside>
    </>
  );
}
