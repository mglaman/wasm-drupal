PWD = $(shell pwd)

build: playground-build copy-playground-archive

serve:
	docker run --rm -p 80:80 \
		-v ${PWD}/playground/Caddyfile:/etc/caddy/Caddyfile \
		-v ${PWD}/playground/public:/usr/share/caddy \
		caddy

drupal-update:
	cd drupal-src && composer update --ignore-platform-reqs

drupal-build:
	cd drupal-src && composer install --ignore-platform-reqs

drupal-archive: drupal-build
	cd drupal-src && composer archive --format=zip
	mv drupal-src/drupal-wasm-1.0.zip .

copy-playground-archive: drupal-archive
	rm -f playground/public/assets/drupal-wasm-1.0.zip
	mv drupal-wasm-1.0.zip playground/public/assets

playground-build:
	cd playground && npm install
	cd playground && npm run build

playground-test:
	cd playground && npm run test

clean:
	cd drupal-src && git clean -fdx
	cd playground && git clean -fdx
