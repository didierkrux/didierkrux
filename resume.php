<?
if (strpos($_SERVER['HTTP_REFERER'], 'linkedin') === false) {
    header('Location: resume.html');    // display og:image for linkedin profile
} else {
    header('Location: https://krux.co/resume');     // go to dl page if you come from linkedin
}
exit;
