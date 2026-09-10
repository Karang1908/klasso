"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "@/components/AppShell";
import { GoogleMark, Icon } from "@/components/icons";
import { Banner, Button, Card, Field, Input, Spinner } from "@/components/ui";
import { deviceTimezone } from "@/lib/time";
import { useApp } from "@/lib/store";
import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const { session, ready } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up" | "forgot">("up");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const configured = isSupabaseConfigured();
  useEffect(() => { if (ready && session) router.replace("/today"); }, [ready, session, router]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!configured) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      const db = supabase();
      if (mode === "forgot") {
        const { error: err } = await db.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (err) throw err;
        setNotice("If there is an account for this address, a password reset link is on its way. Check your inbox."); return;
      }
      if (mode === "up") {
        const { data, error: err } = await db.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() || undefined, timezone: deviceTimezone() ?? undefined }, emailRedirectTo: `${window.location.origin}/today` } });
        if (err) throw err;
        if (!data.session) { setNotice("Check your inbox to confirm your email, then sign in."); setMode("in"); return; }
      } else {
        const { error: err } = await db.auth.signInWithPassword({ email: email.trim(), password }); if (err) throw err;
      }
      router.replace("/today");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not sign in. Please try again."); }
    finally { setBusy(false); }
  }
  async function continueWithGoogle() {
    if (!configured) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      // No callback route needed: the browser client runs with
      // detectSessionInUrl, so it picks the session out of the return URL.
      const { error: err } = await supabase().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/today` },
      });
      if (err) throw err;
      // On success the browser is already navigating to Google. Deliberately
      // leave `busy` set so the button cannot be pressed twice on the way out.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach Google. Please try again.");
      setBusy(false);
    }
  }
  return <main className="safe-t mx-auto flex min-h-dvh max-w-6xl flex-col justify-center px-6 py-10">
    <div className="mb-10"><Brand /></div>
    <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-20">
      <section className="hidden md:block"><div className="live-panel p-10"><h1 className="max-w-sm text-4xl font-semibold leading-tight tracking-tight">Your day.<br />At your pace.</h1><p className="mt-5 max-w-sm text-sm leading-relaxed">A home for your college life. Keep your classes, deadlines and everyday to-dos in a little more harmony.</p><div className="mt-9 space-y-5">{([{ icon: "week", title: "Know what’s next", text: "Your classes and free time, together." }, { icon: "tasks", title: "Keep the bigger picture", text: "Daily plans. A master list that stays." }, { icon: "bell", title: "A nudge when you need it", text: "Class, task and exam reminders." }] as const).map((item) => <div key={item.title} className="flex gap-3"><Icon name={item.icon} /><div><h2 className="!mt-0 !text-sm !font-semibold">{item.title}</h2><p className="mt-1 text-xs">{item.text}</p></div></div>)}</div></div></section>
      <Card className="p-6 sm:p-8"><h2 className="page-heading">{mode === "up" ? "Create your account" : mode === "forgot" ? "Let’s get you back in." : "Welcome back."}</h2><p className="page-subtitle mb-6">{mode === "up" ? "Create your own college workspace." : mode === "forgot" ? "We’ll email you a link to reset your password." : "Your college day is waiting for you."}</p>
        {!configured && <div className="mb-5"><Banner tone="warn">This workspace isn’t connected yet. Complete the cloud setup before signing in.</Banner></div>}
        {mode !== "forgot" && <>
          <Button className="oauth-btn w-full" variant="secondary" onClick={() => void continueWithGoogle()} disabled={busy || !configured}>
            <GoogleMark />Continue with Google
          </Button>
          <p className="or-rule">or</p>
        </>}
        <form className="space-y-4" onSubmit={submit}>
          {mode === "up" && <Field label="Your name"><Input value={name} autoComplete="given-name" placeholder="What should we call you?" maxLength={60} onChange={(event) => setName(event.target.value)} /></Field>}
          <Field label="Email"><Input type="email" inputMode="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></Field>
          {mode !== "forgot" && <Field label="Password" hint={mode === "up" ? "Use at least 8 characters." : undefined}><Input type="password" autoComplete={mode === "up" ? "new-password" : "current-password"} minLength={mode === "up" ? 8 : 6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></Field>}
          {mode === "in" && <button type="button" className="section-link" onClick={() => { setMode("forgot"); setError(null); setNotice(null); }}>Forgot password?</button>}
          {error && <Banner tone="danger">{error}</Banner>}{notice && <Banner tone="success">{notice}</Banner>}
          <Button className="w-full" type="submit" variant="primary" disabled={busy || !configured}>{busy && <Spinner />}{mode === "up" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}<Icon name="arrow" size={17} /></Button>
        </form>
        <div className="mt-5 border-t border-line pt-4 text-center">
          <p className="text-sm text-dim">
            {mode === "up" ? "Already have an account?" : "New to Klasso?"}
          </p>
          <button
            className="mt-1 text-sm font-semibold text-brand underline underline-offset-4"
            onClick={() => { setMode(mode === "up" ? "in" : "up"); setError(null); setNotice(null); }}
          >
            {mode === "up" ? "Sign in instead" : "Create an account"}
          </button>
        </div>
        {process.env.NODE_ENV !== "production" && <Link href="/preview" className="section-link mt-3 w-full justify-center border-t border-line pt-4">Explore the interactive preview<Icon name="arrow" size={16} /></Link>}
      </Card>
    </div>
    <p className="mt-10 text-center text-xs text-dim">Your classes. Your goals. Your Klasso.</p>
  </main>;
}
