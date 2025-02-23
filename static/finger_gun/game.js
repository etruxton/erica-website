document.addEventListener('DOMContentLoaded', function() {
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

    let targetFps = 15; // Initial FPS
    let lastFrameTime = 0;

    async function getWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        } catch (error) {
            console.error('Error accessing webcam:', error);
        }
    }

    async function sendFrame() {
        if (document.visibilityState !== 'visible') {
            return; // Skip frame if tab is not visible
        }

        const startTime = performance.now();
        captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        const frameData = captureCanvas.toDataURL('image/jpeg', 0.8);
        const frameBase64 = frameData.split(',')[1];

        try {
            const response = await fetch('/finger_gun/video_feed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ frame: frameBase64 }),
            });

            if (response.ok) {
                const data = await response.json();
                const endTime = performance.now();
                const responseTime = endTime - startTime;

                if (data.processed_frame) {
                    const processedImage = new Image();
                    processedImage.src = 'data:image/jpeg;base64,' + data.processed_frame;
                    processedImage.onload = () => {
                        outputContext.drawImage(processedImage, 0, 0, outputCanvas.width, outputCanvas.height);
                    };
                } else if (data.error) {
                    console.error("error from server: ", data.error);
                }

                adjustFps(responseTime); // Adjust FPS based on response time
            } else {
                console.error('Error sending frame:', response.status);
            }
        } catch (error) {
            console.error('Error sending frame:', error);
        }
    }

    function adjustFps(responseTime) {
        let newFps = targetFps;

        if (responseTime > 150) {
            newFps = 10;
        } else if (responseTime <= 50) {
            newFps = 20;
        } else {
            newFps = 15;
        }

        if (newFps !== targetFps) {
            targetFps = newFps;
            //console.log("New FPS: ", targetFps);
        }
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
        requestAnimationFrame(frameLoop); // Start the frame loop
    });
});