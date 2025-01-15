gsap.registerPlugin(ScrollTrigger);

gsap.from("#page2 .text-content", {
    opacity: 0,
    y: 100,
    duration: 1.5,
    scrollTrigger: {
        trigger: "#page2",
        start: "top 80%",
        end: "bottom 20%",
        scrub: 1,
        markers: false,
    },
});

gsap.from("#page2 .image-content", {
    opacity: 0,
    x: 100,
    duration: 1.5,
    scrollTrigger: {
        trigger: "#page2",
        start: "top 80%",
        end: "bottom 20%",
        scrub: 1,
        markers: false,
    },
});

gsap.to("#page2", {
    y: -100,
    scrollTrigger: {
        trigger: "#page2",
        start: "top top",
        end: "bottom top",
        scrub: 1,
    },
});

document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        targetElement.scrollIntoView({ behavior: 'smooth' });
    });
});

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
document.querySelectorAll('.product img').forEach(image => {
    image.addEventListener('mouseenter', () => {
      gsap.to(image, {
        scale: 1.1,
        duration: 0.3,
        ease: "power2.out"
      });
    });
  
    image.addEventListener('mouseleave', () => {
      gsap.to(image, {
        scale: 1,
        duration: 0.3,
        ease: "power2.out"
      });
    });
  });



// Function to animate product containers
function animateProductContainers() {
    // Select all product containers
    document.querySelectorAll('.product').forEach((product, index) => {
        // Animate the product container
        gsap.from(product, {
            opacity: 0,
            y: 200, // Increase the y-axis offset to 200
            duration: 2, // Increase the animation duration to 2 seconds
            ease: "power2.out",
            scale: 0.5, // Add a scale effect to the animation
            scrollTrigger: {
                trigger: product,
                start: "top 95%",
                end: "bottom 5%",
                scrub: 1,
                markers: false,
            },
        });

        // Animate the text container
        gsap.from(product.querySelector('.text-container'), {
            opacity: 0,
            y: 100, // Increase the y-axis offset to 100
            duration: 1.5, // Increase the animation duration to 1.5 seconds
            ease: "power2.out",
            delay: 0.5,
            scrollTrigger: {
                trigger: product,
                start: "top 95%",
                end: "bottom 5%",
                scrub: 1,
                markers: false,
            },
        });

        // Animate the image container
        gsap.from(product.querySelector('.image-container'), {
            opacity: 0,
            x: 100, // Increase the x-axis offset to 100
            duration: 1.5, // Increase the animation duration to 1.5 seconds
            ease: "power2.out",
            delay: 0.5,
            scrollTrigger: {
                trigger: product,
                start: "top 95%",
                end: "bottom 5%",
                scrub: 1,
                markers: false,
            },
        });
    });
}

// Call the function to animate product containers
animateProductContainers();

        // Animate the text container
        gsap.from(product.querySelector('.text-container'), {
            opacity: 0,
            y: 50,
            duration: 1,
            ease: "power2.out",
            delay: 0.5,
            scrollTrigger: {
                trigger: product,
                start: "top 80%",
                end: "bottom 20%",
                scrub: 1,
                markers: false,
            },
        });

        // Animate the image container
        gsap.from(product.querySelector('.image-container'), {
            opacity: 0,
            x: 50,
            duration: 1,
            ease: "power2.out",
            delay: 0.5,
            scrollTrigger: {
                trigger: product,
                start: "top 80%",
                end: "bottom 20%",
                scrub: 1,
                markers: false,
            },
        });

// Call the function to animate product containers
animateProductContainers();
