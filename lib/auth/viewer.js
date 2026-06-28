import { randomBytes } from "node:crypto";

export const ANONYMOUS_VOTER_COOKIE = "brackeroni_anon_voter";

export function createAnonymousVoterToken() {
  return randomBytes(18).toString("base64url");
}

export function getAnonymousVoterTokenFromRequest(request) {
  return request?.cookies?.get?.(ANONYMOUS_VOTER_COOKIE)?.value || null;
}
