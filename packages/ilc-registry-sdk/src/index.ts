/**
 * ilc-registry-sdk: turns an ILC override configuration into the cookies that apply it, with the Registry's
 * signature when the Registry signs overrides.
 */
export {
    buildOverrideCookie,
    type Cookie,
    type OverrideCookies,
    type BuildOverrideCookieOptions,
} from './buildOverrideCookie.js';
export { RegistryError, type RegistryErrorCode } from './errors.js';
export type { Auth } from './auth.js';
export type { OverrideConfig } from './types.js';
export type { Compression } from './encoding.js';
