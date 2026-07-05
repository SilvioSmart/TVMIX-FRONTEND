"use client";

import { LoaderCircle, X } from "lucide-react";

export function ResourceState({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string | null;
  empty?: string;
}) {
  if (loading) {
    return (
      <div className="admin-panel grid min-h-48 place-items-center text-slate-400">
        <span className="flex items-center gap-2 text-sm">
          <LoaderCircle size={18} className="animate-spin" /> Caricamento...
        </span>
      </div>
    );
  }
  if (error) {
    return <div className="admin-panel p-5 text-sm text-red-300">{error}</div>;
  }
  if (empty) {
    return <div className="admin-panel p-8 text-center text-sm text-slate-500">{empty}</div>;
  }
  return null;
}

export function AdminModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-black/70 p-2 sm:p-4">
      <button type="button" aria-label="Chiudi finestra" className="absolute inset-0" onClick={onClose} />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="admin-panel relative z-10 max-h-[calc(100svh-1rem)] w-full max-w-[min(42rem,calc(100vw-1rem))] overflow-y-auto p-4 sm:max-h-[90vh] sm:p-6"
      >
        <div className="mb-5 flex min-w-0 items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-base font-bold text-white sm:text-lg">{title}</h3>
          <button type="button" aria-label="Chiudi" onClick={onClose} className="admin-icon-button">
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function ConfirmButton({
  label,
  onConfirm,
  className = "",
  children,
}: {
  label: string;
  onConfirm: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        if (window.confirm("Confermi l'eliminazione?")) onConfirm();
      }}
      className={className}
    >
      {children}
    </button>
  );
}
