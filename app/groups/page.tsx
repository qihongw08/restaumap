import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/shared/nav";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Users, Plus } from "lucide-react";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const groups = await prisma.group.findMany({
    where: { members: { some: { userId: user.id } } },
    include: {
      _count: { select: { members: true, groupRestaurants: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <main className="mx-auto max-w-lg px-6">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase">
            Groups
          </h1>
          <Link
            href="/groups/new"
            className="flex items-center gap-2 rounded-2xl bg-primary px-4 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground shadow-lg transition-transform active:scale-95"
          >
            <Plus className="h-4 w-4" /> New
          </Link>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Shared collections of saved restaurants with friends.
        </p>
        {groups.length === 0 ? (
          <div className="rounded-2xl border-2 border-muted bg-muted/30 px-10 py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/60" />
            <p className="mt-6 text-sm font-bold text-muted-foreground">
              No groups yet
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Create a group and share the invite link with friends.
            </p>
            <Link
              href="/groups/new"
              className="mt-6 inline-block rounded-xl bg-primary px-4 py-2 text-xs font-black uppercase tracking-widest text-primary-foreground"
            >
              Create group
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center justify-between rounded-2xl border-2 border-border bg-background p-4 shadow-sm transition-all hover:border-primary/40 hover:bg-muted/50"
                >
                  <div>
                    <h2 className="font-black italic tracking-tight text-foreground">
                      {g.name}
                    </h2>
                    <p className="mt-1 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      {g._count.members} member
                      {g._count.members !== 1 ? "s" : ""} ·{" "}
                      {g._count.groupRestaurants} restaurant
                      {g._count.groupRestaurants !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Nav />
    </div>
  );
}
