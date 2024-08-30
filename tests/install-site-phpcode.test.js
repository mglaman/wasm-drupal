import {describe, it, expect, afterEach, beforeEach} from 'vitest'
import fs from "node:fs";
import {
    createPhp,
    runPhpCode,
    assertOutput,
    rootPath,
    rootFixturePath,
    setupFixturePaths,
    cleanupFixturePaths,
    writeFlavorTxt,
    copyArtifactFixture,
    createCgiPhp,
    copyExistingBuildFixture, writeInstallParams, doRequest, checkForMetaRefresh
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
            autoLogin: true,
            host: globalThis.location.host,
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
        stdOut.length = 0;

        await runPhpCode(php, rootPath + '/public/assets/login-admin.phpcode')
        const loginOutput = JSON.parse(stdOut.join('').trim());
        expect(loginOutput).toHaveProperty('type')
        expect(loginOutput.type).toStrictEqual('set_cookie')
        expect(loginOutput).toHaveProperty('params')
        expect(loginOutput.params).toHaveProperty('name')
        expect(loginOutput.params).toHaveProperty('id')
        assertOutput(stdErr, '')
        stdOut.length = 0;

        const stat = fs.statSync(`${persistFixturePath}/drupal/web/sites/default`)
        expect(stat.mode & 0o777).toStrictEqual(0o775)

        const statSettings = fs.statSync(`${persistFixturePath}/drupal/web/sites/default/settings.php`)
        expect(statSettings.mode & 0o777).toStrictEqual(0o664)

        const [cgiOut, cgiErr, phpCgi] = createCgiPhp({ configFixturePath, persistFixturePath });
        phpCgi.cookies.set(loginOutput.params.name, loginOutput.params.id)

        const response = await phpCgi.request({
            connection: {
                encrypted: false,
            },
            method: 'GET',
            url: '/cgi/drupal',
            headers: {
                host: globalThis.location.host
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

        expect(text).toContain('/cgi/drupal/user/logout')
    })
    it('installs from existing source', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath)
        writeInstallParams(configFixturePath, {
            langcode: 'en',
            skip: false,
            siteName: 'test',
            profile: 'standard',
            recipes: [],
            host: globalThis.location.host,
        })
        copyExistingBuildFixture(persistFixturePath, 'drupal-core')

        const [stdOut, stdErr, php] = createPhp({ configFixturePath, persistFixturePath })
        await runPhpCode(php, rootPath + '/public/assets/install-site.phpcode')
        expect(stdOut.shift().trim()).toStrictEqual('{"message":"Beginning install tasks","type":"install"}')
        expect(stdOut.pop().trim()).toStrictEqual('{"message":"Performing install task (12 \\/ 12)","type":"install"}')
        assertOutput(stdErr, '')
        stdOut.length = 0

        await runPhpCode(php, rootPath + '/public/assets/login-admin.phpcode')
        const loginOutput = JSON.parse(stdOut.join('').trim());

        const stat = fs.statSync(`${persistFixturePath}/drupal/web/sites/default`)
        expect(stat.mode & 0o777).toStrictEqual(0o775)

        const statSettings = fs.statSync(`${persistFixturePath}/drupal/web/sites/default/settings.php`)
        expect(statSettings.mode & 0o777).toStrictEqual(0o664)

        const [cgiOut, cgiErr, phpCgi] = createCgiPhp({ configFixturePath, persistFixturePath });
        phpCgi.cookies.set(loginOutput.params.name, loginOutput.params.id)

        const response = await phpCgi.request({
            connection: {
                encrypted: false,
            },
            method: 'GET',
            url: '/cgi/drupal',
            headers: {
                host: globalThis.location.host
            }
        })
        const text = await response.text()
        assertOutput(cgiOut, 'GET /cgi/drupal 200')
        assertOutput(cgiErr, '')
        expect(text).toContain('/cgi/drupal/user/logout')
    })
    it.skipIf(!fs.existsSync(`${rootFixturePath}/drupal-cms`))('installs drupal-cms', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath)
        writeInstallParams(configFixturePath, {
            langcode: 'en',
            skip: false,
            siteName: 'test',
            profile: 'standard',
            recipes: [],
            host: globalThis.location.host,
        })
        copyExistingBuildFixture(persistFixturePath, 'drupal-cms')

        const [stdOut, stdErr, php] = createPhp({ configFixturePath, persistFixturePath })
        await runPhpCode(php, rootPath + '/public/assets/login-admin.phpcode')
        assertOutput(stdErr, '')
        const loginOutput = JSON.parse(stdOut.join('').trim());

        const [cgiOut, cgiErr, phpCgi] = createCgiPhp({ configFixturePath, persistFixturePath });
        phpCgi.cookies.set(loginOutput.params.name, loginOutput.params.id)

        const response = await phpCgi.request({
            connection: {
                encrypted: false,
            },
            method: 'GET',
            url: '/cgi/drupal',
            headers: {
                host: globalThis.location.host
            }
        })
        const text = await response.text()
        assertOutput(cgiOut, 'GET /cgi/drupal 200')
        assertOutput(cgiErr, '')
        expect(text).toContain('/cgi/drupal/user/logout')
    })
    it('works with interactive installer', async ({ configFixturePath, persistFixturePath }) => {
        writeFlavorTxt(configFixturePath)
        writeInstallParams(configFixturePath, {
            langcode: 'en',
            skip: false,
            siteName: 'test',
            profile: 'standard',
            recipes: [],
            host: globalThis.location.host,
        })
        copyExistingBuildFixture(persistFixturePath, 'drupal-core')

        const [cgiOut, cgiErr, phpCgi] = createCgiPhp({ configFixturePath, persistFixturePath });

        const [initResponse, initText] = await doRequest(phpCgi, '/cgi/drupal')
        assertOutput(cgiOut, 'GET /cgi/drupal 302')
        assertOutput(cgiErr, '')
        expect(initResponse.headers.get('location'), '/cgi/drupal/core/install.php')
        expect(initText).toContain('Redirecting to /cgi/drupal/core/install.php')

        const [, installText] = await doRequest(phpCgi, '/cgi/drupal/core/install.php')
        expect(installText).toContain('/cgi/drupal/core/install.php?langcode=en')

        const [, selectProfileText] = await doRequest(phpCgi, '/cgi/drupal/core/install.php?langcode=en')
        expect(selectProfileText).toContain('Select an installation profile')

        const [, , databaseConfigDocument] = await doRequest(phpCgi, '/cgi/drupal/core/install.php?langcode=en&profile=minimal')
        expect(databaseConfigDocument.title).toStrictEqual('Database configuration | Drupal')

        const [postDbConfigRes, postDbConfigText] = await doRequest(
            phpCgi,
            '/cgi/drupal/core/install.php?langcode=en&profile=minimal',
            'POST',
            {
                form_build_id: databaseConfigDocument.querySelector('input[name="form_build_id"]').value,
                form_id: databaseConfigDocument.querySelector('input[name="form_id"]').value,
                op: databaseConfigDocument.querySelector('input[name="op"]').value
            }
        )
        let location = new URL(postDbConfigRes.headers.get('location'))
        expect(location.pathname).toStrictEqual('/cgi/drupal/core/install.php')
        expect(postDbConfigText).toContain('Redirecting to http://localhost:3000/cgi/drupal/core/install.php')

        const [metaRefreshRes, metaRefreshText, metaRefreshDoc] = await doRequest(phpCgi, location.pathname + location.search)

        const [checkedRes] = await checkForMetaRefresh(phpCgi, metaRefreshRes, metaRefreshText, metaRefreshDoc)

        location = new URL(checkedRes.headers.get('location'))
        const [, , configureSiteDoc] = await doRequest(phpCgi, location.pathname + location.search)

        const [configureSiteRes, configureSiteText] = await doRequest(
            phpCgi,
            location.pathname + location.search,
            'POST',
            {
                site_name: 'Node test',
                site_mail: 'admin@example.com',
                'account[name]': 'admin',
                'account[pass][pass1]': 'admin',
                'account[pass][pass2]': 'admin',
                'account[mail]': 'admin@example.com',
                date_default_timezone: 'America/Chicago',
                enable_update_status_module: 0,
                enable_update_status_emails: 0,
                form_build_id: configureSiteDoc.querySelector('input[name="form_build_id"]').value,
                form_id: configureSiteDoc.querySelector('input[name="form_id"]').value,
                op: configureSiteDoc.querySelector('input[name="op"]').value
            }
        )
        location = new URL(configureSiteRes.headers.get('location'))
        expect(location.pathname).toStrictEqual('/cgi/drupal/')
        expect(configureSiteText).toContain('Redirecting to http://localhost:3000/cgi/drupal/')

        const [postInstallRes, , ] = await doRequest(phpCgi, location.pathname + location.search)
        location = new URL(postInstallRes.headers.get('location'))
        expect(location.pathname).toStrictEqual('/cgi/drupal/user/1')

        const [, finishedText, finishedDoc] = await doRequest(phpCgi, location.pathname + location.search)
        expect(finishedDoc.title).toStrictEqual('admin | Node test')
        expect(finishedText).toContain('/cgi/drupal/core/themes/stark/logo.svg')
        expect(finishedText).toContain('/cgi/drupal/core/modules/system/css/components/align.module.css')
    })
}, {
    timeout: 999999
})
