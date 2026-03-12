import React from "react";
import Link from "next/link";
import Image from "next/image";

export type DbUser = {
  id: string;
  username: string | null;
  avatarUrl: string | null;
} | null;

export interface DashboardHeaderProps {
  user: DbUser;
  isLoggedIn?: boolean;
}

function getDisplayName(user: DbUser): string {
  if (!user) return "Foodie";
  return user.username ?? "Foodie";
}

export function DashboardHeader(
  props: DashboardHeaderProps,
): React.ReactElement {
  const { user, isLoggedIn = false } = props;
  const displayName = getDisplayName(user);
  const avatarUrl = user?.avatarUrl ?? null;

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="text-2xl md:text-3xl font-black text-muted-foreground italic tracking-tight">
        Hello, <span className="text-foreground not-italic">{displayName}</span>
      </p>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="h-14 w-14 rounded-2xl border-2 border-primary bg-primary/10 flex items-center justify-center overflow-hidden shadow-lg shadow-primary/20">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xl font-black text-primary">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {user || isLoggedIn ? (
          <div className="flex items-center gap-3">
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
