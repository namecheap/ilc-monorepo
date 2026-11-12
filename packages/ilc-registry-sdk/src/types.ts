/**
 * An override configuration as ILC reads it from the cookie: the parts of the Registry config a developer replaces in
 * their own browser. The shapes of the entries follow the ILC Registry API.
 */
export interface OverrideConfig {
    apps?: Record<string, unknown>;
    routes?: unknown[];
    sharedLibs?: Record<string, unknown>;
}
