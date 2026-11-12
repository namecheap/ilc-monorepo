/**
 * The encoding of the override cookie value, the same for every writer and the same ILC and the Registry decode:
 * URI-encoded JSON, or LZUTF8-compressed and base64-encoded JSON behind the `LZUTF8:` prefix when the plain form
 * does not fit the cookie.
 */
import LZUTF8 from 'lzutf8';

import { COMPRESSED_PREFIX, COOKIE_SIZE_LIMIT, OVERRIDE_COOKIE_NAME } from './constants.js';
import type { OverrideConfig } from './types.js';

/**
 * `auto` writes plain URI-encoded JSON when it fits the cookie and compresses otherwise; `always` compresses every
 * value; `never` writes plain JSON even when it does not fit.
 */
export type Compression = 'auto' | 'always' | 'never';

export class OverrideConfigDecodeError extends Error {
    override readonly name = 'OverrideConfigDecodeError';

    constructor(cause: unknown) {
        super('Override config value must be URI-encoded JSON or an "LZUTF8:" encoded value', { cause });
    }
}

/** Size of the override cookie with its name, as the browser counts it */
export function cookieSize(value: string): number {
    return OVERRIDE_COOKIE_NAME.length + 1 + value.length;
}

/** Whether the browser accepts the value as the override cookie */
export function fitsCookie(value: string): boolean {
    return cookieSize(value) <= COOKIE_SIZE_LIMIT;
}

/** Encodes the override, given as an object or as its JSON, into the override cookie value */
export function encodeOverrideConfig(override: OverrideConfig | string, compression: Compression = 'auto'): string {
    const json = typeof override === 'string' ? override : JSON.stringify(override);
    if (compression === 'never') {
        return encodeURIComponent(json);
    }
    if (compression === 'auto') {
        const plain = encodeURIComponent(json);
        if (fitsCookie(plain)) {
            return plain;
        }
    }
    return COMPRESSED_PREFIX + LZUTF8.encodeBase64(toBytes(LZUTF8.compress(json)));
}

/** Decodes an override cookie value the way ILC does; throws `OverrideConfigDecodeError` on a malformed value */
export function decodeOverrideConfig(value: string): unknown {
    try {
        if (value.startsWith(COMPRESSED_PREFIX)) {
            const bytes = LZUTF8.decodeBase64(value.slice(COMPRESSED_PREFIX.length));
            return JSON.parse(toText(LZUTF8.decompress(bytes)));
        }
        return JSON.parse(decodeURIComponent(value));
    } catch (error) {
        throw new OverrideConfigDecodeError(error);
    }
}

function toBytes(output: Uint8Array | string): Uint8Array {
    if (typeof output === 'string') {
        throw new TypeError('Expected LZUTF8 to compress into bytes');
    }
    return output;
}

function toText(output: Uint8Array | string): string {
    if (typeof output !== 'string') {
        throw new TypeError('Expected LZUTF8 to decompress into text');
    }
    return output;
}
