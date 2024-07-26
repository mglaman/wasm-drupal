# Drupal on the Edge with Web Assembly

Run Drupal on the edge in your browser with [Web Assembly](https://webassembly.org/).

This utilizes [php-wasm](https://github.com/seanmorris/php-wasm) and [php-cgi-wasm](https://github.com/seanmorris/php-wasm/tree/master/packages/php-cgi-wasm) by [Sean Morris](https://github.com/seanmorris).

Want to learn more? Catch my session [Running Drupal on the Edge with Web Assembly](https://events.drupal.org/barcelona2024/session/running-drupal-edge-web-assembly) at DrupalCon Barcelona.

## How it works

PHP has been compiled into Web Assembly.

* The `php-wasm` package allows us to execute PHP code in the browser.
* The `php-cgi-wasm` package allows us to execute PHP code in a service worker, which emulates CGI (think PHP-FPM), and allows serving requests to and from Drupal.

## Running locally

### Docker with DDEV

Using [DDEV](https://ddev.com/) you can build and run the playground locally.

```sh
ddev start
ddev make build
```

Visit https://wasm-drupal.ddev.site

### Without Docker

Currently this requires NPM, PHP (with Composer) on the host machine and Docker.

```shell
make build

make serve
```

Open `http://localhost`

Click **Install** for either Drupal or the Starshot prototype, and then wait for environment to launch.

Log in with

* Username: `admin`
* Password: `admin`

## Upcoming: drupal-was package

The goal is to split out the JavaScript from this project into a reusable package for others.

* `drupal-cgi-worker.mjs` as an easy way to register the service worker for serving a Drupal application
* `install-worker.mjs` as an easy way to install a Drupal application from an artifact

## Debugging steps

### Clearing all data

Use your browser's "Clear site data" functionality to perform a manual reset.

### Debugging the service worker

Visit [chrome://serviceworker-internals/](chrome://serviceworker-internals/)

## Limitations

* php-wasm does not provide an exposed function for running a specific script file, that means scripts like Composer and Drush cannot be directly invoked.
* php-wasm's SAPI name is `embed`, which breaks any code which checks `PHP_SAPI === 'cli'`, such as Drush.

## Next steps

- [ ] Allow exporting Drupal database to use locally, with DDEV. [#10](https://github.com/mglaman/wasm-drupal/issues/10)
- [ ] Allow exporting Drupal codebase to use locally, with DDEV. [#11](https://github.com/mglaman/wasm-drupal/issues/11)
