import { createClient } from "@supabase/supabase-js";

// Frontend hanya memakai Supabase untuk Auth/session (bukan CRUD database).
export const supabase = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      // Pertukaran code dilakukan eksplisit di /auth/callback.
      detectSessionInUrl: false,
    },
  },
);
