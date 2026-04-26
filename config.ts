/**
 * Toggleable runtime constants. Edit values here to change behavior;
 * no other module should hardcode any of these.
 *
 * The point of centralizing them is so a future maintainer (or future-you)
 * can flip filter scope, polling-related thresholds, or endpoints without
 * having to grep through the rest of the codebase.
 */

/**
 * Server codes whose entries should pass the Asia-redeemable filter.
 *
 * fandom wiki's `Code Row` template tags each code with a server marker.
 * Observed values: G (Global = NA/EU/SEA/SAR), A (all incl. CN),
 * SEA (Asia), CN, NA, EU, SAR (TW/HK/Macao). A player on the Asia
 * server can redeem any code marked G, A, SEA, or ASIA; everything
 * else is excluded.
 *
 * To broaden the filter (e.g. notify on every active code regardless
 * of server), add the relevant codes here — `NA`, `EU`, `CN`, etc.
 */
export const ALLOWED_SERVERS: readonly string[] = ['G', 'A', 'SEA', 'ASIA'];

/**
 * How many consecutive scrape/parse failures must occur before the
 * notifier sends a Discord alert. Single transient failures (e.g. a
 * fandom API blip) are silently absorbed; persistent failure paged.
 */
export const FAILURE_THRESHOLD = 3;

/** MediaWiki API endpoint for the fandom wiki host. */
export const WIKI_API_URL = 'https://genshin-impact.fandom.com/api.php';

/** Title of the wiki page being scraped. */
export const WIKI_PAGE = 'Promotional_Code';

/**
 * Base URL of HoYoLAB's web redemption page. The notifier appends
 * `?code=<CODE>` so a single click in Discord starts redemption.
 * The user still selects their server in the HoYoLAB UI itself —
 * there is no documented public param to preselect a server.
 */
export const REDEEM_BASE_URL = 'https://genshin.hoyoverse.com/en/gift';

/**
 * Identifier sent in the User-Agent header on outbound HTTP calls.
 * fandom rejects requests with default Node/curl agents (HTTP 403),
 * so this must be a plausible identifier. Update the URL once the
 * project is published so wiki operators can contact the maintainer.
 */
export const USER_AGENT =
  'GenshinAsiaCodeNotifier/0.1 (+https://github.com/your-username/genshin-promotional-code)';

/** Outbound HTTP timeout (ms). Both wiki API and Discord webhook use this. */
export const HTTP_TIMEOUT_MS = 10_000;

/** Filesystem layout for persisted state. */
export const STATE_DIR = 'state';
export const SEEN_CODES_FILE = `${STATE_DIR}/seen-codes.json`;
export const FAILURE_COUNT_FILE = `${STATE_DIR}/failure-count.json`;

/** Environment variable name holding the Discord webhook URL. */
export const DISCORD_WEBHOOK_ENV = 'DISCORD_WEBHOOK_URL';
