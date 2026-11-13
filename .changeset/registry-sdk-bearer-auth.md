---
'ilc-registry-sdk': minor
---

Add `auth: { type: 'bearer', token }`, which sends a composed Registry bearer token (`base64(id):base64(secret)`) as
is, for a caller that is given the token and never the auth entity.
