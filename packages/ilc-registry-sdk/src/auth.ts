/**
 * How a client proves who it is to the Registry. Plain data: the signing call picks the strategy from `type` and the
 * caller never sees the mechanism.
 */

export type Auth =
    /** The id and secret of a Registry auth entity, for scripts and services; sent as a bearer token, no cookies */
    | { type: 'token'; id: string; secret: string }
    /** The Registry session of the browser the code runs in, as in the ILC Overrides extension */
    | { type: 'session' };

/** What the signing call needs from an `Auth` */
export interface AuthStrategy {
    headers: Record<string, string>;
    credentials: RequestCredentials;
    /**
     * Called once when the Registry answered that the request was not authenticated. Returns `true` when the request
     * should be sent again, for example after a new login.
     */
    recover?(): Promise<boolean>;
}

export function resolveAuth(auth: Auth): AuthStrategy {
    switch (auth.type) {
        case 'token':
            return {
                credentials: 'omit',
                headers: { Authorization: `Bearer ${base64(auth.id)}:${base64(auth.secret)}` },
            };
        case 'session':
            return { credentials: 'include', headers: {} };
    }
}

/** Base64 of the UTF-8 bytes, the way the Registry decodes the token parts; works in Node and in browsers */
function base64(text: string): string {
    return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}
