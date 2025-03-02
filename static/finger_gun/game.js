document.addEventListener('DOMContentLoaded', function() {
    const video = document.createElement('video');
    video.style.display = 'none';
    document.body.appendChild(video);

    const captureCanvas = document.createElement('canvas');
    const captureContext = captureCanvas.getContext('2d');

    const videoStream = document.createElement('img');
    videoStream.src = '/finger_gun/processed_stream'; // Flask endpoint
    document.body.appendChild(videoStream);

    async function getWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                captureCanvas.width = video.videoWidth;
                captureCanvas.height = video.videoHeight;
                captureFrames();
            };
        } catch (error) {
            console.error('Error accessing webcam:', error);
        }
    }

    const desiredFps = 20;
    const frameInterval = 1000 / desiredFps; // Milliseconds per frame

    async function captureFrames() {
        captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
        const frameData = captureCanvas.toDataURL('image/jpeg', 0.8);
        const frameBase64 = frameData.split(',')[1];

        try {
            await fetch('/finger_gun/process_frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ frame: frameBase64 }),
            });
        } catch (error) {
            console.error('Error sending frame:', error);
        }

        //requestAnimationFrame(captureFrames);

        setTimeout(captureFrames, frameInterval);
    }

    getWebcam();
});