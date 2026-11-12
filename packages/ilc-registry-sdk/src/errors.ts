export type RegistryErrorCode =
    /** The override is not a JSON object with only the keys the Registry signs */
    | 'invalid-override'
    /** The override does not fit the cookie even compressed */
    | 'too-large'
    /** The Registry did not accept the credentials: log in, or provide a valid token */
    | 'login-required'
    /** The Registry refused to sign the value; the message says why */
    | 'refused'
    /** Over the per-user signing rate limit */
    | 'rate-limited'
    /** The Registry gave no usable answer */
    | 'unreachable';

export class RegistryError extends Error {
    override readonly name = 'RegistryError';

    constructor(
        readonly code: RegistryErrorCode,
        message: string,
        /** For `rate-limited`, how long to wait before trying again, when the Registry said */
        readonly retryAfterMs?: number,
    ) {
        super(message);
    }
}
