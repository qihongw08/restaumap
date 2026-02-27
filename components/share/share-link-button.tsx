"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type ShareLinkButtonProps = {
  endpoint: string;
  label?: string;
  className?: string;
};

export function ShareLinkButton({
  endpoint,
  label = "Share",
  className = "",
}: ShareLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create share link");
      const json = await res.json();
      const url = json?.data?.url;
      if (!url || typeof url !== "string") {
        throw new Error("Share link missing");
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/90 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-foreground shadow-lg backdrop-blur hover:bg-background ${className}`}
      >
        <Share2 className="h-3.5 w-3.5" />
        {loading ? "Generating..." : copied ? "Copied!" : label}
      </button>
      {error && (
        <p className="text-[10px] font-bold text-destructive">{error}</p>
      )}
    </div>
  );
}
