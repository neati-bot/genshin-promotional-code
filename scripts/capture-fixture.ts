import { writeFile } from 'node:fs/promises';
import { fetchWikitext } from '../src/fetch.js';

const wikitext = await fetchWikitext();
await writeFile('tests/fixtures/sample-wikitext.txt', wikitext, 'utf-8');
console.log(`Captured ${wikitext.length} chars`);
