import './style.css'; 
import * as THREE from 'three';
import spline from './spline.js'; 

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Imports for Post-Processing
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- Game State ---
let isGameRunning = false; // Is the animation loop active?
let isPaused = false; // Is the pause menu open?
let animationFrameId = null;

// --- DOM Elements ---
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const loadingText = document.getElementById('loading-text');
// REMOVED: Debug Button

// Pause Menu Elements
const pauseMenu = document.getElementById('pause-menu');
const resumeButton = document.getElementById('resume-button');
const exitButton = document.getElementById('exit-button'); 

// Progress Bar
const progressBarContainer = document.getElementById('progress-bar-container');
let progressBarFill = document.getElementById('progress-bar-fill'); 

// Score Display
const scoreDisplay = document.getElementById('score-display');

// Resume Modal
const resumeModal = document.getElementById('resume-modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseButton = document.getElementById('modal-close-button');

// End Screen
const endScreen = document.getElementById('end-screen');
const mainMenuButton = document.getElementById('main-menu-button'); 
const finalScoreElement = document.getElementById('final-score'); 

startScreen.classList.add('loading');

// 1. Scene
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.3);
const w = window.innerWidth;
const h = window.innerHeight; 
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
const cameraHitbox = new THREE.Sphere(new THREE.Vector3(), 0.1); 

// --- Audio Setup ---
const listener = new THREE.AudioListener();
camera.add(listener);
const audioLoader = new THREE.AudioLoader();
const collectSound = new THREE.Audio(listener);
const hitSound = new THREE.Audio(listener);
const levelUpSound = new THREE.Audio(listener); 
const endCreditsSound = new THREE.Audio(listener); // NEW: End credits audio

function loadAudio() {
  audioLoader.load('/audio/collect.wav', (buffer) => {
    collectSound.setBuffer(buffer);
    collectSound.setVolume(0.5);
  }, undefined, (err) => console.error('Error loading collect sound: Ensure /public/audio/collect.wav exists.', err));

  audioLoader.load('/audio/hit.wav', (buffer) => {
    hitSound.setBuffer(buffer);
    hitSound.setVolume(0.5);
  }, undefined, (err) => console.error('Error loading hit sound: Ensure /public/audio/hit.wav exists.', err));

  audioLoader.load('/audio/levelup.wav', (buffer) => {
    levelUpSound.setBuffer(buffer);
    levelUpSound.setVolume(0.6);
  }, undefined, (err) => console.error('Error loading levelup sound: Ensure /public/audio/levelup.wav exists.', err));

  // NEW: Load end credits sound
  audioLoader.load('/audio/endcredits.wav', (buffer) => {
    endCreditsSound.setBuffer(buffer);
    endCreditsSound.setVolume(0.7);
    endCreditsSound.setLoop(true); // Loop it in case it's shorter than the scroll
  }, undefined, (err) => console.error('Error loading endcredits sound: Ensure /public/audio/endcredits.wav exists.', err));
}

// 3. Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- Post-Processing Setup ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 100);
bloomPass.threshold = 0.002;
bloomPass.strength = 3.5; 
bloomPass.radius = 0;
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Player Control Setup ---
const keyState = {};
function setupKeyListeners() {
  window.addEventListener('keydown', (e) => { 
    keyState[e.code] = true; 
  
    // Pause Menu Toggle
    if (e.code === 'Escape') {
      // Don't allow pause if end screen is up
      if (!endScreen.classList.contains('hidden')) return; 

      if (!resumeModal.classList.contains('hidden')) {
        resumeGame(); 
      } 
      else if (isGameRunning) {
        pauseGame();
      } 
      else if (isPaused) {
        resumeGame();
      }
    }
  });
  window.addEventListener('keyup', (e) => { keyState[e.code] = false; });
}


const currentOffset = new THREE.Vector2();
const targetOffset = new THREE.Vector2();
const LERP_SPEED = 0.1;
const MAX_OFFSET = 0.55; 

// --- Core Mechanic Setup ---
const path = spline;
const tubeGeo = new THREE.TubeGeometry(path, 222, 0.65, 16, true);
const edges = new THREE.EdgesGeometry(tubeGeo, 0.2);
const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000 }); // Red wireframe
const tubeLines = new THREE.LineSegments(edges, lineMat);
scene.add(tubeLines);

// --- Game Logic Setup ---
let score = 0;
let shakeDuration = 0;
const shakeIntensity = 0.08;
const gameObjects = new THREE.Group();
scene.add(gameObjects);

const models = {};

// Gate Geometry
const gateGeometry = new THREE.TorusGeometry(0.4, 0.05, 16, 50);
const gateMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
const finishGateMaterial = new THREE.MeshBasicMaterial({ color: 0xFF00FF, wireframe: true });


// --- Loading Manager ---
const loadingManager = new THREE.LoadingManager();
const gltfLoader = new GLTFLoader(loadingManager);

loadingManager.onLoad = () => {
  console.log("All assets loaded!");
  startScreen.classList.remove('loading'); 
};

loadingManager.onError = (url) => {
  console.error('Error loading asset:', url);
  loadingText.innerText = `Error loading ${url}. Please refresh.`;
};
// Helper function to apply wireframe material
function applyWireframeMaterial(model, color) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.material = new THREE.MeshBasicMaterial({ 
        color: color, 
        wireframe: true 
      });
    }
  });
}

// Load Assets Function
function loadAssets() {
  gltfLoader.load(
    '/models/golang.glb', 
    (gltf) => {
      console.log('Loaded golang model');
      const model = gltf.scene;
      model.scale.set(0.1, 0.1, 0.1); 
      applyWireframeMaterial(model, 0x007ADD); // Blue
      models['golang'] = model; 
    },
    undefined,
    (error) => console.error('Error loading golang model', error)
  );

  gltfLoader.load(
    '/models/angular.glb', 
    (gltf) => {
      console.log('Loaded angular model');
      const model = gltf.scene;
      model.scale.set(0.1, 0.1, 0.1); 
      applyWireframeMaterial(model, 0xFF6600); // Orange
      models['angular'] = model; 
    },
    undefined,
    (error) => console.error('Error loading angular model', error)
  );

  gltfLoader.load(
    '/models/bug.glb', 
    (gltf) => {
      console.log('Loaded bug model');
      const model = gltf.scene;
      model.scale.set(0.1, 0.1, 0.1); 
      applyWireframeMaterial(model, 0xff0000); // Red
      models['bug'] = model; 
    },
    undefined,
    (error) => console.error('Error loading bug model', error)
  );
}


// --- Resume Content ---
const resumeContent = {
  experience: {
    title: "EXPERIENCE",
    body: `
      <h3>Research Intern – SamarthX eGov Project</h3>
      <p><em>Mar 2025 – Present</em></p>
      <ul>
        <li>Built a scalable microservice ecosystem with a Go (Echo) backend and Angular frontend for an eGov framework.</li>
        <li>Dockerized the application and orchestrated deployment on Google Cloud Platform (GCP) using Google Kubernetes Engine (GKE).</li>
        <li>Configured Nginx as a reverse proxy and ingress controller.</li>
        <li>Transitioned the system from local development to a deployed platform serving over 1000+ users.</li>
      </ul>
    `
  },
  projects: {
    title: "PROJECTS",
    body: `
      <h3>Lowkey Chat App</h3>
      <p><em>(github.com/thatquietkid/websockets-project-golang)</em></p>
      <ul>
        <li>Engineered a Go backend using Gorilla WebSocket for persistent, bidirectional client-server communication.</li>
        <li>Dockerized the application and deployed it on a local Linux server.</li>
        <li>Integrated Prometheus to scrape custom application metrics for performance monitoring.</li>
      </ul>
      <h3>South Campus Buddy</h3>
      <p><em>(github.com/thatquietkid/south_campus_app)</em></p>
      <ul>
        <li>Built a RESTful backend in Go (Echo) with a PostgreSQL database to support complaint tracking and attendance logs.</li>
        <li>Developed the cross-platform mobile frontend using Flutter (Dart).</li>
      </ul>
    `
  }
};

// --- Procedural Game Data ---
const gameData = [];
const TOTAL_OBJECTS = 100; 
const OBSTACLE_CHANCE = 0.3; 
const skillTypes = ['golang', 'angular']; 

for (let i = 0; i < TOTAL_OBJECTS; i++) {
  const progress = i / TOTAL_OBJECTS;
  
  const xOffset = (Math.floor(Math.random() * 5) - 2) * (MAX_OFFSET / 2.5);
  const yOffset = (Math.floor(Math.random() * 5) - 2) * (MAX_OFFSET / 2.5);
  
  const type = Math.random() < OBSTACLE_CHANCE ? 'obstacle' : 'skill';

  if (type === 'skill') {
    const skillName = skillTypes[Math.floor(Math.random() * skillTypes.length)];
    gameData.push({
      id: `${skillName}-${i}`,
      type: 'skill',
      skillName: skillName, 
      progress: progress,
      offset: new THREE.Vector2(xOffset, yOffset)
    });
  } else {
    gameData.push({
      id: `bug-${i}`,
      type: 'obstacle',
      progress: progress,
      offset: new THREE.Vector2(xOffset, yOffset)
    });
  }
}
gameData.push({
  id: 'gate-experience',
  type: 'gate',
  progress: 0.33,
  offset: new THREE.Vector2(0, 0),
  contentKey: 'experience',
  scoreThreshold: 100 // NEW: Score threshold
});
gameData.push({
  id: 'gate-projects',
  type: 'gate',
  progress: 0.66,
  offset: new THREE.Vector2(0, 0),
  contentKey: 'projects',
  scoreThreshold: 250 // NEW: Score threshold
});
gameData.push({
  id: 'gate-finish',
  type: 'finish',
  progress: 0.99,
  offset: new THREE.Vector2(0, 0),
});


const objectMeshes = {}; 

// --- End Setup ---

// Handle window resize
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
// --- Function to add gate markers to progress bar ---
function setupProgressBar() {
  progressBarContainer.innerHTML = ''; // Clear old markers
  const newFill = document.createElement('div');
  newFill.id = 'progress-bar-fill';
  progressBarContainer.appendChild(newFill);

  progressBarFill = newFill; 

  gameData.forEach(item => {
    if (item.type === 'gate') {
      const marker = document.createElement('div');
      marker.className = 'gate-marker';
      marker.style.left = `${item.progress * 100}%`;
      marker.title = `LEVEL: ${item.contentKey} (SCORE: ${item.scoreThreshold})`; // NEW: Show threshold
      progressBarContainer.appendChild(marker);
    } else if (item.type === 'finish') { 
      const marker = document.createElement('div');
      marker.className = 'gate-marker';
      marker.style.left = `${item.progress * 100}%`;
      marker.style.backgroundColor = '#FF00FF'; 
      marker.style.boxShadow = '0 0 10px #FF00FF, 0 0 15px #FF00FF';
      marker.title = 'FINISH LINE';
      progressBarContainer.appendChild(marker);
    }
  });
}


// --- Game Control Functions ---
function startGame() {
  // Reset progress
  progress = 0;
  speed = BASE_SPEED; // Reset speed

  // Clear all old meshes from the scene
  for (const id in objectMeshes) {
    const mesh = objectMeshes[id];
    gameObjects.remove(mesh);
    delete objectMeshes[id];
  }
  
  isGameRunning = true;
  isPaused = false;
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden'); 

  // NEW: Stop credits sound if it's playing
  if (endCreditsSound.isPlaying) {
    endCreditsSound.stop();
  }
  
  score = 0;
  scoreDisplay.innerText = 'SCORE: 0';
  scoreDisplay.style.display = 'block';

  progressBarContainer.style.display = 'block'; 
  setupProgressBar(); 
  
  if (listener.context.state === 'suspended') {
    listener.context.resume();
  }
  loadAudio();

  animate();
}

function pauseGame() {
  if (!isGameRunning) return; 
  isGameRunning = false;
  isPaused = true;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  pauseMenu.classList.remove('hidden');
}

function pauseForModal() {
  isGameRunning = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
}

function resumeGame() {
  isGameRunning = true;
  isPaused = false;
  pauseMenu.classList.add('hidden');
  resumeModal.classList.add('hidden');
  animate();
}

function exitGame() {
  // NEW: Stop credits sound if it's playing
  if (endCreditsSound.isPlaying) {
    endCreditsSound.stop();
  }
  location.reload();
}

// --- Modal Functions ---
function showResumeSection(contentKey) {
  pauseForModal(); 
  const content = resumeContent[contentKey];
  if (content) {
    modalTitle.innerText = content.title;
    modalBody.innerHTML = content.body;
    resumeModal.classList.remove('hidden');
  } else {
    console.error('No content found for key:', contentKey);
    resumeGame(); 
  }
}
// NEW: Show End Screen
function showEndScreen() {
  pauseForModal();
  scoreDisplay.style.display = 'none';
  progressBarContainer.style.display = 'none';
  
  if (finalScoreElement) {
    finalScoreElement.innerText = score;
  }
  
  endScreen.classList.remove('hidden');

  // NEW: Play end credits sound
  if (endCreditsSound && !endCreditsSound.isPlaying) {
    endCreditsSound.play();
  }

  // Reset credits animation
  const creditsContent = document.querySelector('.credits-content');
  if (creditsContent) {
    creditsContent.style.animation = 'none';
    creditsContent.offsetHeight; /* trigger reflow */
    creditsContent.style.animation = null; 
  }
}

// --- Event Listeners for UI ---
startButton.addEventListener('click', startGame);
modalCloseButton.addEventListener('click', resumeGame);
resumeButton.addEventListener('click', resumeGame); 
exitButton.addEventListener('click', exitGame);
mainMenuButton.addEventListener('click', exitGame); 

// REMOVED: Debug Button listener

// 7. Animation Loop
let progress = 0;
const BASE_SPEED = 0.00025; 
let speed = BASE_SPEED; 
const up = new THREE.Vector3(0, 1, 0);
const tangent = new THREE.Vector3();
const binormal = new THREE.Vector3();
const normal = new THREE.Vector3(); 
const cameraOffset = new THREE.Vector3();
const lookAtPoint = new THREE.Vector3();
const objectPosition = new THREE.Vector3();

function animate() {
  if (!isGameRunning) return; 

  animationFrameId = requestAnimationFrame(animate);

  progress = (progress + speed); 
  
  // MODIFIED: Removed the `progress >= 1` check.
  // The finish gate will now handle ending the game.

  // Update Progress Bar
  if (progressBarFill) {
    progressBarFill.style.width = `${progress * 100}%`;
  }

  // --- Update Player Controls ---
  if (keyState['KeyA'] || keyState['ArrowLeft']) {
    targetOffset.x = MAX_OFFSET;
  } else if (keyState['KeyD'] || keyState['ArrowRight']) {
    targetOffset.x = -MAX_OFFSET;
  } else {
    targetOffset.x = 0; 
  }
  if (keyState['KeyW'] || keyState['ArrowUp']) {
    targetOffset.y = MAX_OFFSET;
  } else if (keyState['KeyS'] || keyState['ArrowDown']) { 
    targetOffset.y = -MAX_OFFSET;
  } else {
    targetOffset.y = 0; 
  }
  currentOffset.lerp(targetOffset, LERP_SPEED);

  // --- Update Camera Position ---
  // Use progress % 1 to ensure path.getPointAt gets a value between 0 and 1
  const loopProgress = progress % 1; 
  const position = path.getPointAt(loopProgress);

  tangent.copy(path.getTangentAt(loopProgress));
  binormal.crossVectors(up, tangent).normalize();
  normal.crossVectors(tangent, binormal).normalize();

  cameraOffset.copy(binormal).multiplyScalar(currentOffset.x);
  cameraOffset.add(normal.clone().multiplyScalar(currentOffset.y));
  camera.position.copy(position).add(cameraOffset);

  // --- Handle Screen Shake ---
  if (shakeDuration > 0) {
    camera.position.x += (Math.random() - 0.5) * shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * shakeIntensity;
    shakeDuration -= 1;
  }

  cameraHitbox.center.copy(camera.position);

  // --- Update Camera LookAt ---
  lookAtPoint.copy(path.getPointAt((loopProgress + 0.001) % 1)).add(tangent); // Look slightly ahead
  const lookAtOffset = binormal.clone().multiplyScalar(currentOffset.x);
  lookAtOffset.add(normal.clone().multiplyScalar(currentOffset.y));
  lookAtPoint.add(lookAtOffset);
  camera.lookAt(lookAtPoint);
  
  // --- Update Game ---
  updateGameObjects();

  // --- Render with composer ---
  composer.render();
}

function startScreenShake() {
  shakeDuration = 10; 
}

// --- UPDATED: updateGameObjects ---
function updateGameObjects() {
  const spawnDistance = 0.1; 
  const despawnDistance = 0.01; 
  const collisionThreshold = 0.2; 
  const gateCollisionThreshold = 0.5;

  for (const item of gameData) {
    const itemProgress = item.progress;
    
    // Use the main `progress` (which can go > 1) for diff calculation
    let diff = itemProgress - progress;

    // No looping logic needed for diff, we're on a linear track
    
    const inActiveWindow = 
      diff > -despawnDistance && 
      diff < spawnDistance;       

    if (inActiveWindow) {
      // 1. SPAWN LOGIC
      if (!objectMeshes[item.id]) {
        let mesh;
        
        if (item.type === 'skill') {
          const modelKey = item.skillName; 
          if (!models[modelKey]) continue; 
          mesh = models[modelKey].clone(); 
        } else if (item.type === 'obstacle') { 
          if (!models['bug']) continue; 
          mesh = models['bug'].clone(); 
        } else if (item.type === 'gate') {
          mesh = new THREE.Mesh(gateGeometry, gateMaterial);
          mesh.rotation.x = Math.PI / 2;
          mesh.rotation.y = Math.PI / 2;
        } else if (item.type === 'finish') { 
          mesh = new THREE.Mesh(gateGeometry, finishGateMaterial);
          mesh.rotation.x = Math.PI / 2;
          mesh.rotation.y = Math.PI / 2;
        }

        if (!mesh) continue; 

        // Use itemProgress % 1 for path lookups
        const itemLoopProgress = item.progress % 1;
        objectPosition.copy(path.getPointAt(itemLoopProgress));

        const itemTangent = path.getTangentAt(itemLoopProgress);
        const itemBinormal = new THREE.Vector3().crossVectors(up, itemTangent).normalize();
        const itemNormal = new THREE.Vector3().crossVectors(tangent, itemBinormal).normalize();

        const offset = itemBinormal.multiplyScalar(item.offset.x);
        offset.add(itemNormal.multiplyScalar(item.offset.y));
        objectPosition.add(offset);

        mesh.position.copy(objectPosition);
        mesh.userData = item;
        
        objectMeshes[item.id] = mesh; 
        gameObjects.add(mesh);
      }

      // 2. COLLISION LOGIC
      const mesh = objectMeshes[item.id];
      if (mesh && mesh.visible) {
        // Spin all gates
        if (item.type === 'gate' || item.type === 'finish') {
          mesh.rotation.z += 0.05;
        }

        if (item.type === 'skill') {
          if (cameraHitbox.center.distanceTo(mesh.position) < collisionThreshold) {
            mesh.visible = false; 
            score += 10; 
            scoreDisplay.innerText = `SCORE: ${score}`;
            if (collectSound.isPlaying) collectSound.stop();
            collectSound.play();
          }
        } else if (item.type === 'obstacle') {
          if (cameraHitbox.center.distanceTo(mesh.position) < collisionThreshold) {
            mesh.visible = false; 
            score -= 5; 
            if (score < 0) score = 0; 
            scoreDisplay.innerText = `SCORE: ${score}`;
            startScreenShake();
            if (hitSound.isPlaying) hitSound.stop();
            hitSound.play();
          }
        } else if (item.type === 'gate') {
          if (cameraHitbox.center.distanceTo(mesh.position) < gateCollisionThreshold) {
            mesh.visible = false; 
            showResumeSection(item.contentKey);
            
            // NEW: Check score for level up
            if (score >= item.scoreThreshold) {
              speed += 0.0001; // Increase speed
              if (levelUpSound.isPlaying) levelUpSound.stop(); 
              levelUpSound.play();
            }
          }
        } else if (item.type === 'finish') { 
          if (cameraHitbox.center.distanceTo(mesh.position) < gateCollisionThreshold) {
            mesh.visible = false; 
            showEndScreen();
          }
        }
      }
    } else {
      // 3. DESPAWN LOGIC
      if (objectMeshes[item.id]) {
        const mesh = objectMeshes[item.id];
        // We can just remove all objects, gates won't be hit twice
        gameObjects.remove(mesh);
        delete objectMeshes[item.id];
      }
    }
  }
}

// --- Call initial setup functions ---
setupKeyListeners();
loadAssets();