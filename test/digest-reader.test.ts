import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readNight } from '../src/digest/types.js';

const temporaryDirectories: string[] = [];

function createRunsDir() {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
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

describe('readNight', () => {
  it('aggregates the fixture and counts malformed lines', () => {
    const digest = readNight('runs', '2026-10-28');

    expect(digest).not.toBeNull();
    expect(digest?.rows).toHaveLength(5);
    expect(digest?.malformedLines).toBe(1);
    expect(digest?.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('keeps null owners and the most recent error for each job', () => {
    const runsDir = createRunsDir();
    writeNight(
      runsDir,
      '2026-10-28',
      [
        JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job: 'digest/render', status: 'retry', owner: null, error: 'slow' }),
        JSON.stringify({ at: '2026-10-28T01:01:00+01:00', job: 'digest/render', status: 'ok', owner: null }),
      ].join('\n'),
    );

    const digest = readNight(runsDir, '2026-10-28');
    expect(digest?.rows).toEqual([
      {
        job: 'digest/render',
        owner: null,
        runs: 2,
        retries: 1,
        lastStatus: 'ok',
        lastError: 'slow',
        firstTime: '2026-10-28T01:00:00+01:00',
        lastTime: '2026-10-28T01:01:00+01:00',
      },
    ]);
  });

  it('returns null for missing and invalid night paths', () => {
    const runsDir = createRunsDir();
    expect(readNight(runsDir, '2026-10-28')).toBeNull();
    expect(readNight(runsDir, '../plan')).toBeNull();
  });
});
