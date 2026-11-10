import { TtlCache } from '../../src/app/utils/TtlCache';

describe('TtlCache', () => {
    let setTimeoutBackup: typeof setTimeout;

    beforeEach(() => {
        setTimeoutBackup = global.setTimeout;
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        global.setTimeout = setTimeoutBackup;
    });

    it('should set and get a value', () => {
        const cache = new TtlCache<string, number>({ ttl: 1000 });
        cache.set('key1', 123);
        expect(cache.get('key1')).to.equal(123);
    });

    it('should wrap a function and cache its result', () => {
        const cache = new TtlCache<string, number>({ ttl: 1000 });
        const fn = (x: number) => x * 2;
        const wrappedFn = cache.wrap(fn, (x) => `key-${x}`);

        expect(wrappedFn(2)).to.equal(4);
        expect(cache.get('key-2')).to.equal(4);
    });

    it('should return cached value for wrapped function', () => {
        const cache = new TtlCache<string, number>({ ttl: 1000 });
        const fn = vi.fn((x: number) => x * 2);
        const wrappedFn = cache.wrap(fn, (x) => `key-${x}`);

        wrappedFn(2);
        wrappedFn(2);

        expect(fn).toHaveBeenCalledOnce();
        expect(cache.get('key-2')).to.equal(4);
    });

    it('should clean up expired values', () => {
        const cache = new TtlCache<string, number>({ ttl: 1000, cleanupInterval: 500 });
        cache.set('key1', 123);
        expect(cache.get('key1')).to.equal(123);
        vi.advanceTimersByTime(1001);
        vi.advanceTimersByTime(500); // Trigger cleanup
        expect(cache.get('key1')).toBeUndefined();
    });

    it('should clear all values', () => {
        const cache = new TtlCache<string, number>({ ttl: 1000 });
        cache.set('key1', 123);
        cache.set('key2', 456);
        cache.clear();
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toBeUndefined();
    });

    it('should destroy the cache', () => {
        const cache = new TtlCache<string, number>({ ttl: 1000, cleanupInterval: 500 });
        cache.set('key1', 123);
        cache.destroy();
        expect(cache.get('key1')).toBeUndefined();
        // Ensure cleanup interval is cleared
        vi.advanceTimersByTime(1001);
        vi.advanceTimersByTime(500); // Trigger cleanup
        expect(cache.get('key1')).toBeUndefined();
    });

    it('should not schedule cleanup if setTimeout is not available', () => {
        const cache = new TtlCache<string, number>({ ttl: 1000, cleanupInterval: 500 });
        global.setTimeout = undefined as any;
        cache.set('key1', 123);
        expect(cache.get('key1')).to.equal(123);
        vi.advanceTimersByTime(1001);
        expect(cache.get('key1')).to.equal(123);
    });
});
