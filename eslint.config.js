import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TEST_FILES = ['**/*.{spec,test}.?(m|c)ts?(x)', '**/test/**/*.?(m|c)ts?(x)'];

export default tseslint.config(
    {
        // The two ilc-sdk shims are CommonJS by design, for tools that ignore the exports map
        ignores: [
            '**/dist/**',
            '**/coverage/**',
            '**/docs/**',
            '**/node_modules/**',
            '.changeset/**',
            'packages/ilc-sdk/app.js',
            'packages/ilc-sdk/app.d.ts',
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: { ...globals.node },
            parserOptions: {
                projectService: {
                    // Root-level config files that belong to no package tsconfig
                    allowDefaultProject: ['*.ts', '*.js'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            curly: 'error',
            'no-lonely-if': 'error',
            'no-eval': 'error',

            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-misused-promises': 'error',
            '@typescript-eslint/await-thenable': 'error',

            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },

    // Plain JS, no type info
    {
        files: ['**/*.{js,mjs,cjs}'],
        ...tseslint.configs.disableTypeChecked,
        languageOptions: {
            ...tseslint.configs.disableTypeChecked.languageOptions,
            globals: { ...globals.node },
        },
    },

    // ilc-sdk keeps the rule set it had before the move, mirroring its former tslint:recommended config
    {
        files: ['packages/ilc-sdk/**/*.ts'],
        rules: {
            '@typescript-eslint/adjacent-overload-signatures': 'error',
            '@typescript-eslint/array-type': ['error', { default: 'array' }],
            '@typescript-eslint/consistent-type-assertions': 'error',
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: ['class', 'interface'], format: ['PascalCase'] },
                { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'], leadingUnderscore: 'allow' },
            ],
            '@typescript-eslint/prefer-for-of': 'error',
            '@typescript-eslint/prefer-function-type': 'error',
            '@typescript-eslint/unified-signatures': 'error',
            '@typescript-eslint/dot-notation': 'error',
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'guard-for-in': 'error',
            'max-classes-per-file': ['error', 1],
            'no-bitwise': 'error',
            'no-caller': 'error',
            'no-console': 'error',
            'no-new-wrappers': 'error',
            'no-throw-literal': 'error',
            'no-undef-init': 'error',
            'object-shorthand': 'error',
            'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
            radix: 'error',

            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-empty-object-type': ['error', { allowObjectTypes: 'always' }],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-wrapper-object-types': 'off',
            'no-empty': 'off',
            'no-prototype-builtins': 'off',
        },
    },
    {
        // Its source is injected verbatim into app bundles, so the console call is intended
        files: ['packages/ilc-sdk/src/app/utils/resolveDirectory.ts'],
        rules: { 'no-console': 'off' },
    },

    // Tests
    {
        files: TEST_FILES,
        plugins: { vitest },
        rules: {
            ...vitest.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },

    // Keep last: switches off formatting rules
    prettier,
);
