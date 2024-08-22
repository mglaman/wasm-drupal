import {describe, it, expect, afterEach} from 'vitest'
import { PhpNode } from 'php-wasm/PhpNode.mjs';
import { PhpBase } from 'php-wasm/PhpBase.mjs';
import PhpBinary from 'php-wasm/php-node.mjs';
import fs from "node:fs";
import { dirname } from 'node:path'

const rootPath = dirname(import.meta.dirname);
const configFixturePath = rootPath + '/tests/fixtures/config'
const persistFixturePath = rootPath + '/tests/fixtures/persist'

function createPhp() {
    const php = new PhpBase(PhpBinary, {
        persist: [
            {mountPath: '/persist', localPath: persistFixturePath},
            {mountPath: '/config', localPath: configFixturePath},
        ],
        sharedLibs: [
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
    });
    const stdOut = [], stdErr = [];
    php.addEventListener('output', (event) => event.detail.forEach(line => void (stdOut.push(line))));
    php.addEventListener('error',  (event) => event.detail.forEach(line => void (stdErr.push(line))));
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

describe('install-site.phpcode', () => {
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
    })
});
