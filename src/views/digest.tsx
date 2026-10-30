import type { NightDigest } from '../digest/types.js';

function MalformedLineNotice({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <p class="warn">
      {count} malformed log {count === 1 ? 'line' : 'lines'} skipped
    </p>
  );
}

export function DigestPage({ digest }: { digest: NightDigest }) {
  return (
    <>
      <h1>morning digest · {digest.night}</h1>
      <MalformedLineNotice count={digest.malformedLines} />
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first time</th>
              <th>last time</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <tr class={row.retries >= 3 || row.lastStatus === 'fail' ? 'warn' : undefined}>
                <td>{row.job}</td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runs}</td>
                <td>{row.retries}</td>
                <td>{row.lastStatus}</td>
                <td>{row.lastError ?? '—'}</td>
                <td>{row.firstTime}</td>
                <td>{row.lastTime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
