# Drupal on the Edge with Web Assembly

Run Drupal on the edge in your browser with [Web Assembly](https://webassembly.org/).

This utilizes [php-wasm](https://github.com/seanmorris/php-wasm) and [php-cgi-wasm](https://github.com/seanmorris/php-wasm/tree/master/packages/php-cgi-wasm) by [Sean Morris](https://github.com/seanmorris).

Want to learn more? Catch my session [Running Drupal on the Edge with Web Assembly](https://events.drupal.org/barcelona2024/session/running-drupal-edge-web-assembly) at DrupalCon Barcelona.

## How it works

PHP has been compiled into Web Assembly.

* The `php-wasm` package allows us to execute PHP code in the browser.
* The `php-cgi-wasm` package allows us to execute PHP code in a service worker, which emulates CGI (think PHP-FPM), and allows serving requests to and from Drupal.
