import IlcAppSdk, { ApplicationKind } from '../../src/app/index';

describe('IlcAppSdk', () => {
    it('should throw error due to not provided adapter', () => {
        // @ts-expect-error adapter argument is required
        expect(() => new IlcAppSdk()).to.throw('Unable to determine adapter properly...');
    });

    it('should render404 run trigger404Page method from adapter', () => {
        let page404Rendered = false;

        const appSdk = new IlcAppSdk({
            appId: 'someAppId',
            intl: null,
            trigger404Page: () => {
                page404Rendered = true;
            },
        });

        expect(page404Rendered).toBe(false);
        appSdk.render404();
        expect(page404Rendered).toBe(true);
    });

    it('should "unmount" throw error due to not defined set method in adapter', () => {
        const appSdk = new IlcAppSdk({
            appId: 'someAppId',
            intl: null,
            trigger404Page: () => {},
        });

        expect(() => appSdk.unmount()).to.throw("Looks like you're trying to call CSR only method during SSR");
    });

    it('should process sdk params', () => {
        const appSdk = new IlcAppSdk(
            {
                appId: 'someAppId',
                intl: null,
                trigger404Page: () => {},
            },
            {
                i18n: { manifestPath: 'value' },
                cssBundle: '1.css',
            },
        );
        expect(appSdk.intl.getLocalisationManifestPath()).equal('value');
        expect(appSdk.cssBundle).equal('1.css');
    });
});
