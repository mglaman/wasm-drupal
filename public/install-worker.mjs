import { PhpWorker } from './PhpWorker.mjs'
import { getBroadcastChannel } from "./utils.mjs";

const sharedLibs = [
    `php${PhpWorker.phpVersion}-zip.so`,
    `php${PhpWorker.phpVersion}-zlib.so`,
    `php${PhpWorker.phpVersion}-iconv.so`,
    `php${PhpWorker.phpVersion}-gd.so`,
    `php${PhpWorker.phpVersion}-dom.so`,
    `php${PhpWorker.phpVersion}-mbstring.so`,
    `php${PhpWorker.phpVersion}-sqlite.so`,
    `php${PhpWorker.phpVersion}-pdo-sqlite.so`,
    `php${PhpWorker.phpVersion}-xml.so`,
    `php${PhpWorker.phpVersion}-simplexml.so`,
];

self.onmessage = async ({data }) => {
    const { action, params } = data;

    console.log('booting PhpWorker')
    const php = new PhpWorker({
        sharedLibs,
        persist: [{ mountPath: '/persist' }, { mountPath: '/config' }],
        ini: `
        date.timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}
        `
    })
    php.addEventListener('output', event => {
        event.detail.forEach(detail => {
            try {
                const data = JSON.parse(detail.trim());
                postMessage({
                    action: `status`,
                    params,
                    ...data
                })
            } catch (e) {
                console.log(detail)
            }
        })
    });
    php.addEventListener('error', event => console.log(event.detail));

    if (action === 'start') {
        await navigator.locks.request('start', async () => {
            console.log('Starting')
            postMessage({
                action: `started`,
                params,
                message: 'Starting'
            })

            const { flavor, artifact } = params;

            getBroadcastChannel().postMessage({
                action: 'set_vhost',
                params
            })

            const checkWww = await php.analyzePath(`/persist/${flavor}`)
            if (checkWww.exists) {
                postMessage({
                    action: `finished`,
                    params,
                    message: 'Session exists'
                })
            } else {
                const checkArchive = await php.analyzePath('/persist/artifact.zip');
                if (checkArchive.exists) {
                    postMessage({
                        action: 'status',
                        params,
                        message: 'Removing existing archive'
                    })
                    console.log('Removing archive');
                    await php.unlink('/persist/artifact.zip')
                }
                postMessage({
                    action: 'status',
                    params,
                    message: 'Downloading artifact'
                })
                console.log('Downloading artifact')
                const downloader = fetch(artifact);
                const download = await downloader;
                const zipContents = await download.arrayBuffer();

                postMessage({
                    action: 'status',
                    params,
                    message: 'Saving artifact'
                })
                console.log('Writing archive contents')
                await php.writeFile('/config/flavor.txt', flavor)
                await php.writeFile('/persist/artifact.zip', new Uint8Array(zipContents))

                postMessage({
                    action: 'status',
                    params,
                    message: 'Extracting artifact'
                })
                console.log('Extracting archive...')
                console.log('fetching init code')
                const initPhpCode = fetch('/assets/init.phpcode');
                await php.binary;

                console.log('running init code')
                const initPhpExitCode = await php.run(await (await initPhpCode).text());
                console.log(initPhpExitCode)

                postMessage({
                    action: 'status',
                    params,
                    message: 'Installing site'
                })

                console.log('Writing install parameters');
                await php.writeFile(`/config/${flavor}-install-params.json`, JSON.stringify({
                    langcode: 'en',
                    ...params.installParameters
                }))

                console.log('Installing site')
                const installSiteCode = await (await fetch('/assets/install-site.phpcode')).text();
                console.log('Executing install site code...')
                try {
                    const installSiteExitCode = await php.run(installSiteCode);
                    console.log(installSiteExitCode)
                } catch(e) {
                    let message = `An error occured. ${e.name}: ${e.message}`
                    if (e.name === 'RangeError') {
                        message += ' See https://github.com/mglaman/wasm-drupal/issues/28';
                    }

                    postMessage({
                        action: 'status',
                        type: 'error',
                        params,
                        message
                    })
                    return;
                }


                postMessage({
                    action: 'status',
                    params,
                    message: 'Removing artifact archive'
                })
                console.log('Removing archive');
                await php.unlink('/config/flavor.txt')
                await php.unlink(`/config/${flavor}-install-params.json`)
                await php.unlink('/persist/artifact.zip')

                postMessage({
                    action: `finished`,
                    params,
                    message: 'Finishing'
                })
            }
        })
    }
    else if (action === 'remove') {
        const { flavor } = params;
        await self.navigator.locks.request('remove', () => {
            const openDb = indexedDB.open("/persist", 21);
            openDb.onsuccess = () => {
                const db = openDb.result;
                const transaction = db.transaction(["FILE_DATA"], "readwrite");
                const objectStore = transaction.objectStore("FILE_DATA");
                // IDBKeyRange.bound trick found at https://stackoverflow.com/a/76714057/1949744
                const objectStoreRequest = objectStore.delete(IDBKeyRange.bound(`/persist/${flavor}`, `/persist/${flavor}/\uffff`));

                objectStoreRequest.onsuccess = () => {
                    db.close();
                    postMessage({
                        action: 'reload'
                    })
                };
            };
        })
    }
    else if (action === 'stop') {
        self.close()
    }
    else if (action === 'export') {
        const { flavor } = params;
        await self.navigator.locks.request('export', async () => {
            postMessage({
                action: `started`,
                params,
                message: 'Preparing to export'
            })
            await php.writeFile('/config/flavor.txt', flavor)

            console.log('fetching export code')
            const exportPhpCode = fetch('/assets/export.phpcode');
            await php.binary;

            console.log('running export code')
            const exportPhpExitCode = await php.run(await (await exportPhpCode).text())
            console.log(exportPhpExitCode)

            await php.unlink('/config/flavor.txt')
            postMessage({
                action: `status`,
                params,
                message: 'Preparing download'
            })

            const exportContents = await php.readFile('/persist/export.zip')
            const blob = new Blob([exportContents], { type: 'application/zip' })

            postMessage({
                action: `export_finished`,
                params: {
                    ...params,
                    export: blob
                },
                message: 'Download ready'
            })
            setTimeout(() => php.unlink('/persist/export.zip'), 0)

        })
    }
    else if (action === 'check_existing') {
        console.log('Checking for existing session')
        const { flavor } = params;
        const check = await php.analyzePath(`/persist/${flavor}`)
        postMessage({
            action: `check_existing_finished`,
            params: {
                exists: check.exists,
                ...params
            }
        })
    }
}
