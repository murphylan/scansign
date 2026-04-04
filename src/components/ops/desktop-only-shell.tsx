"use client";

import type * as React from "react";

export function DesktopOnlyShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen lg:hidden flex flex-col items-center justify-center px-6 text-center bg-background">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
          运营台仅支持桌面浏览器访问。
          <br />
          请使用电脑或将浏览器宽度拉大后刷新。
        </p>
      </div>
      <div className="hidden lg:block min-h-screen bg-background">{children}</div>
    </>
  );
}
