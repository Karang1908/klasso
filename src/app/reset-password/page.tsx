"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/AppShell";
import { Banner, Button, Card, Field, Input } from "@/components/ui";
import { useApp } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export default function ResetPassword() {
  const { ready, session } = useApp();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-7 px-6 py-10"><Brand /><Card className="p-6"><h1 className="page-heading">A fresh start.</h1><p className="page-subtitle mb-6">Choose a new password for your account.</p>
    {!ready ? <p role="status" className="text-dim">Checking your reset link…</p> : !session ? <><Banner tone="warn">This link has expired or is no longer valid. Request another from the sign-in page.</Banner><Link className="section-link mt-4" href="/login">Return to sign in</Link></> : <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (password !== confirm || password.length < 8) return; setBusy(true); setError(null); try { const { error: err } = await supabase().auth.updateUser({ password }); if (err) throw err; router.replace("/today"); } catch (err) { setError(err instanceof Error ? err.message : "Could not update your password. Please try again."); } finally { setBusy(false); } }}>
      <Field label="New password" hint="At least 8 characters"><Input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Field label="Confirm password"><Input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={(event) => setConfirm(event.target.value)} /></Field>
      {confirm && password !== confirm && <p className="text-sm text-danger">The passwords don’t match yet.</p>}{error && <Banner tone="danger">{error}</Banner>}<Button type="submit" className="w-full" variant="primary" disabled={busy || password.length < 8 || password !== confirm}>{busy ? "Saving…" : "Save new password"}</Button>
    </form>}
  </Card></main>;
}
