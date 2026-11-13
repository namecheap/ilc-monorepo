import { readFileSync } from 'fs';
import path from 'path';
import { Configuration, Stats, webpack } from 'webpack';
import { WebpackPluginsFactory } from '../../src/server';

const fixtures = path.resolve(__dirname, '../fixtures');

function statsErrors(stats: Stats, kind: 'errors' | 'warnings'): string | undefined {
    const items = stats.toJson()[kind];
    return items?.length ? items.map((x) => x.message).join(',') : undefined;
}

function buildBundle(config: Configuration): Promise<string> {
    return new Promise((resolve, reject) => {
        webpack(config, (err, stats) => {
            if (err) {
                return reject(err);
            }
            const problem = stats && (statsErrors(stats, 'errors') ?? statsErrors(stats, 'warnings'));
            if (problem) {
                return reject(new Error(problem));
            }
            resolve(readFileSync(path.join(fixtures, 'dist/app.js'), 'utf-8'));
        });
    });
}

function clientConfig(plugins: Configuration['plugins']): Configuration {
    return {
        mode: 'production',
        entry: path.join(fixtures, 'app.js'),
        output: { path: path.join(fixtures, 'dist'), filename: 'app.js', libraryTarget: 'system' },
        optimization: { minimize: false },
        plugins,
    };
}

function serverConfig(plugins: Configuration['plugins']): Configuration {
    return {
        mode: 'production',
        entry: path.join(fixtures, 'app.js'),
        target: 'node',
        output: { path: path.join(fixtures, 'dist'), filename: 'app.js', libraryTarget: 'commonjs2' },
        optimization: { minimize: false },
        plugins,
    };
}

describe('WebpackPluginsFactory', () => {
    it('should generate client bundle (default)', async () => {
        const { client } = WebpackPluginsFactory();
        expect(await buildBundle(clientConfig(client))).toMatchSnapshot();
    });

    it('should generate client bundle (no public path)', async () => {
        const { client } = WebpackPluginsFactory({ publicPathDetection: { disable: true } });
        expect(await buildBundle(clientConfig(client))).toMatchSnapshot();
    });

    it('should generate client bundle (rootDirectoryLevel)', async () => {
        const { client } = WebpackPluginsFactory({ publicPathDetection: { rootDirectoryLevel: 2 } });
        expect(await buildBundle(clientConfig(client))).toMatchSnapshot();
    });

    it('should generate server bundle (default)', async () => {
        const { server } = WebpackPluginsFactory();
        expect(await buildBundle(serverConfig(server))).toMatchSnapshot();
    });

    it('should generate server bundle (no public path)', async () => {
        const { server } = WebpackPluginsFactory({ publicPathDetection: { disable: true } });
        expect(await buildBundle(serverConfig(server))).toMatchSnapshot();
    });

    it('should generate server bundle (rootDirectoryLevel)', async () => {
        const { server } = WebpackPluginsFactory({ publicPathDetection: { rootDirectoryLevel: 2 } });
        expect(await buildBundle(serverConfig(server))).toMatchSnapshot();
    });

    it('should generate server bundle (ssrPublicPath)', async () => {
        const { server } = WebpackPluginsFactory({ publicPathDetection: { ssrPublicPath: 'ssr-path' } });
        expect(await buildBundle(serverConfig(server))).toMatchSnapshot();
    });
});
