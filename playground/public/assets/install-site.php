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
    if (!$started) {
        $started = TRUE;
        print json_encode([
            'message' => 'Installing Standard....'
        ]) . PHP_EOL;
    }
    // @todo use array_filter to count tasks w/ display name for progress tracking.
    $tasks_to_perform = install_tasks_to_perform($install_state);
    $task = current($tasks_to_perform);
    if (isset($task['display_name'])) {
        print json_encode([
                'message' => "Performing {$task['display_name']}"
            ]) . PHP_EOL;
    }
});
