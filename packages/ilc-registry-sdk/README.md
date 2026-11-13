# ilc-registry-sdk

SDK for the [ILC](https://github.com/namecheap/ilc) Registry API. Its first feature creates the cookies that apply an
override configuration on an ILC site, signed by the Registry when the Registry signs overrides: a caller hands over
the override and how it authenticates, and gets back the cookies to write. The encoding, the signing endpoint and
the cookie names stay inside.

```sh
pnpm add ilc-registry-sdk
```

Node 22 or a browser with `fetch`. ESM only.

## Usage

```ts
import { buildOverrideCookie } from 'ilc-registry-sdk';

const result = await buildOverrideCookie(
    { apps: { '@portal/news': { spaBundle: 'http://localhost:8239/dist/single_spa.js' } } },
    {
        registryUrl: 'https://ilc-registry.example.com',
        auth: { type: 'token', id: process.env.ILC_REGISTRY_ID, secret: process.env.ILC_REGISTRY_SECRET },
    },
);

for (const { name, value } of result.cookies) {
    await browser.setCookie({ name, value, domain: 'www.example.com', path: '/', secure: true });
}
```

`result` holds:

| Field            | Meaning                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `signed`         | Whether the Registry signed the override. `expiresAt` and `untrustedLinks` exist only when `true`.                 |
| `cookies`        | Every cookie to write as `{ name, value }`, in writing order: the signature, then the override. One when unsigned. |
| `expiresAt`      | When the signature stops being valid. Call again before it to keep the override applied.                           |
| `untrustedLinks` | Links of the override that ILC removes because their host is not in the Registry's trusted origins. Show them.     |
| `size`           | Size of the override cookie with its name, as the browser counts it.                                               |

The Registry reports untrusted links only while signing, so an unsigned result says nothing about the links: ILC
still drops untrusted ones on its own, silently.

The override can be an object or its JSON text. By default it is URI-encoded when it fits the 4096-byte cookie
limit and LZUTF8-compressed otherwise; the `compression` option, `'auto'`, `'always'` or `'never'`, changes that.
The Registry call uses the global `fetch` and gives up after `timeoutMs`, 10 seconds by default. The caller adds the domain and the
flags of each cookie, since every cookie writer takes them differently.

When no cookies can be produced, the call throws a `RegistryError` whose `code` says why:

| `code`             | Meaning                                                                       |
| ------------------ | ----------------------------------------------------------------------------- |
| `invalid-override` | Not a JSON object, or with keys other than `apps`, `routes` and `sharedLibs`. |
| `too-large`        | Does not fit the cookie even compressed.                                      |
| `login-required`   | The Registry did not accept the credentials.                                  |
| `refused`          | The Registry refused to sign; the message says why.                           |
| `rate-limited`     | Over the per-user signing rate limit; `retryAfterMs` when the Registry said.  |
| `unreachable`      | No usable answer from the Registry.                                           |

## Authentication

`auth` is plain data; its `type` picks the strategy:

| `auth`                          | For                                                   | What it does                                             |
| ------------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| `{ type: 'token', id, secret }` | scripts and services with a Registry auth entity      | Sends them as the Registry's bearer token, no cookies.   |
| `{ type: 'bearer', token }`     | a caller that already holds the composed bearer token | Sends `Authorization: Bearer <token>` as is, no cookies. |
| `{ type: 'session' }`           | code running in the browser, next to a Registry login | Sends the browser's cookies for the Registry, no token.  |

The composed token is `base64(id):base64(secret)` of the auth entity, the form `type: 'token'` builds. Pass it with
`type: 'bearer'` when the caller is given the token and never the entity.

## Signed overrides

ILC applies the `ILC-overrideConfig` cookie from any browser. A Registry configured with a signing key makes ILC
apply an override only together with the `ILC-overrideConfigSignature` cookie the Registry issued for that exact
value, so only an authenticated Registry user can start one. See "Signed override configuration" in the ILC docs
for the mechanism.
