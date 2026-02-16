'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Nav } from '@/components/shared/nav';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create group');
      }
      const json = await res.json();
      router.push(`/groups/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <main className="mx-auto max-w-lg px-6">
        <Link
          href="/groups"
          className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to groups
        </Link>
        <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase">
          New group
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a shared collection and invite friends with a link.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground">
            Group name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekend brunch crew"
            className="w-full rounded-2xl border-2 border-border bg-background px-4 py-3 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            autoFocus
          />
          {error && (
            <p className="text-sm font-bold text-destructive">{error}</p>
          )}
          <Button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full py-6 text-sm font-black uppercase tracking-widest"
          >
            {isSubmitting ? 'Creating…' : 'Create group'}
          </Button>
        </form>
      </main>
      <Nav />
    </div>
  );
}
