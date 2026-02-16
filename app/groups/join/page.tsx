'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Nav } from '@/components/shared/nav';
import { Loader2 } from 'lucide-react';

function GroupJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'checking' | 'joining' | 'done' | 'error'>('checking');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing invite token');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/groups/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (res.status === 401) {
          const joinUrl = `/groups/join?token=${encodeURIComponent(token)}`;
          router.replace(`/login?next=${encodeURIComponent(joinUrl)}`);
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMessage(data.error ?? 'Could not join group');
          setStatus('error');
          return;
        }
        const json = await res.json();
        setStatus('done');
        router.replace(`/groups/${json.data.groupId}`);
      } catch {
        if (!cancelled) {
          setMessage('Something went wrong');
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <main className="mx-auto max-w-lg px-6 py-12">
        {status === 'checking' || status === 'joining' ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">
              {status === 'checking' ? 'Checking invite…' : 'Joining group…'}
            </p>
          </div>
        ) : status === 'error' ? (
          <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/10 p-6">
            <p className="font-bold text-destructive">{message}</p>
            <a
              href="/groups"
              className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
            >
              ← Back to groups
            </a>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">
              Redirecting to group…
            </p>
          </div>
        )}
      </main>
      <Nav />
    </div>
  );
}

export default function GroupJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background pb-32">
          <div className="h-32 w-full" />
          <main className="mx-auto flex max-w-lg flex-col items-center justify-center gap-4 px-6 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-bold text-muted-foreground">Loading…</p>
          </main>
          <Nav />
        </div>
      }
    >
      <GroupJoinContent />
    </Suspense>
  );
}
