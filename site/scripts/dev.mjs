/** Local-only Worker preview. This never connects to the hosted Sites database. */
import http from 'node:http';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const portText = process.env.PORT ?? '4173';
if (!/^\d+$/.test(portText) || Number(portText) < 1 || Number(portText) > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
const port = Number(portText);
const dataDir = path.join(root, '.local-data');
await fs.mkdir(dataDir, { recursive: true });
const sqlite = new DatabaseSync(path.join(dataDir, 'qa.sqlite'));
sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');

try {
  const files = (await fs.readdir(path.join(root, 'drizzle'))).filter(name => name.endsWith('.sql')).sort();
  for (const name of files) {
    const sql = await fs.readFile(path.join(root, 'drizzle', name), 'utf8');
    const checksum = createHash('sha256').update(sql).digest('hex');
    const applied = sqlite.prepare('SELECT checksum FROM _local_migrations WHERE name = ?').get(name);
    if (applied) {
      if (applied.checksum !== checksum) throw new Error(`Previously applied local migration changed: ${name}. Restore it and add a new migration.`);
      continue;
    }
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      sqlite.exec(sql);
      sqlite.prepare('INSERT INTO _local_migrations (name, checksum, applied_at) VALUES (?, ?, ?)').run(name, checksum, new Date().toISOString());
      sqlite.exec('COMMIT');
      console.log(`Applied local migration: ${name}`);
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
} catch (error) {
  sqlite.close();
  throw error;
}

// Queue every SQLite operation; each batch holds one synchronous transaction.
let databaseQueue = Promise.resolve();
const schedule = operation => {
  const pending = databaseQueue.then(operation);
  databaseQueue = pending.catch(() => {});
  return pending;
};
class LocalStatement {
  constructor(query, parameters = []) { this.query = query; this.parameters = parameters; }
  bind(...parameters) { return new LocalStatement(this.query, parameters); }
  first(column) {
    return schedule(() => {
      const row = sqlite.prepare(this.query).get(...this.parameters);
      return row ? (column === undefined ? row : row[column] ?? null) : null;
    });
  }
  all() {
    return schedule(() => ({ success: true, results: sqlite.prepare(this.query).all(...this.parameters), meta: {} }));
  }
  runSync() {
    const result = sqlite.prepare(this.query).run(...this.parameters);
    return { success: true, results: [], meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) } };
  }
  run() { return schedule(() => this.runSync()); }
}
const DB = {
  prepare(query) { return new LocalStatement(query); },
  batch(statements) {
    return schedule(() => {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(statement => {
          if (!(statement instanceof LocalStatement)) throw new Error('Invalid local database statement.');
          return statement.runSync();
        });
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    });
  },
};

let worker;
try {
  worker = (await import(pathToFileURL(path.join(root, 'dist/server/index.js')).href)).default;
  if (typeof worker?.fetch !== 'function') throw new Error('Worker does not export fetch.');
} catch (error) {
  sqlite.close();
  throw new Error('Build the Worker first with npm run build.', { cause: error });
}

const pendingTasks = new Set();
const context = {
  waitUntil(task) {
    const pending = Promise.resolve(task).catch(error => console.error('Background task failed:', error.message));
    pendingTasks.add(pending);
    pending.finally(() => pendingTasks.delete(pending));
  },
  passThroughOnException() {},
};
const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
const server = http.createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host;
    if (!allowedHosts.has(host)) {
      outgoing.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      outgoing.end('This development server accepts loopback requests only.');
      return;
    }
    const method = incoming.method || 'GET';
    const options = { method, headers: new Headers() };
    for (let i = 0; i < incoming.rawHeaders.length; i += 2) options.headers.append(incoming.rawHeaders[i], incoming.rawHeaders[i + 1]);
    if (!['GET', 'HEAD'].includes(method)) {
      options.body = Readable.toWeb(incoming);
      options.duplex = 'half';
    }
    const request = new Request(new URL(incoming.url || '/', `http://${host}`).href, options);
    const response = await worker.fetch(request, { DB }, context);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (method === 'HEAD' || !response.body) { outgoing.end(); return; }
    const body = Readable.fromWeb(response.body);
    body.on('error', error => outgoing.destroy(error));
    outgoing.on('close', () => body.destroy());
    body.pipe(outgoing);
  } catch (error) {
    console.error('Local request failed:', error.message);
    if (!outgoing.headersSent) outgoing.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    outgoing.end('Local server error. Check the terminal output.');
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.on('error', error => {
  console.error(`Cannot start local preview: ${error.message}`);
  sqlite.close();
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Local preview: http://127.0.0.1:${port}`);
  console.log('Q&A data is stored only in site/.local-data/qa.sqlite. Hosted records are untouched.');
  console.log('After source edits, stop this process and run npm run dev again.');
});

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const forcedClose = setTimeout(() => server.closeAllConnections(), 5000);
  forcedClose.unref();
  server.close(async () => {
    clearTimeout(forcedClose);
    await Promise.allSettled([...pendingTasks]);
    await databaseQueue;
    sqlite.close();
  });
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
