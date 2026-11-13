import { resolveAuth } from './auth.js';

describe('resolveAuth', () => {
    it('composes the Registry token from the id and the secret of an auth entity', () => {
        const strategy = resolveAuth({ type: 'token', id: 'root_api_token', secret: 'token_secret' });

        expect(strategy.credentials).toBe('omit');
        expect(strategy.headers).toEqual({ Authorization: 'Bearer cm9vdF9hcGlfdG9rZW4=:dG9rZW5fc2VjcmV0' });
    });

    it('encodes non-ASCII parts as UTF-8 like the Registry decodes them', () => {
        const strategy = resolveAuth({ type: 'token', id: 'ключ', secret: 's' });

        expect(strategy.headers['Authorization']).toBe(`Bearer ${Buffer.from('ключ').toString('base64')}:cw==`);
    });

    it('sends a composed bearer token as is', () => {
        const strategy = resolveAuth({ type: 'bearer', token: 'cm9vdF9hcGlfdG9rZW4=:dG9rZW5fc2VjcmV0' });

        expect(strategy.credentials).toBe('omit');
        expect(strategy.headers).toEqual({ Authorization: 'Bearer cm9vdF9hcGlfdG9rZW4=:dG9rZW5fc2VjcmV0' });
    });

    it('relies on the browser cookies only for a session', () => {
        const strategy = resolveAuth({ type: 'session' });

        expect(strategy.credentials).toBe('include');
        expect(strategy.headers).toEqual({});
    });
});
