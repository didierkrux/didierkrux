<?
	$root='/';
	$selected_rub=str_replace($root, '', $_SERVER['REQUEST_URI']);
	include_once('config.php');
	if(!empty($selected_rub) && array_key_exists($selected_rub, $tab_rub))
		$title.=' | '.$tab_rub[$selected_rub]['title'];
?>
<!DOCTYPE HTML>
<html>
	<head>
		<title><?=$title;?></title>
		<?
			if($selected_rub=='revolution')
			{
				echo '<meta property="og:description" content="#REVOLUTION" />
<meta property="og:image" content="http://www.didierkrux.com/revolution_fb.jpg" />';
			}
		?>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<!--[if lte IE 8]><script src="assets/js/ie/html5shiv.js"></script><![endif]-->
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.6.3/css/font-awesome.min.css" />
		<link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Source+Sans+Pro:400,400italic" />
		<link rel="stylesheet" href="assets/css/main.css" />
		<!--[if lte IE 8]><link rel="stylesheet" href="assets/css/ie8.css" /><![endif]-->
		<style>
		a{
			color: #337ab7;
		}
		#header h2{
			color: #cecece;
			font-size: 1em;
			line-height: 1em;
			text-align: center;
		}
		#header a:hover{
			color: white !important;
		}
		#header .image.avatar{
			margin: 0;
		}
		#header {
			text-align: left;
			background: none;
			background-color: #252525;
			padding-top: 60px;
		}
		#header h1{
			font-size: 2.8em;
			font-weight: 800;
		}
		#header a.active h1, #header a.active, #main a.link, #main a.link:hover{
			text-decoration: none;
			color: #8e3939 !important;
		}
		#main{
			background-color: #ffffff;
			max-width: none;
		}
		#main a:hover{
			color: #337ab7 !important;
			text-decoration: none;
		}
		#main h2 a, #main h2 a:hover{
			color: #337ab7 !important;
			text-decoration: none;
		}
		.link{
			float: right;
			font-size: 1.5em;
		}
		.center{
			text-align: center;
		}
		ul.labeled-icons li{
			margin: 0.5em 0 0 0;
		}
		img {
			max-width: 100%;
			height: auto;
		}
		#main {
		    padding: 4em;
		}
		@media screen and (max-width: 1280px) {
			#header {
				padding: 2em;
			}
			#main{
				padding: 3em;
			}
		}
		@media screen and (max-width: 980px) {
			#main{
				padding: 3em;
			}
			body{
				background-color: #252525;
			}
		}
		</style>
	</head>
	<body id="top">
<?php include_once("analyticstracking.php") ?>
		<!-- Header -->
			<header id="header">
				<div class="inner">
					<div class="center">
						<a href="/" class="image avatar"><img src="images/avatar.jpg" alt="" /></a>
						<a href="/"><h1 class="center" id="dk">Didier Krux</h1></a>
						<h2>Web Developer</h2>
						<h2>📍 🇫🇷 living in Hong Kong 🇭🇰</h2>
					</div>
					<ul class="labeled-icons">
						<li>
							<h3 class="icon fa-envelope-o"><span class="label">Email</span></h3>
							<a href="mailto:didier@krux.co">didier@krux.co</a>
						</li>
						<li>
							<h3 class="icon fa-whatsapp"><span class="label">Phone HK</span></h3>
							(+852) 6996 1625
						</li>
						<?
						if($private=='revolution'){
						?>
						<li>
							<h3 class="icon fa-globe"><span class="label">Travel Blog</span></h3>
							<a href="/revolution">#REVOLUTION - Travel Blog</a>
						</li>
						<?	
						}
						?>
						<li>
							<h3 class="icon fa-fast-forward"><span class="label">Travel Blog</span></h3>
							<a href="/nextsound#dk">Next Sound - Music Blog</a>
						</li>
						<li>
							<h3 class="icon fa-music"><span class="label">Travel Blog</span></h3>
							<a href="/digitalkrux#dk">Digital Krux - DJ Podcast</a>
						</li>
					</ul>
					<ul class="icons">
						<li><a target="_blank" class="icon fa-linkedin" href="https://linkedin.com/in/didierkrux"><span class="label">LinkedIn</span></a>
						<li><a target="_blank" class="icon fa-twitter" href="https://twitter.com/didierkrux"><span class="label">Twitter</span></a>
						<li><a target="_blank" class="icon fa-wechat" href="/wechat.jpg"><span class="label">WeChat</span></a>
						<li><a target="_blank" class="icon fa-github" href="https://github.com/didierkrux"><span class="label">Github</span></a>
						<li><a target="_blank" class="icon fa-instagram" href="https://instagram.com/didierkrux"><span class="label">Instagram</span></a>
						<li><a target="_blank" class="icon fa-facebook" href="https://facebook.com/didierkrux"><span class="label">Facebook</span></a>	
					</ul>
					<ul class="icons" style="text-align: center;">
						<li>
							<a target="_blank" class="icon fa-download" href="http://krux.co/resume"> resume</a> - <a target="_blank" class="icon fa-download" href="http://krux.co/vcard"> vCard</a>
						</li>
					</ul>
				</div>
			</header>

		<!-- Main -->
			<?
			
			if(!empty($selected_rub) && array_key_exists($selected_rub, $tab_rub))
			{
				echo '<div id="main">';
				$rub=$tab_rub[$selected_rub];
				if($rub['type']=='rss')
				{
					echo '<a target="_blank" class="link" href="'.$rub['website_url'].'">website</a>';
					$rss = new SimpleXMLElement(file_get_contents($rub['rss_url']));
					foreach($rss->channel->item as $item)
					{
						echo '<div>';
						echo '<h2><a target="_blank" href="'.$item->link.'">'.$item->title.'</a></h2>';
						echo '<span>'.$item->pubDate.'</span>';
						echo '<div>'.$item->children('content', true)->encoded.'</div>';
						echo '</div>';
					}
				}
				elseif($rub['type']=='include'){
					include $selected_rub.'.php';
				}
				echo '</div>';
			}
			else{
				echo '<div id="main">';
				include 'accelerate.php';
				echo '</div>';
			}
?>			

		<!-- Scripts -->
			<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
			<script type="text/javascript">
				$('#header a').each(function(){
					if( $(this).attr('href')==window.location.pathname || $(this).attr('href')==window.location.pathname+'#dk' )
						$(this).addClass('active');
				});
			</script>
	</body>
</html>