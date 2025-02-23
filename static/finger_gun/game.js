document.addEventListener('DOMContentLoaded', function() {
    // Create the video element dynamically
    const video = document.createElement('video');
    video.id = 'video';
    video.style.display = 'none';
    video.width = 640;
    video.height = 480;
    video.autoplay = true;
    document.body.appendChild(video);

    const captureCanvas = document.createElement('canvas'); // Canvas for capturing frames
    const captureContext = captureCanvas.getContext('2d');
    captureCanvas.width = 640;
    captureCanvas.height = 480;

    const outputCanvas = document.getElementById('outputCanvas'); // Canvas for displaying processed frames
    const outputContext = outputCanvas.getContext('2d');

    async function getWebcam() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
        } catch (error) {
            console.error('Error accessing webcam:', error);
        }
    }

    async function sendFrame() {
        captureContext.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height); // Draw on capture canvas
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
                if (data.processed_frame) {
                    const processedImage = new Image();
                    processedImage.src = 'data:image/jpeg;base64,' + data.processed_frame;
                    processedImage.onload = () => {
                        outputContext.drawImage(processedImage, 0, 0, outputCanvas.width, outputCanvas.height); // Draw on output canvas
                    };
                } else if (data.error) {
                    console.error("error from server: ", data.error);
                }
            } else {
                console.error('Error sending frame:', response.status);
            }
        } catch (error) {
            console.error('Error sending frame:', error);
        }
    }

    getWebcam();

    video.addEventListener('loadeddata', () => {
        setInterval(sendFrame, 1000 / 30);
    });
});