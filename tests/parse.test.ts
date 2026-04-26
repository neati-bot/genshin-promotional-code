import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseCodes } from '../src/parse.js';

const fixture = readFileSync('tests/fixtures/sample-wikitext.txt', 'utf-8');

describe('parseCodes', () => {
  it('extracts the canonical single-line entry', () => {
    const codes = parseCodes(fixture);
    const genshingift = codes.find((c) => c.code === 'GENSHINGIFT');
    expect(genshingift).toBeDefined();
    expect(genshingift?.server).toBe('G');
    expect(genshingift?.rewards).toEqual([
      { item: 'Primogem', qty: 50 },
      { item: "Hero's Wit", qty: 3 },
    ]);
    expect(genshingift?.discovered).toBe('2020-11-10');
    expect(genshingift?.expires).toBe('indef');
  });

  it('extracts a multi-line comment-split entry', () => {
    const codes = parseCodes(fixture);
    const snezhnaya = codes.find((c) => c.code === 'Snezhnaya20260812');
    expect(snezhnaya).toBeDefined();
    expect(snezhnaya?.server).toBe('G');
    expect(snezhnaya?.rewards).toEqual([{ item: 'Primogem', qty: 200 }]);
    expect(snezhnaya?.expires).toBe('2026-04-27');
  });

  it('parses multi-item semicolon-delimited rewards', () => {
    const codes = parseCodes(fixture);
    const inuh = codes.find((c) => c.code === 'INUH43366326');
    expect(inuh?.rewards).toEqual([
      { item: 'Mora', qty: 10000 },
      { item: "Adventurer's Experience", qty: 10 },
      { item: 'Fine Enhancement Ore', qty: 5 },
      { item: 'Jueyun Chili Chicken', qty: 5 },
      { item: 'Stir-Fried Fish Noodles', qty: 5 },
    ]);
  });

  it('preserves expiry markers ("indef", "unknown", ISO date)', () => {
    const codes = parseCodes(fixture);
    expect(codes.find((c) => c.code === 'GENSHINGIFT')?.expires).toBe('indef');
    expect(codes.find((c) => c.code === 'A0NBWRZZI3XJ')?.expires).toBe('unknown');
    expect(codes.find((c) => c.code === 'Snezhnaya20260812')?.expires).toBe('2026-04-27');
  });

  it('extracts the CN-marked entry (filter happens later, not here)', () => {
    const codes = parseCodes(fixture);
    const yuanShen = codes.find((c) => c.code === 'YuanShen');
    expect(yuanShen?.server).toBe('CN');
  });

  it('does NOT include the editor instructional placeholder WA8MJCETGXLR', () => {
    const codes = parseCodes(fixture);
    expect(codes.some((c) => c.code === 'WA8MJCETGXLR')).toBe(false);
  });

  it('handles entries with optional notes/ref params without dropping them', () => {
    const codes = parseCodes(fixture);
    const fairy = codes.find((c) => c.code === 'FairyGirlLinnea');
    expect(fairy).toBeDefined();
    expect(fairy?.expires).toBe('2026-04-28');
  });

  it('returns the expected number of real entries', () => {
    const codes = parseCodes(fixture);
    expect(codes).toHaveLength(9);
  });

  it('returns an empty array when the Active Codes section is absent', () => {
    expect(parseCodes('==Other Section==\nNo codes here.')).toEqual([]);
  });

  it('returns an empty array when Header/Footer markers are missing', () => {
    expect(parseCodes('==Active Codes==\nSome prose with no template.')).toEqual([]);
  });
});
