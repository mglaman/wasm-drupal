import {getBroadcastChannel} from "./utils.mjs";
import CookieMap from "./cookie-map.mjs";

const cookies = new CookieMap;

const onRequest = (request, response) => {
    const url = new URL(request.url);
    const logLine =
        `[${new Date().toISOString()}]` +
        ` 127.0.0.1 - "${request.method}` +
        ` ${url.pathname}" - HTTP/1.1 ${response.status}`;
    console.log(logLine);
};
const notFound = (request) => {
    console.log(request)
    return new Response(`<body><h1>404</h1>${request.url} not found</body>`, {
        status: 404,
        headers: {"Content-Type": "text/html"},
    });
};

const sharedLibs = [
    `php\${PHP_VERSION}-zlib.so`,
    `php\${PHP_VERSION}-zip.so`,
    `php\${PHP_VERSION}-iconv.so`,
    `php\${PHP_VERSION}-gd.so`,
    `php\${PHP_VERSION}-dom.so`,
    `php\${PHP_VERSION}-mbstring.so`,
    `php\${PHP_VERSION}-sqlite.so`,
    `php\${PHP_VERSION}-pdo-sqlite.so`,
    `php\${PHP_VERSION}-xml.so`,
    `php\${PHP_VERSION}-simplexml.so`,
];

export default function setupCgiWorker(worker, PhpCgiWorker, prefix, docroot, types = {}, vHosts = [], env = {}) {
    const php = new PhpCgiWorker({
        onRequest,
        notFound,
        sharedLibs,
        prefix,
        docroot,
        vHosts,
        types: {
            jpeg: "image/jpeg",
            jpg: "image/jpeg",
            gif: "image/gif",
            png: "image/png",
            svg: "image/svg+xml",
            ...types
        },
        env: {
            HTTP_USER_AGENT: worker.navigator.userAgent,
            ...env
        },
        ini: `
        date.timezone=${Intl.DateTimeFormat().resolvedOptions().timeZone}
        `,
        cookies,
    })

    const channel = getBroadcastChannel()
    channel.addEventListener('message', async ({ data }) => {
        const { action, params } = data;
        if (action === 'refresh') {
            console.log('Refreshing CGI')
            php.refresh();
        }
        if (action === 'set_vhost') {
            const vHost = {
                pathPrefix: `/cgi/${params.flavor}`,
                directory: `/persist/${params.flavor}/web`,
                entrypoint: 'index.php',
            };
            const settings = await php.getSettings();
            const vHostExists = settings.vHosts.find(existing => existing.pathPrefix === vHost.pathPrefix);

            if (!vHostExists) {
                settings.vHosts.push(vHost)
                await php.setSettings(settings)
                await php.storeInit()
            }
        }
    })

    worker.addEventListener('install',  event => php.handleInstallEvent(event));
    worker.addEventListener('activate', event => php.handleActivateEvent(event));
    worker.addEventListener('activate', () => {
        channel.postMessage({
            action: 'service_worker_activated'
        })
    });
    worker.addEventListener('fetch',    event => php.handleFetchEvent(event));
    worker.addEventListener('message',  event => php.handleMessageEvent(event));

    return php
}
