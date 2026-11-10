---
'ilc-sdk': major
---

Node.js 22.12 or newer is now required. The package stays CommonJS, and its `url-join` dependency moved to version 6, which is ESM only; Node 22.12 is the first release that lets CommonJS code `require()` such a module.
