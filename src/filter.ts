import { ALLOWED_SERVERS } from '../config.js';
import type { CodeEntry } from './parse.js';

/**
 * Drops codes whose server marker is not in the allowlist.
 *
 * "Asia" here is the set of codes redeemable on the Asia HoYoLAB server.
 * The allowlist itself lives in `config.ts` so the filter scope can be
 * widened (e.g. to include EU or NA) without touching this module.
 *
 * Unknown server markers are treated as exclusions — better to skip a
 * notification than to spam users with codes they can't use.
 */
export function filterForAsia(codes: readonly CodeEntry[]): CodeEntry[] {
  return codes.filter((c) => ALLOWED_SERVERS.includes(c.server));
}
