"use client";

import { LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { Logo } from "@/components/Logo";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Accesso non riuscito");

      window.localStorage.setItem("tvmix_admin_token", payload.accessToken);
      window.localStorage.setItem("tvmix_admin_user", JSON.stringify(payload.user));
      window.location.href = "/admin";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Accesso non riuscito");
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
        <form onSubmit={submit} className="admin-panel p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-lg bg-[#16b9f4]/10 text-[#22bdf3]">
              <LockKeyhole size={21} />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-[-0.03em]">Accesso admin</h1>
              <p className="text-sm text-slate-400">Inserisci le credenziali redazionali.</p>
            </div>
          </div>

          <label className="admin-label">
            Email
            <input className="admin-input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="admin-label mt-4">
            Password
            <input className="admin-input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {error ? <p className="mt-4 rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p> : null}

          <button className="admin-primary-button mt-6 w-full" disabled={loading}>
            {loading ? "Accesso in corso..." : "Entra"}
          </button>
        </form>
      </div>
    </main>
  );
}
