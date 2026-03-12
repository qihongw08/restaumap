"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { calculatePFRatio, clampScore, cn } from "@/lib/utils";
import { PF_RATIO_FULLNESS_MAX, PF_RATIO_TASTE_MAX } from "@/lib/constants";
import { ImageIcon, Plus, X } from "lucide-react";

interface LogVisitModalProps {
  open: boolean;
  onClose: () => void;
  restaurantId: string;
}

interface GroupOption {
  id: string;
  name: string;
}

export function LogVisitModal({
  open,
  onClose,
  restaurantId,
}: LogVisitModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  const [visitDate, setVisitDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [fullnessScore, setFullnessScore] = useState(5);
  const [tasteScore, setTasteScore] = useState(5);
  const [pricePaid, setPricePaid] = useState("");
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!open || !restaurantId) return;
    fetch(`/api/restaurants/${restaurantId}/groups`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => setGroups(json.data ?? []))
      .catch(() => setGroups([]));
  }, [open, restaurantId]);

  const priceNum = parseFloat(pricePaid);
  const validPrice = Number.isFinite(priceNum) && priceNum > 0;
  const pfRatio = validPrice
    ? calculatePFRatio(fullnessScore, tasteScore, priceNum)
    : 0;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = e.target.files;
    if (!chosen?.length) return;
    const allowed = Array.from(chosen).filter((f) =>
      f.type.startsWith("image/"),
    );
    setPhotoFiles((prev) => [...prev, ...allowed].slice(0, 10));
    e.target.value = "";
  };
  const removePhotoFile = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validPrice) {
      setError("Enter a valid price (e.g. 25.50)");
      return;
    }
    const form = e.currentTarget;
    const selectedGroupId =
      (
        form.elements.namedItem("groupId") as HTMLSelectElement | null
      )?.value?.trim() || undefined;

    setError(null);
    setIsSubmitting(true);

    try {
      let photoUrls: string[] = [];
      if (photoFiles.length > 0) {
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            groupId: selectedGroupId || undefined,
            files: photoFiles.map((f) => ({ name: f.name, type: f.type, size: f.size })),
          }),
        });
        if (!presignRes.ok) {
          const data = await presignRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to get upload URL");
        }
        const { uploads } = await presignRes.json();
        await Promise.all(
          photoFiles.map((file, i) =>
            fetch(uploads[i].uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": file.type },
              body: file,
            }).then((r) => {
              if (!r.ok) throw new Error("Photo upload failed");
            }),
          ),
        );
        photoUrls = uploads.map((u: { publicUrl: string }) => u.publicUrl);
      }
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId,
          visitDate,
          fullnessScore: clampScore(fullnessScore, 1, PF_RATIO_FULLNESS_MAX),
          tasteScore: clampScore(tasteScore, 1, PF_RATIO_TASTE_MAX),
          pricePaid: priceNum,
          notes: notes || undefined,
          groupId: selectedGroupId,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save visit");
      }
      onClose();
      router.refresh();
      setPricePaid("");
      setNotes("");
      setGroupId("");
      setPhotoFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Log visit">
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="WHEN DID YOU VISIT?"
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          className="text-xs font-black uppercase tracking-widest"
        />

        <div className="space-y-6 rounded-3xl bg-muted/30 p-6 border border-border">
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
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
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
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label
            htmlFor="visit-price"
            className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
          >
            TOTAL PRICE PAID
          </label>
          <div
            className={cn(
              "flex items-center rounded-2xl border-2 bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary/20",
              error
                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20"
                : "border-border focus-within:border-primary",
            )}
          >
            <span className="pl-4 text-lg font-black italic text-muted-foreground shrink-0">
              $
            </span>
            <input
              id="visit-price"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={pricePaid}
              onChange={(e) => setPricePaid(e.target.value)}
              className="w-full min-w-0 py-3 pr-4 text-lg font-black italic text-foreground placeholder:text-muted-foreground bg-transparent border-0 focus:outline-none focus:ring-0"
            />
          </div>
          {error && (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        {validPrice && (
          <div className="animate-in zoom-in-75 duration-300 rounded-2xl bg-primary px-6 py-5 text-center shadow-[0_8px_24px_rgba(255,215,0,0.4)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70">
              PF RATIO™
            </p>
            <p className="text-5xl font-black italic tracking-tighter text-primary-foreground">
              {pfRatio.toFixed(2)}
            </p>
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-1">
            <label
              htmlFor="visit-group"
              className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >
              WITH GROUP (OPTIONAL)
            </label>
            <select
              id="visit-group"
              name="groupId"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-2xl border-2 border-border bg-background py-3 px-4 text-sm font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">None</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            PHOTOS{" "}
            <span className="ml-1 font-medium normal-case text-muted-foreground/60">
              ({photoFiles.length}/10)
            </span>
          </label>
          {photoFiles.length === 0 ? (
            <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted bg-muted/20 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5">
              <ImageIcon className="h-8 w-8 opacity-40" />
              <span className="text-xs font-bold">Tap to add photos</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="sr-only"
                onChange={handlePhotoChange}
              />
            </label>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photoFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative aspect-square overflow-hidden rounded-xl border-2 border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Local blob preview */}
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhotoFile(i)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1.5 text-muted-foreground shadow-sm hover:text-foreground"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {photoFiles.length < 10 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted bg-muted/20 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <Plus className="h-6 w-6" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    className="sr-only"
                    onChange={handlePhotoChange}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        <Input
          label="ORDER NOTES (OPTIONAL)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What made this visit special?"
          className="text-sm font-bold"
        />

        <Button
          type="submit"
          disabled={isSubmitting || !validPrice}
          size="lg"
          className="w-full h-14 rounded-full text-lg shadow-[0_10px_30px_rgb(255,215,0,0.3)]"
        >
          {isSubmitting ? "SAVING…" : "LOG VISIT"}
        </Button>
      </form>
    </Modal>
  );
}
