"use client";

export class ApiRequestError extends Error {
  constructor(message, { status = null, data = null } = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
    this.code = data?.error?.code || null;
  }
}

async function readResponseJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

export async function requestJson(path, { method = "GET", body, cache, errorMessage = "Request failed." } = {}) {
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
