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
        ]
    });
    const stdOut = [], stdErr = [];
    php.addEventListener('output', (event) => event.detail.forEach(line => void (stdOut.push(line))));
    php.addEventListener('error',  (event) => event.detail.forEach(line => void (stdErr.push(line))));
    return [stdOut, stdErr, php]
}

async function runInitPhpCode(php) {
    const initPhpCode = fs.readFileSync(rootPath + '/public/assets/init.phpcode').toString()
    await php.binary;
    await php.run(initPhpCode);
}

function assertOutput(std, expected) {
    expect(std.join('').trim()).toStrictEqual(expected)
}

describe('init.phpcode', () => {
    afterEach(() => {
        if (fs.existsSync(`${configFixturePath}/flavor.txt`)) {
            const flavorValue = fs.readFileSync(`${configFixturePath}/flavor.txt`).toString()
            if (fs.existsSync(`${persistFixturePath}/${flavorValue}`)) {
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
        await runInitPhpCode(php)

        assertOutput(stdOut, '{"message":"artifact could not be found","type":"error"}')
        assertOutput(stdErr, '')
    })
    it('errors if artifact cannot be opened properly', async () => {
        fs.writeFileSync(`${configFixturePath}/flavor.txt`, 'drupal')
        fs.writeFileSync(`${persistFixturePath}/artifact.zip`, 'definitely not a zip file')

        const [stdOut, stdErr, php] = createPhp()
        await runInitPhpCode(php)

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
        await runInitPhpCode(php)

        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Unpacking files 100%","type":"unarchive"}')
        assertOutput(stdErr, '')

        expect(fs.existsSync(`${persistFixturePath}/drupal`)).toBe(true)
    })
})
