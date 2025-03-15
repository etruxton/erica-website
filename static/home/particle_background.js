document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let mouseX = null;
    let mouseY = null;

    let particleCount = 75; // Default particle count
    const baseParticleSize = 1;
    const particleSpeed = 0.5;
    const interactionRadius = 20;
    const teleportDelay = 500;
    const colors = ["#007bff", "#ff0000", "#00ff00", "#ff00ff", "#ff8c00", "#00ffff", "#800080", "#ffff00"];
    const minFadeDuration = 1000;
    const maxFadeDuration = 5000;
    const maxFadeDelay = 10000;
    const smallScreenWidth = 480; // Threshold for smaller screen

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Adjust particle count based on screen width
        if (window.innerWidth < smallScreenWidth) {
            particleCount = 30; // Fewer particles for small screens
        } else {
            particleCount = 75; // Default particle count for larger screens
        }

        createParticles(); // Recreate particles with the new count
    }

    function createParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            const fadeDuration = Math.random() * (maxFadeDuration - minFadeDuration) + minFadeDuration;

            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * particleSpeed,
                vy: (Math.random() - 0.5) * particleSpeed,
                color: randomColor,
                touchStartTime: null,
                size: baseParticleSize + Math.random(),
                opacity: Math.random() * 0.5 + 0.3,
                life: 1,
                fadeDelay: Math.random() * maxFadeDelay,
                fadeStartTime: null,
                fadeDuration: fadeDuration,
                fadeProgress: 0
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(particle => {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${parseInt(particle.color.slice(1, 3), 16)}, ${parseInt(particle.color.slice(3, 5), 16)}, ${parseInt(particle.color.slice(5, 7), 16)}, ${particle.opacity * particle.life})`;
            ctx.fill();
        });
    }

    function updateParticles() {
        const now = Date.now();

        particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

            if (mouseX !== null && mouseY !== null) {
                const dx = mouseX - particle.x;
                const dy = mouseY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < interactionRadius) {
                    if (particle.touchStartTime === null) {
                        particle.touchStartTime = now;
                    } else if (now - particle.touchStartTime >= teleportDelay) {
                        particle.x = Math.random() * canvas.width;
                        particle.y = Math.random() * canvas.height;
                        particle.touchStartTime = null;
                    }
                } else {
                    particle.touchStartTime = null;
                }

                if (distance < interactionRadius * 5) {
                    const angle = Math.atan2(dy, dx);
                    particle.vx += Math.cos(angle) * 0.025;
                    particle.vy += Math.sin(angle) * 0.025;

                    const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
                    if (speed > particleSpeed * 0.75) {
                        particle.vx = (particle.vx / speed) * particleSpeed * 0.75;
                        particle.vy = (particle.vy / speed) * particleSpeed * 0.75;
                    }
                }
            } else {
                particle.touchStartTime = null;
            }

            if (particle.fadeStartTime === null && now >= particle.fadeDelay) {
                particle.fadeStartTime = now;
            }

            if (particle.fadeStartTime !== null) {
                particle.fadeProgress = now - particle.fadeStartTime;
                particle.life = 1 - (particle.fadeProgress / particle.fadeDuration);
            }

            if (particle.life <= 0) {
                particle.x = Math.random() * canvas.width;
                particle.y = Math.random() * canvas.height;
                particle.vx = (Math.random() - 0.5) * particleSpeed;
                particle.vy = (Math.random() - 0.5) * particleSpeed;
                particle.life = 1;
                particle.opacity = Math.random() * 0.5 + 0.3;
                particle.color = colors[Math.floor(Math.random() * colors.length)];
                particle.fadeDelay = Math.random() * maxFadeDelay;
                particle.fadeDuration = Math.random() * (maxFadeDuration - minFadeDuration) + minFadeDuration;
                particle.fadeStartTime = null;
                particle.fadeProgress = 0;
            }
        });
    }

    function animate() {
        updateParticles();
        drawParticles();
        requestAnimationFrame(animate);
    }

    resizeCanvas();
    createParticles();
    animate();

    window.addEventListener('resize', () => {
        resizeCanvas();
    });

    window.addEventListener('mousemove', (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;
    });

    window.addEventListener('mouseout', () => {
        mouseX = null;
        mouseY = null;
    });
});