import { name } from './index.js';

describe('ilc-registry-sdk', () => {
    it('exports the package name', () => {
        expect(name).toBe('ilc-registry-sdk');
    });
});
