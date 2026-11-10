import { injectLoader } from '../../src/server/webpack-inject-plugin/loader';
import { registry } from '../../src/server/webpack-inject-plugin/plugin';

// Mock the LoaderContext type
const mockLoaderContext = {
    getOptions: vi.fn(),
    async: vi.fn(),
};

describe('injectLoader', () => {
    beforeEach(() => {
        // Reset the registry and stubs before each test
        Object.keys(registry).forEach((key) => delete registry[key]);
        mockLoaderContext.getOptions.mockReset();
        mockLoaderContext.async.mockReset();
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('should use the default function if no registry entry is found', () => {
        const source = 'test source';
        mockLoaderContext.getOptions.mockReturnValue({ id: 'unknownId' });

        const result = injectLoader.call(mockLoaderContext as any, source);

        expect(result).to.equal('');
    });

    it('should call the registered function if registry entry is found', () => {
        const source = 'test source';
        const id = 'testId';
        const mockFunc = vi.fn().mockReturnValue('processed source');

        registry[id] = mockFunc;
        mockLoaderContext.getOptions.mockReturnValue({ id });

        const result = injectLoader.call(mockLoaderContext as any, source);

        expect(mockFunc).toHaveBeenCalledExactlyOnceWith(source);
        expect(result).to.equal('processed source');
    });

    it('should handle asynchronous registry functions', async () => {
        const source = 'async source';
        const id = 'asyncId';
        const mockFunc = vi.fn().mockResolvedValue('processed async source');

        registry[id] = mockFunc;
        mockLoaderContext.getOptions.mockReturnValue({ id });
        const asyncCallback = vi.fn();
        mockLoaderContext.async.mockReturnValue(asyncCallback);

        injectLoader.call(mockLoaderContext as any, source);

        await Promise.resolve(); // Wait for the promise to resolve

        expect(mockFunc).toHaveBeenCalledExactlyOnceWith(source);
        expect(asyncCallback).toHaveBeenCalledExactlyOnceWith(null, 'processed async source');
    });

    it('should handle asynchronous errors gracefully', async () => {
        const source = 'error source';
        const id = 'errorId';
        const mockFunc = vi.fn().mockRejectedValue(new Error('Async error'));

        registry[id] = mockFunc;
        mockLoaderContext.getOptions.mockReturnValue({ id });
        const asyncCallback = vi.fn();
        mockLoaderContext.async.mockReturnValue(asyncCallback);

        injectLoader.call(mockLoaderContext as any, source);
        await vi.runAllTimersAsync();
        expect(mockFunc).toHaveBeenCalledExactlyOnceWith(source);
        expect(asyncCallback).toHaveBeenCalledOnce();
        expect(asyncCallback.mock.calls[0][0]).to.be.an('error');
        expect(asyncCallback.mock.calls[0][0].message).to.equal('Async error');
    });

    it('should return undefined for asynchronous processing', () => {
        const source = 'async source';
        const id = 'asyncId';
        const mockFunc = vi.fn().mockResolvedValue('processed async source');

        registry[id] = mockFunc;
        mockLoaderContext.getOptions.mockReturnValue({ id });
        mockLoaderContext.async.mockReturnValue(() => {});

        const result = injectLoader.call(mockLoaderContext as any, source);

        expect(result).toBeUndefined();
    });
});
