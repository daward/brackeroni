/**
 * Public route entry for voting on brackets.
 *
 * Keep voting page consumers at this feature root. The vote route is part of
 * the bracket application even when the public URL remains `/vote`.
 */
export { default } from "./internal/vote-page";
