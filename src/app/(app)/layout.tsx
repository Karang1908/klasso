"use client";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { LaunchScreen } from "@/components/LaunchScreen";
import { getRegistration } from "@/lib/push-client";
import { useApp } from "@/lib/store";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { ready, session, loading, data } = useApp();
  const router = useRouter();
  useEffect(() => { if (ready && !session) router.replace("/login"); }, [ready, session, router]);
  // Everyone meets the intro once. Waiting for the profile matters: acting
  // on a not-yet-loaded profile would bounce returning users into it.
  const onboarded = data.profile?.onboarded_at;
  useEffect(() => {
    if (ready && session && data.profile && !onboarded) router.replace("/welcome");
  }, [ready, session, data.profile, onboarded, router]);
  useEffect(() => { void getRegistration(); }, []);
  if (!ready || !session || (loading && !data.profile)) return <LaunchScreen />;
  return <AppShell>{children}</AppShell>;
}
