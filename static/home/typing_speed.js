document.addEventListener('DOMContentLoaded', function () {
    const typingSentence = "The quick brown fox jumps over the lazy dog.";
    const typingContainer = document.createElement('div');
    typingContainer.classList.add('typing-container', 'card');

    const sentenceDisplay = document.createElement('p');
    typingContainer.appendChild(sentenceDisplay);

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = "Start typing here...";
    typingContainer.appendChild(inputField);

    const resultDisplay = document.createElement('p');
    typingContainer.appendChild(resultDisplay);

    const timerIndicatorContainer = document.createElement('div');
    timerIndicatorContainer.classList.add('timer-indicator-container');
    typingContainer.appendChild(timerIndicatorContainer);

    const timerDisplay = document.createElement('p');
    timerDisplay.classList.add('timer-display');
    timerIndicatorContainer.appendChild(timerDisplay);

    const restartIndicator = document.createElement('p');
    restartIndicator.textContent = "Press TAB to restart";
    restartIndicator.classList.add('restart-indicator');
    timerIndicatorContainer.appendChild(restartIndicator);

    document.querySelector('.content').appendChild(typingContainer);

    const capybara = document.createElement('img');
    capybara.src = "static/home/assets/images/capybara_0.png";
    capybara.classList.add('capybara');
    typingContainer.appendChild(capybara); // Append to the typing container

    let startTime;
    let endTime;
    let started = false;
    let timerInterval;

    let capybaraFrame = 0;
    let capybaraPosition = 10;
    let lastCorrectLength = 0; // Track the last correct length of the typed text
    let capybaraRotation = 0; // Initialize rotation angle
    let congratsInterval; // Interval for the celebration animation

    function updateCapybara() {
        // Determine the movement distance based on screen width
        const movementDistance = window.innerWidth < 480 ? 5 : 10; // Move less on smaller screens
    
        // Advance the frame (loop back to 0 after frame 3)
        capybaraFrame = (capybaraFrame + 1) % 4;
        capybara.src = `static/home/assets/images/capybara_${capybaraFrame}.png`;
    
        // Move the capybara
        capybaraPosition += movementDistance; // Adjust the increment based on screen width
        capybara.style.left = `${capybaraPosition}px`;
    }
    
    window.addEventListener('resize', function () {
        // Reset the capybara's position when the screen is resized
        capybaraPosition = 10; // Reset position
        capybara.style.left = `${capybaraPosition}px`;
    });

    function resetTest() {
        inputField.value = "";
        updateSentenceDisplay("");
        resultDisplay.textContent = "";
        timerDisplay.textContent = "Time: 0.00 seconds";
        inputField.disabled = false;
        started = false;
        clearInterval(timerInterval);
        sentenceDisplay.textContent = typingSentence;
        capybaraFrame = 0;
        capybara.src = `static/home/assets/images/capybara_${capybaraFrame}.png`;
        capybaraPosition = 10; // Reset position
        capybara.style.left = `${capybaraPosition}px`;
        inputField.disabled = false;
        lastCorrectLength = 0; // Reset the last correct length
        capybara.style.transform = `rotate(0deg)`; // Reset rotation
    }

    function updateSentenceDisplay(typedText) {
        let highlightedSentence = '';
        let isCorrect = true; // Flag to track if the current letter is correct

        for (let i = 0; i < typingSentence.length; i++) {
            if (i < typedText.length) {
                if (typedText[i] === typingSentence[i]) {
                    highlightedSentence += `<span class="correct">${typingSentence[i]}</span>`;
                } else {
                    highlightedSentence += `<span class="incorrect">${typingSentence[i]}</span>`;
                    isCorrect = false; // Set to false if any incorrect letter is found
                }
            } else {
                highlightedSentence += typingSentence[i];
            }
        }
        sentenceDisplay.innerHTML = highlightedSentence;

        // Update the capybara only if all typed letters are correct and the length has increased
        if (isCorrect && typedText.length > lastCorrectLength) {
            updateCapybara(); // Move the capybara one frame and position
            lastCorrectLength = typedText.length; // Update the last correct length
        } else if (!isCorrect) {
            // Reset the capybara frame if incorrect
            capybaraFrame = 0;
            capybara.src = `static/home/assets/images/capybara_${capybaraFrame}.png`;
        }
    }

    function updateTimerDisplay() {
        const currentTime = new Date().getTime();
        const elapsedTime = (currentTime - startTime) / 1000;
        timerDisplay.textContent = `Time: ${elapsedTime.toFixed(2)} seconds`;
    }

    function animateCapybaraCongrats() {
        capybaraRotation += 10; // Adjust rotation speed as needed
        capybara.style.transform = `rotate(${capybaraRotation}deg)`;
        capybaraFrame = (capybaraFrame + 1) % 4; // Continue animation frames
        capybara.src = `static/home/assets/images/capybara_${capybaraFrame}.png`;
    }

    function handleTestCompletion() {
        endTime = new Date().getTime();
        clearInterval(timerInterval);
        const timeTaken = (endTime - startTime) / 1000;
        const words = typingSentence.split(' ').length;
        const wpm = Math.round((words / timeTaken) * 60);

        sentenceDisplay.textContent = `You typed it in ${timeTaken.toFixed(2)} seconds. Your typing speed is ${wpm} WPM.`;
        inputField.disabled = true;

        // Start the celebration animation
        congratsInterval = setInterval(animateCapybaraCongrats, 50);

        // Reset the test after 5 seconds
        setTimeout(() => {
            clearInterval(congratsInterval); // Stop the celebration animation
            resetTest(); // Reset the test
        }, 5000); // 5 seconds delay
    }

    inputField.addEventListener('input', function () {
        if (!started) {
            startTime = new Date().getTime();
            started = true;
            timerInterval = setInterval(updateTimerDisplay, 10);
        }

        updateSentenceDisplay(inputField.value);

        if (inputField.value === typingSentence) {
            handleTestCompletion();
        }
    });

    inputField.addEventListener('keydown', function (event) {
        if (event.key === 'Tab') {
            event.preventDefault();
            resetTest();
        }
    });

    updateSentenceDisplay("");
    timerDisplay.textContent = "Time: 0.00 seconds";
});