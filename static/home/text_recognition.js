const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const recognizeButton = document.getElementById('recognizeButton'); // Get the recognize button
const clearButton = document.getElementById('clearButton'); // Get the clear button
let isDrawing = false;
let isAnnotated = false; // Track if the annotated image is displayed

// Set canvas background to white
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Drawing functionality
canvas.addEventListener('mousedown', (e) => {
    if (isAnnotated) return; // Disable drawing if annotated image is displayed
    isDrawing = true;
    draw(e.offsetX, e.offsetY);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || isAnnotated) return; // Disable drawing if annotated image is displayed
    draw(e.offsetX, e.offsetY);
});

canvas.addEventListener('mouseup', () => {
    if (isAnnotated) return; // Disable drawing if annotated image is displayed
    isDrawing = false;
    ctx.beginPath();
});

function draw(x, y) {
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

// Clear button functionality
clearButton.addEventListener('click', () => {
    // Clear canvas and reset background to white
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Reset the annotated image flag
    isAnnotated = false;

    // Re-enable the recognize button
    recognizeButton.disabled = false;

    // Clear the result display
    document.getElementById('resultDisplay').textContent = '';
});

recognizeButton.addEventListener('click', () => {
    const imageData = canvas.toDataURL('image/png');

    // Display loading message
    resultDisplay.textContent = 'Loading...';

    // Disable the recognize button
    recognizeButton.disabled = true;

    fetch('/recognize_text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
    })
    .then(response => {
        return response.json();
    })
    .then(data => {
        // Clear loading message
        resultDisplay.textContent = '';

        if (data.annotated_image) {
            const img = new Image();
            img.src = `data:image/png;base64,${data.annotated_image}`;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                isAnnotated = true;
                recognizeButton.disabled = true; // Keep disabled after success
            };

            if (data.text) {
                resultDisplay.textContent = 'Recognized text: ' + data.text;
            }
        } else if (data.error) {
            resultDisplay.textContent = 'Error: ' + data.error;
        }
    })
    .catch(error => {
        resultDisplay.textContent = 'An error occurred.';
    })
    .finally(() => {
        // Re-enable the recognize button if not successful
        if (!isAnnotated) {
            recognizeButton.disabled = false;
        }
    });
});