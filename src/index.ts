import { FAILURE_THRESHOLD } from '../config.js';
import { fetchWikitext } from './fetch.js';
import { filterForAsia } from './filter.js';
import { parseCodes } from './parse.js';
import {
  getFailureCount,
  incrementFailure,
  loadSeen,
  resetFailure,
  saveSeen,
} from './state.js';
import {
  sendCodeAlert,
  sendFailureAlert,
  sendStartupMessage,
} from './notify.js';
import type { CodeEntry } from './parse.js';

/**
 * Orchestrates a single notifier tick (one cron firing).
 *
 * Flow:
 *   1. fetch + parse + filter → currently-active Asia-redeemable codes
 *   2. on fetch/parse failure: bump consecutive-failure counter,
 *      page Discord once when it crosses FAILURE_THRESHOLD, exit non-zero
 *   3. on first run (empty seen state): seed silently and send a
 *      "server on" healthcheck so the operator knows cron is alive
 *   4. otherwise: alert on each new code and persist the updated set
 *   5. clear the failure counter on success
 *
 * The whole tick is idempotent: re-running with no wiki change emits
 * no Discord traffic and produces no state diff.
 */

async function runTick(): Promise<void> {
  let activeCodes: CodeEntry[];
  try {
    const wikitext = await fetchWikitext();
    const all = parseCodes(wikitext);
    activeCodes = filterForAsia(all);
    console.log(
      `Fetched ${all.length} active codes, ${activeCodes.length} Asia-redeemable.`
    );
  } catch (err) {
    await handleScrapeFailure(err);
    return;
  }

  const seen = loadSeen();
  const isFirstRun = seen.size === 0;

  if (isFirstRun) {
    // Send notification first; only persist the seed once it succeeds.
    // If we persisted first and the webhook failed, the next run would
    // treat the seed as already done and never send the healthcheck.
    await sendStartupMessage(activeCodes.length);
    for (const c of activeCodes) seen.add(c.code);
    saveSeen(seen);
    resetFailure();
    console.log(`First run: seeded ${activeCodes.length} codes silently.`);
    return;
  }

  const newCodes = activeCodes.filter((c) => !seen.has(c.code));
  console.log(`${newCodes.length} new code(s) to announce.`);

  for (const c of newCodes) {
    await sendCodeAlert(c);
    seen.add(c.code);
    saveSeen(seen);
  }

  resetFailure();
}

async function handleScrapeFailure(err: unknown): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error(`Scrape failed: ${error.message}`);
  if (error.stack) console.error(error.stack);

  const count = incrementFailure();
  console.error(`Consecutive failures: ${count}/${FAILURE_THRESHOLD}.`);

  if (count >= FAILURE_THRESHOLD) {
    try {
      await sendFailureAlert(count, error);
      // Reset so the next ALERT only fires after another full streak
      // of failures, not on every subsequent failed tick.
      resetFailure();
    } catch (notifyErr) {
      const reason =
        notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
      console.error(`Failure alert itself failed: ${reason}`);
    }
  }

  process.exitCode = 1;
}

await runTick();
