'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function AuthNav() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="max-w-[120px] truncate text-xs text-muted-foreground" title={user.email}>
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
    );
  }

  return (
    <Link
      href="/login"
      className="text-xs font-black uppercase tracking-widest text-primary hover:underline"
    >
      Sign in
    </Link>
  );
}
