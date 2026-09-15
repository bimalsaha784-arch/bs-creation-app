import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

// Uses the ANON key only — never the service role key — and relies entirely on
// Supabase Row Level Security for data access on the client.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
