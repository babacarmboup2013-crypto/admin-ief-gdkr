"use client";

import { usePathname } from "next/navigation";
import { AppShell } from "./app-shell";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/auth")) {
    return <div className="flex min-h-screen flex-col items-center justify-center p-5">{children}</div>;
  }
  return <AppShell>{children}</AppShell>;
}