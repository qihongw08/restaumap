'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Nav } from '@/components/shared/nav';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Users,
  Plus,
  Link2,
  Copy,
  Trash2,
  Loader2,
} from 'lucide-react';

type GroupMember = { id: string; userId: string; role: string };
type Restaurant = {
  id: string;
  name: string;
  formattedAddress?: string | null;
  status?: string;
};
type GroupRestaurant = {
  id: string;
  restaurantId: string;
  restaurant: Restaurant;
};
type GroupData = {
  id: string;
  name: string;
  members: GroupMember[];
  groupRestaurants: GroupRestaurant[];
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
  const [copySuccess, setCopySuccess] = useState(false);

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
        router.push('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to load group');
      }
      const json = await res.json();
      setGroup(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    if (groupId) fetchGroup();
  }, [groupId, fetchGroup]);

  const isOwner = group?.currentMember?.role === 'owner';

  const handleCreateInvite = async () => {
    if (!groupId) return;
    setInviteLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invites`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create invite');
      const json = await res.json();
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      setInviteUrl(`${base}${json.data.joinUrl}`);
    } catch {
      setError('Could not create invite link');
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
    if (!groupId || !confirm('Remove this restaurant from the group?')) return;
    try {
      const res = await fetch(
        `/api/groups/${groupId}/restaurants/${restaurantId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to remove');
      fetchGroup();
    } catch {
      setError('Could not remove restaurant');
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
          <Link href="/groups" className="mt-4 inline-block text-sm font-bold text-primary">
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
              {group.members.length} member{group.members.length !== 1 ? 's' : ''} ·{' '}
              {group.groupRestaurants.length} restaurant
              {group.groupRestaurants.length !== 1 ? 's' : ''}
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
                    {copySuccess ? 'Copied!' : <Copy className="h-4 w-4" />}
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

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
            Restaurants
          </h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setAddRestaurantOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {group.groupRestaurants.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
            <p className="text-sm font-bold text-muted-foreground">No restaurants yet</p>
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
            {group.groupRestaurants.map((gr) => (
              <li key={gr.id}>
                <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-background p-4 shadow-sm">
                  <Link
                    href={`/restaurants/${gr.restaurant.id}`}
                    className="min-w-0 flex-1"
                  >
                    <p className="font-bold text-foreground truncate">{gr.restaurant.name}</p>
                    {gr.restaurant.formattedAddress && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {gr.restaurant.formattedAddress}
                      </p>
                    )}
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
            ))}
          </ul>
        )}
      </main>
      <Nav />

      <AddRestaurantModal
        open={addRestaurantOpen}
        onClose={() => setAddRestaurantOpen(false)}
        groupId={groupId}
        existingRestaurantIds={group.groupRestaurants.map((gr) => gr.restaurantId)}
        onAdded={fetchGroup}
      />
    </div>
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
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch('/api/restaurants')
      .then((r) => r.json())
      .then((json) => setRestaurants(json.data ?? []))
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [open]);

  const available = restaurants.filter((r) => !existingRestaurantIds.includes(r.id));

  const handleAdd = async (restaurantId: string) => {
    setAddingId(restaurantId);
    try {
      const res = await fetch(`/api/groups/${groupId}/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      });
      if (!res.ok) throw new Error('Failed to add');
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
