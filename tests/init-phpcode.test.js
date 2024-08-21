import {describe, it, expect, afterEach} from 'vitest'
import { PhpNode } from 'php-wasm/PhpNode.mjs';
import { PhpBase } from 'php-wasm/PhpBase.mjs';
import PhpBinary from 'php-wasm/php-node.mjs';
import fs from "node:fs";
import { dirname } from 'node:path'

const rootPath = dirname(import.meta.dirname);
const configFixturePath = rootPath + '/tests/fixtures/config'

function createPhp() {
    return new PhpBase(PhpBinary, {
        persist: [
            {mountPath: '/persist', localPath: rootPath + '/tests/fixtures/persist'},
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
        ]
    });
}

describe('init.phpcode', () => {
    afterEach(() => {
        if (fs.existsSync(`${configFixturePath}/flavor.txt`)) {
            fs.unlinkSync(`${configFixturePath}/flavor.txt`)
        }
    })
    it('errors if artifact not found', async () => {
        fs.writeFileSync(`${configFixturePath}/flavor.txt`, 'drupal')

        const php = createPhp()
        let stdOut = '', stdErr = '';

        php.addEventListener('output', (event) => event.detail.forEach(line => void (stdOut += line)));
        php.addEventListener('error',  (event) => event.detail.forEach(line => void (stdErr += line)));

        const initPhpCode = fs.readFileSync(rootPath + '/public/assets/init.phpcode').toString()
        await php.binary;
        await php.run(initPhpCode);

        expect(stdOut.trim()).toStrictEqual('{"message":"artifact could not be found","type":"error"}')
        expect(stdErr.trim()).toStrictEqual('')
    })
})
