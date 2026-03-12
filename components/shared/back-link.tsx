"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  children?: ReactNode;
  className?: string;
}

export function BackLink({ children = "Back", className }: BackLinkProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(
        "inline-flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      {children}
    </button>
  );
}

