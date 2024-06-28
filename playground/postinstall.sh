# This could be `node_modules/php-*/*.mjs*` after https://github.com/seanmorris/php-wasm/issues/45 is fixed.
rsync --exclude='*[nN]ode*' --exclude='*[wW]ebview*' --exclude='php-tags*' node_modules/php-wasm/*.mjs* public
rsync --exclude='*[nN]ode*' --exclude='*[wW]ebview*' --exclude='php-tags*' node_modules/php-cgi-wasm/*.mjs* public
rsync --exclude='php8.0*' --exclude='php8.1*' --exclude='php8.2*' node_modules/*/*.so public
