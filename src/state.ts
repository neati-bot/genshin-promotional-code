import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { FAILURE_COUNT_FILE, SEEN_CODES_FILE } from '../config.js';

/**
 * File-backed persistence for the notifier:
 *
 *   - `state/seen-codes.json` — sorted array of code strings already
 *     announced. Used to compute `newCodes = current - seen`.
 *   - `state/failure-count.json` — `{ count: N }` for consecutive
 *     fetch/parse failures. Resets on success, alerts at threshold.
 *
 * Both files are committed back to the repo by the GitHub Actions
 * workflow so state survives across cron runs without any database.
 */

interface FailureState {
  count: number;
}

export function loadSeen(): Set<string> {
  if (!existsSync(SEEN_CODES_FILE)) return new Set();
  const raw = readFileSync(SEEN_CODES_FILE, 'utf-8').trim();
  if (raw.length === 0) return new Set();
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`${SEEN_CODES_FILE} is not a JSON array`);
  }
  return new Set(parsed.filter((v): v is string => typeof v === 'string'));
}

export function saveSeen(seen: Set<string>): void {
  ensureDir(SEEN_CODES_FILE);
  const sorted = [...seen].sort();
  writeFileSync(SEEN_CODES_FILE, `${JSON.stringify(sorted, null, 2)}\n`, 'utf-8');
}

export function getFailureCount(): number {
  return readFailureState().count;
}

export function incrementFailure(): number {
  const next = readFailureState().count + 1;
  writeFailureState({ count: next });
  return next;
}

export function resetFailure(): void {
  if (readFailureState().count !== 0) {
    writeFailureState({ count: 0 });
  }
}

function readFailureState(): FailureState {
  if (!existsSync(FAILURE_COUNT_FILE)) return { count: 0 };
  const raw = readFileSync(FAILURE_COUNT_FILE, 'utf-8').trim();
  if (raw.length === 0) return { count: 0 };
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'count' in parsed &&
    typeof (parsed as { count: unknown }).count === 'number'
  ) {
    return { count: (parsed as { count: number }).count };
  }
  return { count: 0 };
}

function writeFailureState(state: FailureState): void {
  ensureDir(FAILURE_COUNT_FILE);
  writeFileSync(FAILURE_COUNT_FILE, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
