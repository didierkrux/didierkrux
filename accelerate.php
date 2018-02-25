<?
$json=json_decode(@file_get_contents('accelerate.json'));
//print_r($json);
foreach($json as $i=>$image)
	echo '<div id="img'.$i.'"><img src="'.$image->link.'" /><h3>'.$image->description.'</h3></div>';
// TODO : js click next & keyboard shortcut