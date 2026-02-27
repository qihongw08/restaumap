"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/shared/nav";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ShareLinkButton } from "@/components/share/share-link-button";
import {
  ChevronRight,
  Users,
  Plus,
  Link2,
  Copy,
  Trash2,
  Loader2,
  ExternalLink,
  UtensilsCrossed,
  Sparkles,
  Calendar,
  ImageIcon,
  Map,
} from "lucide-react";
import { format } from "date-fns";
import { calculatePFRatio, formatPFRatio } from "@/lib/utils";

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
  status?: string;
  cuisineTypes: string[];
  priceRange: string | null;
  ambianceTags: string[];
};
type GroupRestaurant = {
  id: string;
  restaurantId: string;
  restaurant: Restaurant;
  sourceUrl?: string | null;
};
type GroupVisit = {
  id: string;
  userId: string;
  restaurantId: string;
  visitDate: string;
  fullnessScore: number;
  tasteScore: number;
  pricePaid: number;
  notes: string | null;
  photos: { url: string }[];
  restaurant: { id: string; name: string };
  user: { username: string | null; avatarUrl?: string } | null;
};
type GroupData = {
  id: string;
  name: string;
  members: GroupMember[];
  groupRestaurants: GroupRestaurant[];
  groupVisits?: GroupVisit[];
  currentUserId?: string | null;
  currentMember: { role: string } | null;
};

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [addRestaurantOpen, setAddRestaurantOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"restaurants" | "memory-lane">(
    "restaurants",
  );

  useEffect(() => {
    params.then((p) => setGroupId(p.id));
  }, [params]);

  const fetchGroup = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load group");
      }
      const json = await res.json();
      setGroup(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    if (groupId) fetchGroup();
  }, [groupId, fetchGroup]);

  const isOwner = group?.currentMember?.role === "owner";

  const handleCreateInvite = async () => {
    if (!groupId) return;
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, {
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
    if (!groupId || !confirm("Remove this restaurant from the group?")) return;
    try {
      const res = await fetch(
        `/api/groups/${groupId}/restaurants/${restaurantId}`,
        { method: "DELETE" },
      );
      if (!res.ok) throw new Error("Failed to remove");
      fetchGroup();
    } catch {
      setError("Could not remove restaurant");
    }
  };

  if (groupId === null) return null;
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background pb-32">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error && !group) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="mx-auto max-w-lg px-6 py-12">
          <p className="font-bold text-destructive">{error}</p>
          <Link
            href="/groups"
            className="mt-4 inline-block text-sm font-bold text-primary"
          >
            ← Back to groups
          </Link>
        </div>
        <Nav />
      </div>
    );
  }
  if (!group) return null;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="h-32 w-full" />
      <main className="mx-auto max-w-lg px-6">
        <Link
          href="/groups"
          className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="h-4 w-4 rotate-180" /> Back to groups
        </Link>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase">
              {group.name}
            </h1>
            <p className="mt-1 flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {group.members.length} member
              {group.members.length !== 1 ? "s" : ""} ·{" "}
              {group.groupRestaurants.length} restaurant
              {group.groupRestaurants.length !== 1 ? "s" : ""}
            </p>
          </div>
          {isOwner && (
            <div className="flex flex-col gap-2">
              {inviteUrl ? (
                <div className="flex items-center gap-2 rounded-xl border-2 border-border bg-muted/30 px-3 py-2">
                  <input
                    readOnly
                    value={inviteUrl}
                    className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCopyInvite}
                    className="shrink-0"
                  >
                    {copySuccess ? "Copied!" : <Copy className="h-4 w-4" />}
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
            currentUserId={group.currentUserId ?? null}
          />
        </div>

        <button
          type="button"
          onClick={() => setMembersOpen(true)}
          className="mb-6 flex w-full items-center justify-between rounded-xl border-2 border-border bg-muted/20 px-4 py-3 md:hidden hover:border-primary/40 hover:bg-muted/30 transition-colors"
          aria-label="Show members"
        >
          <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Members
          </span>
          <span className="text-xs font-bold text-muted-foreground">
            {group.members.length} · Tap to view
          </span>
        </button>

        <Modal
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          title="Members"
        >
          <MembersList
            members={group.members}
            currentUserId={group.currentUserId ?? null}
          />
        </Modal>

        {/* Tabs: Restaurants | Memory lane */}
        <div className="mb-4 flex rounded-xl bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("restaurants")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-black uppercase tracking-widest transition-colors ${
              activeTab === "restaurants"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Restaurants
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("memory-lane")}
            className={`flex-1 rounded-lg py-2.5 text-sm font-black uppercase tracking-widest transition-colors ${
              activeTab === "memory-lane"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Memory lane
          </button>
        </div>

        {activeTab === "memory-lane" ? (
          <MemoryLaneSection
            visits={group.groupVisits ?? []}
            currentUserId={group.currentUserId ?? null}
          />
        ) : (
          <>
            <div className="mb-6 space-y-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                Restaurants
              </h2>
              <div className="grid grid-cols-2 gap-2">
                <ShareLinkButton
                  endpoint={`/api/share/group/${groupId}`}
                  label="Share"
                  className="w-full justify-center rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-none"
                />
                <Link
                  href={`/map?groupId=${groupId}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-black uppercase tracking-widest text-foreground"
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
            {group.groupRestaurants.map((gr) => {
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
                  <div className="flex items-start gap-3 rounded-2xl border-2 border-border bg-background p-4 shadow-sm">
                    <Link
                      href={`/restaurants/${r.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="font-bold text-foreground truncate">
                        {r.name}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs">
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
                              <span className="text-muted-foreground/60">
                                ·
                              </span>
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
                                  return new URL(
                                    gr.sourceUrl!,
                                  ).hostname.replace(/^www\./, "");
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
          </>
        )}
      </main>
      <Nav />

      <AddRestaurantModal
        open={addRestaurantOpen}
        onClose={() => setAddRestaurantOpen(false)}
        groupId={groupId}
        existingRestaurantIds={group.groupRestaurants.map(
          (gr) => gr.restaurantId,
        )}
        onAdded={fetchGroup}
      />
    </div>
  );
}

function MemoryLaneSection({
  visits,
  currentUserId,
}: {
  visits: GroupVisit[];
  currentUserId: string | null;
}) {
  if (visits.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
        <p className="text-sm font-bold text-muted-foreground">
          No group visits yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          When someone logs a visit and tags this group, it will show here.
        </p>
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {visits.map((v) => {
        const fullness = Number(v.fullnessScore);
        const taste = Number(v.tasteScore);
        const price = Number(v.pricePaid);
        const pfRatio = calculatePFRatio(fullness, taste, price);
        const displayName =
          v.userId === currentUserId
            ? "You"
            : (v.user?.username ?? "Someone");
        const photos = v.photos ?? [];
        return (
          <li
            key={v.id}
            className="rounded-xl border-2 border-border bg-card overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b border-border">
              {v.user?.avatarUrl ? (
                <Image
                  src={v.user.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Users className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">
                  {displayName}
                </p>
                <Link
                  href={`/restaurants/${v.restaurant.id}`}
                  className="text-xs font-medium text-primary hover:underline truncate block"
                >
                  {v.restaurant.name}
                </Link>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(new Date(v.visitDate), "MMM d, yyyy")}
                </div>
                <p className="text-sm font-black italic text-primary">
                  PF {formatPFRatio(pfRatio)}
                </p>
              </div>
            </div>
            {photos.length > 0 ? (
              <div className="flex gap-2 p-3 flex-wrap">
                {photos.map((photo) => (
                  <a
                    key={photo.url}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg overflow-hidden border border-border bg-muted shrink-0 focus:ring-2 focus:ring-primary/30 focus:outline-none"
                  >
                    {process.env.NEXT_PUBLIC_R2_PUBLIC_URL &&
                    photo.url.startsWith(
                      process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
                    ) ? (
                      <Image
                        src={photo.url}
                        alt=""
                        width={72}
                        height={72}
                        className="w-[72px] h-[72px] object-cover"
                      />
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element -- Fallback for non-R2 URLs */
                      <img
                        src={photo.url}
                        alt=""
                        width={72}
                        height={72}
                        className="w-[72px] h-[72px] object-cover"
                      />
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
                <ImageIcon className="h-3.5 w-3.5" />
                No photos
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MembersList({
  members,
  currentUserId,
}: {
  members: GroupMember[];
  currentUserId: string | null;
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

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/restaurants")
      .then((r) => r.json())
      .then((json) => setRestaurants(json.data ?? []))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [open]);

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
