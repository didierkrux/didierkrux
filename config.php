<?
$title='Didier Krux';

$tab_rub=array();

if($selected_rub=='revolution')
{
	$private='revolution';
	setcookie("private", $private, 2147483647);
}
elseif($selected_rub=='accelerate')
{
	$private='accelerate';
	setcookie("private", $private, 2147483647);
	header('Location: /');
}
else
	$private=@$_COOKIE['private'];

if($private=='revolution')
{
	$tab_rub['revolution']=array(
		'title'=>'#revolution',
		'type'=>'include',
		'icon'=>'globe',
	);
}
$tab_rub['nextsound']=array(
	'title'=>'Next Sound - Music Blog',
	'type'=>'rss',
	'icon'=>'music',
	'rss_url'=>'http://www.nextsound.co/category/selection,free-download/rss?dk=true',
	'website_url'=>'http://www.nextsound.co',
);
$tab_rub['digitalkrux']=array(
	'title'=>'Digital Krux - Podcast',
	'type'=>'rss',
	'icon'=>'rss',
	'rss_url'=>'http://www.digitalkrux.com/category/podcast,bootleg/feed',
	'website_url'=>'http://www.digitalkrux.com',
);

$GoogleAnalytics_ID='UA-2794987-1';
?>