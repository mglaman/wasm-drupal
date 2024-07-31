<?php

$stdErr = fopen('php://stderr', 'w');

set_error_handler(function (...$args) use ($stdErr, &$errors) {
    fwrite($stdErr, print_r($args, 1));
});

$flavor = file_get_contents('/config/flavor.txt');

$docroot = '/persist/' . $flavor;

$zip = new ZipArchive;

if ($zip->open('/persist/export.zip', ZipArchive::CREATE) !== TRUE) {
    print json_encode([
            'message' => 'export.zip could not be created',
            'type' => 'error',
        ], JSON_THROW_ON_ERROR) . PHP_EOL;
    exit(1);
}

$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($docroot, FilesystemIterator::SKIP_DOTS)
);
$total = iterator_count($files);
$i = $percent = 0;
foreach ($files as $name => $file) {
    if (is_dir($name)) {
        continue;
    }
    $added = $zip->addFile($name, str_replace($docroot, '', $name));
    if ($added) {
        $newPercent = (++$i / $total);
        if ($newPercent - $percent >= 0.01) {
            print json_encode([
                    'message' => 'Packing files ' . round($newPercent * 100, 2) . '%',
                    'type' => 'archive',
                ], JSON_THROW_ON_ERROR) . PHP_EOL;
            $percent = $newPercent;
        }
    } else {
        print json_encode([
                'message' => 'Could not pack file ' . $name,
                'type' => 'error',
            ], JSON_THROW_ON_ERROR) . PHP_EOL;
        exit();
    }
}
print json_encode([
        'message' => 'Packing files 100%',
        'type' => 'archive',
    ], JSON_THROW_ON_ERROR) . PHP_EOL;

$zip->close();

print json_encode([
        'message' => 'Export archive created',
        'type' => 'archive',
    ], JSON_THROW_ON_ERROR) . PHP_EOL;

exit(0);
