import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;
let supabaseError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseError =
    "Supabase URL or Anon Key is missing. Please check your environment variables.";
} else {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
}

/** May be null when env vars are missing (see {@link getSupabaseError}). */
export const supabase = supabaseInstance;

export const getSupabaseError = () => supabaseError;

/** Throws if Supabase was not configured; use for queries so `data` / `error` are typed. */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error(
      supabaseError ??
        "Supabase URL or Anon Key is missing. Please check your environment variables.",
    );
  }
  return supabaseInstance;
}
