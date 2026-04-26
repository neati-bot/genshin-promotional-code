import { describe, expect, it } from 'vitest';
import { filterForAsia } from '../src/filter.js';
import type { CodeEntry } from '../src/parse.js';

const make = (code: string, server: string): CodeEntry => ({
  code,
  server,
  rewards: [{ item: 'Primogem', qty: 60 }],
  discovered: '2026-04-26',
  expires: 'unknown',
});

describe('filterForAsia', () => {
  it('keeps Global (G) codes', () => {
    expect(filterForAsia([make('CODE_G', 'G')])).toHaveLength(1);
  });

  it('keeps All-server (A) codes', () => {
    expect(filterForAsia([make('CODE_A', 'A')])).toHaveLength(1);
  });

  it('keeps SEA-marked codes', () => {
    expect(filterForAsia([make('CODE_SEA', 'SEA')])).toHaveLength(1);
  });

  it('keeps ASIA-marked codes (defensive — not yet observed in wiki)', () => {
    expect(filterForAsia([make('CODE_ASIA', 'ASIA')])).toHaveLength(1);
  });

  it('drops CN-only codes', () => {
    expect(filterForAsia([make('CODE_CN', 'CN')])).toHaveLength(0);
  });

  it('drops NA-only codes', () => {
    expect(filterForAsia([make('CODE_NA', 'NA')])).toHaveLength(0);
  });

  it('drops EU-only codes', () => {
    expect(filterForAsia([make('CODE_EU', 'EU')])).toHaveLength(0);
  });

  it('drops SAR-only codes (TW/HK/Macao is a separate server from Asia)', () => {
    expect(filterForAsia([make('CODE_SAR', 'SAR')])).toHaveLength(0);
  });

  it('keeps the originals untouched (purely returns a filtered copy)', () => {
    const input = [make('A', 'G'), make('B', 'CN')];
    filterForAsia(input);
    expect(input).toHaveLength(2);
  });

  it('preserves order of kept entries', () => {
    const result = filterForAsia([
      make('FIRST', 'G'),
      make('SKIP', 'NA'),
      make('SECOND', 'SEA'),
    ]);
    expect(result.map((c) => c.code)).toEqual(['FIRST', 'SECOND']);
  });

  it('treats unknown server markers as exclusions (conservative)', () => {
    expect(filterForAsia([make('CODE_X', 'XX')])).toHaveLength(0);
  });
});
