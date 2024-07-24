<?php

$stdErr = fopen('php://stderr', 'w');

set_error_handler(function(...$args) use($stdErr, &$errors){
	fwrite($stdErr, print_r($args,1));
});

$flavor = file_get_contents('/config/flavor.txt');
unlink('/config/flavor.txt');

$docroot = '/persist/' . $flavor;

$zip = new ZipArchive;

if (!file_exists('/persist/artifact.zip')) {
    print "artifact could not be found" . PHP_EOL;
    exit(1);
}

if($zip->open('/persist/artifact.zip', ZipArchive::RDONLY) === TRUE)
{
	$total = $zip->count();
    print "total files: $total" . PHP_EOL;
	$percent = 0;
	for($i = 0; $i < $total; $i++)
	{
		$zip->extractTo($docroot, $zip->getNameIndex($i));
		$newPercent = ((1+$i) / $total);

		if($newPercent - $percent >= 0.01)
		{
			print $newPercent . PHP_EOL;
			$percent = $newPercent;
		}
	}
}
else {
    print "could not open artifact archive" . PHP_EOL;
    exit(1);
}

exit(0);
