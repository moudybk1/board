"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PixelButton } from "@/components/ui/pixel-button";
import { PixelField } from "@/components/ui/pixel-field";
import {
  PixelPanel,
  PixelPanelHeader,
  PixelPanelTitle,
} from "@/components/ui/pixel-panel";
import {
  hasAuthErrors,
  validateAuthForm,
  type AuthErrors,
  type AuthMode,
} from "@/lib/auth/validate-auth-form";
import { writeBoardSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

/**
 * Login / register form with shared client-side validation (mock submit → /account).
 */
export function AuthForm({ initialMode = "login" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<AuthErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const values = { email, username, password, confirm };

  function revalidate(nextMode = mode, nextValues = values) {
    setErrors(validateAuthForm(nextMode, nextValues));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched({
      email: true,
      username: true,
      password: true,
      confirm: true,
    });
    const next = validateAuthForm(mode, values);
    setErrors(next);
    if (hasAuthErrors(next)) return;

    setSubmitting(true);
    writeBoardSession({
      mode,
      email: email.trim(),
      username: mode === "register" ? username.trim() : undefined,
      at: new Date().toISOString(),
    });
    window.setTimeout(() => {
      router.push("/account");
    }, 450);
  }

  return (
    <PixelPanel tone="raised" className="overflow-hidden">
      <PixelPanelHeader>
        <PixelPanelTitle>
          {mode === "login" ? "Sign in" : "Create account"}
        </PixelPanelTitle>
      </PixelPanelHeader>

      <div className="flex border-b-2 border-edge">
        {(
          [
            { id: "login", label: "Sign in" },
            { id: "register", label: "Register" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMode(tab.id);
              setErrors({});
              setTouched({});
            }}
            className={cn(
              "flex-1 px-4 py-3 font-pixel text-[10px] uppercase",
              mode === tab.id
                ? "bg-gold/15 text-gold"
                : "text-muted hover:bg-surface-hover hover:text-parchment",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <Field
          label="Email"
          type="email"
          value={email}
          error={touched.email ? errors.email : undefined}
          onChange={(value) => {
            setEmail(value);
            if (touched.email) {
              revalidate(mode, { ...values, email: value });
            }
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, email: true }));
            revalidate();
          }}
          autoComplete="email"
        />

        {mode === "register" ? (
          <Field
            label="Username"
            type="text"
            value={username}
            error={touched.username ? errors.username : undefined}
            onChange={(value) => {
              setUsername(value);
              if (touched.username) {
                revalidate(mode, { ...values, username: value });
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, username: true }));
              revalidate();
            }}
            autoComplete="username"
          />
        ) : null}

        <Field
          label="Password"
          type="password"
          value={password}
          error={touched.password ? errors.password : undefined}
          onChange={(value) => {
            setPassword(value);
            if (touched.password) {
              revalidate(mode, { ...values, password: value });
            }
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, password: true }));
            revalidate();
          }}
          autoComplete={
            mode === "login" ? "current-password" : "new-password"
          }
        />

        {mode === "register" ? (
          <Field
            label="Confirm password"
            type="password"
            value={confirm}
            error={touched.confirm ? errors.confirm : undefined}
            onChange={(value) => {
              setConfirm(value);
              if (touched.confirm) {
                revalidate(mode, { ...values, confirm: value });
              }
            }}
            onBlur={() => {
              setTouched((prev) => ({ ...prev, confirm: true }));
              revalidate();
            }}
            autoComplete="new-password"
          />
        ) : null}

        <PixelButton
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting
            ? "Working…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </PixelButton>
      </form>
    </PixelPanel>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  autoComplete?: string;
}) {
  return (
    <PixelField
      label={label}
      type={type}
      value={value}
      autoComplete={autoComplete}
      error={error}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}
