import { randomBytes } from 'node:crypto';

import { buildOverrideCookie } from './buildOverrideCookie.js';
import { COOKIE_SIZE_LIMIT } from './constants.js';
import { decodeOverrideConfig } from './encoding.js';
import { RegistryError } from './errors.js';

const override = { apps: { '@portal/news': { spaBundle: 'http://localhost:8239/dist/single_spa.js' } } };
const signed = { signature: 'eyJhbGciOiJFZERTQSJ9..c2ln', expiresAt: '2026-11-06T20:00:00.000Z', untrustedLinks: [] };
const options = { registryUrl: 'https://registry.test', auth: { type: 'token' as const, id: 'i', secret: 's' } };

/** Stubs the global fetch with one Registry answer and returns the stub */
function registry(status: number, body: string | object = '', headers: Record<string, string> = {}) {
    const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
}

afterEach(() => {
    vi.unstubAllGlobals();
});

async function failure(promise: Promise<unknown>): Promise<RegistryError> {
    try {
        await promise;
    } catch (error) {
        if (error instanceof RegistryError) {
            return error;
        }
        throw error;
    }
    throw new Error('Expected a RegistryError');
}

describe('buildOverrideCookie', () => {
    it('returns the signature cookie first and the override cookie second', async () => {
        registry(200, signed);

        const result = await buildOverrideCookie(override, options);

        expect(result.cookies).toEqual([
            { name: 'ILC-overrideConfigSignature', value: signed.signature },
            { name: 'ILC-overrideConfig', value: encodeURIComponent(JSON.stringify(override)) },
        ]);
        expect(result).toMatchObject({
            signed: true,
            expiresAt: new Date(signed.expiresAt),
            untrustedLinks: [],
            size: 'ILC-overrideConfig='.length + encodeURIComponent(JSON.stringify(override)).length,
        });
    });

    it('signs exactly the value it writes to the cookie', async () => {
        const fetch = registry(200, signed);

        const result = await buildOverrideCookie(override, { ...options, compression: 'always' });

        const sent = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body)) as { value: string };
        expect(sent.value).toBe(result.cookies.at(-1)?.value);
        expect(sent.value.startsWith('LZUTF8:')).toBe(true);
        expect(decodeOverrideConfig(sent.value)).toEqual(override);
    });

    it('returns the override cookie alone when the Registry does not sign', async () => {
        registry(404);

        const result = await buildOverrideCookie(override, options);

        expect(result).toEqual({
            signed: false,
            cookies: [{ name: 'ILC-overrideConfig', value: encodeURIComponent(JSON.stringify(override)) }],
            size: 'ILC-overrideConfig='.length + encodeURIComponent(JSON.stringify(override)).length,
        });
    });

    it('passes the untrusted links on', async () => {
        registry(200, { ...signed, untrustedLinks: ['https://evil.example/app.js'] });

        const result = await buildOverrideCookie(override, options);

        expect(result).toMatchObject({ signed: true, untrustedLinks: ['https://evil.example/app.js'] });
    });

    it('takes the override as JSON text and sends it unchanged', async () => {
        const json = JSON.stringify(override);
        registry(200, signed);

        const result = await buildOverrideCookie(json, options);

        expect(result.cookies.at(-1)?.value).toBe(encodeURIComponent(json));
    });

    it.each([
        ['not JSON', '{oops', 'must be JSON'],
        ['an array', '[]', 'must be a JSON object'],
        ['unknown keys', { apps: {}, settings: {} }, 'got settings'],
    ])('rejects an override that is %s before calling the Registry', async (_name, input, message) => {
        const fetch = registry(200, signed);

        const error = await failure(buildOverrideCookie(input, options));

        expect(error.code).toBe('invalid-override');
        expect(error.message).toContain(message);
        expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects an override that does not fit the cookie before calling the Registry', async () => {
        const fetch = registry(200, signed);
        const huge = {
            apps: { '@portal/x': { spaBundle: `http://localhost/${randomBytes(COOKIE_SIZE_LIMIT).toString('hex')}` } },
        };

        const error = await failure(buildOverrideCookie(huge, options));

        expect(error.code).toBe('too-large');
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each([
        [401, 'login-required'],
        [422, 'refused'],
        [429, 'rate-limited'],
        [503, 'unreachable'],
    ])('turns a %s from the Registry into a %s error', async (status, code) => {
        registry(status, 'reason');

        const error = await failure(buildOverrideCookie(override, options));

        expect(error.code).toBe(code);
    });

    it('carries the delay of a rate limit', async () => {
        registry(429, '', { 'Retry-After': '5' });

        const error = await failure(buildOverrideCookie(override, options));

        expect(error).toMatchObject({ code: 'rate-limited', retryAfterMs: 5000 });
    });
});
