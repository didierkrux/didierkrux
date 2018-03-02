// tooltip
$(function () {
    $('[data-toggle="tooltip"]').tooltip()
})

// scroll animation
$('.navbar a[href*="#"]').not('[href="#"]').not('[href="#0"]').click(function (event) {
    // On-page links
    if (
        location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '')
        &&
        location.hostname == this.hostname
    ) {
        // Figure out element to scroll to
        var target = $(this.hash);
        target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
        // Does a scroll target exist?
        if (target.length) {
            // Only prevent default if animation is actually gonna happen
            event.preventDefault();
            $('html, body').animate({
                scrollTop: target.offset().top-48
            }, 600, function () {
                // Callback after animation
                // Must change focus!
                var $target = $(target);
                $target.focus();
                if ($target.is(":focus")) { // Checking if the target was focused
                    return false;
                } else {
                    $target.attr('tabindex', '-1'); // Adding tabindex for elements not focusable
                    $target.focus(); // Set focus again
                };
            });
        }
    }
});

// active scroll top
$(window).scroll(function() {
    if ($(window).scrollTop() > 0) {
        $('.navbar').addClass('active-top');
    } else {
        $('.navbar').removeClass('active-top');
    }

}).scroll();