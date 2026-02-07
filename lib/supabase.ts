import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client with service role
// Never expose SUPABASE_SERVICE_ROLE_KEY to the client
export function createServerClient() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing Supabase environment variables");
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
