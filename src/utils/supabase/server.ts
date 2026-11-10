import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client for use inside Server Components / Route
// Handlers, following the standard Next.js App Router SSR pattern. This app
// has no Supabase Auth / user sessions (the admin review page uses a simple
// shared-secret header, not Supabase Auth), so cookie writes here are only
// relevant if that changes in the future — reads/writes to the `policies`
// and `changes` tables don't depend on any session cookie.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` was called from a Server Component — this can be
            // ignored if you have middleware refreshing user sessions.
            // This app doesn't use Supabase Auth sessions, so this is safe
            // to no-op.
          }
        },
      },
    }
  );
}
