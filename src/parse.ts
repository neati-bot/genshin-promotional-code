/**
 * Wikitext parser for the fandom `Promotional_Code` page.
 *
 * The wiki uses a `{{Code Row|code|server|rewards|discovered|expires|notes?}}`
 * template family enclosed by `{{Code Row/Header}}` ... `{{Code Row/Footer}}`.
 * Real entries can be inlined or split across lines via embedded HTML
 * comments — both forms collapse identically once comments are stripped.
 *
 * The page also contains an editor-instruction example (`WA8MJCETGXLR`)
 * inside an HTML comment that follows `{{Code Row/Header}}`. Stripping
 * comments globally before extraction also removes that bogus row, so
 * we never have to special-case it.
 */

export interface Reward {
  item: string;
  qty: number;
}

export interface CodeEntry {
  code: string;
  server: string;
  rewards: Reward[];
  discovered: string;
  expires: string;
}

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
const HEADER_MARKER = '{{Code Row/Header}}';
const FOOTER_MARKER = '{{Code Row/Footer}}';
const CODE_ROW_TEMPLATE = /\{\{Code Row\|([^}]+)\}\}/g;

const POSITIONAL_PARAM_COUNT = 5;

export function parseCodes(wikitext: string): CodeEntry[] {
  const stripped = wikitext.replace(HTML_COMMENT, '');

  const headerIdx = stripped.indexOf(HEADER_MARKER);
  const footerIdx = stripped.indexOf(FOOTER_MARKER);
  if (headerIdx === -1 || footerIdx === -1 || footerIdx < headerIdx) return [];

  const body = stripped.slice(headerIdx + HEADER_MARKER.length, footerIdx);
  const entries: CodeEntry[] = [];

  for (const match of body.matchAll(CODE_ROW_TEMPLATE)) {
    const inner = match[1];
    if (inner === undefined) continue;
    const entry = parseRow(inner);
    if (entry) entries.push(entry);
  }

  return entries;
}

function parseRow(inner: string): CodeEntry | null {
  const positional: string[] = [];
  for (const raw of inner.split('|')) {
    const part = raw.trim();
    if (part.length === 0) continue;
    if (isNamedParam(part)) continue;
    positional.push(part);
    if (positional.length === POSITIONAL_PARAM_COUNT) break;
  }

  if (positional.length < POSITIONAL_PARAM_COUNT) return null;

  const [code, server, rewardsRaw, discovered, expires] = positional as [
    string,
    string,
    string,
    string,
    string,
  ];

  return {
    code,
    server,
    rewards: parseRewards(rewardsRaw),
    discovered,
    expires,
  };
}

function isNamedParam(part: string): boolean {
  const eqIdx = part.indexOf('=');
  if (eqIdx <= 0) return false;
  const key = part.slice(0, eqIdx);
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

function parseRewards(raw: string): Reward[] {
  const rewards: Reward[] = [];
  for (const chunk of raw.split(';')) {
    const trimmed = chunk.trim();
    if (trimmed.length === 0) continue;
    const sepIdx = trimmed.lastIndexOf('*');
    if (sepIdx === -1) continue;
    const item = trimmed.slice(0, sepIdx).trim();
    const qty = Number(trimmed.slice(sepIdx + 1).trim());
    if (item.length === 0 || !Number.isFinite(qty)) continue;
    rewards.push({ item, qty });
  }
  return rewards;
}
