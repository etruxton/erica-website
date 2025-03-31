const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const recognizeButton = document.getElementById('recognizeButton');
const clearButton = document.getElementById('clearButton');
const resultDisplay = document.getElementById('resultDisplay');
let isDrawing = false;
let isAnnotated = false;

function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 300;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    resultDisplay.textContent = 'Please write in plain English.';
    resultDisplay.style.color = '#555';
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Mouse Events
canvas.addEventListener('mousedown', (e) => {
    if (isAnnotated) return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    draw((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || isAnnotated) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    draw((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    draw((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
    e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing || isAnnotated) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    draw((touch.clientX - rect.left) * scaleX, (touch.clientY - rect.top) * scaleY);
    e.preventDefault();
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
    resultDisplay.textContent = 'Please write in plain English.';
    resultDisplay.style.color = 'gray';
});

recognizeButton.addEventListener('click', () => {
    const imageData = canvas.toDataURL('image/png');
    resultDisplay.textContent = 'Loading...';
    resultDisplay.style.color = 'black';
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
                resultDisplay.style.color = 'black';
            }
        } else if (data.error) {
            resultDisplay.textContent = 'Error: ' + data.error;
            resultDisplay.style.color = 'red';
        }
    })
    .catch(error => {
        resultDisplay.textContent = 'An error occurred.';
        resultDisplay.style.color = 'red';
    })
    .finally(() => {
        if (!isAnnotated) {
            recognizeButton.disabled = false;
        }
    });
});

// Cursor change
canvas.addEventListener('mouseenter', () => {
    canvas.classList.add('drawing-active');
    console.log('Mouse entered canvas');
});

canvas.addEventListener('mouseleave', () => {
    canvas.classList.remove('drawing-active');
});