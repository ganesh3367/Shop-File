const text = document.getElementById("animated-text");
const lines = text.innerHTML.split("<br>");
text.innerHTML = "";

lines.forEach((line, index) => {
    const span = document.createElement("span");
    span.innerHTML = line;
    span.style.display = "block";
    text.appendChild(span);

    gsap.from(span, {
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.2,
        scrollTrigger: {
            trigger: span,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
        },
    });
});

document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        targetElement.scrollIntoView({ behavior: 'smooth' });
    });
});
// GSAP Animation for "View All" Button
document.querySelectorAll('.load-more').forEach(button => {
    button.addEventListener('mouseenter', () => {
        gsap.to(button, {
            scale: 1.05,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    button.addEventListener('mouseleave', () => {
        gsap.to(button, {
            scale: 1,
            duration: 0.3,
            ease: "power2.out"
        });
    });

    button.addEventListener('click', () => {
        gsap.to(button, {
            scale: 0.9,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        });
    });
});