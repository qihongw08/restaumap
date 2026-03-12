import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";

interface GroupCardData {
  id: string;
  name: string;
  memberCount: number;
  restaurantCount: number;
  memberAvatars: { id: string; avatarUrl?: string; username?: string }[];
}

interface GroupCardsProps {
  groups: GroupCardData[];
}

export function GroupCards({ groups }: GroupCardsProps) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">
        Your Groups
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            className="flex shrink-0 w-48 flex-col justify-between rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
          >
            <div>
              <p className="font-black italic tracking-tight text-foreground break-words line-clamp-2">
                {g.name}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {g.memberCount} member{g.memberCount !== 1 ? "s" : ""} ·{" "}
                {g.restaurantCount} spot{g.restaurantCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="mt-3 flex">
              {g.memberAvatars.slice(0, 4).map((m, i) =>
                m.avatarUrl ? (
                  <Image
                    key={m.id}
                    src={m.avatarUrl}
                    alt={m.username ?? ""}
                    width={24}
                    height={24}
                    className={`h-6 w-6 rounded-full object-cover ring-2 ring-white${i > 0 ? " -ml-1.5" : ""}`}
                  />
                ) : (
                  <div
                    key={m.id}
                    className={`flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-2 ring-white text-[8px] font-black text-muted-foreground${i > 0 ? " -ml-1.5" : ""}`}
                  >
                    {(m.username ?? "?")[0].toUpperCase()}
                  </div>
                ),
              )}
            </div>
          </Link>
        ))}

        {/* Create group card */}
        <Link
          href="/groups/new"
          className="flex shrink-0 w-48 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted bg-muted/10 p-4 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
        >
          <Plus className="h-6 w-6" />
          <span className="text-xs font-black uppercase tracking-widest">
            New Group
          </span>
        </Link>
      </div>
    </section>
  );
}
