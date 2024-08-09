<?php

$stdErr = fopen('php://stderr', 'w');

set_error_handler(function(...$args) use($stdErr, &$errors){
    fwrite($stdErr, print_r($args,1));
});

$flavor = file_get_contents('/config/flavor.txt');

$docroot = '/persist/' . $flavor;

$zip = new ZipArchive;

if (!file_exists('/persist/artifact.zip')) {
    print json_encode([
            'message' => 'artifact could not be found',
            'type' => 'error',
        ], JSON_THROW_ON_ERROR) . PHP_EOL;
    exit(1);
}

if($zip->open('/persist/artifact.zip', ZipArchive::RDONLY) === TRUE)
{
    $total = $zip->count();
    $percent = 0;
    for($i = 0; $i < $total; $i++)
    {
        $zip->extractTo($docroot, $zip->getNameIndex($i));
        $newPercent = ((1+$i) / $total);

        if($newPercent - $percent >= 0.01)
        {
            print json_encode([
                    'message' => 'Unpacking files ' . round($newPercent * 100, 2) . '%',
                    'type' => 'unarchive',
                ], JSON_THROW_ON_ERROR) . PHP_EOL;
            $percent = $newPercent;
        }
    }
    print json_encode([
            'message' => 'Unpacking files 100%',
            'type' => 'unarchive',
        ], JSON_THROW_ON_ERROR) . PHP_EOL;
}
else {
    print json_encode([
            'message' => 'could not open artifact archive',
            'type' => 'error',
        ], JSON_THROW_ON_ERROR) . PHP_EOL;
    exit(1);
}

exit(0);
