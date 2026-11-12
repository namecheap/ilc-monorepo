import * as authModule from './auth.js';
import { signOverrideConfig } from './signOverrideConfig.js';

const value = encodeURIComponent(JSON.stringify({ apps: {} }));
const signed = { signature: 'eyJhbGciOiJFZERTQSJ9..c2ln', expiresAt: '2026-11-06T20:00:00.000Z', untrustedLinks: [] };
const options = { registryUrl: 'https://registry.test', auth: { type: 'token' as const, id: 'i', secret: 's' } };

/** Stubs the global fetch with one answer and returns the stub */
function answering(status: number, body: string | object = '', headers: Record<string, string> = {}) {
    const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
}

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('signOverrideConfig', () => {
    it('posts the value to the sign endpoint with the credentials of the auth', async () => {
        const fetch = answering(200, signed);

        const outcome = await signOverrideConfig(value, { ...options, registryUrl: 'https://registry.test/' });

        expect(outcome).toEqual({
            kind: 'signed',
            signature: signed.signature,
            expiresAt: new Date(signed.expiresAt),
            untrustedLinks: [],
        });
        expect(fetch).toHaveBeenCalledWith('https://registry.test/api/v1/override-config/sign', {
            method: 'POST',
            headers: {
                Authorization: 'Bearer aQ==:cw==',
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({ value }),
            credentials: 'omit',
            signal: expect.any(AbortSignal),
        });
    });

    it('keeps the base path of the Registry and sends the browser cookies for a session', async () => {
        const fetch = answering(200, signed);

        await signOverrideConfig(value, { registryUrl: 'https://host.test/registry', auth: { type: 'session' } });

        expect(fetch).toHaveBeenCalledWith(
            'https://host.test/registry/api/v1/override-config/sign',
            expect.objectContaining({ credentials: 'include' }),
        );
    });

    it('gives up after the timeout', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn<typeof globalThis.fetch>(
                (_url, init) =>
                    new Promise((_resolve, reject) => {
                        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
                    }),
            ),
        );

        const outcome = await signOverrideConfig(value, { ...options, timeoutMs: 20 });

        expect(outcome).toEqual({ kind: 'unreachable', message: expect.stringContaining('timeout') });
    });

    it('reports the untrusted links the Registry lists', async () => {
        answering(200, { ...signed, untrustedLinks: ['https://evil.example/app.js', 7] });

        const outcome = await signOverrideConfig(value, options);

        expect(outcome).toMatchObject({ kind: 'signed', untrustedLinks: ['https://evil.example/app.js'] });
    });

    it('treats a missing list of untrusted links as an empty one', async () => {
        answering(200, { signature: signed.signature, expiresAt: signed.expiresAt });

        const outcome = await signOverrideConfig(value, options);

        expect(outcome).toMatchObject({ kind: 'signed', untrustedLinks: [] });
    });

    it.each([
        ['not configured', 404, { kind: 'not-configured' }],
        ['unauthorized', 401, { kind: 'unauthorized' }],
        ['forbidden', 403, { kind: 'unauthorized' }],
        ['refused', 422, { kind: 'refused', message: 'Override config must be a JSON object' }],
        ['rate limited', 429, { kind: 'rate-limited' }],
        ['server error', 500, { kind: 'unreachable', message: expect.stringContaining('500') }],
    ])('maps %s', async (_name, status, expected) => {
        answering(status, status === 422 ? 'Override config must be a JSON object' : '');

        const outcome = await signOverrideConfig(value, options);

        expect(outcome).toEqual(expected);
    });

    it('reads Retry-After in seconds and as a date', async () => {
        vi.useFakeTimers({ now: new Date('2026-11-06T10:00:00Z') });
        try {
            answering(429, '', { 'Retry-After': '30' });
            await expect(signOverrideConfig(value, options)).resolves.toEqual({
                kind: 'rate-limited',
                retryAfterMs: 30_000,
            });

            answering(429, '', { 'Retry-After': 'Fri, 06 Nov 2026 10:01:00 GMT' });
            await expect(signOverrideConfig(value, options)).resolves.toEqual({
                kind: 'rate-limited',
                retryAfterMs: 60_000,
            });
        } finally {
            vi.useRealTimers();
        }
    });

    it.each([
        ['not JSON', 'nope'],
        ['no signature', { expiresAt: signed.expiresAt }],
        ['no valid expiry', { signature: 'x', expiresAt: 'soon' }],
    ])('reports a 200 with %s as unreachable', async (_name, body) => {
        answering(200, body);

        const outcome = await signOverrideConfig(value, options);

        expect(outcome).toMatchObject({ kind: 'unreachable' });
    });

    it('reports a failed request as unreachable', async () => {
        vi.stubGlobal('fetch', vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError('fetch failed')));

        const outcome = await signOverrideConfig(value, options);

        expect(outcome).toEqual({ kind: 'unreachable', message: expect.stringContaining('fetch failed') });
    });

    it('sends the request again once when the auth recovers from a refusal', async () => {
        const fetch = vi
            .fn<typeof globalThis.fetch>()
            .mockResolvedValueOnce(new Response('', { status: 401 }))
            .mockResolvedValueOnce(new Response(JSON.stringify(signed), { status: 200 }));
        vi.stubGlobal('fetch', fetch);
        vi.spyOn(authModule, 'resolveAuth').mockReturnValue({
            ...authModule.resolveAuth(options.auth),
            recover: vi.fn().mockResolvedValue(true),
        });

        const outcome = await signOverrideConfig(value, options);

        expect(outcome).toMatchObject({ kind: 'signed' });
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('gives up when the auth cannot recover', async () => {
        const fetch = answering(401);
        vi.spyOn(authModule, 'resolveAuth').mockReturnValue({
            ...authModule.resolveAuth(options.auth),
            recover: vi.fn().mockResolvedValue(false),
        });

        const outcome = await signOverrideConfig(value, options);

        expect(outcome).toEqual({ kind: 'unauthorized' });
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
