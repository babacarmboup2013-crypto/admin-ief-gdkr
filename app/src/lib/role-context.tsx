"use client";

import { createContext, useContext } from "react";
import type { RoleId } from "./types";

export interface Profile {
  nom: string | null;
  bureauId: number | null;
  fonction: string | null;
}

export interface RoleContextValue {
  role: RoleId;
  setRole: (role: RoleId) => void;
  uid: string | null;
  profile: Profile;
}

export const RoleContext = createContext<RoleContextValue | null>(null);

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole doit être utilisé dans <AppShell>");
  return ctx;
}