"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store";

/**
 * Sends a signed-in visitor straight to their day.
 *
 * Deliberately client-side: the landing page must stay a static, crawlable
 * document at "/", so the redirect cannot live in the server component or
 * search engines would index a redirect instead of the page.
 */
export function SignedInRedirect() {
  const { ready, session } = useApp();
  const router = useRouter();
  useEffect(() => { if (ready && session) router.replace("/today"); }, [ready, session, router]);
  return null;
}
