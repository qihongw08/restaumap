"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

function SetUsernameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => {
        if (r.status === 401) {
          router.replace(
            `/login?next=${encodeURIComponent(`/profile/set-username${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`)}`,
          );
          return null;
        }
        return r.json();
      })
      .then((json) => {
        if (json?.data?.username) {
          const safeNext =
            next.startsWith("/") && !next.includes("//") ? next : "/";
          router.replace(safeNext);
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = username.trim();
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to set username");
        setLoading(false);
        return;
      }
      const safeNext =
        next.startsWith("/") && !next.includes("//") ? next : "/";
      router.push(safeNext);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background p-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase">
          Choose your username
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is how you&apos;ll appear in groups and to friends.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="username" className="sr-only">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. foodie_alex"
              autoComplete="username"
              className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              maxLength={50}
              disabled={loading}
            />
          </div>
          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SetUsernamePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <SetUsernameForm />
    </Suspense>
  );
}
