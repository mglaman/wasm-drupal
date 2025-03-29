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
                ...data
            })
        } catch (e) {
            console.log(detail)
        }
    })
});
php.addEventListener('error', event => console.log(event.detail));

self.onmessage = async ({data }) => {
    const { action, params } = data;

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
                    message: 'Site already exists'
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
                    message: 'Downloading archive'
                })
                const downloader = fetch(artifact);

                const download = await downloader.then(response => {
                  const contentEncoding = response.headers.get('content-encoding');
                  const contentLength = response.headers.get(contentEncoding ? 'x-file-size' : 'content-length');
                  const total = parseInt(contentLength, 10);
                  let loaded = 0;

                  return new Response(
                    new ReadableStream({
                      start(controller) {
                        if (typeof response.body.getReader !== 'function') {
                            // @todo only here to make test pass, mock in test.
                          return;
                        }
                        const reader = response.body.getReader();
                        read();
                        function read() {
                          reader.read().then(({done, value}) => {
                            if (done) {
                              controller.close();
                              return;
                            }
                            loaded += value.byteLength;
                            postMessage({
                              action: 'status',
                              params,
                              message: `Downloading archive ${Math.round(loaded/total*100)+'%'}`
                          })
                            controller.enqueue(value);
                            read();
                          }).catch(error => {
                            console.error(error);
                            controller.error(error)
                          })
                        }
                      }
                    })
                  );
                })


                const zipContents = await download.arrayBuffer();

                postMessage({
                    action: 'status',
                    params,
                    message: 'Saving archive'
                })

                await php.writeFile('/config/flavor.txt', flavor)
                await php.writeFile('/persist/artifact.zip', new Uint8Array(zipContents))

                postMessage({
                    action: 'status',
                    params,
                    message: 'Extracting archive'
                })
                const initPhpCode = fetch('/assets/init.phpcode');
                await php.binary;

                const initPhpExitCode = await php.run(await (await initPhpCode).text());
                console.log(initPhpExitCode)

                const installType = params.installParameters.installType;
                if (installType !== 'interactive') {
                    postMessage({
                        action: 'status',
                        params,
                        message: 'Preparing site',
                    });

                    console.log('Writing install parameters');
                    await php.writeFile(`/config/${flavor}-install-params.json`, JSON.stringify({
                        langcode: 'en',
                        host: (new URL(globalThis.location || 'http://localhost')).host,
                        ...params.installParameters,
                    }));

                    if (installType === 'automated') {
                        console.log('Installing site');

                        await php.run(`<?php putenv('DRUPAL_CMS_TRIAL=1');`);

                        const installSiteCode = await (await fetch('/assets/install-site.phpcode')).text();
                        console.log('Executing install site code...');
                        try {
                            const installSiteExitCode = await php.run(installSiteCode);
                            console.log(installSiteExitCode);
                        } catch (e) {
                            let message = `An error occured. ${e.name}: ${e.message}`;
                            if (e.name === 'RangeError') {
                                message += ' See https://github.com/mglaman/wasm-drupal/issues/28';
                            }

                            postMessage({
                                action: 'status',
                                type: 'error',
                                params,
                                message,
                            });
                            return;
                        }
                    }

                    postMessage({
                        action: 'status',
                        params,
                        message: 'Logging you in',
                    });
                    const autoLoginCode = await (await fetch('/assets/login-admin.phpcode')).text();
                    await php.run(autoLoginCode);
                    await php.unlink(`/config/${flavor}-install-params.json`);
                }

                postMessage({
                    action: 'status',
                    params,
                    message: 'Cleaning up files'
                })
                await php.unlink('/config/flavor.txt')
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
