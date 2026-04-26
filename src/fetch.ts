import { HTTP_TIMEOUT_MS, USER_AGENT, WIKI_API_URL, WIKI_PAGE } from '../config.js';

/**
 * Error thrown when the MediaWiki API call fails. Carries enough
 * structured context (endpoint, status, snippet of body) for the
 * Actions log to be self-explanatory without needing to re-run.
 */
export class WikiFetchError extends Error {
  constructor(
    message: string,
    public readonly url: string,
    public readonly status?: number,
    public readonly bodySnippet?: string
  ) {
    super(message);
    this.name = 'WikiFetchError';
  }
}

interface ParseApiResponse {
  parse?: {
    wikitext?: { '*'?: string };
  };
  error?: { code: string; info: string };
}

/**
 * Fetches the raw wikitext of the Promotional_Code page via the
 * MediaWiki `action=parse` API.
 *
 * Why API and not HTML scrape: fandom rejects requests with default
 * Node/curl User-Agents (HTTP 403), and the API returns a stable
 * structured payload that is far less brittle than HTML class names.
 */
export async function fetchWikitext(): Promise<string> {
  const url = buildApiUrl();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new WikiFetchError(`Network failure calling wiki API: ${reason}`, url);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const bodySnippet = (await safeText(response)).slice(0, 200);
    throw new WikiFetchError(
      `Wiki API returned HTTP ${response.status}`,
      url,
      response.status,
      bodySnippet
    );
  }

  let body: ParseApiResponse;
  try {
    body = (await response.json()) as ParseApiResponse;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new WikiFetchError(`Wiki API returned non-JSON: ${reason}`, url, response.status);
  }

  if (body.error) {
    throw new WikiFetchError(
      `Wiki API error ${body.error.code}: ${body.error.info}`,
      url,
      response.status
    );
  }

  const wikitext = body.parse?.wikitext?.['*'];
  if (typeof wikitext !== 'string' || wikitext.length === 0) {
    throw new WikiFetchError(
      'Wiki API response missing parse.wikitext["*"]',
      url,
      response.status,
      JSON.stringify(body).slice(0, 200)
    );
  }

  return wikitext;
}

function buildApiUrl(): string {
  const params = new URLSearchParams({
    action: 'parse',
    page: WIKI_PAGE,
    format: 'json',
    prop: 'wikitext',
    redirects: '1',
  });
  return `${WIKI_API_URL}?${params.toString()}`;
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
