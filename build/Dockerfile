# Creates /app/drupal and /app/drupal/static
# The static files are the JS/CSS/imgs which can be loaded by the browser
# The non-static are what get compiled for Web Assembly
FROM composer/composer:2 as vendor
WORKDIR /app

ENV DRUPAL_VERSION=^10

RUN set -eux; \
    composer create-project \
      drupal/recommended-project:$DRUPAL_VERSION drupal \
      --ignore-platform-reqs
RUN cp drupal/web/sites/example.settings.local.php drupal/web/sites/default/settings.local.php
RUN echo 'include $app_root . "/" . $site_path . "/settings.local.php";' >> drupal/web/sites/default/settings.local.php

# Separate Drupal static files
# TODO move this to after install, because demo_umami adds static files to sites/default/files
# Remove dotfiles
# Remove test directories.
RUN cp -r drupal drupal-static && \
    cd drupal-static && \
    find ./ -name '*.php' -delete && \
    find . -maxdepth 5 -type f -delete && \
    # Remove all empty directories
    find . -type d -empty -delete

FROM php:8.1-cli AS php
WORKDIR /app

RUN apt-get update; \
	apt-get install -y --no-install-recommends \
		libfreetype6-dev \
		libjpeg-dev \
		libpng-dev \
		libpq-dev \
		libzip-dev \
	; \
	docker-php-ext-configure gd \
		--with-freetype \
		--with-jpeg=/usr \
	; \
	\
	docker-php-ext-install -j "$(nproc)" \
		gd \
	;

COPY --from=vendor /app/drupal /app/drupal
RUN cd /app/drupal && php -d memory_limit=256M web/core/scripts/drupal install demo_umami

FROM emscripten/emsdk:3.1.24 as emscripten
SHELL ["/bin/bash", "-c"]
WORKDIR /root

RUN mkdir /root/output

RUN set -euxo pipefail;\
    apt-get update; \
    emsdk install latest

COPY --from=php /app/drupal /root/drupal
COPY --from=vendor /app/drupal-static /root/drupal-static

# Bundle the .data file using Emscripten
RUN mv drupal /drupal && \
    /emsdk/upstream/emscripten/tools/file_packager.py \
    /root/output/drupal.data \
    --export-name="PHPModule" \
    --no-node \
    --preload /drupal \
    --js-output=/root/output/drupal.js

COPY ./build-assets/esm-prefix.js ./build-assets/esm-suffix.js /root/

RUN cat /root/output/drupal.js \
    | sed -E "s#'[^']*drupal\.data'#dependencyFilename#g" \
    > /tmp/drupal.js && \
    mv /tmp/drupal.js /root/output/drupal.js;

RUN cp /root/esm-prefix.js /tmp/esm-prefix.js && \
    export FILE_SIZE=$(stat -c%s "/root/output/drupal.data") && \
    cat /tmp/esm-prefix.js \
        | sed "s#DRUPAL_DATA_SIZE#$FILE_SIZE#g" \
        > /root/esm-prefix.js

# Then, produce the final module:
RUN mv /root/output/drupal.js /tmp/drupal.js && \
    cat /root/esm-prefix.js /tmp/drupal.js /root/esm-suffix.js > /root/output/drupal.js && \
    rm /tmp/drupal.js
