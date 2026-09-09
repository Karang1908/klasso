"use client";
import Link from "next/link";
import { Brand } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="mx-auto flex min-h-[65dvh] max-w-md flex-col justify-center gap-6 p-6"><Brand /><Card className="p-6"><h1 className="page-heading">Let’s try that again.</h1><p className="page-subtitle">This page couldn’t load. Retry, or head back to your day.</p><div className="mt-6 flex items-center gap-5"><Button variant="primary" onClick={retry}>Try again</Button><Link className="section-link" href="/today">Back to Today</Link></div></Card></main>;
}
