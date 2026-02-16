import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components (browser).
 * Uses cookies for session; use with signInWithOAuth, etc.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
