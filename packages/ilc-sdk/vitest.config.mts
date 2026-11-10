import { defineProject } from 'vitest/config';

export default defineProject({
    test: {
        name: 'ilc-sdk',
        environment: 'node',
        globals: true,
        include: ['test/**/*.spec.ts'],
    },
});
