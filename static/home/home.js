document.addEventListener('DOMContentLoaded', function() {
    const projectItems = document.querySelectorAll('.project-item');
    const projectDetails = document.querySelector('.project-details');
    const description = document.querySelector('.project-details .description');
    const demoButton = document.querySelector('.project-details .demo-button');
    const readMoreButton = document.querySelector('.project-details .read-more-button');

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
                strings: [typedText, desc], // Type with typos, then correct
                typeSpeed: 1,
                backSpeed: 0,
                backDelay: function() { // Random backDelay
                    return Math.random() * 1000 + 100; // Random delay between 100ms and 1000ms
                },
                showCursor: true,
                cursorChar: '|'
                ,
                onComplete: function(self) {
                  /*const cursor = document.querySelector('.typed-cursor');
                  if (cursor) {
                      cursor.style.display = 'none';
                  }*/
                }
            });
        }
    }

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