import { timingSafeEqual } from 'crypto';

// Constant-time string comparison, so an attacker attempting to brute-force
// ADMIN_SECRET/CRON_SECRET by measuring response-time differences per
// character can't learn anything from timing. A plain `===` comparison
// short-circuits at the first mismatched character, which in theory leaks
// a tiny timing signal; this doesn't. (Comparing two different-length
// buffers first is still a fast, safe rejection — length alone isn't
// sensitive the way character-by-character content is.)
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
