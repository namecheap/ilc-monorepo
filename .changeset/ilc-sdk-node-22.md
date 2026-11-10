---
'ilc-sdk': major
---

Node.js 22.12 or newer is now required. The package stays CommonJS, and its `url-join` dependency moved to version 6, which is ESM only; Node 22.12 is the first release that lets CommonJS code `require()` such a module.

The package now declares an `exports` map with two entry points, `ilc-sdk` and `ilc-sdk/app`. Deep imports such as `ilc-sdk/dist/server/types` no longer resolve; everything they offered is exported from `ilc-sdk`, so change them to `import { AppAssets } from 'ilc-sdk'`. `ilc-sdk/app` now also resolves from ESM.

`IlcSdk` and `IlcAppSdk` are also available as named exports, so `import { IlcSdk } from 'ilc-sdk'` works from ESM without a `.default` access. The default exports stay.
