/* ------------ CONFIG --------------------------------------------------- */
const MODEL_DIR = "tm_model/";          // model folder

/* ------------ GLOBALS -------------------------------------------------- */
let model, webcam, camOn=false;
const view = document.getElementById("view");         // Hidden Canvas for Model
const liveView = document.getElementById("liveView"); // Visible Video for User
const badge = document.getElementById("badge");
const camBtn= document.getElementById("camBtn");
const fileInput = document.getElementById("fileInput"); // Get file input reference

/* ------------ CULTURE INFORMATION DATABASE ----------------------------- */
const cultureInfo = {
  "Chancay": {
    period: "1000-1470 CE",
    location: "Central coast of Peru (Chancay and Chillón valleys)",
    description: "The Chancay culture was known for mass production of ceramics, textiles, and metalwork. Their artistic legacy includes distinctive geometric designs on textiles depicting animals, human figures, and deities wearing crescent-like headdresses. They also crafted unique burial dolls made of woven fabric."
  },
  "Lurin": {
    period: "1100-1440 CE",
    location: "South of Lima in the Lurin valley",
    description: "The Lurin valley was home to the Ichma culture that inhabited Pachacamac, the region's most important pilgrimage site. They constructed at least 16 pyramids that served as both residential spaces and ceremonial centers, continuing to expand the religious influence of this sacred area."
  },
  "Maranga": {
    period: "100-650 CE",
    location: "Desert coastal region in Chillon, Rimac, and Lurin River valleys",
    description: "The Maranga culture built an extensive administrative and religious center called the ancient city of Maranga. They were part of the Lima civilization known for distinctive ceramic styles with Maranga and Interlocking patterns showing influence from the nearby Moche culture."
  },
  "Nazca": {
    period: "100 BCE-800 CE",
    location: "Southern Peru, northwest of the city of Nazca",
    description: "The Nazca culture is famous for creating the enigmatic Nazca Lines—geometric patterns and animal shapes stretching across nearly 190 square miles of desert floor. These geoglyphs appear etched into Earth's surface and represent one of the most mysterious archaeological achievements of ancient Peru."
  },
  "Pando": {
    period: "Contemporary with Caral (ca. 3000-1800 BCE)",
    location: "Supe Valley of Peru",
    description: "Archaeological sites in the Supe Valley include the 'Era de Pando' settlement, located in the middle of a valley on the right bank of the Supe River. The arrangement and proximity of buildings show evidence of urban planning contemporary with the sacred city of Caral."
  },
  "Supe": {
    period: "3000-1800 BCE",
    location: "Norte Chico region, 182 km north of Lima",
    description: "The Supe culture, or Caral-Supe civilization, is the oldest known civilization in the Americas. Their most impressive achievements include monumental architecture with platform mounds and sunken circular plazas. Despite lacking ceramics, they developed sophisticated governance systems and built their economy on agriculture, fishing, and trade."
  }
};

/* ------------ MODEL LOAD ---------------------------------------------- */
(async()=>{
  try {
    model = await tmImage.load(MODEL_DIR+"model.json",
                               MODEL_DIR+"metadata.json");
    badge.textContent = "Model ready"; // Simpler message
    // Clear badge after a delay
    setTimeout(() => { if (badge.textContent === "Model ready") badge.textContent = ''; }, 2000);
    
    // Create the info sidebar if it doesn't exist
    createInfoSidebar();
  } catch (error) {
      console.error("Error loading model:", error);
      badge.textContent = "Model load failed";
  }
})();

/* ------------ DRAW CROPPED TO HIDDEN CANVAS (for Model) --------------- */
function drawCroppedToHiddenView(src){
  const ctx = view.getContext("2d", { willReadFrequently: true });
  const srcWidth = src.naturalWidth || src.videoWidth || src.width;
  const srcHeight = src.naturalHeight || src.videoHeight || src.height;
  if (!srcWidth || !srcHeight) return;

  const side = Math.min(srcWidth, srcHeight);
  const sx = (srcWidth - side) / 2;
  const sy = (srcHeight - side) / 2;

  ctx.clearRect(0, 0, view.width, view.height);
  // Draw cropped source onto the hidden canvas
  ctx.drawImage(src, sx, sy, side, side, 0, 0, view.width, view.height);
}

/* ------------ PREDICT & DISPLAY -------------------------------------- */
async function predict(){
  if (!model || !view) return;
  
  try {
      const preds = await model.predict(view);
      preds.sort((a,b)=>b.probability-a.probability);
      const best=preds[0];
      if (best && best.probability > 0.5) {
        updateBadgeWithPrediction(best.className, best.probability);
      } else {
        badge.textContent = "Uncertain";
        // Remove info button if exists
        const infoBtn = document.getElementById('infoButton');
        if (infoBtn) infoBtn.remove();
      }
  } catch (error) {
      console.error("Prediction error:", error);
      badge.textContent = "Prediction failed";
      // Remove info button if exists
      const infoBtn = document.getElementById('infoButton');
      if (infoBtn) infoBtn.remove();
  }
}

/* ------------ UPDATE BADGE WITH PREDICTION ---------------------------- */
function updateBadgeWithPrediction(className, probability) {
  const formattedProb = (probability * 100).toFixed(1);
  badge.textContent = `${className} — ${formattedProb}%`;
  
  // Add info button next to badge if not already present
  if (!document.getElementById('infoButton')) {
    const infoBtn = document.createElement('button');
    infoBtn.id = 'infoButton';
    infoBtn.className = 'info-btn';
    infoBtn.innerHTML = '<span class="material-icons">info</span>';
    infoBtn.onclick = () => showCultureInfo(className);
    badge.parentNode.appendChild(infoBtn);
  } else {
    // Update existing button's onclick
    document.getElementById('infoButton').onclick = () => showCultureInfo(className);
  }
}

/* ------------ FILE UPLOAD --------------------------------------------- */
fileInput.onchange = async e => {
  stopCam(); // Stop webcam if running
  const file = e.target.files[0]; 
  if(!file || !model) return;

  const img = new Image();
  img.onload = async () => {
      // Create or get image preview element
      let previewImg = document.getElementById('imagePreview');
      if (!previewImg) {
          previewImg = document.createElement('img');
          previewImg.id = 'imagePreview';
          previewImg.style.position = 'absolute';
          previewImg.style.top = '0';
          previewImg.style.left = '0';
          previewImg.style.width = '100%';
          previewImg.style.height = '100%';
          previewImg.style.objectFit = 'contain';
          previewImg.style.zIndex = '5';
          document.querySelector('.app-container').appendChild(previewImg);
      }
      
      // Display the image
      liveView.style.display = 'none';
      previewImg.src = img.src;
      previewImg.style.display = 'block';
      
      // Process for model
      drawCroppedToHiddenView(img);
      await predict();
  };
  
  img.onerror = () => {
      console.error("Error loading image file.");
      badge.textContent = "Error loading image";
  }
  
  img.src = URL.createObjectURL(file);
  e.target.value = null; // Reset file input
};

/* ------------ WEBCAM DEVICE SELECTION ----------------------------------- */
async function selectCamera() {
  try {
    // Get list of available video devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    if (videoDevices.length <= 1) {
      // Only one camera available, no need for selection
      return startWebcam();
    }
    
    // Create camera selection UI
    const selectEl = document.createElement('div');
    selectEl.id = 'cameraSelect';
    selectEl.style.position = 'absolute';
    selectEl.style.zIndex = '20';
    selectEl.style.top = '50%';
    selectEl.style.left = '50%';
    selectEl.style.transform = 'translate(-50%, -50%)';
    selectEl.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    selectEl.style.padding = '20px';
    selectEl.style.borderRadius = '12px';
    selectEl.style.color = 'white';
    selectEl.style.textAlign = 'center';
    
    // Add heading
    const heading = document.createElement('h3');
    heading.textContent = 'Select Camera';
    heading.style.marginBottom = '15px';
    selectEl.appendChild(heading);
    
    // Add device buttons
    videoDevices.forEach((device, index) => {
      const btn = document.createElement('button');
      btn.textContent = device.label || `Camera ${index + 1}`;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.padding = '10px';
      btn.style.margin = '5px 0';
      btn.style.backgroundColor = '#1a73e8';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '4px';
      btn.style.cursor = 'pointer';
      
      btn.onclick = () => {
        startWebcam(device.deviceId);
        document.body.removeChild(selectEl);
      };
      
      selectEl.appendChild(btn);
    });
    
    // Add cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.display = 'block';
    cancelBtn.style.width = '100%';
    cancelBtn.style.padding = '10px';
    cancelBtn.style.margin = '15px 0 5px 0';
    cancelBtn.style.backgroundColor = '#5f6368';
    cancelBtn.style.color = 'white';
    cancelBtn.style.border = 'none';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.cursor = 'pointer';
    
    cancelBtn.onclick = () => {
      document.body.removeChild(selectEl);
    };
    
    selectEl.appendChild(cancelBtn);
    
    // Add to body
    document.body.appendChild(selectEl);
    
  } catch (error) {
    console.error("Error listing camera devices:", error);
    // Fall back to default camera
    startWebcam();
  }
}

/* ------------ WEBCAM START WITH DEVICE ID ------------------------------ */
async function startWebcam(deviceId = null) {
  if(!model) { 
    badge.textContent = "Model not ready yet."; 
    return; 
  }

  // Hide image preview if exists
  const previewImg = document.getElementById('imagePreview');
  if (previewImg) previewImg.style.display = 'none';
  
  try {
    // Set video constraints based on selected device
    const constraints = {
      video: deviceId 
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } }
    };
    
    // First try to initialize the teachable machine webcam with the device ID
    webcam = new tmImage.Webcam(300, 300, true);
    
    // We need to modify the webcam.webcam settings to use our device ID
    if (deviceId && webcam.webcam) {
      webcam.webcam.videoConstraints = {
        facingMode: "user", // Keep this setting
        deviceId: deviceId // Add our device ID
      };
    }
    
    await webcam.setup(); // This requests camera permissions
    await webcam.play();
    
    // Now get a higher quality stream for display only
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Connect to the video element for display only
      liveView.srcObject = stream;
      liveView.style.display = 'block';
      await liveView.play().catch(e => console.warn("Video play warning:", e));
      
      // Update UI
      camOn = true;
      camBtn.classList.add('cam-on');
      camBtn.querySelector('.material-icons').textContent = 'stop';
      
      // Start processing loop
      requestAnimationFrame(loop);
    } catch (streamError) {
      console.warn("Could not get high-res stream, falling back to TM webcam:", streamError);
      // Fall back to TM webcam's feed
      fallbackToTMWebcam();
    }
  } catch(e) {
    console.error("Error starting webcam:", e);
    badge.textContent = "Webcam access denied or error.";
    camOn = false;
    camBtn.classList.remove('cam-on');
    camBtn.querySelector('.material-icons').textContent = 'videocam';
  }
}

// Fallback to using TM webcam for display
function fallbackToTMWebcam() {
    // Create a container canvas to display the webcam feed
    let displayCanvas = document.getElementById('webcamDisplayCanvas');
    if (!displayCanvas) {
        displayCanvas = document.createElement('canvas');
        displayCanvas.id = 'webcamDisplayCanvas';
        displayCanvas.width = webcam.canvas.width;
        displayCanvas.height = webcam.canvas.height;
        displayCanvas.style.position = 'absolute';
        displayCanvas.style.top = '0';
        displayCanvas.style.left = '0';
        displayCanvas.style.width = '100%';
        displayCanvas.style.height = '100%';
        displayCanvas.style.objectFit = 'contain';
        displayCanvas.style.zIndex = '5';
        document.querySelector('.app-container').appendChild(displayCanvas);
    }
    
    // Hide video element and show canvas instead
    liveView.style.display = 'none';
    displayCanvas.style.display = 'block';
    
    // Start a display loop to copy from webcam.canvas to our display canvas
    function displayLoop() {
        if (!camOn || !webcam) return;
        
        const ctx = displayCanvas.getContext('2d');
        ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        ctx.drawImage(webcam.canvas, 0, 0, displayCanvas.width, displayCanvas.height);
        
        requestAnimationFrame(displayLoop);
    }
    
    // Start the display loop
    requestAnimationFrame(displayLoop);
    
    // Update UI state
    camOn = true;
    camBtn.classList.add('cam-on');
    camBtn.querySelector('.material-icons').textContent = 'stop';
    
    // Start the prediction loop
    requestAnimationFrame(loop);
}

/* ------------ WEBCAM BUTTON CLICK HANDLER ---------------------------- */
camBtn.onclick = async () => {
  if(camOn){ 
    stopCam(); 
    return; 
  }
  
  // Launch camera selection
  selectCamera();
};

/* ------------ STOP CAMERA -------------------------------------------- */
function stopCam(){
  // Stop video feed
  if (liveView.srcObject) {
      liveView.srcObject.getTracks().forEach(track => track.stop());
      liveView.srcObject = null;
  }
  
  // Hide all display elements
  liveView.style.display = 'none';
  
  const displayCanvas = document.getElementById('webcamDisplayCanvas');
  if (displayCanvas) displayCanvas.style.display = 'none';
  
  // Clean up Teachable Machine webcam
  if(webcam){
      webcam.stop();
      webcam = null;
  }
  
  // Update UI
  camOn = false;
  camBtn.classList.remove('cam-on');
  camBtn.querySelector('.material-icons').textContent = 'videocam';
  
  // Clear canvas
  view.getContext("2d").clearRect(0, 0, view.width, view.height);
  badge.textContent = "";
  
  // Remove info button if exists
  const infoBtn = document.getElementById('infoButton');
  if (infoBtn) infoBtn.remove();
}

/* ------------ PREDICTION LOOP --------------------------------------- */
async function loop(){
  if(!camOn || !webcam) return;

  try {
    // Update the teachable machine webcam
    webcam.update();
    
    // IMPORTANT: Always use webcam.canvas as the source for model prediction
    // This ensures consistency with what the model was trained on
    drawCroppedToHiddenView(webcam.canvas);
    
    await predict();
    requestAnimationFrame(loop);
  } catch (e) {
    console.error("Error in loop:", e);
    stopCam();
  }
}

/* ------------ CULTURE INFO SIDEBAR FUNCTIONS ------------------------- */
function createInfoSidebar() {
  // Check if sidebar already exists
  if (document.getElementById('cultureSidebar')) return;
  
  // Create the sidebar element
  const sidebar = document.createElement('div');
  sidebar.id = 'cultureSidebar';
  sidebar.className = 'info-sidebar';
  
  // Create the sidebar content
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <h3 id="cultureTitle">Culture Information</h3>
      <button class="close-btn" onclick="toggleSidebar()">×</button>
    </div>
    <div class="sidebar-content">
      <div id="cultureInfo" class="culture-info-container">
        <!-- Dynamic content will be inserted here -->
      </div>
      <div class="sidebar-footer">
        <small>Source: Archaeological Institute of Peru</small>
      </div>
    </div>
  `;
  
  // Add the sidebar to the document
  document.body.appendChild(sidebar);
  
  // Add the necessary CSS
  const style = document.createElement('style');
  style.textContent = `
    .info-sidebar {
      position: fixed;
      right: -320px;
      top: 0;
      width: 300px;
      height: 100%;
      background-color: #fff;
      box-shadow: -2px 0 10px rgba(0,0,0,0.2);
      z-index: 1000;
      transition: right 0.3s ease;
      color: #333;
      display: flex;
      flex-direction: column;
    }
    
    .info-sidebar.active {
      right: 0;
    }
    
    .sidebar-header {
      padding: 16px;
      background-color: #1a73e8;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
    }
    
    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }
    
    .info-section {
      margin-bottom: 16px;
    }
    
    .info-section h4 {
      margin-bottom: 4px;
      color: #1a73e8;
    }
    
    .learn-more-btn {
      display: block;
      width: 100%;
      padding: 10px;
      background-color: #1a73e8;
      color: white;
      border: none;
      border-radius: 4px;
      margin-top: 20px;
      cursor: pointer;
    }
    
    .info-btn {
      background: rgba(0,0,0,0.2);
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      cursor: pointer;
      color: white;
    }
    
    .sidebar-footer {
      padding: 8px 16px;
      text-align: center;
      color: #666;
      border-top: 1px solid #eee;
    }
  `;
  
  document.head.appendChild(style);
  
  // Add the toggle function to window object so it can be called from HTML
  window.toggleSidebar = function() {
    document.getElementById('cultureSidebar').classList.toggle('active');
  };
}

function showCultureInfo(cultureName) {
  const info = cultureInfo[cultureName];
  if (!info) return;
  
  // Populate the sidebar
  document.getElementById('cultureTitle').textContent = `${cultureName} Culture`;
  
  const infoContainer = document.getElementById('cultureInfo');
  infoContainer.innerHTML = `
    <div class="info-section">
      <h4>Time Period</h4>
      <p>${info.period}</p>
    </div>
    <div class="info-section">
      <h4>Location</h4>
      <p>${info.location}</p>
    </div>
    <div class="info-section">
      <h4>Description</h4>
      <p>${info.description}</p>
    </div>
    <button class="learn-more-btn" onclick="window.open('https://en.wikipedia.org/wiki/${cultureName}_culture', '_blank')">
      Learn More
    </button>
  `;
  
  // Show the sidebar
  document.getElementById('cultureSidebar').classList.add('active');
}