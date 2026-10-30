import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';

const config = {
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
};

const temporaryDirectories: string[] = [];

function createRunsDir() {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  temporaryDirectories.push(runsDir);
  return runsDir;
}

function writeNight(runsDir: string, night: string, content: string) {
  writeFileSync(join(runsDir, `${night}.jsonl`), content);
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('digest routes', () => {
  it('renders the page and returns the same ordered rows as JSON', async () => {
    const runsDir = createRunsDir();
    writeNight(
      runsDir,
      '2026-10-28',
      [
        JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'zeta', status: 'ok', owner: 'rook' }),
        JSON.stringify({ at: '2026-10-28T01:01:00+01:00', job: 'alpha', status: 'fail', owner: null, error: 'quota' }),
      ].join('\n'),
    );
    const app = createApp({ ...config, runsDir });

    const page = await app.request('/digest/2026-10-28');
    const html = await page.text();
    const response = await app.request('/api/digest/2026-10-28');
    const json = (await response.json()) as NightDigest;

    expect(page.status).toBe(200);
    expect(html.indexOf('alpha')).toBeLessThan(html.indexOf('zeta'));
    expect(html).toContain('quota');
    expect(html).toContain('—');
    expect(response.status).toBe(200);
    expect(json.rows.map((row) => row.job)).toEqual(['alpha', 'zeta']);
  });

  it('returns 404 when the night file is missing', async () => {
    const runsDir = createRunsDir();
    const app = createApp({ ...config, runsDir });

    expect((await app.request('/digest/2026-10-28')).status).toBe(404);
    expect((await app.request('/api/digest/2026-10-28')).status).toBe(404);
  });

  it('renders an empty night', async () => {
    const runsDir = createRunsDir();
    writeNight(runsDir, '2026-10-28', '');
    const app = createApp({ ...config, runsDir });

    const page = await app.request('/digest/2026-10-28');
    const response = await app.request('/api/digest/2026-10-28');
    const json = (await response.json()) as NightDigest;

    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    expect(response.status).toBe(200);
    expect(json.rows).toEqual([]);
  });

  it('counts malformed lines and still renders valid rows', async () => {
    const runsDir = createRunsDir();
    writeNight(
      runsDir,
      '2026-10-28',
      [
        JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'lane/sync', status: 'ok', owner: 'rook' }),
        '{not json',
      ].join('\n'),
    );
    const app = createApp({ ...config, runsDir });

    const page = await app.request('/digest/2026-10-28');
    const response = await app.request('/api/digest/2026-10-28');
    const json = (await response.json()) as NightDigest;

    expect(page.status).toBe(200);
    expect(await page.text()).toContain('1 malformed log line skipped');
    expect(response.status).toBe(200);
    expect(json.malformedLines).toBe(1);
  });
});
