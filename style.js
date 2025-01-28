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



/// Function to animate product containers
// Function to animate product containers
function animateProductContainers() {
    // Select all product containers
    document.querySelectorAll('.product').forEach((product, index) => {
        // Animate the product container
        gsap.from(product, {
            opacity: 0,
            x: 20, // Decrease the x-axis offset to 20
            duration: 0.8, // Decrease the animation duration to 0.8 seconds
            ease: "power2.out",
            scale: 0.9, // Decrease the scale effect to 0.9
            scrollTrigger: {
                trigger: product,
                start: "top 90%",
                end: "bottom 10%",
                scrub: 1,
                markers: false,
            },
        });

        // Animate the image container
        gsap.from(product.querySelector('img'), {
            opacity: 0,
            y: 10, // Decrease the y-axis offset to 10
            duration: 0.6, // Decrease the animation duration to 0.6 seconds
            ease: "power2.out",
            delay: 0.1, // Decrease the delay to 0.1 seconds
            scrollTrigger: {
                trigger: product,
                start: "top 90%",
                end: "bottom 10%",
                scrub: 1,
                markers: false,
            },
        });

        // Animate the cost container
        gsap.from(product.querySelector('.cost'), {
            opacity: 0,
            y: 5, // Decrease the y-axis offset to 5
            duration: 0.4, // Decrease the animation duration to 0.4 seconds
            ease: "power2.out",
            delay: 0.2, // Decrease the delay to 0.2 seconds
            scrollTrigger: {
                trigger: product,
                start: "top 90%",
                end: "bottom 10%",
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
// Add event listener to navigation links
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      targetElement.scrollIntoView({ behavior: 'smooth' });
    });
  });
 
