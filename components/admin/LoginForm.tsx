"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Accesso non riuscito");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Impossibile contattare il servizio di autenticazione");
    } finally {
      setLoading(false);
    }
  }

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
              <LockKeyhole size={21} />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-[-0.025em]">Accedi a TVMIX</h1>
              <p className="mt-1 text-xs text-slate-500">
                Usa le credenziali del tuo account amministratore
              </p>
            </div>
          </div>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="admin-label">Email</span>
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@tvmix.it"
                className="admin-input mt-2"
              />
            </label>

            <label className="block">
              <span className="admin-label">Password</span>
              <span className="relative mt-2 block">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={12}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Inserisci la password"
                  className="admin-input pr-11"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-white/5 hover:text-white"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error ? (
              <p role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2.5 text-xs text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="admin-primary-button mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <LoaderCircle size={17} className="animate-spin" /> : <ShieldCheck size={17} />}
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>
          <Link href="/forgot-password" className="mt-4 block text-center text-xs font-semibold text-cyan hover:text-white">
            Hai dimenticato la password?
          </Link>
        </section>

        <p className="mt-5 text-center text-[11px] text-slate-600">
          Connessione protetta tramite api.tvmix.it
        </p>
      </div>
    </main>
  );
}
