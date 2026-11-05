import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TEST_FILES = ['**/*.{spec,test}.?(m|c)ts?(x)', '**/test/**/*.?(m|c)ts?(x)'];

export default tseslint.config(
    {
        ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '.changeset/**'],
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
