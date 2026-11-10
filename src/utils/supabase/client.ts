import { createBrowserClient } from '@supabase/ssr';

// Browser-side Supabase client, for use in Client Components. Not currently
// used by any component (all Supabase access in this app happens from
// server-side API routes), but provided for completeness / future use.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
