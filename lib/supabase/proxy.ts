import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/auth-code-error",
  "/groups/join",
  "/share",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isShareDetailRequest(request: NextRequest): boolean {
  return (
    request.nextUrl.pathname.startsWith("/restaurants/") &&
    request.nextUrl.searchParams.has("shareToken")
  );
}

/**
 * Refreshes Supabase auth session and forwards cookies.
 * Redirects to /login?next=... when not authenticated on protected paths.
 * Must run getClaims() (validates JWT) — never trust getSession() on server.
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  // Protect non-public, non-API page routes
  const pathname = request.nextUrl.pathname;
  if (
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.includes(".") &&
    !isPublicPath(pathname) &&
    !isShareDetailRequest(request) &&
    !data?.claims?.sub
  ) {
    const loginUrl = new URL("/login", request.url);
    const next = pathname + (request.nextUrl.search || "");
    loginUrl.searchParams.set("next", encodeURIComponent(next));
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
