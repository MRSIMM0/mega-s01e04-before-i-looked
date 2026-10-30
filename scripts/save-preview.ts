import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const outputArgument = process.argv[2] === '--' ? process.argv[3] : process.argv[2];
const outputPath = resolve(outputArgument ?? 'var/preview/digest-2026-10-28.html');
const response = await createApp(loadConfig()).request('/digest/2026-10-28');

if (response.status !== 200) {
  throw new Error('Digest route returned HTTP ' + response.status);
}

const html = await response.text();
if (!html.toLowerCase().includes('<!doctype html>')) {
  throw new Error('Digest response is not a complete HTML document');
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf8');
console.log('Saved one-file preview to ' + outputPath);
