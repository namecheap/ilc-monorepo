import type { Auth } from './auth.js';
import { signOverrideConfig } from './signOverrideConfig.js';
import {
    COOKIE_SIZE_LIMIT,
    OVERRIDE_COOKIE_NAME,
    OVERRIDE_TOP_LEVEL_KEYS,
    SIGNATURE_COOKIE_NAME,
} from './constants.js';
import type { OverrideConfig } from './types.js';
import { cookieSize, encodeOverrideConfig, fitsCookie, type Compression } from './encoding.js';
import { RegistryError } from './errors.js';

export interface BuildOverrideCookieOptions {
    /** Origin of the Registry, with its base path when it has one, for example `https://registry.example.com` */
    registryUrl: string;
    auth: Auth;
    /** How the override is encoded into the cookie; `auto` by default */
    compression?: Compression;
    /** How long to wait for the Registry's answer; 10 seconds by default */
    timeoutMs?: number;
}

export interface Cookie {
    name: string;
    value: string;
}

export type OverrideCookies =
    | {
          signed: true;
          /** The signature cookie first, then the override cookie, in writing order */
          cookies: [Cookie, Cookie];
          /** When the signature stops being valid. Call again before it to keep the override. */
          expiresAt: Date;
          /** Links of the override that ILC removes as untrusted; empty when the whole override applies */
          untrustedLinks: string[];
          /** Size of the override cookie with its name, as the browser counts it */
          size: number;
      }
    | {
          /** The Registry does not sign overrides: the override cookie is written alone */
          signed: false;
          cookies: [Cookie];
          size: number;
      };

/**
 * Turns an override into the cookies that apply it on an ILC site: encodes it, has the Registry sign it when the
 * Registry signs overrides, and returns every cookie to write. The caller adds the domain and the flags.
 * Throws a `RegistryError` when no cookies can be produced.
 */
export async function buildOverrideCookie(
    override: OverrideConfig | string,
    options: BuildOverrideCookieOptions,
): Promise<OverrideCookies> {
    const json = toJson(override);
    const value = encodeOverrideConfig(json, options.compression);
    const size = cookieSize(value);
    if (!fitsCookie(value)) {
        throw new RegistryError(
            'too-large',
            `Override cookie would be ${size} bytes with its name, the browser limit is ${COOKIE_SIZE_LIMIT}`,
        );
    }

    const outcome = await signOverrideConfig(value, options);
    switch (outcome.kind) {
        case 'signed':
            return {
                signed: true,
                cookies: [
                    { name: SIGNATURE_COOKIE_NAME, value: outcome.signature },
                    { name: OVERRIDE_COOKIE_NAME, value },
                ],
                expiresAt: outcome.expiresAt,
                untrustedLinks: outcome.untrustedLinks,
                size,
            };
        case 'not-configured':
            return {
                signed: false,
                cookies: [{ name: OVERRIDE_COOKIE_NAME, value }],
                size,
            };
        case 'unauthorized':
            throw new RegistryError('login-required', 'The Registry did not accept the credentials');
        case 'refused':
            throw new RegistryError('refused', `The Registry refused to sign the override: ${outcome.message}`);
        case 'rate-limited':
            throw new RegistryError('rate-limited', 'Too many signing requests, try again later', outcome.retryAfterMs);
        case 'unreachable':
            throw new RegistryError('unreachable', outcome.message);
    }
}

/** The override as JSON, checked to be an object with only the keys the Registry signs */
function toJson(override: OverrideConfig | string): string {
    let parsed: unknown = override;
    if (typeof override === 'string') {
        try {
            parsed = JSON.parse(override);
        } catch {
            throw new RegistryError('invalid-override', 'Override config must be JSON');
        }
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new RegistryError('invalid-override', 'Override config must be a JSON object');
    }
    const allowed: readonly string[] = OVERRIDE_TOP_LEVEL_KEYS;
    const unknownKeys = Object.keys(parsed).filter((key) => !allowed.includes(key));
    if (unknownKeys.length > 0) {
        throw new RegistryError(
            'invalid-override',
            `Override config may contain only ${allowed.join(', ')}, got ${unknownKeys.join(', ')}`,
        );
    }
    return typeof override === 'string' ? override : JSON.stringify(override);
}
