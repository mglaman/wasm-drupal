PWD = $(shell pwd)

build: download-artifacts playground-build

serve:
	docker run --rm -p 80:80 \
		-v ${PWD}/playground/Caddyfile:/etc/caddy/Caddyfile \
		-v ${PWD}/playground/public:/usr/share/caddy \
		caddy

download-artifacts:
	curl https://wasm-drupal.mglaman.dev/assets/drupal-core.zip -o playground/public/assets/drupal-core.zip
	curl https://wasm-drupal.mglaman.dev/assets/drupal-starshot.zip -o playground/public/assets/drupal-starhot.zip
	curl https://git.drupalcode.org/api/v4/projects/157093/jobs/artifacts/0.x/raw/trial.zip?job=trial -o playground/public/assets/drupal-cms.zip

playground-build:
	cd playground && npm install
	cd playground && npm run build

playground-test:
	cd playground && npm run test

clean:
	cd playground && git clean -fdx
