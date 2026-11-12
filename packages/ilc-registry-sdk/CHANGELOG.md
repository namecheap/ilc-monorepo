# ilc-registry-sdk

## 0.1.0

### Minor Changes

- [#3](https://github.com/namecheap/ilc-packages/pull/3) [`323481a`](https://github.com/namecheap/ilc-packages/commit/323481ac0e584e1729751cfd83222329b71a1e6e) Thanks [@stas-nc](https://github.com/stas-nc)! - Add `buildOverrideCookie`, which encodes an ILC override configuration, has the Registry sign it when the Registry
  signs overrides, and returns the cookies to write. It is the package's only function: the encoding, the signing
  endpoint and the cookie names stay inside. Authentication is a plain `auth` object: the id and secret of a Registry
  auth entity, or the browser session. A refused or unreachable Registry surfaces as a `RegistryError` with a `code`.

## 0.0.1

### Patch Changes

- [#1](https://github.com/namecheap/ilc-packages/pull/1) [`89d352e`](https://github.com/namecheap/ilc-packages/commit/89d352e2361572cfc5ca6e4dad1756f610dfdf5a) Thanks [@stas-nc](https://github.com/stas-nc)! - Test release
