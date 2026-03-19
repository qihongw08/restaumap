"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

type ShareLinkButtonProps = {
  action: () => Promise<{ data?: { url: string }; serverError?: string; validationErrors?: any }>;
  label?: string;
  className?: string;
  variant?: "floating" | "secondary";
};

export function ShareLinkButton({
  action,
  label = "Share",
  className = "",
  variant = "floating",
}: ShareLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await action();
      if (res.serverError || res.validationErrors || !res.data) {
        throw new Error(res.serverError || "Failed to create share link");
      }
      const url = res.data.url;

      if (typeof navigator.share === "function") {
        try {
          await navigator.share({ url });
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
          return;
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") return;
        }
      }

      try {
        await navigator.clipboard.writeText(url);
      } catch {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${variant === "floating" ? "items-end" : "w-full"}`}>
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
          variant === "floating"
            ? "rounded-full border border-primary/30 bg-background/90 text-foreground shadow-lg backdrop-blur hover:bg-background"
            : "rounded-xl border border-black/10 bg-white/50 text-muted-foreground hover:bg-white/80 hover:text-foreground active:scale-[0.98]"
        } ${className}`}
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
