import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const globalTrace = globalThis;
const traceStorage = globalTrace.__brackeroniDbTraceStorage ?? new AsyncLocalStorage();
const traceFilePath = path.join(process.cwd(), "logs", "local-db-trace.jsonl");
let traceDirectoryPromise;

if (!globalTrace.__brackeroniDbTraceStorage) {
  globalTrace.__brackeroniDbTraceStorage = traceStorage;
}

function isLocalDatabaseUrl(value) {
  if (!value) return false;

  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function isLocalDbTraceEnabled() {
  return process.env.BRACKERONI_DB_TRACE !== "0" && isLocalDatabaseUrl(process.env.DATABASE_URL);
}

function compactQuery(query) {
  return String(query).replace(/\s+/g, " ").trim();
}

function byteLengthOfJson(value) {
  try {
    return Buffer.byteLength(JSON.stringify(value));
  } catch {
    return null;
  }
}

function writeTrace(trace) {
  if (!isLocalDbTraceEnabled()) return;

  traceDirectoryPromise ??= mkdir(path.dirname(traceFilePath), { recursive: true });
  void traceDirectoryPromise
    .then(() => appendFile(traceFilePath, `${JSON.stringify(trace)}\n`, "utf8"))
    .catch((error) => console.error("Unable to write local database trace.", error));
}

export function recordDbQuery(query, parameters = []) {
  const trace = traceStorage.getStore();
  if (!trace) return;

  trace.queries.push({
    sql: compactQuery(query),
    parameterCount: Array.isArray(parameters) ? parameters.length : 0
  });
}

export function recordJsonResponse(data) {
  const trace = traceStorage.getStore();
  if (!trace) return;

  const bytes = byteLengthOfJson(data);
  if (bytes != null) trace.responseBytes = bytes;
}

export function withLocalDbTrace(request, handler) {
  if (!isLocalDbTraceEnabled() || !request) return handler();

  const trace = {
    type: "request",
    id: randomUUID(),
    at: new Date().toISOString(),
    method: request.method,
    path: new URL(request.url).pathname,
    queryCount: 0,
    queries: [],
    responseBytes: null,
    status: null,
    durationMs: null
  };
  const startedAt = performance.now();

  return traceStorage.run(trace, async () => {
    try {
      const response = await handler();
      trace.status = response?.status ?? 200;
      return response;
    } catch (error) {
      trace.status = 500;
      trace.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      trace.queryCount = trace.queries.length;
      trace.durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
      writeTrace(trace);
    }
  });
}

export function getLocalDbTracePath() {
  return traceFilePath;
}