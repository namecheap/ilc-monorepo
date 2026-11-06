import { defineProject } from 'vitest/config';

export default defineProject({
    test: {
        name: 'ilc-registry-sdk',
        environment: 'node',
        globals: true,
        include: ['src/**/*.{spec,test}.ts', 'test/**/*.ts'],
    },
});
