import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import TrialManager, { defineTrialManagerElement } from "../public/trial-manager.mjs";

function createMockWorker() {
    const mock = {
        postMessage:  vi.fn(),
        terminate:  vi.fn()
    }
    vi.stubGlobal('Worker', vi.fn(() => mock))
    return mock
}

function createTrialManager(flavor, artifact = 'drupal.zip') {
    const sut = new TrialManager();
    sut.flavor = flavor;
    sut.artifact = artifact
    return sut;
}

describe('TrialManager', () => {
    beforeEach(() => {
        defineTrialManagerElement()
    })
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        document.body.replaceChildren()
    })

    it('custom element is defined', () => {
        createMockWorker()
        document.body.appendChild(createTrialManager());
        expect(document.querySelector('trial-manager')).toBeTruthy();
    });

    it('changes state based on the mode', () => {
        createMockWorker()
        const sut = createTrialManager('bar')
        document.body.appendChild(sut);
        expect(sut.getInnerHTML()).toContain('<svg')
        sut.mode = 'new_session'
        expect(sut.getInnerHTML()).not.toContain('<svg')
        sut.message = 'foobar';
        expect(sut.getInnerHTML()).toContain('foobar')
        sut.mode = 'existing_session';
        expect(sut.message).toBe('')
        expect(sut.getInnerHTML()).not.toContain('foobar')
        expect(sut.getInnerHTML()).toContain('Resume session')
        expect(sut.getInnerHTML()).toContain('New session')
        expect(sut.getInnerHTML()).toContain('Export')
    })

    it('handles broadcast message for sw activation', () => {
        const worker = createMockWorker()
        worker.postMessage.mockImplementation(({ action, params }) => {
            expect(action).toBe('check_existing')
            expect(params).toStrictEqual({ flavor: 'foo' })
        })

        createTrialManager('foo');

        const channel = new BroadcastChannel('drupal-cgi-worker');
        channel.postMessage({action: 'service_worker_activated'})

        vi.waitFor(() => {
            expect(worker.postMessage).toHaveBeenCalledTimes(1)
        })
    })

    it.each([
        ['resume', 'start', { flavor: 'bar', artifact: 'baz.zip' }, 'started', 'new_session'],
        ['export', 'export', { flavor: 'bar' }, 'started', 'new_session'],
        ['new', 'remove', { flavor: 'bar' }, 'reload', null]
    ])('button %s interacts with worker', (buttonId, buttonAction, expectedParams, workerAction, endMode) => {
        vi.stubGlobal('confirm', vi.fn().mockImplementation(() => true))
        const worker = createMockWorker()
        worker.postMessage.mockImplementation(({ action, params }) => {
            expect(['check_existing', buttonAction]).toContain(action)
            if (action === 'check_existing') {
                worker.onmessage({
                    data: {
                        action: `check_existing_finished`,
                        params: {
                            exists: true,
                        }
                    }
                })
            } else {
                expect(action).toBe(buttonAction)
                expect(params).toStrictEqual(expectedParams)
                worker.onmessage({
                    data: {
                        action: workerAction,
                    }
                })
            }
        })

        const sut = createTrialManager('bar', 'baz.zip')
        sut.mode = 'existing_session';
        document.body.appendChild(sut);
        document.getElementById(buttonId).click()
        expect(worker.postMessage).toHaveBeenCalledTimes(2)
        expect(sut.mode).toStrictEqual(endMode)
    })

    it.each([
        ['drupal'],
        ['starshot']
    ])('checks for existing `%s` docroot when connected', (flavor) => {
        const worker = createMockWorker()
        worker.postMessage.mockImplementation(({ action, params }) => {
            expect(action).toBe('check_existing')
            expect(params).toStrictEqual({ flavor })
        })

        document.body.appendChild(createTrialManager(flavor));

        expect(worker.postMessage).toHaveBeenCalledTimes(1)
    })

    it('starts new session if one does not exist', () => {
        const worker = createMockWorker()
        worker.postMessage.mockImplementation(({ action, params }) => {
            expect(['check_existing', 'start']).toContain(action)
            if (action === 'check_existing') {
                worker.onmessage({
                    data: {
                        action: `check_existing_finished`,
                        params: {
                            exists: false,
                        }
                    }
                })
            }
            else {
                expect(params).toStrictEqual({
                    artifact: 'drupal.zip',
                    flavor: 'foo',
                    installParameters: {
                        langcode: 'en',
                        profile: 'standard',
                        recipes: [],
                        siteName: 'Try Drupal',
                        skip: false,
                    }
                })
                worker.onmessage({
                    data: {
                        action: `finished`,
                    }
                })
            }
        })

        document.body.appendChild(createTrialManager('foo'));
        expect(worker.postMessage).toHaveBeenCalledTimes(2)
        expect(window.location).toStrictEqual('/cgi/foo')
    })

    it('terminates worker on removal', () => {
        const worker = createMockWorker()
        const sut = document.body.appendChild(createTrialManager());
        document.body.removeChild(sut)
        expect(worker.terminate).toHaveBeenCalledTimes(1)
    })

    it('stops worker on error', () => {
        const worker = createMockWorker()
        worker.postMessage.mockImplementation(({ action }) => {
            expect(action).toBe('stop')
        })
        const sut = createTrialManager('foo');

        worker.onmessage({
            data: {
                action: 'status',
                type: 'error',
                message: 'barbaz',
            }
        })
        expect(worker.postMessage).toHaveBeenCalledTimes(1)
        expect(sut.message).toStrictEqual('barbaz')
    })
})
