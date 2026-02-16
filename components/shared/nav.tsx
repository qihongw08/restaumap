"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapPin, List, Share2, Users } from "lucide-react";

const links = [
  { href: "/", label: "Home", icon: List },
  { href: "/map", label: "Map", icon: MapPin },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/import", label: "Import", icon: Share2 },
];

export function Nav() {
  const pathname = usePathname();
  const isMapPage = pathname === "/map";

  return (
    <nav
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-50 w-auto min-w-[280px]",
        isMapPage ? "top-8" : "bottom-8"
      )}
      aria-label="Main"
    >
      <div className="flex h-16 items-center justify-around gap-4 rounded-full border-2 border-primary bg-background/90 px-6 shadow-2xl backdrop-blur-md">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-full py-2 px-4 transition-all duration-300",
                isActive
                  ? "bg-primary text-primary-foreground scale-105 shadow-md"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "animate-pulse")} />
              <span className={cn("text-sm font-bold", !isActive && "hidden")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
