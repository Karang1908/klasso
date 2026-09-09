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
  useEffect(() => { void getRegistration(); }, []);
  if (!ready || !session || (loading && !data.profile)) return <LaunchScreen />;
  return <AppShell>{children}</AppShell>;
}
