<?
if (strpos($_SERVER['HTTP_REFERER'], 'linkedin') !== false) {
    header('Location: https://ivanontech.teachable.com/courses/blockchain-fundamentals/lectures/4284700'); // go to website if you come from linkedin
} else { // display og:image, title & description for linkedin profile
    $title = 'Blockchain Deep Fundamentals';
    $description = 'Benefits of using Blockchain, Cryptography, Bitcoin & Ethereum Basics, Scaling, Consensus Algorithms & Mining, UTXO Model, Tokens, ICO, Smart Contracts & Blockchain Use Cases.';
    $img = 'https://www.didierkrux.com/assets/img/certificate-of-completion-for-blockchain-deep-fundamentals.png';
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