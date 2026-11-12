/** Path of the signing endpoint, relative to the Registry URL */
export const SIGN_PATH = '/api/v1/override-config/sign';

/** The cookie ILC reads the override configuration from */
export const OVERRIDE_COOKIE_NAME = 'ILC-overrideConfig';

/** The cookie that carries the Registry's signature of the override cookie value */
export const SIGNATURE_COOKIE_NAME = 'ILC-overrideConfigSignature';

/** Chrome's limit for one cookie, name and value together; the Registry refuses to sign a larger value */
export const COOKIE_SIZE_LIMIT = 4096;

/** Prefix of an override cookie value that is LZUTF8-compressed and base64-encoded instead of URI-encoded */
export const COMPRESSED_PREFIX = 'LZUTF8:';

/** The only top-level keys the Registry signs */
export const OVERRIDE_TOP_LEVEL_KEYS = ['apps', 'routes', 'sharedLibs'] as const;
