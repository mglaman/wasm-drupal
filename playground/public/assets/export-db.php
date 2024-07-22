<?php

use Drupal\Core\Cache\Cache;
use Drupal\Core\DrupalKernel;
use Symfony\Component\HttpFoundation\Request;

$stdErr = fopen('php://stderr', 'w');

set_error_handler(static function(...$args) use($stdErr) {
    fwrite($stdErr, print_r($args,1));
});

$flavor = file_get_contents('/config/flavor.txt');
unlink('/config/flavor.txt');

$autoloader = require "/persist/$flavor/vendor/autoload.php";

$request = Request::createFromGlobals();
$kernel = DrupalKernel::createFromRequest($request, $autoloader, 'prod');
chdir($kernel->getAppRoot());
$kernel->boot();

foreach (Cache::getBins() as $cache_backend) {
    $cache_backend->deleteAll();
}
\Drupal::service('plugin.cache_clearer')->clearCachedDefinitions();
$kernel->invalidateContainer();

$sql = 'PRAGMA foreign_keys=OFF;' . PHP_EOL;
$sql .= 'BEGIN TRANSACTION;' . PHP_EOL;

// adapted from https://github.com/ephestione/php-sqlite-dump/blob/master/sqlite_dump.php
$database = \Drupal::database();
$tables = $database->query('SELECT [name], [sql] FROM {sqlite_master} WHERE [type] = "table" AND [name] NOT LIKE "sqlite_%" ORDER BY name');
foreach ($tables as $table) {
    $sql .= str_replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ', $table->sql) . ';' . PHP_EOL;

    $columns = array_map(
        static fn (object $row) => "`{$row->name}`",
        $database->query("PRAGMA table_info({$table->name})")->fetchAll()
    );
    $columns = implode(', ', $columns);
    $sql .= PHP_EOL;

    $rows = $database->select($table->name)->fields($table->name)->execute()->fetchAll(\PDO::FETCH_ASSOC);
    foreach ($rows as $row) {
        $values = implode(
            ', ',
            array: array_map(
                static function ($value) {
                    if ($value === NULL) {
                        return 'NULL';
                    }
                    if ($value === '') {
                        return  "''";
                    }
                    if (is_numeric($value)) {
                        return $value;
                    }
                    if ($value === 'b:0;') {
                        return false;
                    }
                    $is_serialized = $value[1] === ':' && str_ends_with($value, '}');

                    $value = str_replace(["'"], ["''"], $value);
                    $value = "'$value'";

                    if ($is_serialized) {
                        $value = sprintf(
                            "replace(%s, char(1), char(0))",
                            str_replace(chr(0), chr(1), $value),
                        );
                    }
                    return $value;
                },
                array_values($row)
            )
        );
        $sql .= "INSERT INTO {$table->name} VALUES($values);" . PHP_EOL;
    }

    $sql .= PHP_EOL;
}

$sql .= 'DELETE FROM sqlite_sequence;' . PHP_EOL;
$sequences = $database->query('SELECT [name], [seq] FROM sqlite_sequence');
foreach ($sequences as $sequence) {
    $sql .= "INSERT INTO sqlite_sequence VALUES('{$sequence->name}',{$sequence->seq});" . PHP_EOL;
}

$indexes = $database->query('SELECT [sql] FROM {sqlite_master} WHERE [type] = "index" AND [name] NOT LIKE "sqlite_%" ORDER BY name');
foreach ($indexes as $index) {
    $sql .= $index->sql . ';' . PHP_EOL;
}


$sql .= 'COMMIT;' . PHP_EOL;

// TODO support this collation somehow
// see https://www.drupal.org/project/drupal/issues/3036487
$sql = str_replace('NOCASE_UTF8', 'NOCASE', $sql);

file_put_contents('/persist/dump.sql', $sql);
