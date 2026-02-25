/** Owner-mode authentication helpers */

import { config } from "@/lib/config";

const COOKIE_NAME = "fab-owner-token";

/**
 * Check whether the incoming request should be treated as owner.
 * Owner is granted automatically when:
 *   1. The request comes from localhost / 127.0.0.1 (dev machine or server itself)
 *   2. The request has a valid owner cookie (for remote browsers)
 */
export function isOwner(request: Request): boolean {
    // Auto-owner on localhost (this MacBook in dev, or direct server access)
    const host = request.headers.get("host") || "";
    if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
        return true;
    }

    // Otherwise check the cookie
    if (!config.ownerToken) return false;
    const cookieHeader = request.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
    return match ? match[1] === config.ownerToken : false;
}

/** Build a Set-Cookie header value that stores the owner token (HTTP-only, SameSite=Lax). */
export function ownerCookie(maxAgeSeconds = 60 * 60 * 24 * 365): string {
    return `${COOKIE_NAME}=${config.ownerToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

/** Build a Set-Cookie header that clears (expires) the owner cookie. */
export function clearOwnerCookie(): string {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
