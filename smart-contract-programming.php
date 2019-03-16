<?
if (strpos($_SERVER['HTTP_REFERER'], 'linkedin') !== false) {
    header('Location: https://ivanontech.teachable.com/courses/287053/lectures/4422118'); // go to website if you come from linkedin
} else { // display og:image, title & description for linkedin profile
    $title = 'Smart Contract Programming';
    $description = 'Programming Smart Contracts & building DApps on Ethereum, EOS & NEM. Use of Developer Tools. Deployment to Test Net & Main Net.';
    $img = 'https://www.didierkrux.com/assets/img/certificate-of-completion-for-smart-contract-programming.png';
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
