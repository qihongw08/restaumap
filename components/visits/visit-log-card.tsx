"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { format, differenceInCalendarDays } from "date-fns";
import { Pencil } from "lucide-react";
import { calculatePFRatio, formatPFRatio } from "@/lib/utils";
import { EditVisitModal } from "@/components/visits/edit-visit-modal";

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
function isR2Url(url: string) {
  return R2_BASE.length > 0 && url.startsWith(R2_BASE);
}

export interface VisitLogData {
  id: string;
  userId: string;
  restaurantId: string;
  visitDate: string;
  fullnessScore: number;
  tasteScore: number;
  pricePaid: number;
  notes: string | null;
  photos: { id: string; url: string }[];
  restaurant: { id: string; name: string };
}

interface VisitLogCardProps {
  visit: VisitLogData;
  displayName?: string;
  avatarUrl?: string;
  editable?: boolean;
  showRestaurantName?: boolean;
}

export function VisitLogCard({
  visit,
  displayName,
  avatarUrl,
  editable = false,
  showRestaurantName = true,
}: VisitLogCardProps) {
  const [editing, setEditing] = useState(false);

  const pfRatio = calculatePFRatio(
    Number(visit.fullnessScore),
    Number(visit.tasteScore),
    Number(visit.pricePaid),
  );
  const photos = visit.photos ?? [];

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        {/* Photo strip — scrollable, shows all photos */}
        {photos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto p-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
            {photos.map((photo) => (
              <a
                key={photo.id}
                href={photo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block shrink-0 snap-start overflow-hidden rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {isR2Url(photo.url) ? (
                  <Image
                    src={photo.url}
                    alt=""
                    width={192}
                    height={192}
                    className="h-48 w-48 object-cover"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- Fallback for non-R2 URLs */
                  <img
                    src={photo.url}
                    alt=""
                    className="h-48 w-48 object-cover"
                  />
                )}
              </a>
            ))}
          </div>
        )}

        {/* Info section */}
        <div className="px-4 py-3">
          {showRestaurantName && (
            <Link
              href={`/restaurants/${visit.restaurant.id}`}
              className="block min-w-0"
            >
              <p className="text-base font-black italic leading-snug text-foreground break-words">
                {visit.restaurant.name}
              </p>
            </Link>
          )}
          <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{format(new Date(visit.visitDate), "MMMM d, yyyy")}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
              {(() => {
                const days = differenceInCalendarDays(new Date(), new Date(visit.visitDate));
                if (days === 0) return "Today";
                if (days === 1) return "1 day ago";
                return `${days} days ago`;
              })()}
            </span>
          </p>
          {visit.notes && (
            <p className="mt-1.5 text-xs italic text-muted-foreground line-clamp-2">
              {visit.notes}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-black/5 px-4 py-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={28}
              height={28}
              className="size-7 shrink-0 rounded-full object-cover"
            />
          ) : displayName ? (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
              {displayName[0].toUpperCase()}
            </div>
          ) : null}
          {displayName && (
            <p className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-foreground">
              {displayName}
            </p>
          )}
          {!displayName && <div className="min-w-0 flex-1" />}
          <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-sm font-black italic text-primary">
            {formatPFRatio(pfRatio)}
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
              aria-label="Edit visit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing && (
        <EditVisitModal
          open
          onClose={() => setEditing(false)}
          visit={{
            ...visit,
            groupId: null,
            createdAt: visit.visitDate,
            updatedAt: visit.visitDate,
            photos: visit.photos.map((p) => ({
              id: p.id,
              url: p.url,
              uploadedAt: visit.visitDate,
            })),
          }}
          restaurantId={visit.restaurantId}
        />
      )}
    </>
  );
}
