<?php

$stdErr = fopen('php://stderr', 'w');

set_error_handler(function(...$args) use($stdErr, &$errors){
	fwrite($stdErr, print_r($args,1));
});

$flavor = file_get_contents('/config/flavor.txt');
unlink('/config/flavor.txt');

$docroot = '/persist/' . $flavor;

$zip = new ZipArchive;

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
			print \json_encode(['progress' => round($newPercent * 100, 2)]) . PHP_EOL;
			$percent = $newPercent;
		}
	}
}

exit;
