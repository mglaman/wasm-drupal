import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest'
import { PhpNode } from 'php-wasm/PhpNode.mjs';
import { PhpBase } from 'php-wasm/PhpBase.mjs';
import PhpBinary from 'php-wasm/php-node.mjs';
import fs from "node:fs";

describe('init.phpcode', () => {
    it('errors if artifact not found', async () => {
        const php = new PhpBase(PhpBinary, {
            persist: {
                mountPath: '/persist',
                localPath: process.cwd() + '/tests/fixtures/'
            },
            sharedLibs: [
                // await import('php-wasm-zlib'),
                // await import('php-wasm-libzip'),
                `${process.cwd()}/node_modules/php-wasm-libzip/php${PhpNode.phpVersion}-zip.so`,
                `${process.cwd()}/node_modules/php-wasm-libzip/libzip.so`,
                `${process.cwd()}/node_modules/php-wasm-zlib/php${PhpNode.phpVersion}-zlib.so`,
                `${process.cwd()}/node_modules/php-wasm-zlib/zlib.so`,
            ]
        });
        let stdOut = '', stdErr = '';

        php.addEventListener('output', (event) => event.detail.forEach(line => void (stdOut += line)));
        php.addEventListener('error',  (event) => event.detail.forEach(line => void (stdErr += line)));

        const initPhpCode = fs.readFileSync(process.cwd() + '/public/assets/init.phpcode').toString()
        await php.binary;

        const initPhpExitCode = await php.run(initPhpCode);
        console.log(initPhpExitCode);
        expect(stdOut).toStrictEqual('foo')
        expect(stdErr).toStrictEqual('foo')
    })
})
