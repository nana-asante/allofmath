import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Admin Supabase client with service role key.
 * Use only in server-side code (API routes, admin endpoints).
 * Never expose to client.
 */
export const supabaseAdmin = createClient(url, serviceKey, {
    auth: { persistSession: false },
});
