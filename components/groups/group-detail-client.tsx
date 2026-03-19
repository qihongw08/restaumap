"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/share/share-link-button";
import {
  ChevronRight,
  Users,
  Plus,
  Link2,
  Copy,
  Check,
  Trash2,
  Loader2,
  ExternalLink,
  UtensilsCrossed,
  Sparkles,
  Map,
} from "lucide-react";

type MemberUser = {
  username: string | null;
  avatarUrl?: string;
} | null;
type GroupMember = {
  id: string;
  userId: string;
  role: string;
  user: MemberUser;
};
type Restaurant = {
  id: string;
  name: string;
  formattedAddress?: string | null;
  cuisineTypes: string[];
  priceRange: string | null;
  ambianceTags: string[];
  visited?: boolean;
};
type GroupRestaurant = {
  id: string;
  restaurantId: string;
  restaurant: Restaurant;
  sourceUrl?: string | null;
};
export type GroupDetailData = {
  id: string;
  name: string;
  members: GroupMember[];
  groupRestaurants: GroupRestaurant[];
  currentUserId: string;
  currentMember: { role: string } | null;
};

export function GroupDetailClient({ group }: { group: GroupDetailData }) {
  const router = useRouter();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [addRestaurantOpen, setAddRestaurantOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = group.currentMember?.role === "owner";

  const sortedGroupRestaurants = useMemo(() => {
    const items = [...group.groupRestaurants];
    items.sort((a, b) => {
      const aVisited = a.restaurant.visited ? 1 : 0;
      const bVisited = b.restaurant.visited ? 1 : 0;
      return aVisited - bVisited;
    });
    return items;
  }, [group.groupRestaurants]);

  const handleCreateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/invites`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to create invite");
      const json = await res.json();
      const base = typeof window !== "undefined" ? window.location.origin : "";
      setInviteUrl(`${base}${json.data.joinUrl}`);
    } catch {
      setError("Could not create invite link");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleRemoveRestaurant = async (restaurantId: string) => {
    if (!confirm("Remove this restaurant from the group?")) return;
    try {
      const res = await fetch(
        `/api/groups/${group.id}/restaurants/${restaurantId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Failed to remove");
      router.refresh();
    } catch {
      setError("Could not remove restaurant");
    }
  };

  return (
    <main className="mx-auto max-w-lg px-6">
      <button
        type="button"
        onClick={() => router.back()}
        className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4 rotate-180" /> Back to groups
      </button>

      {error && (
        <p className="mb-4 text-sm font-bold text-destructive">{error}</p>
      )}

      <div className="mb-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/20 to-primary/5 p-5">
        <h1 className="text-3xl font-black italic tracking-tighter text-foreground uppercase">
          {group.name}
        </h1>
        <p className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {group.members.length} member{group.members.length !== 1 ? "s" : ""} ·{" "}
          {group.groupRestaurants.length} restaurant
          {group.groupRestaurants.length !== 1 ? "s" : ""}
        </p>
        {isOwner && (
          <div className="mt-4">
            {inviteUrl ? (
              <div
                className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 transition-all ${copySuccess ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border bg-background/60"}`}
              >
                <input
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                />
                <Button
                  size="sm"
                  variant={copySuccess ? "primary" : "secondary"}
                  onClick={handleCopyInvite}
                  className="shrink-0"
                >
                  {copySuccess ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCreateInvite}
                disabled={inviteLoading}
                className="gap-2"
              >
                {inviteLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Invite by link
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Members: inline on desktop, button to open modal on mobile */}
      <div className="mb-6 hidden md:block">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
          Members
        </h2>
        <MembersList
          members={group.members}
          currentUserId={group.currentUserId}
        />
      </div>

      <button
        type="button"
        onClick={() => setMembersOpen(true)}
        className="mb-6 flex w-full items-center gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 shadow-sm md:hidden hover:border-primary/30 transition-colors"
        aria-label="Show members"
      >
        <div className="flex">
          {group.members.slice(0, 4).map((m, i) =>
            m.user?.avatarUrl ? (
              <Image
                key={m.id}
                src={m.user.avatarUrl}
                alt={m.user?.username ?? ""}
                width={28}
                height={28}
                className={`h-7 w-7 rounded-full object-cover ring-2 ring-background${i > 0 ? " -ml-2" : ""}`}
              />
            ) : (
              <div
                key={m.id}
                className={`flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[10px] font-black text-muted-foreground${i > 0 ? " -ml-2" : ""}`}
              >
                {(m.user?.username ?? "?")[0].toUpperCase()}
              </div>
            ),
          )}
        </div>
        <span className="flex-1 text-left text-sm font-black uppercase tracking-widest text-muted-foreground">
          {group.members.length} Member{group.members.length !== 1 ? "s" : ""}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      <Modal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title="Members"
      >
        <MembersList
          members={group.members}
          currentUserId={group.currentUserId}
        />
      </Modal>

      <div className="mb-6 space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          Restaurants
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <ShareLinkButton
            endpoint={`/api/share/group/${group.id}`}
            label="Share"
            className="w-full justify-center rounded-xl border border-black/15 bg-white px-3 py-2 text-xs shadow-sm"
          />
          <Link
            href={`/map?groupId=${group.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-foreground shadow-sm"
          >
            <Map className="h-3.5 w-3.5" />
            Open map
          </Link>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setAddRestaurantOpen(true)}
          className="w-full gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest"
        >
          <Plus className="h-4 w-4" /> Add restaurant
        </Button>
      </div>

      {group.groupRestaurants.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
          <p className="text-sm font-bold text-muted-foreground">
            No restaurants yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add restaurants from your list to share with the group.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => setAddRestaurantOpen(true)}
          >
            Add restaurant
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {sortedGroupRestaurants.map((gr) => {
            const r = gr.restaurant;
            const cuisines =
              r.cuisineTypes?.length > 0
                ? r.cuisineTypes.slice(0, 3).join(", ")
                : null;
            const ambience =
              r.ambianceTags?.length > 0
                ? r.ambianceTags.slice(0, 3).join(" · ")
                : null;
            const hasMeta = cuisines || r.priceRange || ambience;
            return (
              <li key={gr.id}>
                <div className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  <Link
                    href={`/restaurants/${r.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="font-bold text-foreground truncate">
                      {r.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
                      {r.visited && (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
                          Visited
                        </span>
                      )}
                      {r.formattedAddress && (
                        <span className="truncate text-muted-foreground">
                          {r.formattedAddress}
                        </span>
                      )}
                      {r.formattedAddress && (hasMeta || gr.sourceUrl) && (
                        <span className="text-muted-foreground/60">·</span>
                      )}
                      {cuisines && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-primary/15 px-2 py-0.5 font-medium text-primary">
                          <UtensilsCrossed className="h-3 w-3" />
                          {cuisines}
                        </span>
                      )}
                      {r.priceRange && (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-400">
                          {r.priceRange}
                        </span>
                      )}
                      {ambience && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-2 py-0.5 text-muted-foreground">
                          <Sparkles className="h-3 w-3" />
                          {ambience}
                        </span>
                      )}
                      {gr.sourceUrl && (
                        <>
                          {(hasMeta || r.formattedAddress) && (
                            <span className="text-muted-foreground/60">·</span>
                          )}
                          <button
                            type="button"
                            role="link"
                            className="inline-flex items-center gap-1 truncate font-medium text-primary hover:underline text-left"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              window.open(
                                gr.sourceUrl!,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(
                                  gr.sourceUrl!,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {(() => {
                              try {
                                return new URL(gr.sourceUrl!).hostname.replace(
                                  /^www\./,
                                  "",
                                );
                              } catch {
                                return "Source";
                              }
                            })()}
                          </button>
                        </>
                      )}
                    </div>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 size-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveRestaurant(gr.restaurantId)}
                    aria-label="Remove from group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddRestaurantModal
        open={addRestaurantOpen}
        onClose={() => setAddRestaurantOpen(false)}
        groupId={group.id}
        existingRestaurantIds={group.groupRestaurants.map(
          (gr) => gr.restaurantId,
        )}
        onAdded={() => router.refresh()}
      />
    </main>
  );
}

function MembersList({
  members,
  currentUserId,
}: {
  members: GroupMember[];
  currentUserId: string;
}) {
  const sorted = [...members].sort((a, b) =>
    a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0,
  );
  return (
    <ul className="space-y-2">
      {sorted.map((m) => {
        const displayName =
          m.userId === currentUserId ? "You" : (m.user?.username ?? "Member");
        const avatarUrl = m.user?.avatarUrl;
        return (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-4 py-2.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                  aria-hidden
                >
                  <Users className="h-4 w-4" />
                </div>
              )}
              <span className="truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
            </div>
            <span
              className={`shrink-0 text-xs font-bold uppercase tracking-wider ${
                m.role === "owner" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {m.role}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AddRestaurantModal({
  open,
  onClose,
  groupId,
  existingRestaurantIds,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  existingRestaurantIds: string[];
  onAdded: () => void;
}) {
  const [restaurants, setRestaurants] = useState<
    { id: string; name: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setLoading(true);
      fetch("/api/restaurants")
        .then((r) => r.json())
        .then((json) => setRestaurants(json.data ?? []))
        .catch(() => setRestaurants([]))
        .finally(() => setLoading(false));
    }
  }

  const available = restaurants.filter(
    (r) => !existingRestaurantIds.includes(r.id),
  );

  const handleAdd = async (restaurantId: string) => {
    setAddingId(restaurantId);
    try {
      const res = await fetch(`/api/groups/${groupId}/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurantId }),
      });
      if (!res.ok) throw new Error("Failed to add");
      onAdded();
      onClose();
    } catch {
      // could set error state
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add restaurant to group">
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : available.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          No other restaurants to add. Add restaurants from the main list first.
        </p>
      ) : (
        <ul className="max-h-[60vh] space-y-1 overflow-y-auto py-2">
          {available.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => handleAdd(r.id)}
                disabled={addingId !== null}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
              >
                <span className="truncate">{r.name}</span>
                {addingId === r.id ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 shrink-0" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
