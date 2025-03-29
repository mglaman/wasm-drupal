rsync --exclude='*[nN]ode*' --exclude='*[wW]ebview*' --exclude='php-tags*' --exclude='*index*' node_modules/php-*/*.mjs* public
rsync --exclude='php8.0*' --exclude='php8.1*' --exclude='php8.2*' node_modules/*/*.so public
