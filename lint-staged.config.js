/** @type {import('lint-staged').Configuration} */
export default {
    '*.{ts,tsx,js,mjs,cjs}': ['eslint --fix', 'prettier --write'],
    '*': 'prettier --ignore-unknown --write',
};
