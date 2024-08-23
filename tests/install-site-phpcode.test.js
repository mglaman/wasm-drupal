import {describe, it, expect, afterEach, beforeEach} from 'vitest'
import fs from "node:fs";
import {
    createPhp,
    runPhpCode,
    assertOutput,
    rootPath,
    setupFixturePaths,
    cleanupFixturePaths,
    writeFlavorTxt,
    copyArtifactFixture,
    createCgiPhp,
    copyExistingBuildFixture, writeInstallParams
} from './utils'

describe('install-site.phpcode', () => {
    beforeEach(setupFixturePaths)
    afterEach(cleanupFixturePaths)

    it('installs the site from artifact', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath, 'drupal')
        writeInstallParams(configFixturePath, {
            langcode: 'en',
            skip: false,
            siteName: 'test',
            profile: 'standard',
            recipes: [],
        })
        copyArtifactFixture(persistFixturePath, 'drupal-core.zip')

        const [stdOut, stdErr, php] = createPhp({ configFixturePath, persistFixturePath })

        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Unpacking files 100%","type":"unarchive"}')
        assertOutput(stdErr, '')

        expect(fs.existsSync(`${persistFixturePath}/drupal`)).toBe(true)
        stdOut.length = 0;

        await runPhpCode(php, rootPath + '/public/assets/install-site.phpcode')

        expect(stdOut.shift().trim()).toStrictEqual('{"message":"Beginning install tasks","type":"install"}')
        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Performing install task (12 \\/ 12)","type":"install"}')
        assertOutput(stdErr, '')

        const [cgiOut, cgiErr, phpCgi] = createCgiPhp({ configFixturePath, persistFixturePath });
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
    })
    it('installs from existing source', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath)
        writeInstallParams(configFixturePath, {
            langcode: 'en',
            skip: false,
            siteName: 'test',
            profile: 'standard',
            recipes: [],
        })
        copyExistingBuildFixture(persistFixturePath, 'drupal-core')

        const [stdOut, stdErr, php] = createPhp({ configFixturePath, persistFixturePath })
        await runPhpCode(php, rootPath + '/public/assets/install-site.phpcode')
        expect(stdOut.shift().trim()).toStrictEqual('{"message":"Beginning install tasks","type":"install"}')
        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Performing install task (12 \\/ 12)","type":"install"}')
        assertOutput(stdErr, '')

        const [cgiOut, cgiErr, phpCgi] = createCgiPhp({ configFixturePath, persistFixturePath });
        await phpCgi.request({
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
    })
}, {
    timeout: 90000
})
