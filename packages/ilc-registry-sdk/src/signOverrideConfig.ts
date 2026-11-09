/**
 * The signing call: sends an override cookie value to the Registry and reports what came back as an outcome, never
 * as an exception. Runs anywhere `fetch` exists, a browser extension's service worker included.
 */
import { resolveAuth, type Auth, type AuthStrategy } from './auth.js';
import { SIGN_PATH } from './constants.js';

export interface SignOptions {
    /** Origin of the Registry, with its base path when it has one, for example `https://registry.example.com` */
    registryUrl: string;
    auth: Auth;
    /** How long to wait for the Registry's answer; 10 seconds by default */
    timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 10_000;

export type SignOutcome =
    /** The Registry signed the value as sent */
    | { kind: 'signed'; signature: string; expiresAt: Date; untrustedLinks: string[] }
    /** The Registry has no signing key: the override cookie is written alone, as before signing existed */
    | { kind: 'not-configured' }
    /** The Registry did not accept the credentials */
    | { kind: 'unauthorized' }
    /** The Registry refused the value: too large, not an object, or with keys it does not sign */
    | { kind: 'refused'; message: string }
    /** Over the per-user rate limit; `retryAfterMs` when the Registry said how long to wait */
    | { kind: 'rate-limited'; retryAfterMs?: number }
    /** No usable answer: a network error, an abort, a 5xx or a body that is not the documented one */
    | { kind: 'unreachable'; message: string };

/** Asks the Registry to sign the override cookie value */
export async function signOverrideConfig(value: string, options: SignOptions): Promise<SignOutcome> {
    const auth = resolveAuth(options.auth);
    const outcome = await request(value, auth, options);
    if (outcome.kind === 'unauthorized' && auth.recover && (await auth.recover())) {
        return request(value, auth, options);
    }
    return outcome;
}

async function request(value: string, auth: AuthStrategy, options: SignOptions): Promise<SignOutcome> {
    const { registryUrl, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const url = `${registryUrl.replace(/\/+$/, '')}${SIGN_PATH}`;

    let response: Response;
    try {
        response = await fetch(url, {
            method: 'POST',
            headers: { ...auth.headers, 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ value }),
            credentials: auth.credentials,
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (error) {
        return { kind: 'unreachable', message: `Registry is unreachable at ${url}: ${describe(error)}` };
    }

    switch (response.status) {
        case 200:
            return parseSigned(await response.text());
        case 404:
            return { kind: 'not-configured' };
        case 401:
        case 403:
            return { kind: 'unauthorized' };
        case 422:
            return { kind: 'refused', message: await response.text() };
        case 429: {
            const retryAfterMs = retryAfter(response.headers.get('Retry-After'));
            return retryAfterMs === undefined ? { kind: 'rate-limited' } : { kind: 'rate-limited', retryAfterMs };
        }
        default:
            return { kind: 'unreachable', message: `Registry answered ${response.status} at ${url}` };
    }
}

function parseSigned(text: string): SignOutcome {
    let body: unknown;
    try {
        body = JSON.parse(text);
    } catch {
        return { kind: 'unreachable', message: 'Registry answered 200 with a body that is not JSON' };
    }
    if (!isRecord(body) || typeof body['signature'] !== 'string' || body['signature'] === '') {
        return { kind: 'unreachable', message: 'Registry answered 200 without a signature' };
    }
    const expiresAt = typeof body['expiresAt'] === 'string' ? new Date(body['expiresAt']) : new Date(NaN);
    if (Number.isNaN(expiresAt.getTime())) {
        return { kind: 'unreachable', message: 'Registry answered 200 without a valid expiry' };
    }
    const links = body['untrustedLinks'];
    const untrustedLinks = Array.isArray(links) ? links.filter((link): link is string => typeof link === 'string') : [];
    return { kind: 'signed', signature: body['signature'], expiresAt, untrustedLinks };
}

/** `Retry-After` as delay seconds or an HTTP date, in milliseconds from now */
function retryAfter(header: string | null): number | undefined {
    if (header === null) {
        return undefined;
    }
    if (/^\d+$/.test(header)) {
        return Number(header) * 1000;
    }
    const date = Date.parse(header);
    return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describe(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
