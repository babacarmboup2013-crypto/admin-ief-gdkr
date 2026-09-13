import type { PostgrestError } from "@supabase/supabase-js";

export function sbThrow(error: PostgrestError | null): void {
  if (error) throw new Error(error.message);
}