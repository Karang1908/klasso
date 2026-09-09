"use client";
import "./globals.css";

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="en"><body><main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6"><h1 className="page-heading">A brief interruption.</h1><p className="text-dim">Klasso couldn’t open. Please try again.</p><button className="btn btn-primary rounded-xl px-5 py-3 font-semibold" onClick={retry}>Try again</button></main></body></html>;
}
