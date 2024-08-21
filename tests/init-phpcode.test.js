import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest'
import { PhpNode } from 'php-wasm/PhpNode.mjs';
import { PhpBase } from 'php-wasm/PhpBase.mjs';
import PhpBinary from 'php-wasm/php-node.mjs';
import fs from "node:fs";

function createPhp() {
    return new PhpBase(PhpBinary, {
        persist: [
            {mountPath: '/persist', localPath: process.cwd() + '/fixtures/persist'},
            {mountPath: '/config', localPath: process.cwd() + '/fixtures/config'},
        ],
        sharedLibs: [
            {
                name: `php${PhpNode.phpVersion}-zip.so`,
                url: `${process.cwd()}/node_modules/php-wasm-libzip/php${PhpNode.phpVersion}-zip.so`,
                ini: true
            },
            {
                name: `libzip.so`,
                url: `${process.cwd()}/node_modules/php-wasm-libzip/libzip.so`,
                ini: false
            },
            {
                name: `php${PhpNode.phpVersion}-zlib.so`,
                url: `${process.cwd()}/node_modules/php-wasm-zlib/php${PhpNode.phpVersion}-zlib.so`,
                ini: true
            },
            {
                name: `libz.so`,
                url: `${process.cwd()}/node_modules/php-wasm-zlib/libz.so`,
                ini: false
            },
        ]
    });
}

describe('init.phpcode', () => {
    it('errors if artifact not found', async () => {
        const php = createPhp()
        let stdOut = '', stdErr = '';

        php.addEventListener('output', (event) => event.detail.forEach(line => void (stdOut += line)));
        php.addEventListener('error',  (event) => event.detail.forEach(line => void (stdErr += line)));

        const initPhpCode = fs.readFileSync(process.cwd() + '/public/assets/init.phpcode').toString()
        await php.binary;

        const initPhpExitCode = await php.run(initPhpCode);
        console.log(initPhpExitCode);
        expect(stdOut.trim()).toStrictEqual('{"message":"artifact could not be found","type":"error"}')
        expect(stdErr.trim()).toStrictEqual('')
    })
})
