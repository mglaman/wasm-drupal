import {describe, it, expect, afterEach} from 'vitest'
import { PhpNode } from 'php-wasm/PhpNode.mjs';
import { PhpBase } from 'php-wasm/PhpBase.mjs';
import PhpBinary from 'php-wasm/php-node.mjs';
import fs from "node:fs";
import { dirname } from 'node:path'
import {PhpCgiNode} from "php-cgi-wasm/PhpCgiNode.mjs";

const rootPath = dirname(import.meta.dirname);
const configFixturePath = rootPath + '/tests/fixtures/config'
const persistFixturePath = rootPath + '/tests/fixtures/persist'

const persistPaths = [
    {mountPath: '/persist', localPath: persistFixturePath},
    {mountPath: '/config', localPath: configFixturePath},
]
const sharedLibs = [
    {
        name: `php${PhpNode.phpVersion}-zip.so`,
        url: `${rootPath}/node_modules/php-wasm-libzip/php${PhpNode.phpVersion}-zip.so`,
        ini: true
    },
    {
        name: `libzip.so`,
        url: `${rootPath}/node_modules/php-wasm-libzip/libzip.so`,
        ini: false
    },
    {
        name: `php${PhpNode.phpVersion}-zlib.so`,
        url: `${rootPath}/node_modules/php-wasm-zlib/php${PhpNode.phpVersion}-zlib.so`,
        ini: true
    },
    {
        name: `libz.so`,
        url: `${rootPath}/node_modules/php-wasm-zlib/libz.so`,
        ini: false
    },
    {
        name: `php${PhpNode.phpVersion}-dom.so`,
        url: `${rootPath}/node_modules/php-wasm-dom/php${PhpNode.phpVersion}-dom.so`,
        ini: true
    },
    {
        name: `php${PhpNode.phpVersion}-simplexml.so`,
        url: `${rootPath}/node_modules/php-wasm-simplexml/php${PhpNode.phpVersion}-simplexml.so`,
        ini: true
    },
    {
        name: `php${PhpNode.phpVersion}-xml.so`,
        url: `${rootPath}/node_modules/php-wasm-xml/php${PhpNode.phpVersion}-xml.so`,
        ini: true
    },
    {
        name: `php${PhpNode.phpVersion}-gd.so`,
        url: `${rootPath}/node_modules/php-wasm-gd/php${PhpNode.phpVersion}-gd.so`,
        ini: true
    },
    {
        name: `libfreetype.so`,
        url: `${rootPath}/node_modules/php-wasm-gd/libfreetype.so`,
        ini: false
    },
    {
        name: `libjpeg.so`,
        url: `${rootPath}/node_modules/php-wasm-gd/libjpeg.so`,
        ini: false
    },
    {
        name: `libpng.so`,
        url: `${rootPath}/node_modules/php-wasm-gd/libpng.so`,
        ini: false
    },
    {
        name: `libwebp.so`,
        url: `${rootPath}/node_modules/php-wasm-gd/libwebp.so`,
        ini: false
    },
    {
        name: `php${PhpNode.phpVersion}-pdo-sqlite.so`,
        url: `${rootPath}/node_modules/php-wasm-sqlite/php${PhpNode.phpVersion}-pdo-sqlite.so`,
        ini: true
    },
    {
        name: `php${PhpNode.phpVersion}-sqlite.so`,
        url: `${rootPath}/node_modules/php-wasm-sqlite/php${PhpNode.phpVersion}-sqlite.so`,
        ini: true
    },
    {
        name: `libsqlite3.so`,
        url: `${rootPath}/node_modules/php-wasm-sqlite/libsqlite3.so`,
        ini: false
    },
    {
        name: `php${PhpNode.phpVersion}-iconv.so`,
        url: `${rootPath}/node_modules/php-wasm-iconv/php${PhpNode.phpVersion}-iconv.so`,
        ini: true
    },
    {
        name: `libiconv.so`,
        url: `${rootPath}/node_modules/php-wasm-iconv/libiconv.so`,
        ini: false
    },
]

// works around PhpNode and PhpCgiNode locate file issues.
const locateFile = () => undefined;

function createPhp() {
    const php = new PhpBase(PhpBinary, {
        persist: persistPaths,
        locateFile,
        sharedLibs
    });
    const stdOut = [], stdErr = [];
    php.addEventListener('output', (event) => event.detail.forEach(line => void (stdOut.push(line))));
    php.addEventListener('error',  (event) => event.detail.forEach(line => void (stdErr.push(line))));
    return [stdOut, stdErr, php]
}

function createCgiPhp() {
    const stdOut = [], stdErr = [];

    const php = new PhpCgiNode({
        persist: persistPaths,
        locateFile,
        sharedLibs,
        env: {
            HTTP_USER_AGENT: 'node'
        },
        docroot: '/persist/drupal/web',
        vHosts: [
            {
                pathPrefix: '/cgi/drupal',
                directory: '/persist/drupal/web',
                entrypoint: 'index.php',
            }
        ],
        onRequest(request, response) {
            const url = new URL(request.url);
            stdOut.push(`${request.method} ${url.pathname} ${response.status}`)
        },
        notFound(request) {
            const url = new URL(request.url);
            stdErr.push(`${request.method} ${url.pathname} 404`)
            return new Response(`<body><h1>404</h1>${request.url} not found</body>`, {
                status: 404,
                headers: {"Content-Type": "text/html"},
            });
        }
    })

    return [stdOut, stdErr, php]
}

async function runPhpCode(php, path) {
    const initPhpCode = fs.readFileSync(path).toString()
    await php.binary;
    await php.run(initPhpCode);
}

function assertOutput(std, expected) {
    expect(std.join('').trim()).toStrictEqual(expected)
}

describe('phpcode', () => {
    afterEach(() => {
        if (fs.existsSync(`${configFixturePath}/flavor.txt`)) {
            const flavorValue = fs.readFileSync(`${configFixturePath}/flavor.txt`).toString()
            if (fs.existsSync(`${persistFixturePath}/${flavorValue}`)) {
                fs.chmodSync(`${persistFixturePath}/${flavorValue}/web/sites/default`, 0o777)
                fs.rmSync(`${persistFixturePath}/${flavorValue}`, { recursive: true, force: true })
            }
            fs.unlinkSync(`${configFixturePath}/flavor.txt`)
        }
        if (fs.existsSync(`${persistFixturePath}/artifact.zip`)) {
            fs.unlinkSync(`${persistFixturePath}/artifact.zip`)
        }
    })

    it('errors if artifact not found', async () => {
        fs.writeFileSync(`${configFixturePath}/flavor.txt`, 'drupal')

        const [stdOut, stdErr, php] = createPhp()
        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        assertOutput(stdOut, '{"message":"artifact could not be found","type":"error"}')
        assertOutput(stdErr, '')
    })
    it('errors if artifact cannot be opened properly', async () => {
        fs.writeFileSync(`${configFixturePath}/flavor.txt`, 'drupal')
        fs.writeFileSync(`${persistFixturePath}/artifact.zip`, 'definitely not a zip file')

        const [stdOut, stdErr, php] = createPhp()
        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        assertOutput(stdOut, '{"message":"could not open artifact archive","type":"error"}')
        assertOutput(stdErr, '')
    })
    it('extracts an archive correctly', async () => {
        fs.writeFileSync(`${configFixturePath}/flavor.txt`, 'drupal')
        fs.copyFileSync(
            `${persistFixturePath}/drupal-core.zip`,
            `${persistFixturePath}/artifact.zip`
        )

        const [stdOut, stdErr, php] = createPhp()
        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Unpacking files 100%","type":"unarchive"}')
        assertOutput(stdErr, '')

        expect(fs.existsSync(`${persistFixturePath}/drupal`)).toBe(true)
    })

    it('installs the site', async () => {
        fs.writeFileSync(`${configFixturePath}/flavor.txt`, 'drupal')
        fs.writeFileSync(`${configFixturePath}/drupal-install-params.json`, JSON.stringify({
            langcode: 'en',
            skip: false,
            siteName: 'test',
            profile: 'standard',
            recipes: [],
        }))
        fs.copyFileSync(
            `${persistFixturePath}/drupal-core.zip`,
            `${persistFixturePath}/artifact.zip`
        )

        const [stdOut, stdErr, php] = createPhp()

        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Unpacking files 100%","type":"unarchive"}')
        assertOutput(stdErr, '')

        expect(fs.existsSync(`${persistFixturePath}/drupal`)).toBe(true)
        stdOut.length = 0;

        await runPhpCode(php, rootPath + '/public/assets/install-site.phpcode')

        expect(stdOut.shift().trim()).toStrictEqual('{"message":"Beginning install tasks","type":"install"}')
        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Performing install task (12 \\/ 12)","type":"install"}')
        assertOutput(stdErr, '')

        const [cgiOut, cgiErr, phpCgi] = createCgiPhp();
        const response = await phpCgi.request({
            connection: {
                encrypted: false,
            },
            method: 'GET',
            url: '/cgi/drupal',
            headers: {
                host: 'localhost'
            }
        })
        assertOutput(cgiOut, 'GET /cgi/drupal 200')
        assertOutput(cgiErr, '')

        expect(response.headers.get('x-generator')).toMatch(/Drupal \d+ \(https:\/\/www\.drupal\.org\)/)
        const text = await response.text()
        // Assert custom site title.
        expect(text).toContain('<title>Welcome! | test</title>')
        // Verify CSS/JS aggregation turned off
        expect(text).toContain('cgi/drupal/core/themes/olivero/css')
        expect(text).toContain('cgi/drupal/core/themes/olivero/js')

        expect(text).toContain('<h2>Congratulations and welcome to the Drupal community.</h2>')
    }, {
        timeout: 90000,
    })
})
