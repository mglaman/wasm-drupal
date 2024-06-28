PWD = $(shell pwd)

build: drupal-install drupal-archive playground-build

serve:
	docker run --rm -p 80:80 \
		-v ${PWD}/playground/Caddyfile:/etc/caddy/Caddyfile \
		-v ${PWD}/playground/public:/usr/share/caddy \
		caddy

drupal-update:
	cd drupal-src && composer update --ignore-platform-reqs

drupal-build:
	cd drupal-src && composer install --ignore-platform-reqs

drupal-install: drupal-build
	cd drupal-src && \
		php vendor/bin/drush site:install --account-pass=admin --yes --site-name="Drupal WASM" && \
		php vendor/bin/drush pm-uninstall big_pipe --yes

drupal-archive:
	cd drupal-src && composer archive --format=zip
	mv drupal-src/drupal-wasm-1.0.zip .

playground-build:
	cp drupal-wasm-1.0.zip playground/public/assets
	cd playground && npm install

clean:
	git clean -fdX
