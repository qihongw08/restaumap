import Link from "next/link";

export function ExpiredView() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-black italic tracking-tighter text-foreground">
          This share link has expired
        </h1>
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Ask for a fresh link, or create your own restaurant map.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/login"
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground"
          >
            Sign up free
          </Link>
          <Link
            href="/"
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-black uppercase tracking-widest text-foreground"
          >
            Back home
          </Link>
        </div>
      </main>
    </div>
  );
}
