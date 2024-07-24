# Testing a Drupal build

1. Make changes in `drupal-src` (manually or via patches)
2. Run `make drupal-archive` to run `composer install` and create artifact
3. Run `copy-playground-archive` to make new artifact available 
4. Run `make serve` to run playground
5. Install and test
