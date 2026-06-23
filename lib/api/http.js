import { ZodError } from "zod";

export function json(data, init) {
  return Response.json(data, init);
}

export function errorResponse(status, code, message, details) {
  return json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    { status }
  );
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("INVALID_JSON");
  }
}

export function withRouteErrorHandling(handler) {
  return async function wrappedHandler(...args) {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(400, "VALIDATION_ERROR", "Request validation failed.", error.issues);
      }

      if (error.message === "INVALID_JSON") {
        return errorResponse(400, "INVALID_JSON", "Request body must be valid JSON.");
      }

      if (error.message === "DATABASE_URL is not set.") {
        return errorResponse(500, "SERVER_MISCONFIGURED", "DATABASE_URL is not configured.");
      }

      if (error.message === "CURRENT_USER_NOT_CONFIGURED") {
        return errorResponse(
          500,
          "CURRENT_USER_NOT_CONFIGURED",
          "Set DEV_USER_EMAIL to use the development auth shim."
        );
      }

      if (error.message === "UNAUTHORIZED") {
        return errorResponse(401, "UNAUTHORIZED", "You must sign in to access this resource.");
      }

      if (error.message === "NOT_FOUND") {
        return errorResponse(404, "NOT_FOUND", "The requested resource was not found.");
      }

      if (error.message === "FORBIDDEN") {
        return errorResponse(403, "FORBIDDEN", "You do not have access to this resource.");
      }

      if (error.message === "POOL_EMPTY") {
        return errorResponse(
          400,
          "POOL_EMPTY",
          "You cannot create a tournament from an empty pool."
        );
      }

      if (error.message === "INVALID_TOURNAMENT_STATUS_TRANSITION") {
        return errorResponse(
          400,
          "INVALID_TOURNAMENT_STATUS_TRANSITION",
          "That tournament status change is not allowed."
        );
      }

      if (error.message === "NOT_ENOUGH_ENTRIES") {
        return errorResponse(
          400,
          "NOT_ENOUGH_ENTRIES",
          "A tournament needs at least two entries before it can start."
        );
      }

      if (error.message === "TOURNAMENT_SEEDING_LOCKED") {
        return errorResponse(
          400,
          "TOURNAMENT_SEEDING_LOCKED",
          "You can only change seeding while a tournament is still in draft."
        );
      }

      if (error.message === "INVALID_TOURNAMENT_ENTRIES") {
        return errorResponse(
          400,
          "INVALID_TOURNAMENT_ENTRIES",
          "That seeding update did not match the tournament's current entries."
        );
      }

      if (error.message === "MATCH_NOT_OPEN") {
        return errorResponse(400, "MATCH_NOT_OPEN", "That match is not open for voting.");
      }

      if (error.message === "ALREADY_VOTED") {
        return errorResponse(409, "ALREADY_VOTED", "You have already voted in that match.");
      }

      if (error.message === "INVALID_MATCH_SELECTION") {
        return errorResponse(
          400,
          "INVALID_MATCH_SELECTION",
          "That entry is not a valid choice for this match."
        );
      }

      if (error.message === "ROUND_NOT_READY") {
        return errorResponse(
          409,
          "ROUND_NOT_READY",
          "The active round still has open matches without votes."
        );
      }

      if (error.message === "ROUND_NOT_CLOSABLE") {
        return errorResponse(
          400,
          "ROUND_NOT_CLOSABLE",
          "There is no active round that can be closed for this tournament."
        );
      }

      if (error.message === "IMAGE_SUGGESTIONS_UNAVAILABLE") {
        return errorResponse(
          502,
          "IMAGE_SUGGESTIONS_UNAVAILABLE",
          "Image suggestions are unavailable right now."
        );
      }

      if (error.message === "INVALID_IMAGE_PROXY_URL") {
        return errorResponse(400, "INVALID_IMAGE_PROXY_URL", "That image URL cannot be proxied.");
      }

      if (error.message === "IMAGE_PROXY_UNAVAILABLE") {
        return errorResponse(502, "IMAGE_PROXY_UNAVAILABLE", "That image could not be loaded.");
      }

      if (error.message === "IMAGE_PROXY_INVALID_TYPE") {
        return errorResponse(400, "IMAGE_PROXY_INVALID_TYPE", "That URL did not return an image.");
      }

      console.error(error);
      return errorResponse(500, "INTERNAL_SERVER_ERROR", "An unexpected server error occurred.");
    }
  };
}
