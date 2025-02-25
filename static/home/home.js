document.addEventListener('DOMContentLoaded', function() {
    const projectItems = document.querySelectorAll('.project-item');
    const projectDetails = document.querySelector('.project-details');
    const description = document.querySelector('.project-details .description');
    const demoButton = document.querySelector('.project-details .demo-button');
    const readMoreButton = document.querySelector('.project-details .read-more-button');
    const customCursor = document.querySelector('.custom-cursor');

    let currentProject = null;
    let typedInstance = null;

    // Hide buttons initially
    demoButton.style.display = 'none';
    readMoreButton.style.display = 'none';

    projectItems.forEach(item => {
        item.addEventListener('mouseover', function() {
            // Hide buttons on new hover
            demoButton.style.display = 'none';
            readMoreButton.style.display = 'none';

            if (currentProject !== this) {
                currentProject = this;
                const desc = this.getAttribute('data-description');
                const demoLink = this.getAttribute('data-demo-link');
                const target = this.getAttribute('data-target') || "_self";

                if (typedInstance) {
                    typedInstance.destroy();
                }

                description.textContent = ''; // Clear description
                customCursor.style.display = 'inline'; // Show custom cursor

                typedInstance = new Typed(description, {
                    strings: [desc],
                    typeSpeed: 5,
                    showCursor: true,
                    cursorChar: '|',
                    onStart: function(self){
                        customCursor.style.display = 'inline'; //Ensure cursor is visible on start.
                    },
                    onComplete: function(self) {
                        demoButton.href = demoLink;
                        demoButton.target = target;
                        // Show buttons after animation
                        demoButton.style.display = 'inline-block';
                        readMoreButton.style.display = 'inline-block';
                        //customCursor.style.display = 'none'; // Hide custom cursor
                    }
                });
            }
        });
    });

    if(currentProject === null){
        demoButton.href = "";
        demoButton.target = "";
    }
});