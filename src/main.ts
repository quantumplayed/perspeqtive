import { ensureLoaded, QuantumPropertyManager, getModule } from "quantum-forge/quantum";
import { router, type RouteState } from "./router";
import {
  playFootstep,
  playShift,
  playGrab,
  playDrop,
  playPlateActivate,
  playDoorOpen,
  playDoorClose,
  playDecoherenceTick,
  playDecoherenceCollapse,
  playVictory,
  playPetChirp,
  triggerScreenShake,
  showFloatingText,
  ensureAmbientSound,
  startBackgroundMusic,
  toggleBackgroundMusic,
  setMusicDimension,
  isMusicPlaying
} from "./audio";

let qpm: QuantumPropertyManager;
let qf: any;
let playerProp: any;
let boxProp: any;
let boxProp2: any = null;
let plateProp: any;
let plateProp2: any = null;
let petProp: any;

// Multi-box & Bedroom State
let box2X = 576;
let box2Y = 320;
let canGrabBox2 = false;
let activeHoldingBox: 1 | 2 | null = null;
let isBedroomDoorUnlocked = false;

// Audio context & game variables
let currentDecoherenceTime = 5.0;

// Game & Routing State
let currentLevel = 1;
let currentRoute: 'menu' | 'game' = 'menu';
let isPaused = false;

// Classical State
let playerX = 64;
let playerY = 64;
let boxX = 192;
let boxY = 192;
let plateX = 384;
let plateY = 384;

let playerDir: 'down' | 'up' | 'left' | 'right' = 'down';
let walkFrame = 0;
let isWalking = false;
let walkTimer: any = null;

let isHolding = false;
let canGrab = false;
let isSolved = false;
let scrollPos = 0; // Current perspective: 0.0 = |0>, 1.0 = |1>

// Laplace (Bearded Dragon Companion) State
let petX = 256;
let petY = 128;
let petDir: 'down' | 'up' | 'left' | 'right' = 'down';
let petWanderTimer = 2.0;
let isPetOnShoulder = false;
let canGrabPet = false;

// Decoherence State (ONLY active after player drops the item in |1>)
let isDecoherenceActive = false;
let boxDecayRemaining = 5.0;
let lastDecayTickedSec = 5;
// Removed constant
let lastTimestamp = performance.now();
let scrollTarget: number | null = null;

// DOM Elements: Pages
const menuPage = document.getElementById('menu-page')!;
const gamePage = document.getElementById('game-page')!;

// DOM Elements: Menu Page & Prologue
const menuPlayBtn = document.getElementById('menu-play-btn')!;
const menuPrologueBtn = document.getElementById('menu-prologue-btn') as HTMLButtonElement | null;
const menuInfoBtn = document.getElementById('menu-info-btn')!;
const menuInfoModal = document.getElementById('menu-info-modal')!;
const menuInfoCloseBtn = document.getElementById('menu-info-close-btn')!;
const menuInfoPlayBtn = document.getElementById('menu-info-play-btn')!;

// Prologue Modal Elements
const introModal = document.getElementById('intro-modal') as HTMLElement | null;
const introSlideNum = document.getElementById('intro-slide-num') as HTMLElement | null;
const introImage = document.getElementById('intro-image') as HTMLImageElement | null;
const introTitle = document.getElementById('intro-title') as HTMLElement | null;
const introText = document.getElementById('intro-text') as HTMLElement | null;
const introPrevBtn = document.getElementById('intro-prev-btn') as HTMLButtonElement | null;
const introNextBtn = document.getElementById('intro-next-btn') as HTMLButtonElement | null;
const introSkipBtn = document.getElementById('intro-skip-btn') as HTMLButtonElement | null;
const escPrologueBtn = document.getElementById('esc-prologue-btn') as HTMLButtonElement | null;

interface IntroSlide {
  image: string;
  title: string;
  text: string;
}

const INTRO_SLIDES: IntroSlide[] = [
  {
    image: "/intro_slide1.jpg",
    title: "Rain on Rue Saint-Lambert // 23:42",
    text: "You haven't heard from your friend Julian in days. After dozens of unanswered calls and frantic messages, silence turned into dread. You clutch the brass emergency key he gave you, stepping through the rain toward his building."
  },
  {
    image: "/intro_slide2.jpg",
    title: "Apartment 304 // Inside",
    text: "The lock turns with a hollow clatter. Inside, the apartment is mostly empty, suspended in an eerie quiet. But the air itself feels bifurcated—an electrical hum vibrates across the floorboards, and strange dimensional rifts seem to split reality in two."
  },
  {
    image: "/intro_slide3.jpg",
    title: "The Workspace // Julian's Notes",
    text: "On his desk lie scattered handwritten notes, equations of quantum superpositions, and personal mementos left in bizarre arrangements. Julian was attempting to bridge dimensions—and vanished within them. You must decipher his clues and restore his displaced artifacts to find him."
  }
];

let currentIntroSlide = 0;
let hasSeenIntro = false;
let introCompleteCallback: (() => void) | null = null;

function renderIntroSlide(idx: number) {
  if (idx < 0 || idx >= INTRO_SLIDES.length) return;
  currentIntroSlide = idx;
  const slide = INTRO_SLIDES[idx];

  if (introSlideNum) introSlideNum.textContent = `SLIDE ${idx + 1} OF ${INTRO_SLIDES.length}`;
  if (introTitle) introTitle.textContent = slide.title;
  if (introText) introText.textContent = slide.text;

  if (introImage) {
    introImage.style.opacity = '0.3';
    introImage.style.transform = 'scale(1.03)';
    setTimeout(() => {
      if (introImage) {
        introImage.src = slide.image;
        introImage.style.opacity = '1';
        introImage.style.transform = 'scale(1)';
      }
    }, 120);
  }

  const dots = document.querySelectorAll('.intro-dot');
  dots.forEach((dot, dIdx) => {
    dot.classList.toggle('active', dIdx === idx);
  });

  if (introPrevBtn) introPrevBtn.disabled = idx === 0;
  if (introNextBtn) {
    introNextBtn.textContent = idx === INTRO_SLIDES.length - 1 ? "ENTER APARTMENT ▶" : "CONTINUE ▶";
  }
}

function openIntroModal(onComplete?: () => void) {
  introCompleteCallback = onComplete || null;
  currentIntroSlide = 0;
  renderIntroSlide(0);
  if (introModal) introModal.classList.remove('hidden');
}

function closeIntroModal() {
  if (introModal) introModal.classList.add('hidden');
  hasSeenIntro = true;
  if (introCompleteCallback) {
    const cb = introCompleteCallback;
    introCompleteCallback = null;
    cb();
  }
}

// DOM Elements: HUD & Telemetry
const playerStateSpan = document.getElementById('player-state');
const boxStateSpan = document.getElementById('box-state');
const petStateSpan = document.getElementById('pet-state');
const plateStateSpan = document.getElementById('plate-state');
const petStatusSpan = document.getElementById('pet-status');
const sysStatus = document.getElementById('system-status')!;
const levelStamp = document.getElementById('level-stamp')!;
const gameSubtitle = document.getElementById('game-subtitle');
const currentLevelTag = document.getElementById('current-level-tag')!;
const levelObjectiveLore = document.getElementById('level-objective-lore');

// DOM Elements: Game Entities & Interactive World
const playerEl = document.getElementById('player')!;
const playerSpriteEl = document.getElementById('player-sprite')!;
const boxEl = document.getElementById('box')!;
const boxHazard = document.getElementById('box-hazard')!;
const plateEl = document.getElementById('pressure-plate')!;
const petEl = document.getElementById('pet')!;
const petSpriteEl = document.getElementById('pet-sprite')!;
const promptEl = document.getElementById('interaction-prompt')!;
const promptTextEl = document.getElementById('prompt-text') || promptEl;
const vaultLabel = document.getElementById('vault-label-text');
const vaultHologram = document.getElementById('vault-hologram');

// DOM Elements: Level 2 Washroom & Quantum Door
const isoContainer = document.querySelector('.iso-container') as HTMLElement;
const washroomRoom = document.getElementById('washroom-room')!;
const bathroomDoorway = document.getElementById('bathroom-doorway')!;
const quantumDoor = document.getElementById('quantum-door')!;
const doorPanel = document.getElementById('door-panel')!;

// DOM Elements: Level 3 Bedroom & Adjoining Areas
const bedroomRoom = document.getElementById('bedroom-room')!;
const bedroomDoor = document.getElementById('bedroom-door')!;
const bedroomDoorPanel = document.getElementById('bedroom-door-panel')!;
const kitchenRoom = document.getElementById('kitchen-room');
const energyBarrier = document.getElementById('energy-barrier');
const box2El = document.getElementById('box2')!;
const plate2El = document.getElementById('pressure-plate2')!;

// DOM Elements: Modals & Controls
const victoryModal = document.getElementById('victory-modal')!;
const victoryTitle = document.getElementById('victory-title')!;
const victoryDescription = document.getElementById('victory-description')!;
const victoryNextBtn = document.getElementById('victory-next-btn')!;
const restartBtn = document.getElementById('restart-btn')!;
const victoryMenuBtn = document.getElementById('victory-menu-btn')!;

const pauseBtn = document.getElementById('pause-btn')!;
const musicToggleBtn = document.getElementById('music-toggle-btn') as HTMLButtonElement | null;
const escapeMenu = document.getElementById('escape-menu')!;
const escResumeBtn = document.getElementById('esc-resume-btn')!;
const escMusicBtn = document.getElementById('esc-music-btn') as HTMLButtonElement | null;
const escMusicText = document.getElementById('esc-music-text') as HTMLSpanElement | null;
const escLvl1Btn = document.getElementById('esc-lvl1-btn')!;
const escLvl2Btn = document.getElementById('esc-lvl2-btn')!;
const escLvl3Btn = document.getElementById('esc-lvl3-btn')!;
const escLvl4Btn = document.getElementById('esc-lvl4-btn')!;
const escRestartBtn = document.getElementById('esc-restart-btn')!;
const escMainMenuBtn = document.getElementById('esc-mainmenu-btn')!;

// Item Decoherence HUD Elements
const boxDecayGauge = document.getElementById('box-decay-gauge')!;
const boxDecayLabel = document.getElementById('box-decay-label')!;
const boxDecayTime = document.getElementById('box-decay-time')!;
const boxDecayFill = document.getElementById('box-decay-fill')!;
const decayIcon = document.getElementById('decay-icon')!;

async function init() {
  sysStatus.textContent = "Initializing Quantum Simulator...";
  await ensureLoaded();
  
  qf = getModule();
  qpm = new QuantumPropertyManager({ dimension: 2 });
  

  setupInput();
  setupMenuUI();
  setupIntroModal();
  setupEscapeMenu();
  setupVictoryUI();
  
  // Connect Router
  router.subscribe((state: RouteState) => {
    handleRouteChange(state);
  });
  
  // Game Loop
  lastTimestamp = performance.now();
  requestAnimationFrame(gameLoop);
}

function handleRouteChange(state: RouteState) {
  currentRoute = state.route;
  
  if (state.route === 'menu') {
    menuPage.classList.remove('hidden');
    gamePage.classList.add('hidden');
    closeEscapeMenu();
    if (menuInfoModal) menuInfoModal.classList.add('hidden');
  } else {
    menuPage.classList.add('hidden');
    gamePage.classList.remove('hidden');
    closeEscapeMenu();
    
    // Always start the level from scratch when navigating to it via router
    loadLevel(state.level);
  }
}

function setBedroomDoorState(open: boolean) {
  const stateChanged = isBedroomDoorUnlocked !== open;
  isBedroomDoorUnlocked = open;
  if (bedroomDoorPanel) {
    if (open) {
      bedroomDoorPanel.classList.add('open');
    } else {
      bedroomDoorPanel.classList.remove('open');
    }
  }
  if (open) {
    const wave = document.getElementById('bedroom-door-wave');
    if (wave) {
      wave.classList.remove('pulse');
      void wave.offsetWidth;
      wave.classList.add('pulse');
    }
    if (stateChanged) {
      playDoorOpen();
      triggerScreenShake(2.5, 100);
      showFloatingText("BEDROOM UNLOCKED", 512, 300, "#10b981");
    }
  } else if (stateChanged) {
    playDoorClose();
    triggerScreenShake(3.0, 120);
    showFloatingText("BEDROOM LOCKED", 512, 300, "#ef4444");
  }
}

function loadLevel(level: number) {
  currentLevel = level;
  qpm.clear();
  
  playerProp = qpm.acquireProperty();
  boxProp = qpm.acquireProperty();
  plateProp = qpm.acquireProperty(); // Plate starts in |0>
  petProp = qpm.acquireProperty();   // Laplace starts in |0>
  
  if (level === 3) {
    boxProp2 = qpm.acquireProperty(); // Box 2 (Box B) starts in |0>
    plateProp2 = qpm.acquireProperty();
    qf.shift(plateProp2); // Target convergence vault is in |1>
    qf.shift(plateProp);  // Relay plate is in |1>!
    qf.shift(boxProp);    // Box A starts in |1>
  } else if (level === 4) {
    boxProp2 = qpm.acquireProperty();
    plateProp2 = qpm.acquireProperty();
    qf.shift(plateProp2); // Plate 2 in |1>
    qf.shift(boxProp2);   // Box 2 in |1>
    // Box 1 and Plate 1 stay in pure |0>!
  } else {
    boxProp2 = null;
    plateProp2 = null;
  }
  
  // Default states
  currentDecoherenceTime = 5.0;
  if (energyBarrier) energyBarrier.classList.add('hidden');
  box2El.classList.add('hidden');
  plate2El.classList.add('hidden');
  if (kitchenRoom) kitchenRoom.classList.add('hidden');
  
  scrollPos = 0;
  isHolding = false;
  activeHoldingBox = null;
  isSolved = false;
  isPaused = false;
  isBedroomDoorUnlocked = false;
  
  isDecoherenceActive = false;
  boxDecayRemaining = currentDecoherenceTime;
  if (boxDecayGauge) boxDecayGauge.classList.add('hidden');
  
  boxEl.classList.remove('held', 'entangled', 'observed', 'decohering');
  box2El.classList.remove('held', 'entangled');
  playerEl.classList.remove('holding');
  petEl.classList.remove('on-shoulder', 'observing');
  plateEl.classList.remove('active');
  plate2El.classList.remove('active');
  if (vaultHologram) vaultHologram.style.display = 'flex';
  if (vaultLabel) vaultLabel.textContent = "|0⟩ FLOOR VAULT";
  victoryModal.classList.add('hidden');
  closeEscapeMenu();

  if (isoContainer) {
    if (level === 2 || level === 3) {
      isoContainer.classList.add('has-washroom');
    } else {
      isoContainer.classList.remove('has-washroom');
    }
  }

  if (level === 1) {
    // LEVEL 1: Standard Split Apartment
    levelStamp.textContent = "LEVEL 1 // CASE #702";
    currentLevelTag.textContent = "LEVEL 1: THE SPLIT APARTMENT";
    if (gameSubtitle) gameSubtitle.textContent = "Julian's Apartment — Living Area";
    if (levelObjectiveLore) levelObjectiveLore.textContent = "Find the evidence crate in |1⟩ and secure it inside the |0⟩ Floor Vault before decoherence consumes it.";
    
    washroomRoom.classList.add('hidden');
    if (bathroomDoorway) bathroomDoorway.classList.add('hidden');
    quantumDoor.classList.add('hidden');
    bedroomRoom.classList.add('hidden');
    bedroomDoor.classList.add('hidden');
    
    playerX = 64; playerY = 64;
    boxX = 192; boxY = 192;
    plateX = 384; plateY = 384;
    petX = 256; petY = 128;
    
    qf.shift(boxProp);
    sysStatus.textContent = "Level 1: Locate the evidence crate in |1⟩ and deposit it in the |0⟩ Vault.";
    
  } else if (level === 2) {
    // LEVEL 2: The Phased Washroom
    levelStamp.textContent = "LEVEL 2 // CASE #702";
    currentLevelTag.textContent = "LEVEL 2: THE PHASED WASHROOM";
    if (gameSubtitle) gameSubtitle.textContent = "Julian's Apartment — Phased Washroom Addition";
    if (levelObjectiveLore) levelObjectiveLore.textContent = "The washroom is locked in |0>. Shift to |1⟩ to phase through the wall, shift to |0⟩ inside to secure the crate, and carry it out to the Floor Vault.";
    
    washroomRoom.classList.remove('hidden');
    if (bathroomDoorway) bathroomDoorway.classList.remove('hidden');
    quantumDoor.classList.remove('hidden');
    doorPanel.classList.remove('open');
    bedroomRoom.classList.add('hidden');
    bedroomDoor.classList.add('hidden');
    
    playerX = 64; playerY = 256;
    plateX = 128; plateY = 384;
    petX = 192; petY = 128;
    boxX = 576; boxY = 64;
    
    sysStatus.textContent = "Level 2: The washroom wall is solid in |0>. Shift to |1⟩ to phase through!";
    
  } else if (level === 3) {
    // LEVEL 3: Cross-Dimensional Relay
    levelStamp.textContent = "LEVEL 3 // CASE #702";
    currentLevelTag.textContent = "LEVEL 3: CROSS-DIMENSIONAL RELAY";
    if (gameSubtitle) gameSubtitle.textContent = "Julian's Apartment — Archives & Bedroom Relay";
    if (levelObjectiveLore) levelObjectiveLore.textContent = "Place Box A on the |1⟩ Relay Plate (384, 128) to unlock the bedroom in |0⟩. You have 5s before Box A decoheres to enter!";
    
    washroomRoom.classList.add('hidden');
    if (bathroomDoorway) bathroomDoorway.classList.add('hidden');
    quantumDoor.classList.add('hidden');
    if (energyBarrier) energyBarrier.classList.add('hidden');
    
    bedroomRoom.classList.remove('hidden');
    bedroomDoor.classList.remove('hidden');
    setBedroomDoorState(false);
    
    box2El.classList.remove('hidden');
    plate2El.classList.remove('hidden');
    
    playerX = 64; playerY = 128;
    petX = 64; petY = 256;
    boxX = 128; boxY = 128; // Box A in |1>
    plateX = 384; plateY = 128; // Relay Sensor in |1>
    
    box2X = 576; box2Y = 320; // Box B in |0> inside bedroom
    box2El.style.left = `${box2X}px`;
    box2El.style.top = `${box2Y}px`;
    box2El.style.display = 'block';
    
    // Convergence Vault at (128, 384) in |1>
    plate2El.style.left = `128px`;
    plate2El.style.top = `384px`;
    plate2El.style.display = 'flex';
    const title = plate2El.querySelector('.vault-title');
    if (title) title.textContent = "|1⟩ CONVERGENCE VAULT";
    
    if (vaultLabel) vaultLabel.textContent = "|1⟩ RELAY SENSOR";
    
    sysStatus.textContent = "Level 3: Place Box A on the |1⟩ Relay Plate at (384, 128). You have 5 seconds before decoherence to enter the |0⟩ bedroom!";
    
  } else if (level === 4) {
    // LEVEL 4: Spatial Entanglement
    levelStamp.textContent = "LEVEL 4 // CASE #702";
    currentLevelTag.textContent = "LEVEL 4: SPATIAL ENTANGLEMENT";
    if (gameSubtitle) gameSubtitle.textContent = "Julian's Apartment — Twin Vaults & Laser Grid";
    if (levelObjectiveLore) levelObjectiveLore.textContent = "Box 1 in |0⟩ is spatially entangled with Box 2 in |1⟩ (inverted coordinate mirror). Move Box 1 to guide Box 2 through the western gap (x ≤ 128) around the Secure Laser Grid and synchronize both vaults!";
    
    washroomRoom.classList.add('hidden');
    if (bathroomDoorway) bathroomDoorway.classList.add('hidden');
    quantumDoor.classList.add('hidden');
    bedroomRoom.classList.add('hidden');
    bedroomDoor.classList.add('hidden');
    
    box2El.classList.remove('hidden');
    plate2El.classList.remove('hidden');
    if (energyBarrier) {
      energyBarrier.classList.remove('hidden');
      energyBarrier.classList.add('phased-preview');
    }
    
    playerX = 64; playerY = 320;
    petX = 64; petY = 64;
    boxX = 128; boxY = 320; // Box 1 in |0>
    plateX = 320; plateY = 64; // Plate 1 in |0>
    
    box2X = 448 - boxX; // = 320
    box2Y = 448 - boxY; // = 128 (starts north-east in |1>)
    box2El.style.left = `${box2X}px`;
    box2El.style.top = `${box2Y}px`;
    box2El.style.display = 'block';
    
    // Plate 2 at (128, 384) in |1>
    plate2El.style.left = `128px`;
    plate2El.style.top = `384px`;
    plate2El.style.display = 'flex';
    const title = plate2El.querySelector('.vault-title');
    if (title) title.textContent = "|1⟩ TWIN VAULT";
    
    if (vaultLabel) vaultLabel.textContent = "|0⟩ FLOOR VAULT";
    
    sysStatus.textContent = "Level 4: Move Box 1 in |0⟩ to guide entangled Box 2 in |1⟩ around the Laser Grid into the Twin Vault.";
  }

  // Update vault DOM position
  plateEl.style.left = `${plateX}px`;
  plateEl.style.top = `${plateY}px`;
  
  playerDir = 'down';
  petDir = 'down';
  petWanderTimer = 2.0;
  isPetOnShoulder = false;
  canGrabPet = false;
  
  if (petStatusSpan) petStatusSpan.textContent = "Wandering in |0>";
  
  updateSprite();
  updatePetVisuals();
  updatePhysics();
}

function updateSprite() {
  const row = playerDir === 'down' ? 0 : playerDir === 'up' ? 1 : playerDir === 'left' ? 2 : 3;
  const col = isWalking ? walkFrame : 0;
  playerSpriteEl.style.backgroundPosition = `-${col * 64}px -${row * 64}px`;
}

function updatePetVisuals() {
  let deg = 0;
  if (petDir === 'up') deg = 0;
  else if (petDir === 'right') deg = 90;
  else if (petDir === 'down') deg = 180;
  else if (petDir === 'left') deg = 270;
  
  petSpriteEl.style.transform = `rotate(${deg}deg)`;
  petEl.style.left = `${petX}px`;
  petEl.style.top = `${petY}px`;
}

function isInsideWashroom(x: number, y: number): boolean {
  return x >= 512 && x < 704 && y >= 0 && y < 192;
}

function isInsideBedroom(x: number, y: number): boolean {
  return x >= 512 && x < 704 && y >= 256 && y < 512;
}

function setupInput() {
  window.addEventListener('keydown', (e) => {
    // Menu Page Handling
    if (currentRoute === 'menu') {
      if (e.key === 'Escape' && menuInfoModal && !menuInfoModal.classList.contains('hidden')) {
        menuInfoModal.classList.add('hidden');
      }
      return;
    }
    
    // In-Game Escape Key: Toggle Pause / Escape Menu
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!victoryModal.classList.contains('hidden')) {
        victoryModal.classList.add('hidden');
        router.navigate('menu');
        return;
      }
      toggleEscapeMenu();
      return;
    }
    
    if (isPaused || isSolved) return;
    
    const key = e.key.toLowerCase();
    const gridSize = 64;
    let dx = 0;
    let dy = 0;
    let moved = false;
    
    if (key === 'w') { dy = -gridSize; playerDir = 'up'; moved = true; }
    else if (key === 's') { dy = gridSize; playerDir = 'down'; moved = true; }
    else if (key === 'a') { dx = -gridSize; playerDir = 'left'; moved = true; }
    else if (key === 'd') { dx = gridSize; playerDir = 'right'; moved = true; }
    
    if (moved) {
      walkFrame = (walkFrame + 1) % 4;
      isWalking = true;
      clearTimeout(walkTimer);
      walkTimer = setTimeout(() => {
        isWalking = false;
        updateSprite();
      }, 180);
      updateSprite();
      
      let collision = false;
      const currentViewingDimension = scrollPos < 0.5 ? 0 : 1;
      
      const nextX = playerX + dx;
      const nextY = playerY + dy;
      
      // LEVEL 1: Standard Apartment bounds (0..448, 0..448)
      if (currentLevel === 1) {
        if (nextX < 0 || nextX > 448 || nextY < 0 || nextY > 448) {
          collision = true;
        }
      }
      // LEVEL 4: Spatial Entanglement with Laser Grid in |1>
      else if (currentLevel === 4) {
        if (nextX < 0 || nextX > 448 || nextY < 0 || nextY > 448) {
          collision = true;
        }
        
        // In |1>, player is directly blocked by the Secure Laser Grid at y = 256, x >= 192
        if (currentViewingDimension === 1 && nextY === 256 && nextX >= 192) {
          collision = true;
          triggerScreenShake(2.5, 90);
          sysStatus.textContent = "The |1⟩ Secure Laser Grid blocks your path! Shift to |0⟩ to bypass.";
        }
        
        // When carrying Box 1 in |0>, check if entangled Box 2 would hit boundary or the |1> Laser Grid!
        if (isHolding && activeHoldingBox === 1) {
          const nextBox2X = 448 - nextX;
          const nextBox2Y = 448 - nextY;
          
          if (nextBox2X < 0 || nextBox2X > 448 || nextBox2Y < 0 || nextBox2Y > 448) {
            collision = true;
          } else if (nextBox2Y === 256 && nextBox2X >= 192) {
            // Box 2 hit the |1> laser grid!
            collision = true;
            triggerScreenShake(3.5, 120);
            showFloatingText("BLOCKED BY |1⟩ LASERS", playerX + 32, playerY - 14, "#ff3366");
            sysStatus.textContent = "ENTANGLEMENT LOCK: Box 2 cannot cross the |1⟩ Laser Grid! Route Box 2 through the western gap (x ≤ 128).";
          }
        }
      }
      // LEVEL 2: Living room (0..448, 0..448) + Washroom (512..640, 0..128)
      else if (currentLevel === 2) {
        const currentlyInside = isInsideWashroom(playerX, playerY);
        const nextInside = isInsideWashroom(nextX, nextY);
        
        if (currentlyInside !== nextInside) {
          // Transitioning across washroom boundary (doorway at y = 64)
          if (playerY !== 64 || nextY !== 64) {
            collision = true;
          } else if (currentViewingDimension === 0) {
            collision = true;
            sysStatus.textContent = currentlyInside 
              ? "The washroom security wall is solid in |0⟩. Shift to |1⟩ to phase out!"
              : "The washroom security partition is locked in |0⟩. Shift to |1⟩ to phase inside!";
          }
        }
        
        if (nextInside) {
          if (nextX < 512 || nextX > 640 || nextY < 0 || nextY > 128) {
            collision = true;
          }
        } else {
          if (nextX < 0 || nextX > 448 || nextY < 0 || nextY > 448) {
            collision = true;
          }
        }
      }
      // LEVEL 3: Living room (0..448, 0..448) + Bedroom (512..640, 256..448)
      else if (currentLevel === 3) {
        const currentlyInside = isInsideBedroom(playerX, playerY);
        const nextInside = isInsideBedroom(nextX, nextY);
        
        if (currentlyInside !== nextInside) {
          // Transitioning across bedroom boundary (doorway at y = 320)
          if (playerY !== 320 || nextY !== 320) {
            collision = true;
          } else if (!currentlyInside && nextInside && !isBedroomDoorUnlocked) {
            // Entering from outside is blocked if door is locked
            collision = true;
            sysStatus.textContent = "The bedroom door is locked. Place Box A on the |1⟩ Relay Plate at (384, 128) in |1⟩ to open it in |0⟩ (5s timer!).";
          }
          // Note: if currentlyInside && !nextInside, exiting the bedroom is permitted even when the door has locked!
        }
        
        if (nextInside) {
          if (nextX < 512 || nextX > 640 || nextY < 256 || nextY > 448) {
            collision = true;
          }
        } else {
          if (nextX < 0 || nextX > 448 || nextY < 0 || nextY > 448) {
            collision = true;
          }
        }
      }
      
      // Box collisions if not holding
      if (!isHolding && !collision) {
        const boxInView = isObjectInDimension(boxProp, currentViewingDimension);
        if (boxInView && nextX === boxX && nextY === boxY) {
          collision = true;
        }
        if (boxProp2 && (currentLevel === 3 || currentLevel === 4)) {
          const box2InView = isObjectInDimension(boxProp2, currentViewingDimension);
          if (box2InView && nextX === box2X && nextY === box2Y) {
            collision = true;
          }
        }
      }
      
      if (!collision) {
        playerX = nextX;
        playerY = nextY;
        playFootstep();
        ensureAmbientSound();
        if (isPetOnShoulder) {
          petX = playerX;
          petY = playerY;
        }
        updatePhysics();
      }
    }
    
    // Interaction Key [E]: Pick Up or Drop Box (or Laplace if near)
    if (key === 'e') {
      if (isHolding || canGrab || canGrabBox2) {
        handleInteraction();
      } else if (isPetOnShoulder || canGrabPet) {
        handlePetInteraction();
      }
    }
    
    // Interaction Key [F]: Dedicated Laplace Shoulder Interaction
    if (key === 'f') {
      handlePetInteraction();
    }
  });
  
  let scrollTimeout: any = null;
  
  window.addEventListener('wheel', (e) => {
    if (isSolved || isPaused || currentRoute !== 'game') return;
    
    // Normal Scroll: Shift Perspective directly between |0> and |1>
    const delta = Math.sign(e.deltaY) * 0.08;
    const newScroll = Math.max(0, Math.min(1, scrollPos + delta));
    
    if (newScroll !== scrollPos) {
      scrollTarget = null;
      const actualDelta = newScroll - scrollPos;
      scrollPos = newScroll;
      
      // Rotate player
      if (isHolding) {
        if (activeHoldingBox === 1) qf.shift(boxProp, 1.0, [playerProp.is(1)]);
        if (activeHoldingBox === 2 && boxProp2) qf.shift(boxProp2, 1.0, [playerProp.is(1)]);
      }
      if (isPetOnShoulder) qf.shift(petProp, 1.0, [playerProp.is(1)]);
      
      qf.x(playerProp, actualDelta);
      
      if (isHolding) {
        if (activeHoldingBox === 1) qf.shift(boxProp, 1.0, [playerProp.is(1)]);
        if (activeHoldingBox === 2 && boxProp2) qf.shift(boxProp2, 1.0, [playerProp.is(1)]);
      }
      if (isPetOnShoulder) qf.shift(petProp, 1.0, [playerProp.is(1)]);
      
      if (scrollTimeout) clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        // Snap directly past 50/50 to either pure |0> or pure |1>
        scrollTarget = scrollPos < 0.5 ? 0.0 : 1.0;
      }, 180);
    }
    
    updatePhysics();
    renderQuantumScene();
  });
}

function handleInteraction() {
  if (isHolding) {
    dropBox();
  } else if (canGrab || canGrabBox2) {
    pickUpBox();
  }
}

function handlePetInteraction() {
  if (isPetOnShoulder) {
    putDownPet();
  } else if (canGrabPet) {
    pickUpPet();
  }
}

function pickUpPet() {
  const currentViewingDimension = scrollPos < 0.5 ? 0 : 1;
  const petInView = isObjectInDimension(petProp, currentViewingDimension);
  if (!petInView) return;
  
  isPetOnShoulder = true;
  petEl.classList.add('on-shoulder');
  playPetChirp();
  showFloatingText("LAPLACE PERCHED", petX + 32, petY - 14, "#f59e0b");
  
  // Align and entangle Laplace with player perspective:
  const pDist = qf.probabilities([petProp]);
  const pVal = (pDist.find((d: any) => d.qudit_values[0] === 1)?.probability || 0) > 0.5 ? 1 : 0;
  if (pVal === 1) {
    qf.shift(petProp);
  }
  
  qf.x(playerProp, -scrollPos);
  if (scrollPos > 0) {
    qf.x(playerProp, scrollPos);
  }
  qf.shift(petProp, 1.0, [playerProp.is(1)]);
  
  petX = playerX;
  petY = playerY;
  updatePhysics();
  updatePetVisuals();
  if (petStatusSpan) petStatusSpan.textContent = "On Shoulder";
  sysStatus.textContent = "Laplace jumped onto your shoulder. Ready to cross dimensions.";
}

function putDownPet() {
  let dropX = playerX;
  let dropY = playerY;
  
  if (playerDir === 'up') dropY -= 64;
  else if (playerDir === 'down') dropY += 64;
  else if (playerDir === 'left') dropX -= 64;
  else if (playerDir === 'right') dropX += 64;
  
  if (currentLevel === 2) {
    if (!isInsideWashroom(dropX, dropY) && (dropX >= 512 || dropY >= 512 || dropX < 0 || dropY < 0)) {
      dropX = playerX;
      dropY = playerY;
    }
  } else if (currentLevel === 3) {
    if (!isInsideBedroom(dropX, dropY) && (dropX >= 512 || dropY >= 512 || dropX < 0 || dropY < 0)) {
      dropX = playerX;
      dropY = playerY;
    }
  } else if (dropX < 0 || dropX > 448 || dropY < 0 || dropY > 448) {
    dropX = playerX;
    dropY = playerY;
  }
  
  petX = dropX;
  petY = dropY;
  isPetOnShoulder = false;
  petEl.classList.remove('on-shoulder');
  
  // TRIGGER QUANTUM MEASUREMENT FOR LAPLACE
  const [outcome] = qf.measure_properties([petProp]);
  console.log(`[Measurement] Laplace measured: collapsed to |${outcome}>`);
  
  petWanderTimer = 1.8;
  playPetChirp();
  if (petStatusSpan) petStatusSpan.textContent = `Wandering in |${outcome}>`;
  sysStatus.textContent = `Laplace hopped down and collapsed into reality |${outcome}>.`;
  
  updatePhysics();
  updatePetVisuals();
}

function pickUpBox() {
  const currentViewingDimension = scrollPos < 0.5 ? 0 : 1;
  
  if (canGrab) {
    const boxInView = isObjectInDimension(boxProp, currentViewingDimension);
    if (!boxInView) return;
    
    // Hide the decoherence timer while held
    isDecoherenceActive = false;
    if (boxDecayGauge) boxDecayGauge.classList.add('hidden');
    boxEl.classList.remove('observed', 'decohering');
    
    isHolding = true;
    activeHoldingBox = 1;
    playGrab();
    showFloatingText("BOX A SECURED", playerX + 32, playerY - 14, "#f59e0b");
    
    // If Box 1 was holding the bedroom door open on the Relay Plate:
    if (currentLevel === 3 && isBedroomDoorUnlocked) {
      setBedroomDoorState(false);
      plateEl.classList.remove('active');
      sysStatus.textContent = "Relay circuit broken: Box A lifted. Bedroom door locked.";
    }
    
    // Align and entangle Box 1:
    const bDist = qf.probabilities([boxProp]);
    const bVal = (bDist.find((d: any) => d.qudit_values[0] === 1)?.probability || 0) > 0.5 ? 1 : 0;
    if (bVal === 1) {
      qf.shift(boxProp);
    }
    
    qf.x(playerProp, -scrollPos);
    if (scrollPos > 0) {
      qf.x(playerProp, scrollPos);
    }
    qf.shift(boxProp, 1.0, [playerProp.is(1)]);
    
    boxX = playerX;
    boxY = playerY;
    boxEl.classList.add('held', 'entangled');
    playerEl.classList.add('holding');
    
    sysStatus.textContent = currentLevel === 3
      ? "Box A secured! Carry it to the |1⟩ Relay Target at (384, 128)."
      : "Evidence secured & entangled! Perspective shifts affect both.";
    updatePhysics();
    
  } else if (canGrabBox2 && currentLevel === 3 && boxProp2) {
    const box2InView = isObjectInDimension(boxProp2, currentViewingDimension);
    if (!box2InView) return;
    
    isHolding = true;
    activeHoldingBox = 2;
    playGrab();
    showFloatingText("BOX B SECURED", playerX + 32, playerY - 14, "#f59e0b");
    
    // Align and entangle Box 2:
    const b2Dist = qf.probabilities([boxProp2]);
    const b2Val = (b2Dist.find((d: any) => d.qudit_values[0] === 1)?.probability || 0) > 0.5 ? 1 : 0;
    if (b2Val === 1) {
      qf.shift(boxProp2);
    }
    
    qf.x(playerProp, -scrollPos);
    if (scrollPos > 0) {
      qf.x(playerProp, scrollPos);
    }
    qf.shift(boxProp2, 1.0, [playerProp.is(1)]);
    
    box2X = playerX;
    box2Y = playerY;
    if (box2El) box2El.classList.add('held', 'entangled');
    playerEl.classList.add('holding');
    
    sysStatus.textContent = "Box B retrieved! Carry it into the living room and shift to |1⟩ to deposit in Convergence Vault.";
    updatePhysics();
  }
}

function dropBox() {
  playDrop();
  triggerScreenShake(2.5, 90);
  let dropX = playerX;
  let dropY = playerY;
  
  if (playerDir === 'up') dropY -= 64;
  else if (playerDir === 'down') dropY += 64;
  else if (playerDir === 'left') dropX -= 64;
  else if (playerDir === 'right') dropX += 64;
  
  if (currentLevel === 2) {
    if (!isInsideWashroom(dropX, dropY) && (dropX >= 512 || dropY >= 512 || dropX < 0 || dropY < 0)) {
      dropX = playerX;
      dropY = playerY;
    }
  } else if (currentLevel === 3) {
    if (!isInsideBedroom(dropX, dropY) && (dropX >= 512 || dropY >= 512 || dropX < 0 || dropY < 0)) {
      dropX = playerX;
      dropY = playerY;
    }
  } else if (dropX < 0 || dropX > 448 || dropY < 0 || dropY > 448) {
    dropX = playerX;
    dropY = playerY;
  }
  
  // In Level 2, prevent dropping across the solid wall in |0>
  if (currentLevel === 2 && scrollPos < 0.5) {
    const playerInWashroom = isInsideWashroom(playerX, playerY);
    const dropInWashroom = isInsideWashroom(dropX, dropY);
    if (playerInWashroom !== dropInWashroom) {
      dropX = playerX;
      dropY = playerY;
    }
  }
  
  // In Level 3, prevent dropping across locked bedroom door
  if (currentLevel === 3 && !isBedroomDoorUnlocked) {
    const playerInBedroom = isInsideBedroom(playerX, playerY);
    const dropInBedroom = isInsideBedroom(dropX, dropY);
    if (playerInBedroom !== dropInBedroom) {
      dropX = playerX;
      dropY = playerY;
    }
  }
  
  if (activeHoldingBox === 1) {
    boxX = dropX;
    boxY = dropY;
    boxEl.classList.remove('held', 'entangled');
    
    // TRIGGER QUANTUM MEASUREMENT FOR BOX 1
    const [outcome] = qf.measure_properties([boxProp]);
    console.log(`[Measurement] Box 1 measured: collapsed to |${outcome}>`);
    
    if (currentLevel === 3) {
      // Check Relay Plate at (384, 128) in |1>
      if (boxX === plateX && boxY === plateY && outcome === 1) {
        setBedroomDoorState(true);
        plateEl.classList.add('active');
        isDecoherenceActive = true;
        boxDecayRemaining = currentDecoherenceTime;
        lastDecayTickedSec = Math.ceil(currentDecoherenceTime);
        playPlateActivate();
        triggerScreenShake(4.5, 140);
        showFloatingText("RELAY ACTIVE [5.0s]", plateX + 32, plateY - 16, "#00f0ff");
        if (boxDecayGauge) {
          boxDecayGauge.classList.remove('hidden', 'zeno-locked');
          boxDecayTime.textContent = `${currentDecoherenceTime.toFixed(1)}s`;
          boxDecayFill.style.width = '100%';
        }
        sysStatus.textContent = "RELAY ACTIVE! Bedroom door open in |0⟩! You have 5 seconds before Box A decoheres to enter!";
      } else if (boxX === plateX && boxY === plateY && outcome === 0) {
        setBedroomDoorState(false);
        plateEl.classList.remove('active');
        isDecoherenceActive = false;
        sysStatus.textContent = "The pressure plate does not exist in |0⟩! Only Box A placed on it in |1⟩ activates the relay.";
      } else {
        setBedroomDoorState(false);
        plateEl.classList.remove('active');
        if (outcome === 1) {
          isDecoherenceActive = true;
          boxDecayRemaining = currentDecoherenceTime;
          if (boxDecayGauge) {
            boxDecayGauge.classList.remove('hidden', 'zeno-locked');
            boxDecayTime.textContent = `${currentDecoherenceTime.toFixed(1)}s`;
            boxDecayFill.style.width = '100%';
          }
          sysStatus.textContent = "Box A dropped in |1⟩. Place it on the |1⟩ Relay Plate at (384, 128) to unlock the bedroom.";
        } else {
          isDecoherenceActive = false;
          if (boxDecayGauge) boxDecayGauge.classList.add('hidden');
          sysStatus.textContent = "Box A dropped in |0⟩. Shift to |1⟩ to place it on the Relay Plate.";
        }
      }
    } else if (currentLevel === 4) {
      // Level 4 Entanglement Check:
      // Box 1 on plate 1 (320, 64) in |0>
      if (boxX === 320 && boxY === 64 && outcome === 0) {
        isSolved = true;
        plateEl.classList.add('active');
        if (plate2El) plate2El.classList.add('active');
        playPlateActivate();
        playVictory();
        triggerScreenShake(5.0, 250);
        showFloatingText("TWIN VAULTS SYNCHRONIZED!", 320, 48, "#10b981");
        sysStatus.textContent = "TWIN VAULT SYNCHRONIZED! Both entangled crates locked into position.";
        victoryTitle.textContent = "CASE RESOLVED: REALITY RESTORED";
        victoryDescription.innerHTML = "You synchronized the entangled crates across dimensions! The final lock is open. Reality in the flat is stabilized.";
        victoryNextBtn.textContent = "RETURN TO MAIN MENU";
        setTimeout(() => { victoryModal.classList.remove('hidden'); }, 600);
      } else {
        sysStatus.textContent = outcome === 0
          ? "Box 1 dropped in |0⟩. Align it with the Floor Vault at (320, 64) to synchronize both."
          : "Box 1 dropped in |1⟩. Shift to |0⟩ to guide the entangled pair.";
      }
    } else {
      // Level 1 or 2 standard plate condition
      // DECOHERENCE TIMER: ONLY appears after player drops the item in |1>!
      if (outcome === 1 && currentLevel !== 2) {
        isDecoherenceActive = true;
        boxDecayRemaining = currentDecoherenceTime;
        if (boxDecayGauge) {
          boxDecayGauge.classList.remove('hidden', 'zeno-locked');
          boxDecayTime.textContent = `${currentDecoherenceTime.toFixed(1)}s`;
          boxDecayFill.style.width = '100%';
        }
        sysStatus.textContent = `Evidence dropped into |1>! Decoherence timer active.`;
      } else {
        isDecoherenceActive = false;
        if (boxDecayGauge) boxDecayGauge.classList.add('hidden');
        sysStatus.textContent = `Evidence dropped into stable state.`;
      }
      checkPlateCondition(outcome);
    }
    
  } else if (activeHoldingBox === 2 && boxProp2) {
    box2X = dropX;
    box2Y = dropY;
    if (box2El) box2El.classList.remove('held', 'entangled');
    
    // TRIGGER QUANTUM MEASUREMENT FOR BOX 2
    const [outcome2] = qf.measure_properties([boxProp2]);
    console.log(`[Measurement] Box 2 measured: collapsed to |${outcome2}>`);
    
    if (currentLevel === 3) {
      const onTargetVault = (box2X === 128 && box2Y === 384);
      if (onTargetVault && outcome2 === 1) {
        isSolved = true;
        if (plate2El) plate2El.classList.add('active');
        playPlateActivate();
        playVictory();
        triggerScreenShake(5.0, 250);
        showFloatingText("CONVERGENCE ACHIEVED!", 128, 360, "#d4af37");
        sysStatus.textContent = "SUCCESS! Box B secured in |1⟩ Convergence Vault. Dimensional relay stabilized!";
        victoryTitle.textContent = "LEVEL 3 CONVERGENCE";
        victoryDescription.innerHTML = "By completing the cross-dimensional relay, you retrieved Box B from the bedroom and converged reality! Proceed to <strong>Level 4</strong>.";
        victoryNextBtn.textContent = "PROCEED TO LEVEL 4";
        setTimeout(() => { victoryModal.classList.remove('hidden'); }, 600);
      } else if (onTargetVault && outcome2 === 0) {
        sysStatus.textContent = "Box B is on the Convergence Vault, but in |0⟩! Shift to |1⟩ and place it.";
      } else {
        sysStatus.textContent = outcome2 === 1
          ? "Box B dropped in |1⟩. Bring it to the Convergence Vault at (128, 384) to complete the relay!"
          : "Box B dropped in |0⟩. Shift to |1⟩ to deposit it in the Convergence Vault.";
      }
    }
  }
  
  isHolding = false;
  activeHoldingBox = null;
  playerEl.classList.remove('holding');
  updatePhysics();
}

function checkPlateCondition(measuredOutcome: number) {
  const isOnPlate = (boxX === plateX && boxY === plateY);
  
  if (isOnPlate) {
    const plateMatches = isObjectInDimension(plateProp, measuredOutcome);
    
    if (plateMatches) {
      isSolved = true;
      isDecoherenceActive = false;
      if (boxDecayGauge) boxDecayGauge.classList.add('hidden');
      playPlateActivate();
      playVictory();
      triggerScreenShake(4.5, 200);
      showFloatingText("VAULT SECURED!", plateX + 32, plateY - 16, "#10b981");
      
      plateEl.classList.add('active');
      if (vaultHologram) vaultHologram.style.display = 'none';
      if (vaultLabel) vaultLabel.textContent = "|0⟩ SECURED";
      sysStatus.textContent = `SUCCESS! Evidence secured in |${measuredOutcome}> Floor Vault. Reality stabilized!`;
      
      if (currentLevel === 1) {
        victoryTitle.textContent = "LEVEL 1 CONVERGENCE";
        victoryDescription.innerHTML = "You stabilized the living room and proved the quantum perspective mechanism. Proceed to <strong>Level 2</strong> to investigate the phased washroom.";
        victoryNextBtn.textContent = "PROCEED TO LEVEL 2";
      } else if (currentLevel === 2) {
        victoryTitle.textContent = "LEVEL 2 RESOLVED";
        victoryDescription.innerHTML = "You successfully extracted the crate from the washroom anomaly. Proceed to <strong>Level 3</strong> for the Cross-Dimensional Relay.";
        victoryNextBtn.textContent = "PROCEED TO LEVEL 3";
      }
      
      setTimeout(() => {
        victoryModal.classList.remove('hidden');
      }, 600);
    } else {
      plateEl.classList.remove('active');
      if (vaultHologram) vaultHologram.style.display = 'flex';
      if (vaultLabel) vaultLabel.textContent = "|0⟩ FLOOR VAULT";
      sysStatus.textContent = `Evidence collapsed into |${measuredOutcome}>, but the containment vault is in dimension |0>!`;
    }
  }
}

function isObjectInDimension(prop: any, dimension: number): boolean {
  if (!prop) return false;
  const dist = qf.probabilities([prop]);
  const match = dist.find((d: any) => d.qudit_values[0] === dimension);
  return (match?.probability || 0) > 0.5;
}

function updatePhysics() {
  playerEl.style.left = `${playerX}px`;
  playerEl.style.top = `${playerY}px`;
  
  if (isHolding) {
    playerSpriteEl.style.transform = isWalking ? 'translateY(-2px)' : 'translateY(0)';
  } else {
    playerSpriteEl.style.transform = '';
  }
  
  if (isHolding) {
    if (activeHoldingBox === 1) {
      boxX = playerX;
      boxY = playerY;
    } else if (activeHoldingBox === 2) {
      box2X = playerX;
      box2Y = playerY;
    }
  }
  
  boxEl.style.left = `${boxX}px`;
  boxEl.style.top = `${boxY}px`;
  
  if (isPetOnShoulder) {
    petX = playerX;
    petY = playerY;
    petEl.style.left = `${petX}px`;
    petEl.style.top = `${petY}px`;
    canGrabPet = false;
  } else {
    petEl.style.left = `${petX}px`;
    petEl.style.top = `${petY}px`;
  }
  
  if (currentLevel === 4) {
    // Box 2 mirrors Box 1 invertedly
    box2X = 448 - boxX;
    box2Y = 448 - boxY;
    if (box2El) {
      box2El.style.left = `${box2X}px`;
      box2El.style.top = `${box2Y}px`;
    }
  } else if (currentLevel === 3) {
    if (box2El) {
      box2El.style.left = `${box2X}px`;
      box2El.style.top = `${box2Y}px`;
    }
  }
}

function gameLoop(now: number) {
  const dt = Math.min(0.1, (now - lastTimestamp) / 1000);
  lastTimestamp = now;
  
  if (currentRoute === 'game' && !isPaused) {
    if (scrollTarget !== null) {
      const diff = scrollTarget - scrollPos;
      if (Math.abs(diff) < 0.01) {
        const actualDelta = scrollTarget - scrollPos;
        scrollPos = scrollTarget;
        scrollTarget = null;
        const finalDim = scrollPos < 0.5 ? 0 : 1;
        playShift(finalDim);
        setMusicDimension(finalDim);
        triggerScreenShake(1.5, 60);
        showFloatingText(finalDim === 0 ? "DIMENSION |0⟩" : "DIMENSION |1⟩", playerX + 32, playerY - 14, finalDim === 0 ? "#00f0ff" : "#ff3366");
        if (actualDelta !== 0) {
          if (isHolding) qf.shift(boxProp, 1.0, [playerProp.is(1)]);
          if (isPetOnShoulder) qf.shift(petProp, 1.0, [playerProp.is(1)]);
          qf.x(playerProp, actualDelta);
          if (isHolding) qf.shift(boxProp, 1.0, [playerProp.is(1)]);
          if (isPetOnShoulder) qf.shift(petProp, 1.0, [playerProp.is(1)]);
        }
      } else {
        const step = diff * 5.0 * dt; // Smooth snap
        scrollPos += step;
        if (isHolding) qf.shift(boxProp, 1.0, [playerProp.is(1)]);
        if (isPetOnShoulder) qf.shift(petProp, 1.0, [playerProp.is(1)]);
        qf.x(playerProp, step);
        if (isHolding) qf.shift(boxProp, 1.0, [playerProp.is(1)]);
        if (isPetOnShoulder) qf.shift(petProp, 1.0, [playerProp.is(1)]);
      }
      updatePhysics();
    }
    
    handlePetWandering(dt);
    handleDecoherence(dt);
    renderQuantumScene();
  }
  
  requestAnimationFrame(gameLoop);
}

/**
 * Autonomous wandering for Laplace the Bearded Dragon:
 * Explores the apartment floor naturally, basking and crawling around.
 */
function handlePetWandering(dt: number) {
  if (isSolved || isPetOnShoulder) return;
  // Disable wandering in Level 3 and 4 so Laplace can "Stay" to apply Zeno Effect
  if (currentLevel >= 3) return;
  
  petWanderTimer -= dt;
  if (petWanderTimer <= 0) {
    // Reset timer to 2.5 - 4.5 seconds
    petWanderTimer = 2.5 + Math.random() * 2.0;
    
    // 50% chance to crawl a step, 50% chance to bask / turn
    if (Math.random() > 0.45) {
      const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
      const chosenDir = dirs[Math.floor(Math.random() * dirs.length)];
      petDir = chosenDir;
      
      let nextPetX = petX;
      let nextPetY = petY;
      
      if (chosenDir === 'up') nextPetY -= 64;
      else if (chosenDir === 'down') nextPetY += 64;
      else if (chosenDir === 'left') nextPetX -= 64;
      else if (chosenDir === 'right') nextPetX += 64;
      
      if (currentLevel === 2) {
        if (!isInsideWashroom(nextPetX, nextPetY) && (nextPetX >= 512 || nextPetY >= 512 || nextPetX < 0 || nextPetY < 0)) {
          nextPetX = petX;
          nextPetY = petY;
        }
      } else {
        if (nextPetX < 0 || nextPetX > 448 || nextPetY < 0 || nextPetY > 448) {
          nextPetX = petX;
          nextPetY = petY;
        }
      }
      
      // In Level 2, don't wander across the solid wall in |0>
      if (currentLevel === 2) {
        const petCurrentInWashroom = isInsideWashroom(petX, petY);
        const petNextInWashroom = isInsideWashroom(nextPetX, nextPetY);
        if (petCurrentInWashroom !== petNextInWashroom) {
          nextPetX = petX;
          nextPetY = petY;
        }
      }
      
      // Avoid stepping directly into player
      if (!(nextPetX === playerX && nextPetY === playerY)) {
        petX = nextPetX;
        petY = nextPetY;
      }
      
      updatePetVisuals();
    } else {
      // Turn in place
      const dirs: Array<'up' | 'down' | 'left' | 'right'> = ['up', 'down', 'left', 'right'];
      petDir = dirs[Math.floor(Math.random() * dirs.length)];
      updatePetVisuals();
    }
  }
}

/**
 * Continuous Decoherence & Quantum Zeno Effect
 */
function handleDecoherence(dt: number) {
  if (!isDecoherenceActive || isSolved || isHolding) return;
  
  const bDist = qf.probabilities([boxProp]);
  const bProb1 = (bDist.find((d: any) => d.qudit_values[0] === 1)?.probability || 0);
  
  if (bProb1 < 0.01 && boxDecayRemaining > 0.01) {
    isDecoherenceActive = false;
    if (boxDecayGauge) boxDecayGauge.classList.add('hidden');
    boxEl.classList.remove('decohering');
    return;
  }
  
  // Check if Laplace (pet) is nearby in the SAME reality dimension
  const petDistToBox = Math.hypot((petX + 32) - (boxX + 32), (petY + 32) - (boxY + 32));
  const isPetNear = petDistToBox < 100;
  
  const petInDimension1 = isObjectInDimension(petProp, 1);
  const isProtectedByPet = isPetNear && petInDimension1 && !isPetOnShoulder;
  
  if (isProtectedByPet) {
    boxEl.classList.add('observed');
    boxEl.classList.remove('decohering');
    petEl.classList.add('observing');
    
    if (boxDecayGauge) {
      boxDecayGauge.classList.add('zeno-locked');
      if (decayIcon) decayIcon.textContent = '👁️';
      if (boxDecayLabel) boxDecayLabel.textContent = 'ZENO LOCKED (LAPLACE)';
    }
  } else {
    boxEl.classList.remove('observed');
    boxEl.classList.add('decohering');
    petEl.classList.remove('observing');
    
    if (boxDecayGauge) {
      boxDecayGauge.classList.remove('zeno-locked');
      if (decayIcon) decayIcon.textContent = '⏳';
      if (boxDecayLabel) boxDecayLabel.textContent = 'DECOHERENCE';
    }
    
    boxDecayRemaining = Math.max(0, boxDecayRemaining - dt);
    
    const currentSec = Math.floor(boxDecayRemaining);
    if (currentSec < lastDecayTickedSec && boxDecayRemaining > 0.1) {
      lastDecayTickedSec = currentSec;
      playDecoherenceTick(boxDecayRemaining);
      showFloatingText(`T-${(currentSec + 1)}s`, boxX + 32, boxY - 14, "#ff3366");
    }
    
    if (boxDecayTime) {
      boxDecayTime.textContent = `${boxDecayRemaining.toFixed(1)}s`;
    }
    
    if (boxDecayFill) {
      const pct = (boxDecayRemaining / currentDecoherenceTime) * 100;
      boxDecayFill.style.width = `${pct}%`;
    }
    
    // No continuous rotation! Stays in |1> until it hits 0.
    
    if (boxDecayRemaining <= 0.01) {
      // Instant collapse into ground state |0>
      const curDist = qf.probabilities([boxProp]);
      const isOne = (curDist.find((d: any) => d.qudit_values[0] === 1)?.probability || 0) > 0.5;
      if (isOne) {
        qf.shift(boxProp); // In qudit dimension 2, shift wraps |1> directly into |0>
      }
      isDecoherenceActive = false;
      if (boxDecayGauge) boxDecayGauge.classList.add('hidden');
      boxEl.classList.remove('decohering');
      playDecoherenceCollapse();
      triggerScreenShake(5.0, 180);
      showFloatingText("DECOHERENCE COLLAPSED", boxX + 32, boxY - 14, "#ef4444");
      
      if (currentLevel === 3) {
        setBedroomDoorState(false);
        plateEl.classList.remove('active');
        sysStatus.textContent = "DECOHERENCE: Box A collapsed to |0⟩! The bedroom door has locked.";
      } else {
        // Check Game Over!
        if (playerX === boxX && playerY === boxY) {
          sysStatus.textContent = "CRITICAL FAILURE: Materialized inside the investigator! Reality reset...";
          isSolved = true; // prevent movement
          setTimeout(() => loadLevel(currentLevel), 1500);
        } else {
          sysStatus.textContent = "Evidence has completely decohered into Ground State |0>.";
        }
      }
    }
  }
}

function renderQuantumScene() {
  const pDist = qf.probabilities([playerProp]);
  const bDist = qf.probabilities([boxProp]);
  const plDist = qf.probabilities([plateProp]);
  const petDist = qf.probabilities([petProp]);
  
  const getProbOf0 = (dist: any[]) => {
    const state0 = dist.find(d => d.qudit_values[0] === 0);
    return state0 ? state0.probability : 0;
  };
  
  const getProbOf1 = (dist: any[]) => {
    const state1 = dist.find(d => d.qudit_values[0] === 1);
    return state1 ? state1.probability : 0;
  };

  const pProb0 = getProbOf0(pDist);
  const pProb1 = getProbOf1(pDist);
  const bProb0 = getProbOf0(bDist);
  const bProb1 = getProbOf1(bDist);
  const plProb0 = getProbOf0(plDist);
  const plProb1 = getProbOf1(plDist);
  const petProb0 = getProbOf0(petDist);
  const petProb1 = getProbOf1(petDist);
  
  if (playerStateSpan) playerStateSpan.textContent = formatState(pProb0, pProb1);
  if (boxStateSpan) boxStateSpan.textContent = formatState(bProb0, bProb1);
  if (petStateSpan) {
    petStateSpan.textContent = formatState(petProb0, petProb1);
  }
  if (plateStateSpan) {
    plateStateSpan.textContent = formatState(plProb0, plProb1);
  }
  
  // Pure Red and Blue only — no yellow or rainbow phase!
  const targetHue = scrollPos < 0.5 ? 215 : 355; // 215 = Electric Blue for |0>, 355 = Neon Red for |1>
  document.documentElement.style.setProperty('--theme-hue', `${targetHue}`);
  const playerViewingDimension = scrollPos < 0.5 ? 0 : 1;
  const viewFactor = playerViewingDimension === 0 ? (1 - scrollPos) : scrollPos;
  
  // Level 2 Quantum Door visual update:
  if (currentLevel === 2 && quantumDoor) {
    if (playerViewingDimension === 1) {
      doorPanel.classList.add('open');
    } else {
      doorPanel.classList.remove('open');
    }
  }
  
  // Level 3 Bedroom Door visual update:
  if (currentLevel === 3 && bedroomDoorPanel) {
    if (isBedroomDoorUnlocked) {
      bedroomDoorPanel.classList.add('open');
    } else {
      bedroomDoorPanel.classList.remove('open');
    }
  }
  
  // Level 3 & 4: Box 2 and Plate 2 visuals
  if (currentLevel === 3 && boxProp2 && plateProp2) {
    // Level 3: Box B (Box 2)
    if (isHolding && activeHoldingBox === 2) {
      box2El.style.display = 'block';
      box2El.style.opacity = '1.0';
      box2El.style.pointerEvents = 'auto';
    } else {
      const box2InView = isObjectInDimension(boxProp2, playerViewingDimension);
      if (box2InView) {
        box2El.style.display = 'block';
        box2El.style.opacity = Math.max(0.35, viewFactor).toFixed(2);
        box2El.style.pointerEvents = 'auto';
      } else {
        // In |1>, show Box B as a semi-transparent ghost inside the bedroom
        box2El.style.display = 'block';
        box2El.style.opacity = '0.35';
        box2El.style.pointerEvents = 'none';
      }
    }
    
    // Level 3: Convergence Vault (Plate 2)
    const plate2InView = isObjectInDimension(plateProp2, playerViewingDimension);
    const p2Holo = plate2El.querySelector('.vault-hologram') as HTMLElement | null;
    const p2Title = plate2El.querySelector('.vault-title');
    if (plate2InView) {
      plate2El.style.display = 'flex';
      plate2El.style.opacity = Math.max(0.35, viewFactor).toFixed(2);
      plate2El.style.pointerEvents = 'auto';
      plate2El.classList.remove('relay-projection');
      if (p2Title) p2Title.textContent = "|1⟩ CONVERGENCE VAULT";
      if (p2Holo) p2Holo.style.display = isSolved ? 'none' : 'flex';
    } else {
      // In |0>, display Convergence Vault as holographic target projection
      plate2El.style.display = 'flex';
      plate2El.style.opacity = '0.45';
      plate2El.style.pointerEvents = 'none';
      plate2El.classList.add('relay-projection');
      if (p2Title) p2Title.textContent = "|1⟩ VAULT TARGET";
      if (p2Holo) p2Holo.style.display = isSolved ? 'none' : 'flex';
    }
  } else if (currentLevel === 4 && boxProp2 && plateProp2) {
    // Level 4: Both twins and vaults are visible across both dimensions!
    box2El.style.display = 'block';
    plate2El.style.display = 'flex';
    
    if (playerViewingDimension === 0) {
      // In |0>: Box 2 rendered as cyan glowing entangled ghost twin
      box2El.style.opacity = '0.75';
      box2El.classList.add('entangled');
      box2El.style.pointerEvents = 'none';
      
      // Plate 2 rendered as twin vault projection
      plate2El.style.opacity = '0.55';
      plate2El.classList.add('relay-projection');
      const p2Title = plate2El.querySelector('.vault-title');
      if (p2Title) p2Title.textContent = "|1⟩ TWIN VAULT [PROJ]";
      
      // Laser barrier shows as phased preview
      if (energyBarrier) {
        energyBarrier.classList.remove('hidden');
        energyBarrier.classList.add('phased-preview');
        const bText = energyBarrier.querySelector('.barrier-text');
        if (bText) bText.textContent = "|1⟩ SECURE LASER GRID [PHASED]";
      }
    } else {
      // In |1>: Box 2 is physical
      box2El.style.opacity = '1.0';
      box2El.classList.remove('entangled');
      box2El.style.pointerEvents = 'auto';
      
      // Plate 2 is physical active twin vault
      plate2El.style.opacity = '1.0';
      plate2El.classList.remove('relay-projection');
      const p2Title = plate2El.querySelector('.vault-title');
      if (p2Title) p2Title.textContent = "|1⟩ TWIN VAULT";
      
      // Laser barrier is full active lethal grid
      if (energyBarrier) {
        energyBarrier.classList.remove('hidden', 'phased-preview');
        const bText = energyBarrier.querySelector('.barrier-text');
        if (bText) bText.textContent = "⚡ |1⟩ SECURE LASER GRID";
      }
    }
  } else {
    box2El.style.display = 'none';
    plate2El.style.display = 'none';
    if (energyBarrier && currentLevel !== 4) energyBarrier.classList.add('hidden');
  }
  
  // Box Hazard Visibility
  if (isDecoherenceActive && playerViewingDimension === 0) {
    boxHazard.classList.remove('hidden');
    boxHazard.style.left = `${boxX}px`;
    boxHazard.style.top = `${boxY}px`;
  } else {
    boxHazard.classList.add('hidden');
  }
  
  // Poll Box 1 visibility:
  if (currentLevel === 4) {
    boxEl.style.display = 'block';
    if (playerViewingDimension === 0) {
      boxEl.style.opacity = '1.0';
      boxEl.classList.remove('entangled');
    } else {
      // In |1>, Box 1 rendered as cyan entangled ghost
      boxEl.style.opacity = '0.65';
      boxEl.classList.add('entangled');
    }
  } else if (isHolding && activeHoldingBox === 1) {
    boxEl.style.display = 'block';
    boxEl.style.opacity = '1.0';
    boxEl.style.pointerEvents = 'auto';
  } else {
    const inCurrentDimension = isObjectInDimension(boxProp, playerViewingDimension);
    
    if (inCurrentDimension) {
      boxEl.style.display = 'block';
      boxEl.style.opacity = Math.max(0.15, viewFactor).toFixed(2);
      boxEl.style.pointerEvents = 'auto';
    } else {
      boxEl.style.display = 'none';
      boxEl.style.opacity = '0';
      boxEl.style.pointerEvents = 'none';
    }
  }
  
  // Poll Laplace (pet) visibility:
  if (isPetOnShoulder) {
    petEl.style.display = 'block';
    petEl.style.opacity = '1.0';
    petEl.style.pointerEvents = 'auto';
  } else {
    const petInView = isObjectInDimension(petProp, playerViewingDimension);
    if (petInView) {
      petEl.style.display = 'block';
      petEl.style.opacity = Math.max(0.2, viewFactor).toFixed(2);
      petEl.style.pointerEvents = 'auto';
    } else {
      petEl.style.display = 'none';
      petEl.style.opacity = '0';
      petEl.style.pointerEvents = 'none';
    }
  }
  
  // Poll Pressure Plate visibility:
  if (currentLevel === 3) {
    if (playerViewingDimension === 1) {
      // In |1>, plate is physically present and active
      plateEl.style.display = 'flex';
      plateEl.style.opacity = Math.max(0.35, viewFactor).toFixed(2);
      plateEl.style.pointerEvents = 'auto';
      plateEl.classList.remove('relay-projection');
      if (vaultLabel) vaultLabel.textContent = isBedroomDoorUnlocked ? "|1⟩ RELAY ACTIVE" : "|1⟩ RELAY SENSOR";
    } else {
      // On |0>, the plate does not exist and is completely invisible
      plateEl.style.display = 'none';
      plateEl.style.opacity = '0';
      plateEl.style.pointerEvents = 'none';
    }
  } else {
    plateEl.classList.remove('relay-projection');
    const plateInView = isObjectInDimension(plateProp, playerViewingDimension);
    if (plateInView) {
      plateEl.style.display = 'flex';
      plateEl.style.opacity = Math.max(0.2, viewFactor).toFixed(2);
      plateEl.style.pointerEvents = 'auto';
    } else {
      plateEl.style.display = 'none';
      plateEl.style.opacity = '0';
      plateEl.style.pointerEvents = 'none';
    }
  }
  
  // Update proximity grabs continuously
  const boxInView = isObjectInDimension(boxProp, playerViewingDimension);
  if (boxInView && !isHolding) {
    const dist = Math.hypot((playerX + 32) - (boxX + 32), (playerY + 32) - (boxY + 32));
    canGrab = dist < 75;
  } else {
    canGrab = false;
  }
  
  if (boxProp2 && currentLevel === 3 && !isHolding) {
    const box2InView = isObjectInDimension(boxProp2, playerViewingDimension);
    if (box2InView) {
      const dist2 = Math.hypot((playerX + 32) - (box2X + 32), (playerY + 32) - (box2Y + 32));
      canGrabBox2 = dist2 < 75;
    } else {
      canGrabBox2 = false;
    }
  } else {
    canGrabBox2 = false;
  }
  
  if (!isPetOnShoulder) {
    const petInView = isObjectInDimension(petProp, playerViewingDimension);
    if (petInView) {
      const distPet = Math.hypot((playerX + 32) - (petX + 32), (playerY + 32) - (petY + 32));
      canGrabPet = distPet < 75;
    } else {
      canGrabPet = false;
    }
  } else {
    canGrabPet = false;
  }

  // Update interaction prompt
  if (isHolding) {
    if (currentLevel === 3) {
      promptTextEl.textContent = activeHoldingBox === 1
        ? "Press [E] to place Box A onto |1⟩ Relay Target (384, 128)"
        : "Press [E] to place Box B into |1⟩ Convergence Vault (128, 384)";
    } else if (currentLevel === 4) {
      promptTextEl.textContent = "Press [E] to deposit Box 1 into Floor Vault (320, 64)";
    } else {
      promptTextEl.textContent = "Press [E] to drop crate (Carry to |0⟩ Floor Vault)";
    }
    promptEl.classList.remove('hidden');
  } else if (canGrab && canGrabPet) {
    promptTextEl.textContent = currentLevel === 3 ? "Press [E] for Box A | [F] for Laplace" : "Press [E] for Box | [F] for Laplace";
    promptEl.classList.remove('hidden');
  } else if (canGrab) {
    promptTextEl.textContent = currentLevel === 3 ? "Press [E] to pick up Box A" : "Press [E] to pick up evidence crate";
    promptEl.classList.remove('hidden');
  } else if (canGrabBox2) {
    promptTextEl.textContent = "Press [E] to pick up Box B";
    promptEl.classList.remove('hidden');
  } else if (canGrabPet) {
    promptTextEl.textContent = "Press [F] to take Laplace onto shoulder";
    promptEl.classList.remove('hidden');
  } else if (isPetOnShoulder) {
    promptTextEl.textContent = "Press [F] to put down Laplace";
    promptEl.classList.remove('hidden');
  } else {
    promptEl.classList.add('hidden');
  }
}

function formatState(prob0: number, prob1: number) {
  if (prob0 > 0.99) return '|0>';
  if (prob1 > 0.99) return '|1>';
  const p0 = Math.round(prob0 * 100);
  const p1 = Math.round(prob1 * 100);
  return `${p0}% |0> + ${p1}% |1>`;
}

function updateMusicButtonUI() {
  const playing = isMusicPlaying();
  if (musicToggleBtn) {
    musicToggleBtn.textContent = playing ? "🎵 MUSIC: ON" : "🔇 MUSIC: OFF";
    musicToggleBtn.classList.toggle('muted', !playing);
  }
  if (escMusicText) {
    escMusicText.textContent = playing ? "SOUNDTRACK: ON" : "SOUNDTRACK: OFF";
  }
}

function setupMenuUI() {
  // Resume & start background music on initial user interaction anywhere
  const triggerAudioOnce = () => {
    startBackgroundMusic();
    updateMusicButtonUI();
  };
  ['pointerdown', 'keydown', 'click'].forEach(evt => {
    window.addEventListener(evt, triggerAudioOnce, { once: true });
  });

  if (musicToggleBtn) {
    musicToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBackgroundMusic();
      updateMusicButtonUI();
    });
  }

  if (menuPlayBtn) {
    menuPlayBtn.addEventListener('click', () => {
      startBackgroundMusic();
      updateMusicButtonUI();
      if (!hasSeenIntro) {
        openIntroModal(() => {
          router.navigate('game', currentLevel);
        });
      } else {
        router.navigate('game', currentLevel);
      }
    });
  }

  if (menuPrologueBtn) {
    menuPrologueBtn.addEventListener('click', () => {
      startBackgroundMusic();
      updateMusicButtonUI();
      openIntroModal();
    });
  }
  
  if (menuInfoBtn) {
    menuInfoBtn.addEventListener('click', () => {
      menuInfoModal.classList.remove('hidden');
    });
  }
  
  if (menuInfoCloseBtn) {
    menuInfoCloseBtn.addEventListener('click', () => {
      menuInfoModal.classList.add('hidden');
    });
  }
  
  if (menuInfoPlayBtn) {
    menuInfoPlayBtn.addEventListener('click', () => {
      menuInfoModal.classList.add('hidden');
      startBackgroundMusic();
      updateMusicButtonUI();
      if (!hasSeenIntro) {
        openIntroModal(() => {
          router.navigate('game', currentLevel);
        });
      } else {
        router.navigate('game', currentLevel);
      }
    });
  }
}

function setupIntroModal() {
  if (introPrevBtn) {
    introPrevBtn.addEventListener('click', () => {
      if (currentIntroSlide > 0) renderIntroSlide(currentIntroSlide - 1);
    });
  }

  if (introNextBtn) {
    introNextBtn.addEventListener('click', () => {
      if (currentIntroSlide < INTRO_SLIDES.length - 1) {
        renderIntroSlide(currentIntroSlide + 1);
      } else {
        closeIntroModal();
      }
    });
  }

  if (introSkipBtn) {
    introSkipBtn.addEventListener('click', () => {
      closeIntroModal();
    });
  }

  const dots = document.querySelectorAll('.intro-dot');
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetSlide = parseInt(dot.getAttribute('data-slide') || '0', 10);
      renderIntroSlide(targetSlide);
    });
  });
}

function toggleEscapeMenu() {
  if (isPaused) {
    closeEscapeMenu();
  } else {
    openEscapeMenu();
  }
}

function openEscapeMenu() {
  isPaused = true;
  escapeMenu.classList.remove('hidden');
}

function closeEscapeMenu() {
  isPaused = false;
  escapeMenu.classList.add('hidden');
}

function setupEscapeMenu() {
  if (pauseBtn) {
    pauseBtn.addEventListener('click', openEscapeMenu);
  }

  if (escMusicBtn) {
    escMusicBtn.addEventListener('click', () => {
      toggleBackgroundMusic();
      updateMusicButtonUI();
    });
  }

  if (escPrologueBtn) {
    escPrologueBtn.addEventListener('click', () => {
      closeEscapeMenu();
      openIntroModal();
    });
  }
  
  if (escResumeBtn) {
    escResumeBtn.addEventListener('click', closeEscapeMenu);
  }
  
  if (escLvl1Btn) {
    escLvl1Btn.addEventListener('click', () => {
      closeEscapeMenu();
      router.navigate('game', 1);
    });
  }
  
  if (escLvl2Btn) {
    escLvl2Btn.addEventListener('click', () => {
      closeEscapeMenu();
      router.navigate('game', 2);
    });
  }

  if (escLvl3Btn) {
    escLvl3Btn.addEventListener('click', () => {
      closeEscapeMenu();
      router.navigate('game', 3);
    });
  }
  
  if (escLvl4Btn) {
    escLvl4Btn.addEventListener('click', () => {
      closeEscapeMenu();
      router.navigate('game', 4);
    });
  }
  
  if (escRestartBtn) {
    escRestartBtn.addEventListener('click', () => {
      closeEscapeMenu();
      loadLevel(currentLevel);
    });
  }
  
  if (escMainMenuBtn) {
    escMainMenuBtn.addEventListener('click', () => {
      closeEscapeMenu();
      router.navigate('menu');
    });
  }
}

function setupVictoryUI() {
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      loadLevel(currentLevel);
    });
  }
  
  if (victoryNextBtn) {
    victoryNextBtn.addEventListener('click', () => {
      victoryModal.classList.add('hidden');
      if (currentLevel === 1) {
        router.navigate('game', 2);
      } else if (currentLevel === 2) {
        router.navigate('game', 3);
      } else if (currentLevel === 3) {
        router.navigate('game', 4);
      } else {
        router.navigate('menu');
      }
    });
  }
  
  if (victoryMenuBtn) {
    victoryMenuBtn.addEventListener('click', () => {
      victoryModal.classList.add('hidden');
      router.navigate('menu');
    });
  }
}

init();
