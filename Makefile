build: drupal-install drupal-archive

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
