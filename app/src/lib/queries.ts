import { supabase } from "./supabase/client";
import { BUREAUX } from "./data";
import type { Bureau } from "./types";

interface BureauRow {
  id: number;
  nom: string;
}

export async function fetchBureaux(): Promise<Bureau[]> {
  if (!supabase) return BUREAUX;
  const { data, error } = await supabase
    .from("bureaux")
    .select("id, nom")
    .order("id", { ascending: true });
  if (error || !data || data.length === 0) return BUREAUX;
  return (data as BureauRow[]).map((b) => ({ id: b.id, nom: b.nom }));
}