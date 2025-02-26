document.addEventListener('DOMContentLoaded', function() {
    const projectItems = document.querySelectorAll('.project-item');
    const projectDetails = document.querySelector('.project-details');
    const description = document.querySelector('.project-details .description');
    const demoButton = document.querySelector('.project-details .demo-button');
    const readMoreButton = document.querySelector('.project-details .read-more-button');
    const projectDisplayImage = document.querySelector('.project-image-display .project-display-image');
    const overlay = document.querySelector('.image-overlay');
    const enlargedImage = overlay.querySelector('img');

    let currentProject = null;
    let typedInstance = null;

    // Hide buttons initially
    demoButton.style.display = 'none';
    readMoreButton.style.display = 'none';

    function startProjectAnimation(item) {
        // Show buttons before animation
        demoButton.style.display = 'inline-block';
        readMoreButton.style.display = 'inline-block';

        if (currentProject !== item) {
            currentProject = item;
            const desc = item.getAttribute('data-description');
            const demoLink = item.getAttribute('data-demo-link');
            const target = item.getAttribute('data-target') || "_self";
            const imageSrc = item.getAttribute('data-image'); // Get image source

            // Update demoButton href and target immediately
            demoButton.href = demoLink;
            demoButton.target = target;

            // Update button text and hide "Read More" for "Twisted Visions Studio"
            if (item.textContent.trim() === 'Twisted Visions Studio') {
                demoButton.textContent = 'Visit';
            } else {
                demoButton.textContent = 'Demo';
                readMoreButton.style.display = 'inline-block';
            }

            if (typedInstance) {
                typedInstance.destroy();
            }

            description.textContent = ''; // Clear description

            // Fade out the image immediately
            projectDisplayImage.classList.remove('fade-in');
            projectDisplayImage.classList.add('fade-out');

            // Introduce typos and corrections
            let typedText = '';
            let startIndex = Math.floor(desc.length / 2); // Start typos at the beginning of the last half
            for (let i = 0; i < desc.length; i++) {
                if (i >= startIndex && Math.random() < 0.05) { // 5% chance of typo
                    typedText += String.fromCharCode(Math.floor(Math.random() * 26) + 97); // Random lowercase letter
                } else {
                    typedText += desc[i];
                }
            }

            typedInstance = new Typed(description, {
                strings: [typedText, desc],
                typeSpeed: 10,
                backSpeed: 8,
                backDelay: function() {
                    return Math.random() * 1000 + 100;
                },
                showCursor: true,
                cursorChar: '|',
                onComplete: function(self) {
                    // Fade in the image when typing is complete
                    if (imageSrc) {
                        projectDisplayImage.src = imageSrc; // Set image source after fade in
                        projectDisplayImage.classList.remove('fade-out');
                        projectDisplayImage.classList.add('fade-in');
                    }
                }
            });

            // Add click event listener to image
            projectDisplayImage.addEventListener('click', function() {
                enlargedImage.src = imageSrc;
                overlay.classList.add('active');
                document.body.classList.add('blur');
            });
        }
    }

    // Add click event listener to overlay
    overlay.addEventListener('click', function() {
        overlay.classList.remove('active');
        document.body.classList.remove('blur');
    });

    projectItems.forEach(item => {
        item.addEventListener('mouseover', function() {
            startProjectAnimation(this);
        });

        item.addEventListener('click', function() {
            startProjectAnimation(this);
        });
    });

    if (currentProject === null) {
        demoButton.href = "";
        demoButton.target = "";
    }

    const wavingEmoji = document.querySelector('.waving-emoji');

    if (wavingEmoji) {
        wavingEmoji.addEventListener('click', function() {
            this.classList.add('waving'); // Add the class to start waving

            setTimeout(() => {
                this.classList.remove('waving'); // Remove the class after 2 seconds
            }, 2000); // 2000 milliseconds = 2 seconds
        });
    }
});