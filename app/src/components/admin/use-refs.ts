"use client";

import { supabase } from "@/lib/supabase/client";
import type { BureauRow, EcoleRow, UtilisateurReference } from "@/lib/admin-types";
import { useRows } from "./use-rows";

export function useBureauxRef() {
  return useRows<BureauRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("bureaux")
        .select("id, nom")
        .order("id", { ascending: true });
      return error || !data ? [] : (data as BureauRow[]);
    },
    []
  );
}

export function useUsersRef() {
  return useRows<UtilisateurReference>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("utilisateurs")
        .select("id, nom_complet, email")
        .order("nom_complet", { ascending: true });
      return error || !data ? [] : (data as UtilisateurReference[]);
    },
    []
  );
}

export function useEcolesRef() {
  return useRows<EcoleRow>(
    async () => {
      if (!supabase) return [];
      const { data, error } = await supabase
        .from("ecoles")
        .select("id, nom, cycle, localisation, effectif_eleves")
        .order("nom", { ascending: true });
      return error || !data ? [] : (data as EcoleRow[]);
    },
    []
  );
}