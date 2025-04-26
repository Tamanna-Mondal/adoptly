(function () {
    'use strict';
    document.addEventListener('DOMContentLoaded', function () {
        let form = document.getElementById('createForm');
        if (!form) return; 

        form.addEventListener('submit', function (event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
})();


// Banner


document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById("videoContainer");
    const dots = document.querySelectorAll(".nav-dot");
    let currentIndex = 0;
    const videos = document.querySelectorAll(".video-slide");
    const totalVideos = videos.length;

    function slideToVideo(index) {
        const offset = -(index * 100);
        gsap.to(container, {
            x: `${offset}vw`,
            duration: 1,
            ease: "power2.inOut",
            onComplete: () => currentIndex = index,
        });
        updateActiveDot(index);
    }

    function updateActiveDot(index) {
        dots.forEach((dot, i) => {
            dot.classList.toggle("active", i === index);
        });
    }

    function autoSlide() {
        setInterval(() => {
            const nextIndex = (currentIndex + 1) % totalVideos;
            slideToVideo(nextIndex);
        }, 5000);
    }

    window.handleDotClick = (index) => {
        slideToVideo(index);
    };

    autoSlide();
});