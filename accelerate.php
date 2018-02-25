<style>
img {
    max-width: 80%;
    height: auto;
}
h3 a{
    color: #337ab7;
}
</style>
<?
$json=json_decode(@file_get_contents('accelerate.json'));
//print_r($json);
foreach($json as $i=>$image)
	echo '<div id="img_'.$i.'"><center><img src="'.$image->link.'" /></center><h3>'.$image->description.'</h3></div>';
// TODO : js click next & keyboard shortcut