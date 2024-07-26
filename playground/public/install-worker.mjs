import { PhpWorker } from './PhpWorker.mjs'

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

onmessage = async ({data, source}) => {
    const { action, params } = data;

    console.log('booting PhpWorker')
    const php = new PhpWorker({ sharedLibs, persist: [{ mountPath: '/persist' }, { mountPath: '/config' }] })
    php.addEventListener('output', event => {
        event.detail.forEach(detail => {
            const data = JSON.parse(detail.trim());
            postMessage({
                action: `status`,
                params,
                ...data
            })
        })
    });
    php.addEventListener('error', event => console.log(event.detail));

    if (action === 'start') {
        const { flavor, artifact } = params;

        const checkWww = await php.analyzePath(`/persist/${flavor}`)
        if (checkWww.exists) {
            postMessage({
                action: `finished`,
                params,
                message: 'Session exists'
            })
        }

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
        const downloader = fetch(`/assets/${artifact}`);
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
        const initPhpCode = fetch('/assets/init.php');
        await php.binary;

        console.log('running init code')
        const initPhpExitCode = await php.run(await (await initPhpCode).text());
        console.log(initPhpExitCode)

        postMessage({
            action: 'status',
            params,
            message: 'Installing site'
        })
        console.log('Installing site')
        const installSiteCode = await (await fetch('/assets/install-site.php')).text();
        console.log('Executing install site code...')
        const installSiteExitCode = await php.run(installSiteCode);
        console.log(installSiteExitCode)

        postMessage({
            action: 'status',
            params,
            message: 'Removing artifact archive'
        })
        console.log('Removing archive');
        await php.unlink('/config/flavor.txt')
        await php.unlink('/persist/artifact.zip')

        postMessage({
            action: `finished`,
            params,
            message: 'Finishing'
        })
    }
    else if (action === 'stop') {
        self.close()
    }
}
