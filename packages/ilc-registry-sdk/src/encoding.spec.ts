import LZUTF8 from 'lzutf8';

import { COMPRESSED_PREFIX, COOKIE_SIZE_LIMIT, OVERRIDE_COOKIE_NAME } from './constants.js';
import {
    cookieSize,
    decodeOverrideConfig,
    encodeOverrideConfig,
    fitsCookie,
    OverrideConfigDecodeError,
} from './encoding.js';

const small = { apps: { '@portal/news': { spaBundle: 'http://localhost:8239/dist/single_spa.js' } } };

function large(): Record<string, unknown> {
    const apps: Record<string, unknown> = {};
    for (let i = 0; i < 40; i++) {
        apps[`@portal/app-${i}`] = {
            spaBundle: `http://localhost:8239/dist/app-${i}/single_spa.js`,
            cssBundle: `http://localhost:8239/dist/app-${i}/common.css`,
            props: { publicPath: `http://localhost:8239/dist/app-${i}/` },
        };
    }
    return { apps };
}

/** The decode ILC's server applies to the cookie (ilc/server/tailor/parse-override-config.ts) */
function ilcReads(value: string): unknown {
    if (value.startsWith('LZUTF8:')) {
        return JSON.parse(LZUTF8.decompress(LZUTF8.decodeBase64(value.replace(/^LZUTF8:/, ''))) as string);
    }
    return JSON.parse(decodeURIComponent(value));
}

describe('encodeOverrideConfig', () => {
    it('writes URI-encoded JSON when it fits the cookie', () => {
        const value = encodeOverrideConfig(small);

        expect(value).toBe(encodeURIComponent(JSON.stringify(small)));
        expect(ilcReads(value)).toEqual(small);
    });

    it('compresses when the plain form does not fit the cookie', () => {
        const override = large();
        expect(cookieSize(encodeURIComponent(JSON.stringify(override)))).toBeGreaterThan(COOKIE_SIZE_LIMIT);

        const value = encodeOverrideConfig(override);

        expect(value.startsWith(COMPRESSED_PREFIX)).toBe(true);
        expect(fitsCookie(value)).toBe(true);
        expect(ilcReads(value)).toEqual(override);
    });

    it('compresses a small override on demand', () => {
        const value = encodeOverrideConfig(small, 'always');

        expect(value.startsWith(COMPRESSED_PREFIX)).toBe(true);
        expect(ilcReads(value)).toEqual(small);
    });

    it('writes plain JSON on demand even when it does not fit', () => {
        const value = encodeOverrideConfig(large(), 'never');

        expect(value.startsWith('%7B')).toBe(true);
        expect(fitsCookie(value)).toBe(false);
    });

    it('takes the override as JSON text', () => {
        const json = JSON.stringify(small);

        expect(encodeOverrideConfig(json)).toBe(encodeURIComponent(json));
    });
});

describe('decodeOverrideConfig', () => {
    it('reads both encodings', () => {
        expect(decodeOverrideConfig(encodeOverrideConfig(small, 'never'))).toEqual(small);
        expect(decodeOverrideConfig(encodeOverrideConfig(small, 'always'))).toEqual(small);
    });

    it('rejects a malformed value', () => {
        expect(() => decodeOverrideConfig('%7Bnot json')).toThrow(OverrideConfigDecodeError);
        expect(() => decodeOverrideConfig('LZUTF8:###')).toThrow(OverrideConfigDecodeError);
    });
});

describe('cookieSize', () => {
    it('counts the name, the separator and the value', () => {
        expect(cookieSize('abc')).toBe(OVERRIDE_COOKIE_NAME.length + 1 + 3);
        expect(fitsCookie('x'.repeat(COOKIE_SIZE_LIMIT - OVERRIDE_COOKIE_NAME.length - 1))).toBe(true);
        expect(fitsCookie('x'.repeat(COOKIE_SIZE_LIMIT - OVERRIDE_COOKIE_NAME.length))).toBe(false);
    });
});
