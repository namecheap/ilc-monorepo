---
'ilc-registry-sdk': minor
---

Add `buildOverrideCookie`, which encodes an ILC override configuration, has the Registry sign it when the Registry
signs overrides, and returns the cookies to write. It is the package's only function: the encoding, the signing
endpoint and the cookie names stay inside. Authentication is a plain `auth` object: the id and secret of a Registry
auth entity, or the browser session. A refused or unreachable Registry surfaces as a `RegistryError` with a `code`.
