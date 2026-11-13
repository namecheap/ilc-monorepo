'use strict';
// Mirrors dist/app/index.js for tools that ignore the exports map.
Object.defineProperty(exports, '__esModule', { value: true });
const app = require('./dist/app');
Object.assign(exports, app);
exports.default = app.default;
