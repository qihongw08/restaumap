import Image from "next/image";

interface ProfileHeaderProps {
  username: string;
  avatarUrl?: string;
  totalVisits: number;
  uniqueRestaurants: number;
  bestPF: number;
}

export function ProfileHeader({
  username,
  avatarUrl,
  totalVisits,
  uniqueRestaurants,
  bestPF,
}: ProfileHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-primary bg-primary/10 shadow-lg shadow-primary/20">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={username}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-black italic text-primary">
              {username[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black italic tracking-tighter text-foreground uppercase break-words">
            {username}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">Your food journey</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-primary/25 bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-black italic leading-none text-primary">{totalVisits}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            VISITS
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-black italic leading-none text-primary">{uniqueRestaurants}</p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            SPOTS
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-3 text-center shadow-sm">
          <p className="text-2xl font-black italic leading-none text-primary">
            {bestPF > 0 ? bestPF.toFixed(1) : "—"}
          </p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            BEST PF
          </p>
        </div>
      </div>
    </div>
  );
}
