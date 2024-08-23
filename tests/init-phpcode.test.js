import {describe, it, expect, afterEach, beforeEach} from 'vitest'
import fs from "node:fs";
import {
    createPhp,
    runPhpCode,
    assertOutput,
    rootPath, setupFixturePaths, cleanupFixturePaths, writeFlavorTxt, copyArtifactFixture
} from './utils'

describe('init.phpcode', () => {
    beforeEach(setupFixturePaths)
    afterEach(cleanupFixturePaths)

    it('errors if artifact not found', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath)

        const [stdOut, stdErr, php] = createPhp({ configFixturePath, persistFixturePath })
        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        assertOutput(stdOut, '{"message":"artifact could not be found","type":"error"}')
        assertOutput(stdErr, '')
    })
    it('errors if artifact cannot be opened properly', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath)
        fs.writeFileSync(`${persistFixturePath}/artifact.zip`, 'definitely not a zip file')

        const [stdOut, stdErr, php] = createPhp({ configFixturePath, persistFixturePath })
        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        assertOutput(stdOut, '{"message":"could not open artifact archive","type":"error"}')
        assertOutput(stdErr, '')
    })
    it('extracts an archive correctly', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath)
        copyArtifactFixture(persistFixturePath, 'drupal-core.zip')

        const [stdOut, stdErr, php] = createPhp({ configFixturePath, persistFixturePath })
        await runPhpCode(php, rootPath + '/public/assets/init.phpcode')

        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Unpacking files 100%","type":"unarchive"}')
        assertOutput(stdErr, '')

        expect(fs.existsSync(`${persistFixturePath}/drupal`)).toBe(true)
    })
})
