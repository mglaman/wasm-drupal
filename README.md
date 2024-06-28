# Drupal on the Edge with Web Assembly

Run Drupal on the edge in your browser with [Web Assembly](https://webassembly.org/).

This utilizes [php-wasm](https://github.com/seanmorris/php-wasm) and [php-cgi-wasm](https://github.com/seanmorris/php-wasm/tree/master/packages/php-cgi-wasm) by [Sean Morris](https://github.com/seanmorris).

Want to learn more? Catch my session [Running Drupal on the Edge with Web Assembly](https://events.drupal.org/barcelona2024/session/running-drupal-edge-web-assembly) at DrupalCon Barcelona.

## How it works

PHP has been compiled into Web Assembly.

* The `php-wasm` package allows us to execute PHP code in the browser.
* The `php-cgi-wasm` package allows us to execute PHP code in a service worker, which emulates CGI (think PHP-FPM), and allows serving requests to and from Drupal.

## Running locally

Currently this requires PHP (with Composer) on the host machine and Docker.

```shell
make build

make serve
```

Open `http://localhost`

Click **GO**, wait for environment to launch.

Log in with

* Username: admin
* Password: admin

## Debugging steps

### Debuging the service worker

Visit chrome://serviceworker-internals/

### Resetting IndexDB

1. Open developer console
2. Under "Application" tab, go to IndexDB
3. Delete /persist and /config
4. Unregister service worker
5. Refresh.

## Next steps

- [ ] Figure out why session is periodically lost after first run [#7](https://github.com/mglaman/wasm-drupal/issues/7)
- [ ] Install Drupal on demand instead of using a prepared SQLite database [#8](https://github.com/mglaman/wasm-drupal/issues/8)
- [ ] Add WebP support to GD extension [#9](https://github.com/mglaman/wasm-drupal/issues/9) [seanmorris/php-wasm#43](https://github.com/seanmorris/php-wasm/issues/43)
- [ ] Allow exporting Drupal database to use locally, with DDEV. [#10](https://github.com/mglaman/wasm-drupal/issues/10)
- [ ] Allow exporting Drupal codebase to use locally, with DDEV. [#11](https://github.com/mglaman/wasm-drupal/issues/11)
- [ ] Use `vHosts` to have "Drupal core" and "Drupal CMS" options. [#12](https://github.com/mglaman/wasm-drupal/issues/12)
