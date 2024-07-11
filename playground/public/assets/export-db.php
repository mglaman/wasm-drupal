<?php

use Drupal\Core\Database\Database;
use Drupal\Core\DrupalKernel;
use Symfony\Component\HttpFoundation\Request;

$stdErr = fopen('php://stderr', 'w');

set_error_handler(function(...$args) use($stdErr, &$errors){
    fwrite($stdErr, print_r($args,1));
});

$flavor = file_get_contents('/config/flavor.txt');
unlink('/config/flavor.txt');

$autoloader = require "/persist/$flavor/vendor/autoload.php";

$request = Request::createFromGlobals();
$kernel = DrupalKernel::createFromRequest($request, $autoloader, 'prod');

$dbinfo = Database::getConnectionInfo('default');

$dbfile = "{$kernel->getAppRoot()}/{$dbinfo['default']['database']}";

print $dbfile;
