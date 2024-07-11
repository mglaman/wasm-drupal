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

$sql = '';

// adapted from https://github.com/ephestione/php-sqlite-dump/blob/master/sqlite_dump.php
$database = \Drupal::database();
$tables = $database->query('SELECT [name] FROM {sqlite_master} WHERE [type] = "table" AND [name] NOT LIKE "sqlite_%" ORDER BY name');
foreach ($tables as $table) {
    $sql .= '--' . PHP_EOL;
    $sql .= "-- Table structure for table `{$table->name}`" . PHP_EOL;
    $sql .= '--' . PHP_EOL;
    $sql .= $database->query('SELECT [sql] FROM {sqlite_master} WHERE [name] = :name ', [
        ':name' => $table->name,
    ])->fetchField();
    $sql .= PHP_EOL.PHP_EOL;

    $columns = array_map(
        fn (object $row) => "`{$row->name}`",
        $database->query("PRAGMA table_info({$table->name})")->fetchAll()
    );
    $columns = implode(', ', $columns);

    $sql .= '--' . PHP_EOL;
    $sql .= "-- Dumping data for table `{$table->name}`" . PHP_EOL;
    $sql .= '--' . PHP_EOL;
    $sql .= PHP_EOL;

    $sql .= "INSERT INTO {$table->name} ($columns) VALUES" . PHP_EOL;

    $rows = $database->select($table->name)->fields($table->name)->execute()->fetchAll(\PDO::FETCH_ASSOC);
    if (count($rows) > 0) {
        $last_row = implode(', ', array_pop($rows));
        foreach ($rows as $row) {
            $values = implode(', ', array_values($row));
            $sql .= "($values),";
        }
        $sql .= "($last_row);";
    }

    $sql .= PHP_EOL.PHP_EOL;
}

file_put_contents('/persist/dump.sql', $sql);
