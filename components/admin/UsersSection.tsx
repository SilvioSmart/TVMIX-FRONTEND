"use client";

import {
  CheckCircle2,
  Edit3,
  KeyRound,
  MailCheck,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminRequest,
  type ListResponse,
  type PlatformUser,
  type UserPermission,
  type UserPermissionConfig,
} from "./admin-api";
import { AdminModal, ConfirmButton, ResourceState } from "./AdminResourceUI";
import { Header } from "./ContentSection";

type UserForm = {
  email: string;
  name: string;
  role: PlatformUser["role"];
  permissions: UserPermission[];
  password: string;
  emailVerified: boolean;
  sendVerificationEmail: boolean;
};

const emptyForm: UserForm = {
  email: "",
  name: "",
  role: "USER",
  permissions: ["CONTENT_VIEW"],
  password: "",
  emailVerified: false,
  sendVerificationEmail: true,
};

const roleLabels: Record<PlatformUser["role"], string> = {
  USER: "Utente",
  EDITOR: "Editor",
  ADMIN: "Admin",
};

function userFormFromUser(user: PlatformUser): UserForm {
  return {
    email: user.email,
    name: user.name ?? "",
    role: user.role,
    permissions: user.permissions,
    password: "",
    emailVerified: Boolean(user.emailVerifiedAt),
    sendVerificationEmail: false,
  };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function UsersSection({ onNotify }: { onNotify: (message: string) => void }) {
  const [data, setData] = useState<PlatformUser[]>([]);
  const [permissionConfig, setPermissionConfig] = useState<UserPermissionConfig | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [issuedSecret, setIssuedSecret] = useState<{ label: string; value: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const [users, permissions] = await Promise.all([
        adminRequest<ListResponse<PlatformUser>>(`users${query}`),
        adminRequest<UserPermissionConfig>("users/permissions"),
      ]);
      setData(users.data);
      setPermissionConfig(permissions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore di caricamento");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissionsByKey = useMemo(
    () => new Map(permissionConfig?.data.map((item) => [item.key, item.label]) ?? []),
    [permissionConfig],
  );

  function openCreate() {
    const nextRole: PlatformUser["role"] = "USER";
    setIssuedSecret(null);
    setSelectedUser(null);
    setForm({
      ...emptyForm,
      permissions: permissionConfig?.defaults[nextRole] ?? emptyForm.permissions,
    });
    setModal("create");
  }

  function openEdit(user: PlatformUser) {
    setIssuedSecret(null);
    setSelectedUser(user);
    setForm(userFormFromUser(user));
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setSelectedUser(null);
    setIssuedSecret(null);
    setSaving(false);
  }

  function setRole(role: PlatformUser["role"]) {
    setForm((current) => ({
      ...current,
      role,
      permissions: permissionConfig?.defaults[role] ?? current.permissions,
    }));
  }

  function togglePermission(permission: UserPermission) {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((item) => item !== permission)
        : [...current.permissions, permission],
    }));
  }

  async function saveUser() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        email: form.email,
        name: form.name.trim() || null,
        role: form.role,
        permissions: form.permissions,
        ...(form.password ? { password: form.password } : {}),
        emailVerified: form.emailVerified,
        ...(modal === "create" ? { sendVerificationEmail: form.sendVerificationEmail } : {}),
      };

      if (modal === "create") {
        const created = await adminRequest<{
          data: PlatformUser;
          temporaryPassword?: string;
          emailVerificationUrl?: string;
        }>("users", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setIssuedSecret(
          created.temporaryPassword
            ? { label: "Password temporanea", value: created.temporaryPassword }
            : created.emailVerificationUrl
              ? { label: "Link verifica email", value: created.emailVerificationUrl }
              : null,
        );
        onNotify(`Utente ${created.data.email} creato`);
      } else if (selectedUser) {
        await adminRequest<{ data: PlatformUser }>(`users/${selectedUser.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        onNotify(`Utente ${form.email} aggiornato`);
        closeModal();
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Salvataggio non riuscito");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await adminRequest(`users/${id}`, { method: "DELETE" });
      onNotify("Utente eliminato");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eliminazione non riuscita");
    }
  }

  async function sendVerification(user: PlatformUser) {
    try {
      const response = await adminRequest<{ emailVerificationUrl?: string }>(
        `users/${user.id}/send-verification`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setIssuedSecret(
        response.emailVerificationUrl
          ? { label: "Link verifica email", value: response.emailVerificationUrl }
          : null,
      );
      onNotify(`Verifica email inviata a ${user.email}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invio verifica non riuscito");
    }
  }

  async function createResetLink(user: PlatformUser) {
    try {
      const response = await adminRequest<{ passwordResetUrl?: string }>(
        `users/${user.id}/password-reset-link`,
        { method: "POST", body: JSON.stringify({}) },
      );
      setIssuedSecret(
        response.passwordResetUrl
          ? { label: "Link recupero password", value: response.passwordResetUrl }
          : null,
      );
      onNotify(`Link recupero password generato per ${user.email}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generazione link reset non riuscita");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Header title="Utenti" description="Crea account, assegna ruoli, permessi e certificazione email." />
        <button type="button" onClick={openCreate} className="admin-primary-button">
          <Plus size={17} /> Nuovo utente
        </button>
      </div>

      {issuedSecret ? (
        <div className="admin-panel border-cyan/30 bg-cyan/10 p-4 text-sm text-cyan">
          <p className="font-bold">{issuedSecret.label}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={issuedSecret.value} className="admin-input text-xs" />
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => {
                void navigator.clipboard?.writeText(issuedSecret.value);
                onNotify("Copiato negli appunti");
              }}
            >
              Copia
            </button>
          </div>
        </div>
      ) : null}

      <label className="admin-panel relative block p-3">
        <Search size={17} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="admin-input pl-10"
          placeholder="Cerca nome o email..."
        />
      </label>

      <ResourceState loading={loading} error={error} empty={!data.length ? "Nessun utente presente." : undefined} />

      {!loading && !error && data.length ? (
        <section className="admin-panel overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-[#102238] text-[11px] uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Utente</th>
                <th className="px-4 py-3">Ruolo</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Permessi</th>
                <th className="px-4 py-3">Reset password</th>
                <th className="px-5 py-3 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {data.map((user) => (
                <tr key={user.id} className="border-t border-[#1b2b3d] align-top">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{user.name ?? "Senza nome"}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <p className="mt-1 text-[11px] text-slate-600">Creato: {formatDate(user.createdAt)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-xs font-bold text-cyan">
                      <ShieldCheck size={13} /> {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {user.emailVerifiedAt ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                        <CheckCircle2 size={15} /> Certificata
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                        <XCircle size={15} /> Da certificare
                      </span>
                    )}
                    <p className="mt-1 text-[11px] text-slate-500">{formatDate(user.emailVerifiedAt)}</p>
                  </td>
                  <td className="max-w-xs px-4 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.permissions.slice(0, 5).map((permission) => (
                        <span key={permission} className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                          {permissionsByKey.get(permission) ?? permission}
                        </span>
                      ))}
                      {user.permissions.length > 5 ? (
                        <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-500">
                          +{user.permissions.length - 5}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-400">{formatDate(user.passwordResetExpires)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Modifica ${user.email}`}
                        className="admin-icon-button"
                        onClick={() => openEdit(user)}
                      >
                        <Edit3 size={17} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Verifica email ${user.email}`}
                        className="admin-icon-button"
                        onClick={() => void sendVerification(user)}
                      >
                        <MailCheck size={17} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Reset password ${user.email}`}
                        className="admin-icon-button"
                        onClick={() => void createResetLink(user)}
                      >
                        <KeyRound size={17} />
                      </button>
                      <ConfirmButton
                        label={`Elimina ${user.email}`}
                        onConfirm={() => void remove(user.id)}
                        className="admin-icon-button hover:text-red-400"
                      >
                        <Trash2 size={17} />
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {modal ? (
        <AdminModal title={modal === "create" ? "Nuovo utente" : "Modifica utente"} onClose={closeModal}>
          <UserEditor
            form={form}
            permissionConfig={permissionConfig}
            saving={saving}
            mode={modal}
            onChange={setForm}
            onRoleChange={setRole}
            onTogglePermission={togglePermission}
            onSave={() => void saveUser()}
            issuedSecret={issuedSecret}
          />
        </AdminModal>
      ) : null}
    </div>
  );
}

function UserEditor({
  form,
  permissionConfig,
  saving,
  mode,
  issuedSecret,
  onChange,
  onRoleChange,
  onTogglePermission,
  onSave,
}: {
  form: UserForm;
  permissionConfig: UserPermissionConfig | null;
  saving: boolean;
  mode: "create" | "edit";
  issuedSecret: { label: string; value: string } | null;
  onChange: (form: UserForm) => void;
  onRoleChange: (role: PlatformUser["role"]) => void;
  onTogglePermission: (permission: UserPermission) => void;
  onSave: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="admin-label">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={(event) => onChange({ ...form, email: event.target.value })}
            className="admin-input mt-2"
            placeholder="utente@tvmix.it"
          />
        </label>
        <label>
          <span className="admin-label">Nome</span>
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            className="admin-input mt-2"
            placeholder="Nome operatore"
          />
        </label>
        <label>
          <span className="admin-label">Ruolo</span>
          <select
            value={form.role}
            onChange={(event) => onRoleChange(event.target.value as PlatformUser["role"])}
            className="admin-input mt-2"
          >
            <option value="USER">Utente</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </label>
        <label>
          <span className="admin-label">{mode === "create" ? "Password" : "Nuova password"}</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) => onChange({ ...form, password: event.target.value })}
            className="admin-input mt-2"
            placeholder={mode === "create" ? "Vuota = generata automaticamente" : "Lascia vuota per non modificare"}
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-3 rounded-lg border border-[#1d3044] bg-white/[0.03] p-3 text-sm">
          <input
            type="checkbox"
            checked={form.emailVerified}
            onChange={(event) => onChange({ ...form, emailVerified: event.target.checked })}
          />
          Email certificata
        </label>
        {mode === "create" ? (
          <label className="flex items-center gap-3 rounded-lg border border-[#1d3044] bg-white/[0.03] p-3 text-sm">
            <input
              type="checkbox"
              checked={form.sendVerificationEmail}
              onChange={(event) => onChange({ ...form, sendVerificationEmail: event.target.checked })}
              disabled={form.emailVerified}
            />
            Invia email di verifica
          </label>
        ) : null}
      </div>

      <section>
        <p className="admin-label">Permessi concessi</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {permissionConfig?.data.map((permission) => (
            <label
              key={permission.key}
              className="flex items-center gap-3 rounded-lg border border-[#1d3044] bg-white/[0.03] p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={form.permissions.includes(permission.key)}
                onChange={() => onTogglePermission(permission.key)}
              />
              {permission.label}
            </label>
          ))}
        </div>
      </section>

      {issuedSecret ? (
        <div className="rounded-lg border border-cyan/30 bg-cyan/10 p-3 text-xs text-cyan">
          <p className="font-bold">{issuedSecret.label}</p>
          <p className="mt-1 break-all">{issuedSecret.value}</p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={onSave} className="admin-primary-button">
          {saving ? "Salvataggio..." : mode === "create" ? "Crea utente" : "Salva modifiche"}
        </button>
      </div>
    </div>
  );
}
