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

    let targetFps = 30; // Initial FPS
    let lastFrameTime = 0;
    let sendTime = 0; // Timestamp when frame is sent

    const socket = io('/finger_gun');

    socket.on('connect', () => {
        console.log('Connected to WebSocket server');
    });

    socket.on('processed_frame', (data) => {
        const receiveTime = performance.now(); // Timestamp when frame is received
        const responseTime = receiveTime - sendTime; // Calculate response time

        if (responseTime > 50) {
            targetFps = 10; // Drop FPS if response time is above 50ms
        } else {
            targetFps = 30; // Restore FPS if response time is below 50ms
        }

        const processedImage = new Image();
        processedImage.src = 'data:image/jpeg;base64,' + data.processed_frame;
        processedImage.onload = () => {
            outputContext.drawImage(processedImage, 0, 0, outputCanvas.width, outputCanvas.height);
        };
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
            return;
        }

        captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);

        const frameData = captureCanvas.toDataURL('image/jpeg', 0.7);
        const frameBase64 = frameData.split(',')[1];

        sendTime = performance.now(); // Timestamp before sending
        socket.emit('frame', { frame: frameBase64 });
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

    getWebcam();

    video.addEventListener('loadeddata', () => {
        requestAnimationFrame(frameLoop);
    });

    const idleTimeout = 30000;
    socket.on('frame', (data) => {
        clearTimeout(socket.idleTimer);
        socket.idleTimer = setTimeout(() => {
            socket.disconnect();
        }, idleTimeout);

        handleFrame(data);
    });
});