import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type RunStatus = 'ok' | 'retry' | 'fail';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type StatusCounts = Record<RunStatus, number>;

export type NightDigest = {
  night: string;
  rows: DigestRow[];
  malformedLines: number;
  counts: StatusCounts;
};

type RunLogEntry = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

const nightPattern = /^\d{4}-\d{2}-\d{2}$/;

function isRunStatus(value: unknown): value is RunStatus {
  return value === 'ok' || value === 'retry' || value === 'fail';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRunLogEntry(value: unknown): value is RunLogEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.at === 'string' &&
    value.at.length > 0 &&
    typeof value.job === 'string' &&
    value.job.length > 0 &&
    isRunStatus(value.status) &&
    (typeof value.owner === 'string' || value.owner === null) &&
    (value.error === undefined || typeof value.error === 'string')
  );
}

function emptyCounts(): StatusCounts {
  return { ok: 0, retry: 0, fail: 0 };
}

export function readNight(runsDir: string, night: string): NightDigest | null {
  if (!nightPattern.test(night)) return null;

  let content: string;
  try {
    content = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }

  const rows = new Map<string, DigestRow>();
  const counts = emptyCounts();
  let malformedLines = 0;

  for (const line of content.split(/\r?\n/)) {
    if (line.trim() === '') continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      malformedLines += 1;
      continue;
    }

    if (!isRunLogEntry(parsed)) {
      malformedLines += 1;
      continue;
    }

    counts[parsed.status] += 1;
    const existing = rows.get(parsed.job);
    if (existing) {
      existing.owner = parsed.owner;
      existing.runs += 1;
      if (parsed.status === 'retry') existing.retries += 1;
      existing.lastStatus = parsed.status;
      existing.lastTime = parsed.at;
      if (parsed.error !== undefined) existing.lastError = parsed.error;
      continue;
    }

    rows.set(parsed.job, {
      job: parsed.job,
      owner: parsed.owner,
      runs: 1,
      retries: parsed.status === 'retry' ? 1 : 0,
      lastStatus: parsed.status,
      lastError: parsed.error ?? null,
      firstTime: parsed.at,
      lastTime: parsed.at,
    });
  }

  return {
    night,
    rows: [...rows.values()].sort((a, b) => a.job.localeCompare(b.job)),
    malformedLines,
    counts,
  };
}
