document.addEventListener('DOMContentLoaded', function () {
    const video = document.createElement('video');
    video.id = 'video';
    video.style.display = 'none';
    video.width = 640;
    video.height = 480;
    video.autoplay = true;
    document.body.appendChild(video);

    const captureCanvas = document.createElement('canvas');
    const captureContext = captureCanvas.getContext('2d');
    captureCanvas.width = 640;
    captureCanvas.height = 480;

    const outputCanvas = document.getElementById('outputCanvas');
    const outputContext = outputCanvas.getContext('2d');

    let targetFps = 15; // 15 frames per second
    let lastFrameTime = 0;
    let frameBuffer = []; // Buffer to store incoming frames
    let isProcessingFrame = false; // Flag to prevent overlapping frame processing
    const maxBufferSize = 1; // Maximum number of frames to buffer

    // Connect to the WebSocket server with the correct namespace
    const socket = io('/finger_gun');
    
    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
    });

    socket.on('processed_frame', (data) => {
        // Add the processed frame to the buffer
        frameBuffer.push(data.processed_frame);

        // If the buffer exceeds the maximum size, discard the oldest frame
        if (frameBuffer.length > maxBufferSize) {
            frameBuffer.shift(); // Remove the oldest frame
        }

        // If no frame is currently being processed, start processing the buffer
        if (!isProcessingFrame) {
            processFrameBuffer();
        }
    });

    socket.on('error', (data) => {
        console.error('Error from server:', data.error);
    });

    async function getWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        } catch (error) {
            console.error('Error accessing webcam:', error);
        }
    }

    function sendFrame() {
        if (document.visibilityState !== 'visible') {
            return; // Skip frame if tab is not visible
        }

        captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        const frameData = captureCanvas.toDataURL('image/jpeg', 0.8);
        const frameBase64 = frameData.split(',')[1];

        // Send the frame to the server via WebSocket
        socket.emit('frame', { frame: frameBase64 });
        //console.log('Sent frame to server' + frameBase64);
    }

    function frameLoop(timestamp) {
        if (!lastFrameTime) {
            lastFrameTime = timestamp;
        }

        const deltaTime = timestamp - lastFrameTime;

        if (deltaTime >= (1000 / targetFps)) {
            sendFrame();
            lastFrameTime = timestamp;
        }

        requestAnimationFrame(frameLoop);
    }

    function processFrameBuffer() {
        if (frameBuffer.length === 0) {
            isProcessingFrame = false; // No more frames to process
            return;
        }

        isProcessingFrame = true;

        // Get the next frame from the buffer
        const processedFrameBase64 = frameBuffer.shift();

        // Display the frame
        const processedImage = new Image();
        processedImage.src = 'data:image/jpeg;base64,' + processedFrameBase64;
        processedImage.onload = () => {
            outputContext.drawImage(processedImage, 0, 0, outputCanvas.width, outputCanvas.height);

            // Schedule the next frame to be processed after the target frame delay
            setTimeout(processFrameBuffer, 1000 / targetFps);
        };
    }

    getWebcam();

    video.addEventListener('loadeddata', () => {
        requestAnimationFrame(frameLoop); // Start the frame loop
    });
});