import {describe, it, expect, vi, afterEach} from 'vitest'
import createFetchMock from 'vitest-fetch-mock';
import '@vitest/web-worker'

global.navigator = {
    ...global.navigator,
    locks: {
        request: vi.fn((name, callback) => callback())
    }
};

vi.mock('../public/PhpWorker.mjs', () => {
    return {
        PhpWorker: vi.fn(() => {
            return {
                addEventListener: vi.fn(),
                unlink: vi.fn(),
                writeFile: vi.fn(),
                run: vi.fn(),
                analyzePath: vi.fn(() => ({
                    exists: false,
                }))
            }
        })
    }
});

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();
fetchMocker.mockResponse(
    (req) => {
        if (req.url === '/foo/bar/baz.zip') {
            return Promise.resolve({
                body: '',
                status: 200,
            });
        }
        if (req.url.endsWith('install-site.phpcode')) {
            return Promise.resolve({
                body: 'install-site.php',
                status: 200,
            });
        }
        if (req.url.endsWith('init.phpcode')) {
            return Promise.resolve({
                body: 'init.php',
                status: 200,
            });
        }
        if (req.url.endsWith('login-admin.phpcode')) {
            return Promise.resolve({
                body: 'login-admin.php',
                status: 200,
            });
        }
        return Promise.reject(new Error('not mocked'));
    }
);

function createWorker() {
    return new Worker(new URL('../public/install-worker.mjs?worker', import.meta.url));
}

function runAction(sut, message, endAction) {
    return new Promise((resolve) => {
        sut.onmessage = ({data}) => {
            const {action} = data;
            if (action === endAction) {
                resolve(data)
            }
        }
        sut.postMessage(message);
    });
}

describe('install worker', () => {
    afterEach(() => {
        vi.restoreAllMocks()
        fetchMocker.resetMocks()
    })

    it('uses absolute urls for artifact', async () => {
        const sut = createWorker()
        await runAction(
            sut,
            {
                action: 'start',
                params: {
                    flavor: 'foo',
                    artifact: '/foo/bar/baz.zip',
                    installParameters: {
                        autoLogin: true,
                        installType: 'automated',
                    }
                }
            },
            'finished',
        )

        expect(fetchMock.requests().length).toEqual(4);
        expect(fetchMock.requests()[0].url).toEqual('/foo/bar/baz.zip');
        expect(fetchMock.requests()[1].url).toEqual('/assets/init.phpcode');
        expect(fetchMock.requests()[2].url).toEqual('/assets/install-site.phpcode');
        expect(fetchMock.requests()[3].url).toEqual('/assets/login-admin.phpcode');
    })
})
