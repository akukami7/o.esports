import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest, response: NextResponse) => {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  // Clean up potential literal quotes from Vercel env vars
  if (supabaseUrl) supabaseUrl = supabaseUrl.replace(/^["']|["']$/g, '');
  if (supabaseKey) supabaseKey = supabaseKey.replace(/^["']|["']$/g, '');

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabaseResponse = response;

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      },
    );

    await supabase.auth.getUser();
  } catch (error) {
    console.error("Supabase middleware error:", error);
  }

  return supabaseResponse;
};
