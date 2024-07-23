import {PhpCgiWorker} from "./PhpCgiWorker.mjs";

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

export class DrupalCgiWorker extends PhpCgiWorker {
    // @todo `docroot` doesn't really work, requires vHosts.
    constructor({docroot, prefix, types = {}, ...args}) {
        super({
            onRequest,
            notFound,
            sharedLibs,
            docroot,
            prefix,
            types: {
                jpeg: "image/jpeg",
                jpg: "image/jpeg",
                gif: "image/gif",
                png: "image/png",
                svg: "image/svg+xml",
                ...types
            },
            ...args,
        });
    }
}

export function registerWorker(worker, prefix, docroot, vHosts = []) {
    const php = new DrupalCgiWorker({ prefix, docroot, vHosts })
    worker.addEventListener('install',  event => php.handleInstallEvent(event));
    worker.addEventListener('activate', event => php.handleActivateEvent(event));
    worker.addEventListener('fetch',    event => php.handleFetchEvent(event));
    worker.addEventListener('message',  event => php.handleMessageEvent(event));
    return php
}
