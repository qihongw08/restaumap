import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNowStrict, differenceInCalendarDays } from "date-fns";
import { MapPin, Camera } from "lucide-react";
import { calculatePFRatio, formatPFRatio } from "@/lib/utils";

function daysAgoLabel(dateStr: string): string {
  const days = differenceInCalendarDays(new Date(), new Date(dateStr));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

interface VisitItem {
  id: string;
  restaurantId: string;
  restaurantName: string;
  visitDate: string;
  fullnessScore: number;
  tasteScore: number;
  pricePaid: number;
  photoUrl?: string;
}

interface AddedItem {
  restaurantId: string;
  restaurantName: string;
  address?: string;
  savedAt: string;
  photoReference?: string;
}

interface RecentActivityProps {
  visits: VisitItem[];
  added: AddedItem[];
}

type ActivityEntry =
  | { type: "visit"; date: Date; data: VisitItem }
  | { type: "added"; date: Date; data: AddedItem };

export function RecentActivity({ visits, added }: RecentActivityProps) {
  // Merge and sort by date descending
  const entries: ActivityEntry[] = [
    ...visits.map((v) => ({ type: "visit" as const, date: new Date(v.visitDate), data: v })),
    ...added.map((a) => ({ type: "added" as const, date: new Date(a.savedAt), data: a })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (entries.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">
          Recent Activity
        </h2>
        <div className="rounded-2xl border border-black/10 bg-white px-6 py-8 text-center shadow-sm">
          <p className="text-sm font-bold text-muted-foreground">No activity yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Import a restaurant or log a visit to get started.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-muted-foreground">
        Recent Activity
      </h2>
      <ul className="space-y-2">
        {entries.slice(0, 8).map((entry) => {
          if (entry.type === "visit") {
            const v = entry.data;
            const pfRatio = calculatePFRatio(v.fullnessScore, v.tasteScore, v.pricePaid);
            return (
              <li key={`visit-${v.id}`}>
                <Link
                  href={`/restaurants/${v.restaurantId}`}
                  className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.99]"
                >
                  {v.photoUrl ? (
                    (R2_BASE && v.photoUrl.startsWith(R2_BASE)) ? (
                      <Image
                        src={v.photoUrl}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={v.photoUrl}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-xl object-cover"
                      />
                    )
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Camera className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground break-words line-clamp-1">
                      {v.restaurantName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Visited {daysAgoLabel(v.visitDate)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-black italic text-primary">
                    {formatPFRatio(pfRatio)}
                  </span>
                </Link>
              </li>
            );
          }

          const a = entry.data;
          return (
            <li key={`added-${a.restaurantId}`}>
              <Link
                href={`/restaurants/${a.restaurantId}`}
                className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/20 active:scale-[0.99]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/10">
                  <MapPin className="h-4 w-4 text-blue-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground break-words line-clamp-1">
                    {a.restaurantName}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Saved {formatDistanceToNowStrict(new Date(a.savedAt), { addSuffix: true })}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                  New
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
