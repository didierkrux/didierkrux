<?
if (strpos($_SERVER['HTTP_REFERER'], 'linkedin') !== false) {
    header('Location: https://www.lesechos.fr/'); // go to website if you come from linkedin
} else { // display og:image, title & description for linkedin profile
    $title = 'Les Echos.fr - Actualité économique, financière';
    $description = 'Toute l&#039;actualité économique, financière et boursière française et internationale sur Les Echos.fr';
    $img = 'https://www.didierkrux.com/assets/img/lesechos.fr.png';
    echo '<html>
    <head>
        <title>' . $title . '</title>
        <meta name="description" content="' . $description . '" />
        <meta property="og:image" content="' . $img . '" />
    </head>
    <body>
    </body>
    </html>';
}
exit;
