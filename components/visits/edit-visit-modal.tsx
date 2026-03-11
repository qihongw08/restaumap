"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculatePFRatio, clampScore, cn } from "@/lib/utils";
import { PF_RATIO_FULLNESS_MAX, PF_RATIO_TASTE_MAX } from "@/lib/constants";
import { Plus, X, Trash2 } from "lucide-react";
import type { VisitWithPhotos } from "@/types/visit";
import Image from "next/image";

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";
function isR2Url(url: string) {
  return R2_BASE.length > 0 && url.startsWith(R2_BASE);
}

interface EditVisitModalProps {
  open: boolean;
  onClose: () => void;
  visit: VisitWithPhotos;
  restaurantId: string;
}

export function EditVisitModal({
  open,
  onClose,
  visit,
  restaurantId,
}: EditVisitModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [visitDate, setVisitDate] = useState(
    new Date(visit.visitDate).toISOString().slice(0, 10),
  );
  const [fullnessScore, setFullnessScore] = useState(
    Number(visit.fullnessScore),
  );
  const [tasteScore, setTasteScore] = useState(Number(visit.tasteScore));
  const [pricePaid, setPricePaid] = useState(
    String(Number(visit.pricePaid)),
  );
  const [notes, setNotes] = useState(visit.notes ?? "");

  const [existingPhotos, setExistingPhotos] = useState(visit.photos ?? []);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);

  const priceNum = parseFloat(pricePaid);
  const validPrice = Number.isFinite(priceNum) && priceNum > 0;
  const pfRatio = validPrice
    ? calculatePFRatio(fullnessScore, tasteScore, priceNum)
    : 0;

  const handleRemoveExisting = (photoId: string) => {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setRemovedPhotoIds((prev) => [...prev, photoId]);
  };

  const handleNewPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files;
    if (!chosen?.length) return;
    const allowed = Array.from(chosen).filter((f) =>
      f.type.startsWith("image/"),
    );
    const totalSlots = 10 - existingPhotos.length;
    setNewPhotoFiles((prev) => [...prev, ...allowed].slice(0, totalSlots));
    e.target.value = "";
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validPrice) {
      setError("Enter a valid price (e.g. 25.50)");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      for (const photoId of removedPhotoIds) {
        const delRes = await fetch(`/api/photos/${photoId}`, {
          method: "DELETE",
        });
        if (!delRes.ok) {
          const data = await delRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to remove photo");
        }
      }

      let newPhotoUrls: string[] = [];
      if (newPhotoFiles.length > 0) {
        const formData = new FormData();
        formData.append("restaurantId", restaurantId);
        newPhotoFiles.forEach((f) => formData.append("files", f));
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Photo upload failed");
        }
        const uploadJson = await uploadRes.json();
        newPhotoUrls = uploadJson.urls ?? [];
      }

      if (newPhotoUrls.length > 0) {
        await fetch("/api/photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitId: visit.id,
            restaurantId,
            urls: newPhotoUrls,
          }),
        });
      }

      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitDate,
          fullnessScore: clampScore(fullnessScore, 1, PF_RATIO_FULLNESS_MAX),
          tasteScore: clampScore(tasteScore, 1, PF_RATIO_TASTE_MAX),
          pricePaid: priceNum,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update visit");
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete visit");
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  const totalPhotos = existingPhotos.length + newPhotoFiles.length;

  return (
    <Modal open={open} onClose={onClose} title="Edit visit">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="VISIT DATE"
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="text-xs font-black uppercase tracking-widest"
        />

        <div className="space-y-6 rounded-3xl border border-border bg-muted/30 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                FULLNESS SCORE
              </label>
              <span className="text-sm font-black italic text-primary">
                {fullnessScore}/{PF_RATIO_FULLNESS_MAX}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={PF_RATIO_FULLNESS_MAX}
              value={fullnessScore}
              onChange={(e) => setFullnessScore(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                TASTE EXPERIENCE
              </label>
              <span className="text-sm font-black italic text-primary">
                {tasteScore}/{PF_RATIO_TASTE_MAX}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={PF_RATIO_TASTE_MAX}
              value={tasteScore}
              onChange={(e) => setTasteScore(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="edit-price"
            className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            TOTAL PRICE PAID
          </label>
          <div
            className={cn(
              "flex items-center overflow-hidden rounded-2xl border-2 bg-background focus-within:ring-2 focus-within:ring-primary/20",
              error
                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                : "border-border focus-within:border-primary",
            )}
          >
            <span className="shrink-0 pl-4 text-lg font-black italic text-muted-foreground">
              $
            </span>
            <input
              id="edit-price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={pricePaid}
              onChange={(e) => setPricePaid(e.target.value)}
              className="w-full min-w-0 border-0 bg-transparent py-3 pr-4 text-lg font-black italic text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            />
          </div>
          {error && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        {validPrice && (
          <div className="flex items-center justify-between rounded-2xl bg-primary px-6 py-4 shadow-lg">
            <span className="text-xs font-black uppercase tracking-widest text-primary-foreground opacity-80">
              PF RATIO™
            </span>
            <span className="text-2xl font-black italic tracking-tighter text-primary-foreground">
              {pfRatio.toFixed(2)}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            PHOTOS
          </label>
          <div className="flex flex-wrap gap-2">
            {existingPhotos.map((photo) => (
              <div
                key={photo.id}
                className="relative overflow-hidden rounded-lg border-2 border-border bg-muted"
              >
                {isR2Url(photo.url) ? (
                  <Image
                    src={photo.url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-20 object-cover"
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element -- Fallback for non-R2 URLs */
                  <img
                    src={photo.url}
                    alt=""
                    width={80}
                    height={80}
                    className="h-20 w-20 object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveExisting(photo.id)}
                  className="absolute right-1 top-1 rounded-full bg-destructive/90 p-1 text-destructive-foreground hover:bg-destructive"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {newPhotoFiles.map((file, i) => (
              <div
                key={`new-${file.name}-${i}`}
                className="relative overflow-hidden rounded-lg border-2 border-dashed border-primary/50 bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Local blob preview */}
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="h-20 w-20 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewPhoto(i)}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {totalPhotos < 10 && (
              <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/30 text-muted-foreground hover:border-primary/50 hover:bg-muted/50">
                <Plus className="h-6 w-6" />
                <span className="mt-1 text-[10px] font-bold">Add</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="sr-only"
                  onChange={handleNewPhotoChange}
                />
              </label>
            )}
          </div>
        </div>

        <Input
          label="ORDER NOTES (OPTIONAL)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What made this visit special?"
          className="text-sm font-bold"
        />

        <div className="space-y-3">
          <Button
            type="submit"
            disabled={isSubmitting || !validPrice || isDeleting}
            size="lg"
            className="h-14 w-full rounded-full text-lg shadow-[0_10px_30px_rgb(255,215,0,0.3)]"
          >
            {isSubmitting ? "SAVING…" : "SAVE CHANGES"}
          </Button>

          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Delete this visit
            </button>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 rounded-full"
              >
                {isDeleting ? "Deleting…" : "Confirm delete"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 rounded-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
