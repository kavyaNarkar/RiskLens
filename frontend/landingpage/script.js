// Register GSAP plugins
gsap.registerPlugin(TextPlugin);

document.addEventListener('DOMContentLoaded', () => {

    // Simple Preloader Timeline (Clean White Theme)
    const tl = gsap.timeline({
        onComplete: () => {
            gsap.to("#preloader", {
                duration: 1,
                opacity: 0,
                ease: "power2.inOut",
                onComplete: () => {
                    document.getElementById("preloader").style.display = "none";
                    animateMinimalistLanding();
                }
            });
        }
    });

    // Simulate loading
    tl.to({}, { duration: 1.5 });

    // Minimalist Landing Page Animation
    function animateMinimalistLanding() {
        const landingTl = gsap.timeline();

        // 1. Reveal Navbar Elements (Floating Down)
        landingTl.to([".navbar", ".logo", ".nav-cta"], {
            duration: 1.2,
            y: 0,
            opacity: 1,
            stagger: 0.1,
            ease: "elastic.out(1, 0.75)"
        });

        // 1b. Scramble Logo Text
        // 1b. Scramble Logo Text (Custom Implementation)
        const logoText = document.querySelector(".logo-text");
        const finalLogoText = "RiskLens";
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*";

        landingTl.to({}, {
            duration: 1.5,
            onUpdate: function () {
                const progress = this.progress();
                const len = finalLogoText.length;
                const revealed = Math.floor(progress * len);
                let output = "";

                for (let i = 0; i < len; i++) {
                    if (i < revealed) {
                        output += finalLogoText[i];
                    } else {
                        output += chars[Math.floor(Math.random() * chars.length)];
                    }
                }
                if (logoText) logoText.textContent = output;
            }
        }, "<");

        // 2. Reveal Hero Content
        landingTl.to(".hero-section", {
            duration: 0.1,
            opacity: 1
        }, "<")

            .from(".hero-content h1", {
                duration: 1,
                y: 50,
                opacity: 0,
                ease: "power3.out"
            }, "-=0.8")

            .from(".hero-content p", {
                duration: 1,
                y: 30,
                opacity: 0,
                ease: "power2.out"
            }, "-=0.6")

            .from(".hero-btns .btn", {
                duration: 0.8,
                y: 20,
                opacity: 0,
                stagger: 0.15,
                ease: "back.out(1.7)"
            }, "-=0.6")

            .from(".stat-item", {
                duration: 0.8,
                y: 20,
                opacity: 0,
                stagger: 0.1,
                ease: "power2.out"
            }, "-=0.4");

        // 3. Hero Visual Animation (Complex)

        // Circle Scale
        landingTl.from(".visual-circle", {
            duration: 1.5,
            scale: 0,
            opacity: 0,
            ease: "power2.out"
        }, "-=2.0");

        // Icon Pop
        landingTl.from(".hero-icon", {
            duration: 1,
            scale: 0,
            rotation: -180,
            opacity: 0,
            ease: "back.out(1.7)"
        }, "-=1.2");

        // Floating Cards Entry
        landingTl.from(".floating-card", {
            duration: 0.8,
            x: 50,
            opacity: 0,
            stagger: 0.2,
            ease: "power3.out"
        }, "-=0.8");

        // 4. Continuous Floating Animations

        // Hero Icon Float
        gsap.to(".hero-icon", {
            y: -20,
            duration: 4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        // Circle Pulse
        gsap.to(".visual-circle", {
            scale: 1.1,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        // Floating Cards random float
        gsap.to(".card-1", {
            y: -15,
            x: 5,
            duration: 3.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 0.5
        });

        gsap.to(".card-2", {
            y: 15,
            x: -5,
            duration: 4,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 1
        });
    }

    // Interactive Elements Logic
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    const interactiveBg = document.querySelector('.interactive-bg');

    document.addEventListener('mousemove', (e) => {
        // Move Cursor
        gsap.to(cursor, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.1
        });

        gsap.to(follower, {
            x: e.clientX,
            y: e.clientY,
            duration: 0.3
        });

        // Move Background (Parallax)
        gsap.to(interactiveBg, {
            x: e.clientX,
            y: e.clientY,
            duration: 1.5,
            ease: "power2.out"
        });
    });

    // Hover Effects for Interactive Elements
    const interactiveTargets = document.querySelectorAll('a, button, .btn, .nav-cta, .logo');

    interactiveTargets.forEach(el => {
        el.addEventListener('mouseenter', () => {
            gsap.to(follower, {
                scale: 1.5,
                backgroundColor: "rgba(37, 99, 235, 0.2)",
                duration: 0.3
            });
        });

        el.addEventListener('mouseleave', () => {
            gsap.to(follower, {
                scale: 1,
                backgroundColor: "rgba(37, 99, 235, 0.1)",
                duration: 0.3
            });
        });
    });



    // ScrollTrigger Animations
    gsap.registerPlugin(ScrollTrigger);

    // Features Header Animation
    gsap.to(".features-header", {
        scrollTrigger: {
            trigger: ".features-section",
            start: "top 80%",
            toggleActions: "play none none reverse"
        },
        y: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out"
    });

    // Features Grid Animation
    gsap.to(".feature-card", {
        scrollTrigger: {
            trigger: ".features-grid",
            start: "top 85%",
            toggleActions: "play none none reverse"
        },
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.2,
        ease: "power3.out"
    });

    // About Section Animation
    const aboutTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".about-section",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });

    aboutTl.to(".about-text", {
        x: 0,
        opacity: 1,
        duration: 1,
        ease: "power3.out"
    })
        .to(".about-visual", {
            x: 0,
            opacity: 1,
            duration: 1,
            ease: "power3.out"
        }, "-=0.8");

    // App Tour Animation
    gsap.to(".tour-step", {
        scrollTrigger: {
            trigger: ".tour-steps",
            start: "top 85%",
            toggleActions: "play none none reverse"
        },
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.3,
        ease: "power3.out"
    });

    // Mission Hub Animation
    const missionTl = gsap.timeline({
        scrollTrigger: {
            trigger: ".mission-hub-section",
            start: "top 75%",
            toggleActions: "play none none reverse"
        }
    });

    missionTl.to(".mission-hub-section", {
        autoAlpha: 1,
        duration: 0.5
    })
        .from(".mission-content h2", {
            y: 30,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        }, "-=0.2")
        .from(".mission-statement", {
            y: 20,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out"
        }, "-=0.6")
        .to(".mission-pill", {
            y: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.1,
            ease: "back.out(1.7)"
        }, "-=0.4");

    // Cyber Security Insights Logic
    const insightWindow = document.getElementById('insightWindow');
    const insightText = document.getElementById('insightText');
    const insightProgress = document.getElementById('insightProgress');
    const insightContent = document.getElementById('insightContent');

    if (insightWindow && insightText && insightProgress && insightContent) {
        const insights = [
            "95% of cybersecurity breaches are caused by human error.",
            "Phishing attacks have increased by 48% in the last year.",
            "A cyber attack occurs every 39 seconds on average.",
            "Using multi-factor authentication blocks 99.9% of automated attacks.",
            "The average cost of a data breach is $4.45 million.",
            "Update your software regularly to patch known vulnerabilities.",
            "Small businesses are the target of 43% of cyber attacks.",
            "IoT devices are attacked within 5 minutes of connecting to the internet.",
            "Ransomware attacks happen every 11 seconds."
        ];

        let index = 0;

        function updateInsight() {
            // Fade out
            insightContent.classList.remove('active');

            setTimeout(() => {
                // Change text
                insightText.textContent = insights[index];
                index = (index + 1) % insights.length;

                // Fade in
                insightContent.classList.add('active');

                // Reset and animate progress bar
                insightProgress.style.transition = 'none';
                insightProgress.style.width = '0%';

                setTimeout(() => {
                    insightProgress.style.transition = 'width 6s linear';
                    insightProgress.style.width = '100%';
                }, 50);

            }, 500); // Wait for fade out
        }

        // Initial call
        setTimeout(updateInsight, 100);

        // Rotate every 6.5 seconds (6s for bar + 0.5s buffer)
        setInterval(updateInsight, 6500);
    }
});
