<?php

$stdErr = fopen('php://stderr', 'w');

set_error_handler(function(...$args) use($stdErr, &$errors){
    fwrite($stdErr, print_r($args,1));
});

$flavor = file_get_contents('/config/flavor.txt');
$docroot = '/persist/' . $flavor;

$class_loader = require $docroot . '/vendor/autoload.php';

chdir($docroot . '/web');

$install_profile = 'standard';
$langcode = 'en';
$site_path = 'sites/default';

// @todo have this written by the worker as JSON and parsed from the disk?
$parameters = [
    'interactive' => FALSE,
    'site_path' => $site_path,
    'parameters' => [
        'profile' => $install_profile,
        'langcode' => $langcode,
    ],
    'forms' => [
        'install_settings_form' => [
            'driver' => 'sqlite',
            'sqlite' => [
                'database' => $site_path . '/files/.sqlite',
            ],
        ],
        'install_configure_form' => [
            'site_name' => 'Drupal WASM',
            'site_mail' => 'drupal@localhost',
            'account' => [
                'name' => 'admin',
                'mail' => 'admin@localhost',
                'pass' => [
                    'pass1' => 'admin',
                    'pass2' => 'admin',
                ],
            ],
            'enable_update_status_module' => TRUE,
            // \Drupal\Core\Render\Element\Checkboxes::valueCallback() requires
            // NULL instead of FALSE values for programmatic form submissions to
            // disable a checkbox.
            'enable_update_status_emails' => NULL,
        ],
    ],
];

require_once 'core/includes/install.core.inc';

install_drupal($class_loader, $parameters, static function ($install_state) {
    static $started = FALSE;
    static $finished, $total = 0;
    if (!$started) {
        print json_encode([
                'message' => 'Beginning install tasks',
                'type' => 'install',
            ], JSON_THROW_ON_ERROR) . PHP_EOL;

        $started = TRUE;
        $total = count(install_tasks_to_perform($install_state));
    }
    print json_encode([
            'message' => "Performing install task ($finished / $total)",
            'type' => 'install',
        ], JSON_THROW_ON_ERROR) . PHP_EOL;
    $finished++;
});

exit;
