'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

function getDisplayName(user: User | null): string {
  if (!user) return 'Foodie';
  const meta = user.user_metadata;
  if (meta?.full_name) return meta.full_name;
  if (meta?.name) return meta.name;
  if (user.email) return user.email.split('@')[0];
  return 'Foodie';
}

function getAvatarUrl(user: User | null): string | null {
  if (!user?.user_metadata) return null;
  return user.user_metadata.avatar_url ?? user.user_metadata.picture ?? null;
}

export function DashboardHeader() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  const avatarUrl = getAvatarUrl(user);
  const displayName = getDisplayName(user);

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-2xl md:text-3xl font-black text-muted-foreground italic tracking-tight">
        Hello, <span className="text-foreground not-italic">{displayName}</span>
      </p>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="h-14 w-14 rounded-2xl border-2 border-primary bg-primary/10 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-xl font-black text-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <span
              className="max-w-[140px] truncate text-xs text-muted-foreground"
              title={user.email ?? ''}
            >
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
