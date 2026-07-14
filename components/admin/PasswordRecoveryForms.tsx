"use client";

import { CheckCircle2, LoaderCircle, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#020a13] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_18%,rgba(22,185,244,0.10),transparent_34%)]" />
      <div className="relative w-full max-w-[430px]">
        <div className="mb-8 text-center">
          <Logo className="justify-center text-[2rem] sm:text-[2rem]" />
          <p className="mt-3 text-sm text-slate-400">Pannello di amministrazione</p>
        </div>
        <section className="admin-panel p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
              <ShieldCheck size={21} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-[-0.025em]">{title}</h1>
              <p className="mt-1 text-xs text-slate-500">{description}</p>
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) {
        setError(payload.error ?? "Richiesta non riuscita");
        return;
      }
      setMessage(payload.message ?? "Se l'email è certificata, riceverai le istruzioni.");
    } catch {
      setError("Servizio non raggiungibile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Recupera password" description="Ricevi un link sulla casella email certificata.">
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="admin-label">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="admin-input mt-2"
            placeholder="admin@tvmix.it"
          />
        </label>
        {message ? <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-300">{message}</p> : null}
        {error ? <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">{error}</p> : null}
        <button type="submit" disabled={loading} className="admin-primary-button w-full">
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : <Mail size={17} />}
          Invia link recupero
        </button>
      </form>
      <Link href="/login" className="mt-5 block text-center text-xs font-semibold text-cyan hover:text-white">
        Torna al login
      </Link>
    </AuthShell>
  );
}

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Reset non riuscito");
        return;
      }
      setMessage("Password aggiornata. Ora puoi accedere.");
    } catch {
      setError("Servizio non raggiungibile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Nuova password" description="Imposta una nuova password di almeno 12 caratteri.">
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="admin-label">Nuova password</span>
          <input
            type="password"
            required
            minLength={12}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="admin-input mt-2"
          />
        </label>
        {message ? <p className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2.5 text-xs text-emerald-300">{message}</p> : null}
        {error ? <p className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">{error}</p> : null}
        <button type="submit" disabled={loading || !token} className="admin-primary-button w-full">
          {loading ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
          Aggiorna password
        </button>
      </form>
      <Link href="/login" className="mt-5 block text-center text-xs font-semibold text-cyan hover:text-white">
        Vai al login
      </Link>
    </AuthShell>
  );
}

export function VerifyEmailView() {
  const token = useSearchParams().get("token") ?? "";
  const [message, setMessage] = useState("Verifica in corso...");
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!token) {
      setMessage("Token mancante.");
      return;
    }
    fetch(`/api/auth/email/verify?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error);
        setOk(true);
        setMessage("Email certificata correttamente.");
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error && error.message ? error.message : "Verifica non riuscita.");
      });
  }, [token]);

  return (
    <AuthShell title="Verifica email" description="Certificazione della casella email account TVMIX.">
      <div className={`mt-7 rounded-lg border px-3 py-3 text-sm ${ok ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300" : "border-amber-400/25 bg-amber-400/10 text-amber-300"}`}>
        {message}
      </div>
      <Link href="/login" className="mt-5 block text-center text-xs font-semibold text-cyan hover:text-white">
        Vai al login
      </Link>
    </AuthShell>
  );
}
