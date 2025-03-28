import {dirname} from "node:path";
import {PhpNode} from "php-wasm/PhpNode.mjs";
import {PhpBase} from "php-wasm/PhpBase.mjs";
import PhpBinary from "php-wasm/php-node.mjs";
import {PhpCgiNode} from "php-cgi-wasm/PhpCgiNode.mjs";
import fs from "node:fs";
import {expect} from "vitest";
import crypto from "node:crypto";
import {Window} from "happy-dom";
import querystring from "node:querystring";

export const rootPath = dirname(import.meta.dirname);
export const rootFixturePath = rootPath + '/tests/fixtures'

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
    {
        name: `php${PhpNode.phpVersion}-mbstring.so`,
        url: `${rootPath}/node_modules/php-wasm-mbstring/php${PhpNode.phpVersion}-mbstring.so`,
        ini: true
    },
    {
        name: `libonig.so`,
        url: `${rootPath}/node_modules/php-wasm-mbstring/libonig.so`,
        ini: false
    },
]

// works around PhpNode and PhpCgiNode locate file issues.
const locateFile = () => undefined;

export function createPhp({ configFixturePath, persistFixturePath }) {
    const php = new PhpBase(PhpBinary, {
        persist: [
            {mountPath: '/persist', localPath: persistFixturePath},
            {mountPath: '/config', localPath: configFixturePath},
        ],
        locateFile,
        sharedLibs
    });
    const stdOut = [], stdErr = [];
    php.addEventListener('output', (event) => event.detail.forEach(line => void (stdOut.push(line))));
    php.addEventListener('error',  (event) => event.detail.forEach(line => void (stdErr.push(line))));
    return [stdOut, stdErr, php]
}

export function createCgiPhp({ configFixturePath, persistFixturePath }) {
    const stdOut = [], stdErr = [];

    const php = new PhpCgiNode({
        persist: [
            {mountPath: '/persist', localPath: persistFixturePath},
            {mountPath: '/config', localPath: configFixturePath},
        ],
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
        /**
         *
         * @param {Request} request
         * @param {Response} response
         */
        onRequest(request, response) {
            const url = new URL(request.url);
            stdOut.push(`${request.method} ${url.pathname}${url.search} ${response.status}`)
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
    php.cookies.set('big_pipe_nojs', '1')
    return [stdOut, stdErr, php]
}

export async function runPhpCode(php, path) {
    const initPhpCode = fs.readFileSync(path).toString()
    await php.binary;
    await php.run(initPhpCode);
}

export function assertOutput(std, expected) {
    expect(std.join('').trim()).toStrictEqual(expected)
}

export function setupFixturePaths(context) {
    const testRoot = rootFixturePath + '/' + crypto.randomBytes(5).toString('hex');
    context.configFixturePath = testRoot + '/config'
    context.persistFixturePath =  testRoot + '/persist'
    context.testRoot = testRoot
    fs.mkdirSync(context.configFixturePath, { recursive: true })
    fs.mkdirSync(context.persistFixturePath, { recursive: true })
}

export function cleanupFixturePaths({ configFixturePath, persistFixturePath, testRoot }) {
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
    fs.rmSync(testRoot, { recursive: true, force: true })
}

export function writeFlavorTxt(configFixturePath) {
    fs.writeFileSync(`${configFixturePath}/flavor.txt`, 'drupal')
}

export function writeInstallParams(configFixturePath, params) {
    fs.writeFileSync(`${configFixturePath}/drupal-install-params.json`, JSON.stringify({
        langcode: 'en',
        skip: false,
        siteName: 'test',
        profile: 'standard',
        recipes: [],
        ...params
    }))
}

export function copyArtifactFixture(persistFixturePath, name) {
    fs.copyFileSync(
        `${rootFixturePath}/${name}`,
        `${persistFixturePath}/artifact.zip`
    )
}
export function copyExistingBuildFixture(persistFixturePath, name) {
    fs.cpSync(`${rootFixturePath}/${name}`, `${persistFixturePath}/drupal`, {
        recursive: true
    })
}

export async function doRequest(phpCgi, url, method = 'GET', body = null) {
    const request = {
        connection: {
            encrypted: false,
        },
        method,
        url,
        headers: {
            host: globalThis.location.host
        },
    };
    if (body) {
        const buffer = new TextEncoder().encode(querystring.stringify(body));
        request.body = new ReadableStream({
            start(controller) {
                controller.enqueue(buffer);
                controller.close();
            }
        })
    }
    const response = await phpCgi.request(request)
    const text = await response.text()
    const document = (new Window()).document
    document.write(text)
    return [response, text, document]
}

export async function checkForMetaRefresh(phpCgi, response, text, document) {
    if (response.status === 200) {
        const meta = document.querySelector('meta[http-equiv="Refresh"]');
        if (meta) {
            const match = meta.content.match(/\d+;\s*URL=\'?(?<url>[^\']*)/i)
            if (match) {
                const url = match.groups.url
                const [newRes, newText, newDocument] = await doRequest(phpCgi, url)
                return await checkForMetaRefresh(phpCgi, newRes, newText, newDocument)
            }
        }
    }
    return [response, text, document]
}

/**
 * Verifies that the `sites/default` directory is writeable.
 *
 * @param {string} persistFixturePath
 */
export function assertSitesDefaultDirectoryPermissions(persistFixturePath) {
    const stat = fs.statSync(`${persistFixturePath}/drupal/web/sites/default`)
    expect(stat.mode & 0o777).toStrictEqual(0o755)

    const statSettings = fs.statSync(`${persistFixturePath}/drupal/web/sites/default/settings.php`)
    expect(statSettings.mode & 0o777).toStrictEqual(0o644)
  }

  /**
 * Asserts the location header of a response.
 *
 * @param {Response} response
 * @param {string} pathname
 * @param {string} search
 */
export function assertLocationHeader(response, pathname, search) {
    expect(response.headers.has('location')).toBeTruthy()
    let location;
    try {
      location = new URL(response.headers.get('location'), globalThis.location.toString())
    } catch (e) {
      console.error(e)
      expect(response.headers.get('location')).toStrictEqual(pathname + search)
    }
    expect(location.pathname).toStrictEqual(pathname)
    expect(location.search).toStrictEqual(search)
    return location
  }
