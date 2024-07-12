<?php

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

$sql = 'PRAGMA foreign_keys=OFF;' . PHP_EOL;
$sql .= 'BEGIN TRANSACTION;' . PHP_EOL;

// adapted from https://github.com/ephestione/php-sqlite-dump/blob/master/sqlite_dump.php
$database = \Drupal::database();
$tables = $database->query('SELECT [name], [sql] FROM {sqlite_master} WHERE [type] = "table" AND [name] NOT LIKE "sqlite_%" ORDER BY name');
foreach ($tables as $table) {
    $sql .= str_replace('CREATE TABLE ', 'CREATE TABLE IF NOT EXISTS ', $table->sql) . PHP_EOL;

    $columns = array_map(
        fn (object $row) => "`{$row->name}`",
        $database->query("PRAGMA table_info({$table->name})")->fetchAll()
    );
    $columns = implode(', ', $columns);
    $sql .= PHP_EOL;

    $rows = $database->select($table->name)->fields($table->name)->execute()->fetchAll(\PDO::FETCH_ASSOC);
    $sql .= "INSERT INTO {$table->name} ($columns) VALUES" . PHP_EOL;
    if (count($rows) > 0) {
        $last_row = implode(', ', array_pop($rows));
        foreach ($rows as $row) {
            $values = implode(', ', array_values($row));
            $sql .= "($values),";
        }
        $sql .= "($last_row);";
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
    $sql .= $index->sql . PHP_EOL;
}

$sql .= 'COMMIT;' . PHP_EOL;

file_put_contents('/persist/dump.sql', $sql);
