// Get video element reference
const video = document.getElementById("video");
let canvas = null;

async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        width: 640,
        height: 480
      } 
    });
    video.srcObject = stream;
    
    // Return a promise that resolves when the video is ready
    return new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
  } catch (err) {
    console.error("Error accessing webcam:", err);
    throw err;
  }
}

async function loadModels() {
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    ]);
    console.log("All models loaded successfully");
  } catch (error) {
    console.error("Error loading models:", error);
    throw error;
  }
}

async function setupCanvas() {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("Video dimensions not ready");
  }
  
  canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  
  canvas.style.position = 'absolute';
  canvas.style.left = video.offsetLeft + 'px';
  canvas.style.top = video.offsetTop + 'px';
  
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);
  
  return displaySize;
}

async function startDetection(displaySize) {
  return setInterval(async () => {
    try {
      if (video.paused || video.ended) {
        return;
      }

      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

      if (detections.length > 0) {
        console.log(`Detected ${detections.length} faces`);
        detections.forEach((detection, index) => {
          console.log(`Face ${index + 1} expressions:`, detection.expressions);
        });
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
  }, 100);
}

async function start() {
  try {
    // First load the models
    await loadModels();
    
    // Then start the video and wait for it to be ready
    await startVideo();
    
    // Once video is playing, setup the canvas
    const displaySize = await setupCanvas();
    
    // Start detection loop
    startDetection(displaySize);
    
  } catch (error) {
    console.error("Application error:", error);
  }
}

// Make sure DOM is loaded before starting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}