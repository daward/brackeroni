"use client";

import { createWorkspaceRequestLoopGuard } from "@/lib/client-api/workspace-request-loop-guard";

export class ApiRequestError extends Error {
  constructor(message, { status = null, data = null } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
    this.code = data?.error?.code || null;
  }
}

const workspaceRequestLoopGuard = createWorkspaceRequestLoopGuard();

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

const inFlightGetRequests = new Map();

async function performRequest(path, { method, body, cache, errorMessage }) {
  if (process.env.NODE_ENV !== "production") {
    const loop = workspaceRequestLoopGuard.record(path, method);

    if (loop) {
      const message =
        `Stopped a probable workspace request loop: ${loop.path} was requested ` +
        `${loop.count} times in ${loop.windowMs / 1000} seconds.`;
      console.error(message);
      throw new ApiRequestError(message);
    }
  }

  const response = await fetch(path, {
    method,
    cache,
    ...(body === undefined
      ? {}
      : {
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(body)
        })
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new ApiRequestError(data.error?.message || errorMessage, {
      status: response.status,
      data
    });
  }

  return data;
}

export function requestJson(path, { method = "GET", body, cache, errorMessage = "Request failed." } = {}) {
  const requestOptions = { method, body, cache, errorMessage };

  // Multiple mounted views can ask for the same read during a route transition.
  // Coalesce only overlapping, identical GETs: mutations always remain distinct,
  // and a later read still fetches fresh data once the original completes.
  if (method !== "GET") {
    return performRequest(path, requestOptions);
  }

  const existing = inFlightGetRequests.get(path);
  if (existing) {
    return existing;
  }

  const request = performRequest(path, requestOptions);
  inFlightGetRequests.set(path, request);
  void request.then(
    () => {
      if (inFlightGetRequests.get(path) === request) {
        inFlightGetRequests.delete(path);
      }
    },
    () => {
      if (inFlightGetRequests.get(path) === request) {
        inFlightGetRequests.delete(path);
      }
    }
  );

  return request;
}
