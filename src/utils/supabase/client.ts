import { createBrowserClient } from "@supabase/ssr";

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "";

supabaseUrl = supabaseUrl.replace(/^["']|["']$/g, '');
supabaseKey = supabaseKey.replace(/^["']|["']$/g, '');

export const createClient = () =>
  createBrowserClient(
    supabaseUrl,
    supabaseKey,
  );
