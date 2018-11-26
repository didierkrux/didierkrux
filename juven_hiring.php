<?
if (strpos($_SERVER['HTTP_REFERER'], 'linkedin') !== false) {
    header('Location: https://www.linkedin.com/jobs/search/?f_C=13440071'); // go to website if you come from linkedin
} else { // display og:image, title & description for linkedin profile
    $title = 'Juven is hiring!';
    $description = 'Want to join our growing team? Juven is hiring senior developers, apply here!';
    $img = 'https://www.didierkrux.com/assets/img/talent_wanted.png';
    echo '<html>
    <head>
        <title>' . $title . '</title>
        <meta name="description" content="' . $description . '" />
        <meta property="og:image" content="' . $img . '" />
    </head>
    <body>
    <h2>How to add this link to your LinkedIn profile:</h2>
    <img src="http://g.recordit.co/nvZ248vaND.gif" />
    </body>
    </html>';
}
exit;
