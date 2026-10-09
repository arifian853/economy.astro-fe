import { supabase } from "./supabase";

const BASE_URL = import.meta.env.PUBLIC_API_URL || "/api";

export async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Unauthorized: sesi tidak ditemukan.");
  }

  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${session.access_token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });

  return response;
}
