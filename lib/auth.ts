import { createClient } from '@/lib/supabase/server';

/**
 * Get the current user on the server. Uses getClaims() for verified session.
 * Use this (not getSession()) to protect routes or show user-specific UI.
 * Returns null if not signed in or token invalid.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub as string,
    email: (claims.email as string) ?? undefined,
  };
}
