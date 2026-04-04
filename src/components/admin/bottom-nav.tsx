"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { bottomNavItems } from "./nav-config";

const APP_ROUTE_PREFIXES = ["/apps", "/checkins", "/votes", "/forms", "/lotteries"];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  if (href === "/apps") {
    return APP_ROUTE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border lg:hidden">
      <div
        className="grid h-[60px]"
        style={{
          gridTemplateColumns: `repeat(${bottomNavItems.length}, 1fr)`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {bottomNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full bg-primary" />
              )}
              <item.icon
                className={cn(
                  "h-[22px] w-[22px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={cn(
                  "text-[11px] leading-none",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
