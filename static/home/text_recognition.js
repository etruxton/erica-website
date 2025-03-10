const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const recognizeButton = document.getElementById('recognizeButton');
const clearButton = document.getElementById('clearButton');
let isDrawing = false;
let isAnnotated = false;

ctx.fillStyle = 'white';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Mouse Events
canvas.addEventListener('mousedown', (e) => {
    if (isAnnotated) return;
    isDrawing = true;
    draw(e.offsetX, e.offsetY);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || isAnnotated) return;
    draw(e.offsetX, e.offsetY);
});

canvas.addEventListener('mouseup', () => {
    if (isAnnotated) return;
    isDrawing = false;
    ctx.beginPath();
});

// Touch Events
canvas.addEventListener('touchstart', (e) => {
    if (isAnnotated) return;
    isDrawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    draw(touch.clientX - rect.left, touch.clientY - rect.top);
    e.preventDefault(); // Prevent scrolling
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing || isAnnotated) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    draw(touch.clientX - rect.left, touch.clientY - rect.top);
    e.preventDefault(); // Prevent scrolling
}, { passive: false });

canvas.addEventListener('touchend', () => {
    if (isAnnotated) return;
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

clearButton.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    isAnnotated = false;
    recognizeButton.disabled = false;
    document.getElementById('resultDisplay').textContent = '';
});

recognizeButton.addEventListener('click', () => {
    const imageData = canvas.toDataURL('image/png');
    resultDisplay.textContent = 'Loading...';
    recognizeButton.disabled = true;

    fetch('/recognize_text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
    })
    .then(response => response.json())
    .then(data => {
        resultDisplay.textContent = '';
        if (data.annotated_image) {
            const img = new Image();
            img.src = `data:image/png;base64,${data.annotated_image}`;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                isAnnotated = true;
                recognizeButton.disabled = true;
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
        if (!isAnnotated) {
            recognizeButton.disabled = false;
        }
    });
});