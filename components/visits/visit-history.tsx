"use client";

import { useState } from "react";
import { formatPFRatio, calculatePFRatio } from "@/lib/utils";
import type { VisitWithPhotos } from "@/types/visit";
import { format } from "date-fns";
import { Calendar, Pencil } from "lucide-react";
import Image from "next/image";
import { EditVisitModal } from "./edit-visit-modal";

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
function isR2Url(url: string) {
  return R2_BASE.length > 0 && url.startsWith(R2_BASE);
}

interface VisitHistoryProps {
  visits: VisitWithPhotos[];
  restaurantId: string;
  editable?: boolean;
}

export function VisitHistory({
  visits,
  restaurantId,
  editable = false,
}: VisitHistoryProps) {
  const [editingVisit, setEditingVisit] = useState<VisitWithPhotos | null>(
    null,
  );

  if (visits.length === 0) return null;

  return (
    <>
      <ul className="mt-3 space-y-4">
        {visits.map((visit) => {
          const pfRatio = calculatePFRatio(
            Number(visit.fullnessScore),
            Number(visit.tasteScore),
            Number(visit.pricePaid),
          );
          const photos = visit.photos ?? [];
          return (
            <li
              key={visit.id}
              className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
            >
              {/* Photo strip — scrollable, shows all photos */}
              {photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto p-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
                  {photos.map((photo) => (
                    <a
                      key={photo.url}
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

              {!photos.length && (
                <div className="bg-gradient-to-br from-primary/10 to-transparent px-4 py-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    {format(new Date(visit.visitDate), "MMMM d, yyyy")}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-black/5 px-4 py-3">
                <div className="min-w-0 flex-1">
                  {photos.length > 0 && (
                    <p className="text-xs font-bold text-muted-foreground">
                      {format(new Date(visit.visitDate), "MMMM d, yyyy")}
                    </p>
                  )}
                  {visit.group && (
                    <p className="text-[10px] font-bold text-muted-foreground">
                      {visit.group.name}
                    </p>
                  )}
                  {visit.notes && (
                    <p className="overflow-hidden text-ellipsis whitespace-nowrap text-xs italic text-muted-foreground">
                      {visit.notes}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-primary/15 px-3 py-1 text-sm font-black italic text-primary">
                  {formatPFRatio(pfRatio)}
                </span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => setEditingVisit(visit)}
                    className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground"
                    aria-label="Edit visit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {editingVisit && (
        <EditVisitModal
          open
          onClose={() => setEditingVisit(null)}
          visit={editingVisit}
          restaurantId={restaurantId}
        />
      )}
    </>
  );
}
