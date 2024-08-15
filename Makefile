PWD = $(shell pwd)

build: download-artifacts demo-build

serve:
	docker run --rm -p 80:80 \
		-v ${PWD}/Caddyfile:/etc/caddy/Caddyfile \
		-v ${PWD}/public:/usr/share/caddy \
		caddy

download-artifacts:
	curl -o public/assets/drupal-core.zip 		https://wasm-drupal.mglaman.dev/assets/drupal-core.zip
	curl -o public/assets/drupal-starhot.zip	https://wasm-drupal.mglaman.dev/assets/drupal-starshot.zip
	curl -o public/assets/drupal-cms.zip 		https://git.drupalcode.org/api/v4/projects/157093/jobs/artifacts/0.x/raw/trial.zip?job=trial

demo-build:
	npm install
	npm run build

demo-test:
	npm run test

clean:
	cd public && git clean -fdx
