// At the very top of your game's main JS file
// Make sure this path is correct relative to your main game JS file
// If not using ES Modules (e.g., just including scripts with <script> tags),
// then 'allQuestionSets' will automatically be available as a global variable
// once questionsData.js is loaded BEFORE your main game script.


// Game Settings
const BASE_WIDTH = 960;  // 기준 너비
const BASE_HEIGHT = 576; // 기준 높이
let scaleFactor = 1;      // 화면 크기에 따른 스케일 비율

// NEW: Question Selection Settings
const SELECTED_QUIZ_KEYWORD = null; // 원하는 키워드를 여기에 설정
const NUMBER_OF_QUIZZES_TO_LOAD = 20; // 가져올 문제의 개수를 설정


// Color Definitions
let DAY_SKY_TOP, DAY_SKY_BOT, NIGHT_SKY_TOP, NIGHT_SKY_BOT;
let DAY_MOUNTAIN, NIGHT_MOUNTAIN, DAY_HILL, NIGHT_HILL, DAY_GROUND, NIGHT_GROUND;
let DAY_BUILDING_PALETTE = [], NIGHT_BUILDING_PALETTE = [];
let DAY_APT_PALETTE = [], NIGHT_APT_PALETTE = [];
let DAY_PLANT_PALETTE = [], NIGHT_PLANT_PALETTE = [];
let BUILDING_STROKE, NIGHT_BUILDING_FILL_REFERENCE;
let DAY_CRANE_BODY, NIGHT_CRANE_BODY, CRANE_ARM;
let APT_WINDOW_DAY, APT_WINDOW_NIGHT;
let DAY_BRIDGE_STRUCTURE, NIGHT_BRIDGE_STRUCTURE, BRIDGE_ROAD;
let PLANT_CHIMNEY, PLANT_SMOKE_COLOR;
let HEART_ITEM_COLOR, SHIELD_ITEM_COLOR, SHIELD_EFFECT_COLOR;
let OBSTACLE_ROCK_FILL_DAY, OBSTACLE_ROCK_STROKE_DAY, OBSTACLE_ROCK_FILL_NIGHT, OBSTACLE_ROCK_STROKE_NIGHT;
let OBSTACLE_PIT_OUTER_DAY, OBSTACLE_PIT_INNER_DAY, OBSTACLE_PIT_OUTER_NIGHT, OBSTACLE_PIT_INNER_NIGHT, OBSTACLE_PIT_EDGE_COLOR;
let OBSTACLE_FALLING_ROCK_FILL_DAY, OBSTACLE_FALLING_ROCK_STROKE_DAY, OBSTACLE_FALLING_ROCK_FILL_NIGHT, OBSTACLE_FALLING_ROCK_STROKE_NIGHT;
let LASER_COLOR_DAY, LASER_COLOR_NIGHT, LASER_WARNING_COLOR;
let PLAYER_BODY_COLOR, PLAYER_HELMET_COLOR, PLAYER_LIMB_COLOR, PLAYER_VEST_COLOR, PLAYER_GLOVE_COLOR, PLAYER_BOOT_COLOR, PLAYER_VISOR_COLOR;
let QUIZ_BODY_COLOR_A, QUIZ_ACCENT_COLOR_A, QUIZ_EYE_COLOR_A;
let QUIZ_BODY_COLOR_B, QUIZ_ACCENT_COLOR_B, QUIZ_FEATURE_COLOR_B;
let UI_TEXT_COLOR, UI_BG_COLOR, UI_ACCENT_COLOR, OVERLAY_COLOR, UI_SCORE_COLOR, UI_FEVER_GAUGE_COLOR;
let CORRECT_COLOR, INCORRECT_COLOR, PARTICLE_COLOR;
let BIRD_COLOR, CLOUD_COLOR, DAY_STAR_COLOR, NIGHT_STAR_COLOR, SHOOTING_STAR_COLOR;
let currentSkyTop, currentSkyBot, currentMountain, currentHill, currentGround, currentStarColor;

// ... 다른 전역 변수들 ...
let bgSkyImage, bgMountainsImage, bgMidHillsImage, bgNearDetailsImage; // 예시 레이어 이미지 변수
// 필요에 따라 더 많은 레이어 변수를 추가할 수 있습니다.
// ...

// New Producer Screen Variables (제작자 화면 변수) - ⭐ 수정된 부분
const CREDITS_SCREENS = [
    { main: "POSCO E&C COP", sub: "presents" }, // 첫 번째 화면 (부제목 없음)
    { main: "S.Jang", sub: "Directed by" } // 두 번째 화면
    // 여기에 더 많은 화면을 추가할 수 있습니다.
];
let currentCreditIndex = 0;         // 현재 표시 중인 크레딧 인덱스
let producerFadeState = "FADING_IN"; // 현재 페이드 상태
let producerFadeTimer = 0;           // 페이드 타이머
let producerFadeProgress = 0;        // 페이드 진행도 (0 ~ 1)
const PRODUCER_FADE_IN_DURATION = 120; // 페이드인 지속 시간
const PRODUCER_HOLD_DURATION = 180;    // 텍스트 유지 시간
const PRODUCER_FADE_OUT_DURATION = 120; // 페이드아웃 지속 시간

// Game State and Variables
let gameState = "AUDIO_PROMPT";
let allQuizzesSpawned = false, lastQuizProcessed = false;
let highScore = 0, screenShakeTime = 0, correctEffectTime = 0;

// Global 'questions' array will now be populated dynamically
let questions = []; // Initialize as an empty array

// Day/Night Cycle Variables
let dayNightCycleTimer = 0;
const DAY_DURATION = 10 * 60, NIGHT_DURATION = 10 * 60, TRANSITION_DURATION = 2 * 60; // 10분 낮/밤, 2분 전환
let isDay = true, transitionProgress = 0;

// Objects
let player;
let quizzes = [], particles = [], clouds = [], stars = [], heartItems = [], shieldItems = [], obstacles = [];
let bird, backgroundElements = [], startScreenSilhouettes = [], shootingStars = [];

// Timers and Indices
let currentQuiz = null;
let quizSpawnTimer = 0, quizIndex = 0, quizResultTimer = 0;
let quizFeedback = "", quizExplanation = "";
const QUIZ_SPEED = 2.6;
let heartSpawnTimer = 0; const HEART_SPAWN_INTERVAL = 20 * 60; const HEART_SPEED = 6; // 하트 스폰 간격 증가
let shieldSpawnTimer = 0; const SHIELD_SPAWN_INTERVAL = 15 * 60; const SHIELD_SPEED = 5.5; // 보호막 아이템 스폰 간격
let obstacleSpawnTimer = 0; const OBSTACLE_SPAWN_INTERVAL = 1.3 * 60; // 장애물 스폰 간격 감소

// Quiz Timer
const QUIZ_TIME_LIMIT = 15; // 15 seconds
let quizTimerValue = QUIZ_TIME_LIMIT;
// let quizTimerInterval = null; // setInterval을 사용하지 않으므로 제거

// Camera
let cameraX = 0;

let startScreenBackgroundImage; // 시작 화면 배경 이미지를 저장할 변수
let bgFarImage, bgGroundImage, bgMidImage, bgNearImage; // 배경 이미지 변수 추가

// Constants
const PLAYER_WIDTH = 40, PLAYER_HEIGHT = 56;
let currentPlayerSpeed = 6.0; // 피버 모드 위해 let으로 변경
const PLAYER_BASE_SPEED = 6.0;
const JUMP_FORCE = 17, GRAVITY = 0.85;
const NUM_STARS = 100, NUM_CLOUDS = 5, NUM_SHOOTING_STARS = 3;

// Fever Mode
let feverModeActive = false;
let feverTimer = 0;
const FEVER_DURATION = 15 * 60; // 8초
const FEVER_SPEED_BOOST = 1.5;
let correctStreak = 0;
const CORRECT_STREAK_FOR_FEVER = 3;

// Music & SFX
let fmSynth, amSynth, noiseSynthMusic, padSynth, highMelodySynth, padSynthIngame, chorus, reverb, delay, shortDelay;
let jumpSound, correctAnswerSound, incorrectAnswerSound, heartCollectSound, shieldGetSound, shieldBlockSound, obstacleHitSound, laserHitSound, gameOverSound, gameClearSound, feverStartSound, feverEndSound;
let startMusicLoop, gameMusicLoop;
let musicContextStarted = false, startMusicPlaying = false, gameMusicPlaying = false;

// Ranking System
let rankings = [];
let gameStartTime = 0;
let nicknameInputElement, submitNicknameButtonElement;
let nicknamePopupTitleElement, nicknamePopupInstructionElement, nicknamePopupScoreElement; // ⭐ nicknamePopupScoreElement 추가

// Flask 서버 주소
const FLASK_SERVER_URL = 'https://dreamofenc.com'; // Flask 서버가 실행되는 주소 (사용자 환경에 맞게 수정)

// tsParticles instances
let tsParticlesBgInstance = null, tsInteractionInstance = null;

// New Global Variables for Opening Sequence (오프닝 시퀀스를 위한 새로운 전역 변수)
const OPENING_TEXT_LINES = [
    "2025년,",
    "포스코이앤씨는",
    "중대한 기로에 서 있습니다.",
    "급변하는 경영환경 아래,",
    "우리 회사는",
    "새로운 지식과 통찰을 필요로 합니다.",
    "회사의 미래를 향한",
    "당신의 지식을 시험할 시간입니다.",
    "COP 팀원 여러분,",
    "",
    "준비되셨습니까?"
];
let openingTextScrollY; // 텍스트 블록의 현재 Y 위치
let openingTextFadeProgress; // 0에서 1까지의 페이드 진행도
const OPENING_SCROLL_SPEED = 0.7; // 텍스트가 위로 스크롤되는 속도
const OPENING_FADE_IN_DURATION = 90; // 페이드인 프레임 수
const OPENING_FADE_OUT_DURATION = 90; // 페이드아웃 프레임 수
const OPENING_HOLD_DURATION = 1080; // 텍스트가 완전히 불투명하게 유지되는 프레임 수
let openingSequenceTimer; // 오프닝 시퀀스 전체 타이머

let touchControl = {
    left: false,
    right: false,
    jump: false
};

function preload() {
    // 다른 preload 내용이 있다면 여기에 유지합니다.
    // 예: someFont = loadFont('assets/font.ttf');

    // 시작 화면 배경 이미지 로드
    // 'assets/your_start_screen_image.png' 부분은 실제 이미지 파일의 경로와 이름으로 바꿔주세요.
    // 이미지가 스케치 파일과 같은 폴더에 있다면 'your_start_screen_image.png' 처럼 파일 이름만 적어도 됩니다.
    // 하위 폴더 (예: 'assets')에 있다면 경로를 포함해주세요.
    bgFarImage = loadImage('assets/background_far.png'); // 원경이미지
    bgGroundImage = loadImage('assets/background_ground.png');
    bgMidImage = loadImage('assets/background_mid.png');
    bgNearImage = loadImage('assets/background_near.png');
    bgMountainsImage = loadImage('assets/background_mountain.png');
    startScreenBackgroundImage = loadImage('assets/background_start.gif');
}

function setup() {
    let canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('game-container');
    
    // 최초 게임 크기 조절
    resizeGame(); 

    // --- ⬇️ 모바일 스크롤 방지 코드 추가 ---
    document.body.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
    // --- ⬆️ 모바일 스크롤 방지 코드 추가 ---


    // Initialize colors
    DAY_SKY_TOP = color(135, 206, 235); DAY_SKY_BOT = color(240, 248, 255); DAY_MOUNTAIN = color(160, 150, 140); DAY_HILL = color(180, 170, 150); DAY_GROUND = color(107, 142, 35);
    BUILDING_STROKE = color(80, 85, 90, 200); DAY_CRANE_BODY = color(255, 193, 7); CRANE_ARM = color(158, 158, 158);
    APT_WINDOW_DAY = color(100, 149, 237, 180); APT_WINDOW_NIGHT = color(255, 223, 186, 220);
    DAY_BRIDGE_STRUCTURE = color(192, 192, 192); BRIDGE_ROAD = color(105, 105, 105);
    PLANT_CHIMNEY = color(160,160,160); PLANT_SMOKE_COLOR = color(220,220,220, 100);
    DAY_STAR_COLOR = color(255, 255, 200, 0); SHOOTING_STAR_COLOR = color(255, 255, 220, 200);
    HEART_ITEM_COLOR = color(255, 0, 0, 220); SHIELD_ITEM_COLOR = color(0, 150, 255, 220); SHIELD_EFFECT_COLOR = color(0, 180, 255, 100);
    OBSTACLE_ROCK_FILL_DAY = color(130, 110, 90); OBSTACLE_ROCK_STROKE_DAY = color(80, 60, 40);
    OBSTACLE_PIT_OUTER_DAY = DAY_GROUND; OBSTACLE_PIT_INNER_DAY = color(60, 40, 20);
    OBSTACLE_PIT_EDGE_DAY = color(120, 100, 80); OBSTACLE_FALLING_ROCK_FILL_DAY = color(110, 100, 90);
    OBSTACLE_FALLING_ROCK_STROKE_DAY = color(70, 60, 50);
    LASER_COLOR_DAY = color(255, 100, 0, 200); LASER_WARNING_COLOR = color(255,0,0,100);

    NIGHT_SKY_TOP = color(25, 25, 112); NIGHT_SKY_BOT = color(75, 0, 130); NIGHT_MOUNTAIN = color(47, 79, 79, 230); NIGHT_HILL = color(72, 61, 139, 240); NIGHT_GROUND = color(34, 139, 34, 220);
    NIGHT_CRANE_BODY = color(139, 69, 19); NIGHT_BRIDGE_STRUCTURE = color(100, 100, 100);
    NIGHT_STAR_COLOR = color(255, 255, 240, 220); OBSTACLE_ROCK_FILL_NIGHT = color(70, 60, 50);
    OBSTACLE_ROCK_STROKE_NIGHT = color(40, 30, 20); OBSTACLE_PIT_OUTER_NIGHT = NIGHT_GROUND;
    OBSTACLE_PIT_INNER_NIGHT = color(30, 20, 10); OBSTACLE_PIT_EDGE_NIGHT = color(60, 50, 40);
    OBSTACLE_FALLING_ROCK_FILL_NIGHT = color(70, 60, 50); OBSTACLE_FALLING_ROCK_STROKE_NIGHT = color(40, 30, 20);
    LASER_COLOR_NIGHT = color(255, 150, 50, 220);

    DAY_BUILDING_PALETTE = [ color(180, 190, 200), color(220, 200, 180), color(170, 200, 220), color(230, 210, 190), color(190, 210, 190), color(210, 220, 200), color(200, 180, 220) ];
    NIGHT_BUILDING_PALETTE = [ color(40, 45, 55), color(50, 40, 60), color(30, 50, 50), color(65, 55, 50), color(45, 60, 45), color(55, 50, 65), color(35, 45, 60) ];
    DAY_APT_PALETTE = [ color(230, 220, 210), color(210, 225, 230), color(225, 215, 200), color(235, 230, 220) ];
    NIGHT_APT_PALETTE = [ color(50, 50, 70), color(60, 70, 75), color(75, 65, 60), color(55, 65, 70) ];
    DAY_PLANT_PALETTE = [ color(190, 190, 190), color(210, 200, 190), color(180, 195, 200), color(205, 205, 205) ];
    NIGHT_PLANT_PALETTE = [ color(80, 80, 90), color(70, 75, 80), color(90, 95, 100), color(85, 90, 95) ];
    NIGHT_BUILDING_FILL_REFERENCE = color(60, 65, 75);

    // Player Color Definitions (개선된 색상)
    PLAYER_BODY_COLOR = color(135, 206, 250); // 하늘색 작업복 (Light Sky Blue)
    PLAYER_HELMET_COLOR = color(255, 255, 255); // 흰색 안전모 (White)
    PLAYER_LIMB_COLOR = color(110, 180, 230); // 작업복 팔/다리 (Slightly Darker Blue)
    PLAYER_VEST_COLOR = color(255, 165, 0); // 주황색 조끼 (Orange)
    PLAYER_GLOVE_COLOR = color(220, 220, 220); // 흰색/회색 장갑 (Light Grey/White)
    PLAYER_BOOT_COLOR = color(60, 60, 60);     // 어두운 회색 안전화 (Dark Grey)
    PLAYER_VISOR_COLOR = color(50, 50, 100, 150); // 바이저/얼굴 그림자 (기존 유지 또는 변경)

    QUIZ_BODY_COLOR_A = color(220, 50, 80, 240); QUIZ_ACCENT_COLOR_A = color(255, 200, 210); QUIZ_EYE_COLOR_A = color(255);
    QUIZ_BODY_COLOR_B = color(80, 180, 220, 240); QUIZ_ACCENT_COLOR_B = color(220, 255, 255); QUIZ_FEATURE_COLOR_B = color(255, 100, 100);
    UI_TEXT_COLOR = color(230, 230, 240); UI_BG_COLOR = color(30, 30, 35, 230); UI_ACCENT_COLOR = color(255, 200, 50); UI_SCORE_COLOR = color(255, 255, 100); OVERLAY_COLOR = color(5, 5, 10, 200);
    UI_FEVER_GAUGE_COLOR = color(255, 80, 0);
    CORRECT_COLOR = color(80, 200, 120, 250); INCORRECT_COLOR = color(240, 70, 70, 250); PARTICLE_COLOR = color(200, 200, 180);
    BIRD_COLOR = color(50, 50, 60); CLOUD_COLOR = color(200, 200, 210, 120);

    let storedHighScore = localStorage.getItem('encQuizAdventureHighScore');
    if (storedHighScore) { highScore = parseInt(storedHighScore); }
    loadRankingsFromServer();

    initializeSceneryData();
    bird = new Bird();

    // Initialize opening sequence variables (오프닝 시퀀스 변수 초기화)
    openingTextScrollY = BASE_HEIGHT + 50; // 화면 아래에서 시작
    openingTextFadeProgress = 0;
    openingSequenceTimer = 0;

    // Call the new function to load questions
    loadQuestions(); // <--- ADD THIS LINE HERE

    // Initialize Tone.js Effects and Synths
    reverb = new Tone.Reverb({ decay: 4, wet: 0.3 }).toDestination();
    chorus = new Tone.Chorus(3, 2.0, 0.6).connect(reverb);
    delay = new Tone.FeedbackDelay("8n", 0.25).connect(chorus);
    shortDelay = new Tone.PingPongDelay("16n", 0.15).connect(reverb);

    fmSynth = new Tone.FMSynth({ harmonicity: 2.0, modulationIndex: 1.5, oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 1.0 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }, volume: 5 }).connect(delay);
    amSynth = new Tone.AMSynth({ harmonicity: 1.5, oscillator: { type: "sawtooth" }, envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 1 }, modulation: { type: "sine" }, modulationEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.3, release: 0.8 }, volume: 0 }).connect(delay);
    noiseSynthMusic = new Tone.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.2 }, volume: -28 }).connect(reverb);
    padSynth = new Tone.PolySynth(Tone.FMSynth, { harmonicity: 0.8, modulationIndex: 3, oscillator: { type: "sine" }, envelope: { attack: 1.5, decay: 0.5, sustain: 0.8, release: 2.5 }, modulation: { type: "sawtooth" }, modulationEnvelope: { attack: 1.0, decay: 0.3, sustain: 0.6, release: 1.5 }, volume: 5 }).connect(chorus);
    padSynthIngame = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.8, decay: 0.4, sustain: 0.9, release: 1.5 }, volume: -26 }).connect(reverb);
    highMelodySynth = new Tone.Synth({ oscillator: { type: "triangle8" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.5 }, portamento: 0.01, volume: 0 }).connect(shortDelay);
    
    const chordsForStartMelody = [
        { baseNoteNames: ["C", "D", "E", "G"], startOctave: 3 },    // Cadd2 느낌
        { baseNoteNames: ["A", "B", "C", "E"], startOctave: 2 },    // Amadd2 느낌
        { baseNoteNames: ["F", "G", "A", "C"], startOctave: 2 },    // Fadd2 느낌
        { baseNoteNames: ["G", "A", "B", "D"], startOctave: 2 },    // Gadd2 느낌
        { baseNoteNames: ["Ab", "C", "Eb", "G"], startOctave: 2 },  // Abmaj7 느낌
        { baseNoteNames: ["Bb", "D", "F", "A"], startOctave: 2 }   // Bbmaj7 느낌
    ];
    let startMelodyNotes = []; let currentBarForStartMelody = 0; const startMelodyBaseVelocity = 0.5;
    for (const chordDef of chordsForStartMelody) { const arpeggioSection = generateArpeggioPattern( chordDef.baseNoteNames, chordDef.startOctave, fmSynth, startMelodyBaseVelocity, currentBarForStartMelody ); startMelodyNotes.push(...arpeggioSection); currentBarForStartMelody += 2; }
    if (startMusicLoop) { startMusicLoop.dispose(); }
    startMusicLoop = new Tone.Part((time, value) => { value.synth.triggerAttackRelease(value.note, value.duration, time, value.velocity); }, startMelodyNotes).start(0);
    startMusicLoop.loop = true; startMusicLoop.loopEnd = `${currentBarForStartMelody}m`; startMusicLoop.mute = true;

    const gameMelodyNotes = startMelodyNotes; // Using same melody for game for now
    gameMusicLoop = new Tone.Part((time, value) => { if (value.synth === noiseSynthMusic) { noiseSynthMusic.triggerAttackRelease(value.duration, time, value.velocity * 0.5); } else { value.synth.triggerAttackRelease(value.note, value.duration, time, value.velocity); } }, gameMelodyNotes).start(0);
    gameMusicLoop.loop = true; gameMusicLoop.loopEnd = startMusicLoop.loopEnd; gameMusicLoop.mute = true;

    // SFX Synths
    jumpSound = new Tone.Synth({ oscillator: { type: "triangle" }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.01, release: 0.15 }, volume: 0 }).toDestination();
    correctAnswerSound = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.3 }, volume: 0 }).toDestination();
    incorrectAnswerSound = new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.01, decay: 0.25, sustain: 0, release: 0.2 }, volume: 0 }).toDestination();
    heartCollectSound = new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.002, decay: 0.08, sustain: 0.02, release: 0.15 }, volume: 0 }).connect(new Tone.PingPongDelay("16n", 0.2).toDestination());
    obstacleHitSound = new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 5, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 }, volume: 0 }).toDestination();
    gameOverSound = new Tone.FMSynth({ harmonicity: 1.2, modulationIndex: 6, oscillator: {type: "sine"}, envelope: {attack: 0.1, decay: 0.8, sustain: 0.1, release: 1.2}, modulation: {type: "triangle"}, modulationEnvelope: {attack:0.1, decay:0.5, sustain:0.1, release:1}, volume: 0 }).toDestination();
    gameClearSound = new Tone.PolySynth(Tone.Synth, { oscillator: {type: "triangle"}, envelope: {attack:0.05, decay:0.4, sustain:0.3, release:0.8}, volume: 0 }).connect(reverb);
    
    // New SFX Synths
    shieldGetSound = new Tone.FMSynth({
        harmonicity: 1.2,
        modulationIndex: 12, // [수정] 값을 15 -> 8로 줄여서 소리를 안정화
        oscillator: { type: "triangle" },
        envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.1,
            release: 0.8
        },
        modulation: { type: "sawtooth" },
        modulationEnvelope: {
            attack: 0.02,
            decay: 0.1,
            sustain: 0,
            release: 0.8
        },
        volume: 10 // [수정] 볼륨을 최대로 키워 확실히 들리게 함
    }).toDestination(); // [수정] 효과를 잠시 빼고, 최종 출력으로 직접 연결

    shieldBlockSound = new Tone.NoiseSynth({ noise: { type: "white" }, envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.1 }, volume: -3 }).toDestination();
    laserHitSound = obstacleHitSound; // Reuse for now
    feverStartSound = new Tone.Synth({ oscillator: { type: "pulse", width: 0.4 }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.1, release: 0.5 }, volume: -2 }).connect(reverb);
    feverEndSound = new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.05, decay: 0.4, sustain: 0, release: 0.3 }, volume: -2 }).connect(reverb);


    loadParticles();
    isDay = true; dayNightCycleTimer = DAY_DURATION; transitionProgress = 1;
    currentPlayerSpeed = PLAYER_BASE_SPEED;

    // 모바일 컨트롤 설정
    setupMobileControls();
}

function setupMobileControls() {
    // 버튼 DOM 요소 가져오기 (p5.select 대신 네이티브 JS 사용)
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnJump = document.getElementById('btn-jump');

    // 요소가 존재하는지 확인
    if (btnLeft && btnRight && btnJump) {
        // --- 왼쪽 버튼 이벤트 리스너 ---
        // 터치가 시작될 때 (손가락을 댔을 때)
        btnLeft.addEventListener('touchstart', (e) => {
            e.preventDefault(); // 버튼 누를 때 화면이 확대/이동되는 기본 동작 방지
            touchControl.left = true;
        });
        // 터치가 끝날 때 (손가락을 뗐을 때)
        btnLeft.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControl.left = false;
        });
        // 터치가 비정상적으로 취소될 경우 대비 (예: 전화 수신)
        btnLeft.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            touchControl.left = false;
        });

        // --- 오른쪽 버튼 이벤트 리스너 ---
        btnRight.addEventListener('touchstart', (e) => {
            e.preventDefault();
            touchControl.right = true;
        });
        btnRight.addEventListener('touchend', (e) => {
            e.preventDefault();
            touchControl.right = false;
        });
        btnRight.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            touchControl.right = false;
        });

        // --- 점프 버튼 이벤트 리스너 ---
        // 점프는 한 번의 터치로 충분하므로 touchstart만 사용합니다.
        btnJump.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (gameState === "PLAYING") {
                player.jump();
            }
        });
    }
}

async function loadParticles() {
    await tsParticles.load("tsparticles-bg", { autoPlay: true, fpsLimit: 60, interactivity: { events: { onClick: { enable: false }, onHover: { enable: false } } }, particles: { number: { value: 0 }, color: { value: "#ffffff" }, shape: { type: "circle" }, opacity: { value: {min: 0.1, max: 0.5}, animation: { enable: true, speed: 0.5, minimumValue: 0.1, sync: false } }, size: { value: {min: 1, max: 3} }, links: { enable: false }, move: { enable: true, speed: 0.5, direction: "none", random: true, straight: false, outModes: "out" }, }, detectRetina: true, fullScreen: { enable: false }
    }).then(container => { tsParticlesBgInstance = container; updateBackgroundParticles(); console.log("tsParticles background instance loaded."); }).catch(error => console.error("Error loading tsParticles background instance:", error));
    
    await tsParticles.load("tsparticles-interactions", { autoPlay: false, fpsLimit: 60, particles: { number: { value: 0 } }, detectRetina: true, fullScreen: { enable: false }
    }).then(container => { tsInteractionInstance = container; console.log("tsParticles interaction instance loaded."); }).catch(error => console.error("Error loading tsParticles interaction instance:", error));
}

function updateBackgroundParticles() {
    if (!tsParticlesBgInstance) { console.log("updateBackgroundParticles: tsParticlesBgInstance not ready."); return; }
    let particleOptionsConfig;
    if (feverModeActive) {
        particleOptionsConfig = {
            number: { value: 200, density: { enable: true, area: 600 } },
            color: { value: ["#FFD700", "#FFA500", "#FF4500", "#FF6347"] }, // 기존 피버 모드 입자 색상
            opacity: { value: { min: 0.5, max: 1 }, animation: { enable: true, speed: 1, minimumValue: 0.3, sync: false } },
            size: { value: { min: 2, max: 5 }, animation: { enable: true, speed: 5, minimumValue: 1, sync: false } },
            move: { 
                speed: 3, 
                direction: "top-right", 
                outModes: { top: "destroy", default: "destroy" }, 
                trail: { 
                    enable: false // 하얀색 꼬리 효과 비활성화
                    // 만약 꼬리 효과를 유지하되 색상을 바꾸고 싶다면 아래와 같이 수정할 수 있습니다.
                    // enable: true, 
                    // length: 5, // 꼬리 길이 조절
                    // fillColor: "#FFD700" // 입자 색상과 유사하게 또는 다른 어두운 색으로 변경
                } 
            }
        };
    } else if (isDay) {
        particleOptionsConfig = { 
            number: { value: 50, density: { enable: true, area: 800 } }, 
            color: { value: ["#FFFFFF", "#FFFFAA", "#FFDDAA"] }, 
            opacity: { value: {min: 0.2, max: 0.6} }, 
            size: { value: {min: 1, max: 2} }, 
            move: { speed: 0.3, direction: "top", outModes: { top: "destroy", default: "out" } } 
        };
    } else { // Night
        particleOptionsConfig = { 
            number: { value: 150, density: { enable: true, area: 800 } }, 
            color: { value: ["#FFFFFF", "#E0E0FF", "#C0C0FF"] }, 
            opacity: { value: {min: 0.3, max: 0.8} }, 
            size: { value: {min: 0.5, max: 2.5} }, 
            move: { 
                speed: 0.2, 
                direction: "none", 
                trail: { 
                    enable: true, 
                    length: 5, 
                    fillColor: { r:NIGHT_SKY_BOT.levels[0], g:NIGHT_SKY_BOT.levels[1], b:NIGHT_SKY_BOT.levels[2] } 
                } 
            }, 
            twinkle: { particles: { enable: true, frequency: 0.05, opacity: 1 } } 
        };
    }
    tsParticlesBgInstance.options.particles.load(particleOptionsConfig);
    tsParticlesBgInstance.refresh().catch(error => console.error("Error refreshing tsParticles background:", error));
}

function triggerInteractionParticles(particleOptions, x, y) {
    if (!tsInteractionInstance) { console.error("tsInteractionInstance not loaded yet!"); return; }
    const numParticles = particleOptions.particles.number.value || 1;
    for (let i = 0; i < numParticles; i++) {
        const gameWrapperRect = document.getElementById('game-container').getBoundingClientRect();
        const p5Canvas = document.querySelector('#game-container canvas');
        if (!p5Canvas) return;
        const canvasRect = p5Canvas.getBoundingClientRect();
        const particleX = (canvasRect.left - gameWrapperRect.left) + x;
        const particleY = (canvasRect.top - gameWrapperRect.top) + y;
        tsInteractionInstance.particles.addParticle({ x: particleX, y: particleY }, particleOptions.particles);
    }
    if (!tsInteractionInstance.playing) { tsInteractionInstance.play(); }
}


function playJumpSound() { if (musicContextStarted && jumpSound) jumpSound.triggerAttackRelease("G5", "32n", Tone.now(), 0.7); }
function playCorrectAnswerSound() { if (musicContextStarted && correctAnswerSound) correctAnswerSound.triggerAttackRelease(["C5", "E5", "G5"], "16n", Tone.now(), 0.6); }
function playIncorrectAnswerSound() { if (musicContextStarted && incorrectAnswerSound) incorrectAnswerSound.triggerAttackRelease("A2", "8n", Tone.now(), 0.8); }
function playHeartCollectSound() {
    if (musicContextStarted && heartCollectSound) {
        heartCollectSound.triggerAttackRelease("C6", "32n", Tone.now(), 0.5);
        setTimeout(() => heartCollectSound.triggerAttackRelease("C#6", "32n", Tone.now() + 0.05, 0.4), 50);
        const heartParticleOptions = { particles: { number: { value: 15 }, color: { value: ["#FF0000", "#FF69B4", "#FFC0CB"] }, shape: { type: "heart" }, opacity: { value: {min: 0.5, max: 1} }, size: { value: {min: 5, max: 10} }, move: { speed: 3, gravity: { enable: true, acceleration: 5 }, decay: 0.05, direction: "top", spread: 90 }, life: { duration: { value: 0.7 }, count: 1 } } };
        triggerInteractionParticles(heartParticleOptions, player.pos.x - cameraX, player.pos.y - PLAYER_HEIGHT / 2);
    }
}
// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
// playShieldGetSound 함수 전체를 이 코드로 교체합니다.
function playShieldGetSound() {
    if (musicContextStarted && shieldGetSound) {
        const now = Tone.now();
        
        // 1. 소리의 볼륨 엔벨로프를 작동시킵니다. (음높이 없이)
        shieldGetSound.triggerAttack(now);

        // 2. 시작 주파수(피치)를 'C3'으로 즉시 설정합니다.
        shieldGetSound.frequency.setValueAtTime("C3", now);

        // 3. 0.15초에 걸쳐 목표 주파수인 'G4'까지 선형으로 부드럽게 증가시킵니다.
        shieldGetSound.frequency.linearRampToValueAtTime("G4", now + 0.15);

        // 4. 총 0.4초 후에 소리를 끄도록 예약합니다. (release 단계 시작)
        shieldGetSound.triggerRelease(now + 0.4);

        // 파티클 효과는 그대로 유지합니다.
        const shieldParticleOptions = { particles: { number: { value: 20 }, color: { value: ["#00BFFF", "#87CEEB", "#ADD8E6"] }, shape: { type: "circle" }, opacity: { value: {min: 0.6, max: 1} }, size: { value: {min: 3, max: 7} }, move: { speed: 2, gravity: { enable: false }, decay: 0.03, direction: "none", spread: 360, attract: { enable: false } }, life: { duration: { value: 0.8 }, count: 1 } } };
        triggerInteractionParticles(shieldParticleOptions, player.pos.x - cameraX, player.pos.y - PLAYER_HEIGHT / 2);
    }
}
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
function playShieldBlockSound() {
    if (musicContextStarted && shieldBlockSound) {
        shieldBlockSound.triggerAttackRelease("4n", Tone.now(), 0.9); // Sound will be different now
        const blockParticleOptions = { particles: { number: { value: 25 }, color: { value: ["#00FFFF", "#AFEEEE", "#7FFFD4"] }, shape: { type: "polygon", polygon: { sides: 6 } }, opacity: { value: {min: 0.5, max: 1} }, size: { value: {min: 4, max: 8} }, move: { speed: 5, gravity: { enable: false }, decay: 0.08, direction: "none", spread: 360, outModes: "destroy" }, life: { duration: { value: 0.4 }, count: 1 } } };
        triggerInteractionParticles(blockParticleOptions, player.pos.x - cameraX, player.pos.y - PLAYER_HEIGHT / 2);
    }
}
function playObstacleHitSound(isLaser = false) {
    if (musicContextStarted) {
        const soundToPlay = isLaser ? (laserHitSound || obstacleHitSound) : obstacleHitSound;
        if(soundToPlay) soundToPlay.triggerAttackRelease(isLaser ? "E2" : "C2", "8n", Tone.now(), 1.0);
        
        const hitParticleColor = isLaser ? ["#FF8C00", "#FFA500", "#FF4500"] : ["#8B4513", "#A0522D", "#505050"];
        const hitParticleShape = isLaser ? "line" : "triangle";
        const hitParticleOptions = { particles: { number: { value: 20 }, color: { value: hitParticleColor }, shape: { type: hitParticleShape }, opacity: { value: {min: 0.5, max: 1} }, size: { value: {min: 2, max: (isLaser ? 15: 5)} }, move: { speed: 4, gravity: { enable: true, acceleration: 2 }, decay: 0.1, direction: "none", spread: 180 }, life: { duration: { value: 0.5 }, count: 1 } } };
        triggerInteractionParticles(hitParticleOptions, player.pos.x - cameraX, player.pos.y - PLAYER_HEIGHT / 2);
    }
}
function playFeverStartSound() { if (musicContextStarted && feverStartSound) feverStartSound.triggerAttackRelease("C4", "2n", Tone.now(), 0.8); }
function playFeverEndSound() { if (musicContextStarted && feverEndSound) feverEndSound.triggerAttackRelease("G3", "2n", Tone.now(), 0.7); }

function playGameOverSound() { if (musicContextStarted && gameOverSound) { gameOverSound.triggerAttackRelease("F#3", "0.5n", Tone.now(), 0.7); setTimeout(() => gameOverSound.triggerAttackRelease("D3", "1n", Tone.now() + 0.4, 0.6), 400); } }
function playGameClearSound() { if (musicContextStarted && gameClearSound) { const now = Tone.now(); gameClearSound.triggerAttackRelease(["C4", "G4", "C5", "E5"], "4n", now, 0.8); gameClearSound.triggerAttackRelease(["D4", "A4", "D5", "F#5"], "4n", now + 0.4, 0.7); gameClearSound.triggerAttackRelease(["E4", "B4", "E5", "G#5"], "2n", now + 0.8, 0.9); } }

function initializeSceneryData() {
    stars = []; for (let i = 0; i < NUM_STARS; i++) { stars.push(createVector(floor(random(BASE_WIDTH * 2)), floor(random(BASE_HEIGHT * 0.7)))); }
    shootingStars = []; for (let i = 0; i < NUM_SHOOTING_STARS; i++) { shootingStars.push(new ShootingStar());}
    clouds = []; for (let i = 0; i < NUM_CLOUDS; i++) { clouds.push(new Cloud(floor(random(BASE_WIDTH)), floor(random(BASE_HEIGHT * 0.05, BASE_HEIGHT * 0.35)))); }
    // backgroundElements = []; const groundYBase = floor(BASE_HEIGHT * 0.85);
    // startScreenSilhouettes = [ { x: floor(BASE_WIDTH * 0.1), h: floor(BASE_HEIGHT * 0.3), w: floor(BASE_WIDTH * 0.08), crane: true, cH: floor(BASE_HEIGHT * 0.15), cArmH: floor(BASE_HEIGHT * 0.05) }, { x: floor(BASE_WIDTH * 0.3), h: floor(BASE_HEIGHT * 0.5), w: floor(BASE_WIDTH * 0.1), crane: false }, { x: floor(BASE_WIDTH * 0.55), h: floor(BASE_HEIGHT * 0.4), w: floor(BASE_WIDTH * 0.09), crane: true, cH: floor(BASE_HEIGHT * 0.2), cArmH: floor(BASE_HEIGHT * 0.04) }, { x: floor(BASE_WIDTH * 0.75), h: floor(BASE_HEIGHT * 0.6), w: floor(BASE_WIDTH * 0.12), crane: false }, { x: floor(BASE_WIDTH * 0.9), h: floor(BASE_HEIGHT * 0.35), w: floor(BASE_WIDTH * 0.07), crane: true, cH: floor(BASE_HEIGHT * 0.1), cArmH: floor(BASE_HEIGHT * 0.06) }, ];
    // for (let i = 0; i < 4; i++) { let bWidth = floor(random(50, 120)); let bHeight = floor(random(BASE_HEIGHT * 0.25, BASE_HEIGHT * 0.6)); let bX = floor(random(BASE_WIDTH * 2.5) + i * (BASE_WIDTH/3)); let bY = floor(groundYBase - bHeight); let bWindows = []; let numWin = floor(random(3,10)); for(let w=0; w < numWin; w++){ bWindows.push({ x: floor(random(bWidth * 0.1, bWidth * 0.75)), y: floor(random(bHeight * 0.1, bHeight * 0.75)), w: floor(bWidth*0.12), h: floor(bHeight*0.08) }); } backgroundElements.push({ type: 'building', x: bX, y: bY, width: bWidth, height: bHeight, parallax: 0.15 + random(-0.03, 0.03), windows: bWindows, dayColor: random(DAY_BUILDING_PALETTE), nightColor: random(NIGHT_BUILDING_PALETTE) }); }
    // for (let i = 0; i < 2; i++) { backgroundElements.push({ type: 'crane', x: floor(random(BASE_WIDTH * 2.5) + i * (BASE_WIDTH/1.5)), y: floor(groundYBase), width: floor(120), height: floor(BASE_HEIGHT * 0.45), parallax: 0.2 + random(-0.02, 0.02) }); }
    // for (let i = 0; i < 3; i++) { let aptWidth = floor(random(180, 280)); let aptHeight = floor(random(BASE_HEIGHT * 0.2, BASE_HEIGHT * 0.4)); let aptX = floor(random(BASE_WIDTH * 2.5) + i * (BASE_WIDTH/2)); let aptY = floor(groundYBase - aptHeight); let aptBlocks = []; let numBlocks = 3; let blockW = floor(aptWidth / (numBlocks + 0.2)); for(let k=0; k < numBlocks; k++){ let blockH = floor(aptHeight * random(0.65, 0.95)); let blockX = floor(k * (blockW + aptWidth * 0.03 / numBlocks)); let blockWindows = []; for(let r=0; r < 6; r++){ blockWindows.push({ x: floor(random(5, blockW*0.7)), y: floor(random(5, blockH*0.8)), w: 8, h: 6 }); } aptBlocks.push({x: blockX, y: floor(aptHeight - blockH), w: blockW, h: blockH, windows: blockWindows}); } backgroundElements.push({ type: 'apartment', x: aptX, y: aptY, width: aptWidth, height: aptHeight, parallax: 0.25 + random(-0.03, 0.03), blocks: aptBlocks, dayColor: random(DAY_APT_PALETTE), nightColor: random(NIGHT_APT_PALETTE) }); }
    // backgroundElements.push({ type: 'bridge', x: floor(BASE_WIDTH * 0.4), y: floor(groundYBase - BASE_HEIGHT * 0.18), width: floor(BASE_WIDTH * 0.7), height: floor(BASE_HEIGHT * 0.12), parallax: 0.08 });
    // backgroundElements.push({ type: 'bridge', x: floor(BASE_WIDTH * 1.6), y: floor(groundYBase - BASE_HEIGHT * 0.22), width: floor(BASE_WIDTH * 0.6), height: floor(BASE_HEIGHT * 0.08), parallax: 0.08 });
    // for (let i = 0; i < 2; i++) { let plantWidth = floor(random(200, 350)); let plantHeight = floor(random(BASE_HEIGHT * 0.18, BASE_HEIGHT * 0.3)); backgroundElements.push({ type: 'plant', x: floor(random(BASE_WIDTH * 2.5) + i * (BASE_WIDTH*0.8)), y: floor(groundYBase - plantHeight), width: plantWidth, height: plantHeight, parallax: 0.12 + random(-0.02, 0.02), dayColor: random(DAY_PLANT_PALETTE), nightColor: random(NIGHT_PLANT_PALETTE) }); }
    // mountainPeakHeights = []; for (let i = 0; i < 8; i++) { mountainPeakHeights.push(floor(random(BASE_HEIGHT*0.1, BASE_HEIGHT*0.35))); }
    // hillData = []; for (let i = 0; i < 6; i++) { hillData.push({ w: floor(random(BASE_WIDTH*0.3, BASE_WIDTH*0.6)), h: floor(random(BASE_HEIGHT*0.1, BASE_HEIGHT*0.25)) }); }
    // 시작 화면용 실루엣 데이터는 그대로 둡니다 (drawStartScreen()에서 사용).
    startScreenSilhouettes = [ { x: floor(BASE_WIDTH * 0.1), h: floor(BASE_HEIGHT * 0.3), w: floor(BASE_WIDTH * 0.08), crane: true, cH: floor(BASE_HEIGHT * 0.15), cArmH: floor(BASE_HEIGHT * 0.05) }, { x: floor(BASE_WIDTH * 0.3), h: floor(BASE_HEIGHT * 0.5), w: floor(BASE_WIDTH * 0.1), crane: false }, { x: floor(BASE_WIDTH * 0.55), h: floor(BASE_HEIGHT * 0.4), w: floor(BASE_WIDTH * 0.09), crane: true, cH: floor(BASE_HEIGHT * 0.2), cArmH: floor(BASE_HEIGHT * 0.04) }, { x: floor(BASE_WIDTH * 0.75), h: floor(BASE_HEIGHT * 0.6), w: floor(BASE_WIDTH * 0.12), crane: false }, { x: floor(BASE_WIDTH * 0.9), h: floor(BASE_HEIGHT * 0.35), w: floor(BASE_WIDTH * 0.07), crane: true, cH: floor(BASE_HEIGHT * 0.1), cArmH: floor(BASE_HEIGHT * 0.06) }, ];

}

function stopAllMusic() {
    if (startMusicLoop && startMusicPlaying) { startMusicLoop.mute = true; startMusicPlaying = false; }
    if (gameMusicLoop && gameMusicPlaying) { gameMusicLoop.mute = true; gameMusicPlaying = false; }
    console.log("All music loops muted.");
}

function resetGame() {
    player = new Player(); quizzes = []; particles = []; heartItems = []; shieldItems = []; obstacles = [];
    quizSpawnTimer = 0; quizIndex = 0; cameraX = 0; currentQuiz = null;
    heartSpawnTimer = HEART_SPAWN_INTERVAL / 2; 
    shieldSpawnTimer = SHIELD_SPAWN_INTERVAL / 3; // 초기 스폰 빠르게
    obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL;
    allQuizzesSpawned = false; lastQuizProcessed = false; screenShakeTime = 0; correctEffectTime = 0;
    bird.reset(); isDay = true; dayNightCycleTimer = DAY_DURATION; transitionProgress = 1;
    gameStartTime = 0;  
    quizTimerValue = QUIZ_TIME_LIMIT; 
//     if (quizTimerInterval) clearInterval(quizTimerInterval); 
    
    deactivateFeverMode(); // 피버 모드 초기화
    correctStreak = 0;

    // Reload questions when resetting the game,
    // so if you decide to allow keyword changes later, it's covered.
    loadQuestions(); // <--- ALSO ADD THIS HERE for game resets

    stopAllMusic();
    updateBackgroundParticles();
    hideNicknameInput();  
}

function updateDayNightCycle() {
    let oldIsDay = isDay; dayNightCycleTimer--;
    if (dayNightCycleTimer <= 0) { if (isDay) { dayNightCycleTimer = NIGHT_DURATION + TRANSITION_DURATION; isDay = false; } else { dayNightCycleTimer = DAY_DURATION + TRANSITION_DURATION; isDay = true; } }
    let targetTransitionProgress = isDay ? 1 : 0;
    if (dayNightCycleTimer > (isDay ? DAY_DURATION : NIGHT_DURATION)) { let timeIntoTransition = TRANSITION_DURATION - (dayNightCycleTimer - (isDay ? DAY_DURATION : NIGHT_DURATION)); if (isDay) { transitionProgress = timeIntoTransition / TRANSITION_DURATION; } else { transitionProgress = 1 - (timeIntoTransition / TRANSITION_DURATION); } } else { transitionProgress = targetTransitionProgress; }
    transitionProgress = constrain(transitionProgress, 0, 1);
    if (oldIsDay !== isDay || (dayNightCycleTimer > (isDay ? DAY_DURATION : NIGHT_DURATION) && dayNightCycleTimer % 30 === 0) ) { updateBackgroundParticles(); }
}

function activateFeverMode() {
    if (!feverModeActive) {
        feverModeActive = true;
        feverTimer = FEVER_DURATION;
        currentPlayerSpeed = PLAYER_BASE_SPEED * FEVER_SPEED_BOOST;
        playFeverStartSound();
        updateBackgroundParticles(); // 피버 모드용 파티클로 변경
        console.log("FEVER MODE ACTIVATED!");
    }
}

function deactivateFeverMode() {
    if (feverModeActive) {
        feverModeActive = false;
        feverTimer = 0;
        currentPlayerSpeed = PLAYER_BASE_SPEED;
        playFeverEndSound();
        updateBackgroundParticles(); // 일반 파티클로 복원
        console.log("FEVER MODE DEACTIVATED.");
    }
}

function drawAudioPromptScreen() { /* ... (same as before) ... */ 
    background(30, 30, 40); textAlign(CENTER, CENTER); textSize(32); fill(220, 220, 230);
    text("화면을 클릭하여 시작하세요", BASE_WIDTH / 2, BASE_HEIGHT / 2);
    textSize(25); fill(150,150,160); text("(음악이 재생되니 스피커나 이어폰을 사용하세요)", BASE_WIDTH / 2, BASE_HEIGHT / 2 + 40);
}
function drawStartScreen() { /* ... (same as before) ... */ 
    // 1. 기존 절차적 배경 그리기 코드 삭제:
    // let startSkyTop = color(255, 182, 193); let startSkyBot = color(255, 223, 186);
    // for (let y = 0; y < BASE_HEIGHT; y++) { /* ... */ }
    // noStroke(); fill(50, 50, 70, 150); let groundY = floor(BASE_HEIGHT * 0.85);
    // for (let s of startScreenSilhouettes) { /* ... */ }
    // fill(40,30,20); rect(0, floor(groundY), BASE_WIDTH, floor(BASE_HEIGHT * 0.15));
    // 위와 같은 배경 그리기 코드를 모두 제거합니다.

    // 2. 로드한 배경 이미지 그리기
    if (startScreenBackgroundImage) {
        image(startScreenBackgroundImage, 0, 0, BASE_WIDTH, BASE_HEIGHT);
    } else {
        // 이미지가 로드되지 않았을 경우의 대체 배경 (선택 사항)
        background(200, 220, 255); // 간단한 단색 배경
        console.error("시작 화면 배경 이미지를 불러오지 못했습니다!");
    }

    const mx = mouseX / scaleFactor;
    const my = mouseY / scaleFactor;

     // 3. 기존 텍스트 및 버튼 그리기 로직은 그대로 유지합니다.
    textAlign(CENTER, CENTER); textSize(100); textStyle(BOLD); // 텍스트를 굵게
    for(let i=5; i>=0; i--){ fill(50 + i*20, 150 + i*10, 150, 200 - i*25); text("이앤씨의 꿈", BASE_WIDTH / 2 + floor(i*2), BASE_HEIGHT / 3.5 + floor(i*2)); }
    fill(255); text("이앤씨의 꿈", BASE_WIDTH / 2, BASE_HEIGHT / 3.5);
    let buttonWidth = 250, buttonHeight = 70; let startButtonX = BASE_WIDTH / 2 - buttonWidth / 2; let startButtonY = BASE_HEIGHT / 2;
    if (mx > startButtonX && mx < startButtonX + buttonWidth && my > startButtonY && my < startButtonY + buttonHeight) { fill(255, 180, 0, 250); stroke(255,255,255, 200); strokeWeight(3); } else { fill(0, 34, 102, 220); stroke(230,230,230, 180); strokeWeight(2); }
    rect(startButtonX, startButtonY, buttonWidth, buttonHeight, 15); noStroke(); fill(255); textSize(32); textStyle(BOLD); text("시작하기", BASE_WIDTH / 2, startButtonY + buttonHeight / 2);
    let rankingButtonWidth = 200, rankingButtonHeight = 50; let rankingButtonX = BASE_WIDTH / 2 - rankingButtonWidth / 2; let rankingButtonY = startButtonY + buttonHeight + 20;
    if (mx > rankingButtonX && mx < rankingButtonX + rankingButtonWidth && my > rankingButtonY && my < rankingButtonY + rankingButtonHeight) { fill(100, 180, 255, 250); stroke(255,255,255, 200); strokeWeight(3); } else { fill(152, 0, 0, 220); stroke(230,230,230, 180); strokeWeight(2); }
    rect(rankingButtonX, rankingButtonY, rankingButtonWidth, rankingButtonHeight, 10); noStroke(); fill(255); textSize(24); textStyle(BOLD); text("랭킹 보기", BASE_WIDTH / 2, rankingButtonY + rankingButtonHeight / 2);
    fill(255, 255, 255, 200); textSize(25); textAlign(CENTER, BOTTOM); text("시사상식 퀴즈를 풀고 푸짐한 선물에 도전해보세요!\n장애물을 피하고 아이템을 모아 더 높은 점수에 도전하세요!", BASE_WIDTH / 2, BASE_HEIGHT - 28);
}

// New function for opening sequence (오프닝 시퀀스를 그리는 새로운 함수)
function drawOpeningSequence() {
    // 배경 이미지 그리기
    if (startScreenBackgroundImage) {
        image(startScreenBackgroundImage, 0, 0, BASE_WIDTH, BASE_HEIGHT);
    } else {
        background(0); // 이미지 로드 실패 시 대체 배경
    }

    openingSequenceTimer++;

    // 텍스트 위치 업데이트 (위로 스크롤)
    openingTextScrollY -= OPENING_SCROLL_SPEED;

    // 페이드 진행도 업데이트
    if (openingSequenceTimer < OPENING_FADE_IN_DURATION) {
        openingTextFadeProgress = map(openingSequenceTimer, 0, OPENING_FADE_IN_DURATION, 0, 1);
    } else if (openingSequenceTimer < OPENING_FADE_IN_DURATION + OPENING_HOLD_DURATION) {
        openingTextFadeProgress = 1; // 완전히 불투명하게 유지
    } else if (openingSequenceTimer < OPENING_FADE_IN_DURATION + OPENING_HOLD_DURATION + OPENING_FADE_OUT_DURATION) {
        openingTextFadeProgress = map(openingSequenceTimer,
                                      OPENING_FADE_IN_DURATION + OPENING_HOLD_DURATION,
                                      OPENING_FADE_IN_DURATION + OPENING_HOLD_DURATION + OPENING_FADE_OUT_DURATION,
                                      1, 0);
    } else {
        openingTextFadeProgress = 0; // 완전히 사라짐
    }

    let currentAlpha = map(openingTextFadeProgress, 0, 1, 0, 255);
    currentAlpha = constrain(currentAlpha, 0, 255);

    // 텍스트 그리기
    textAlign(CENTER, TOP);
    textSize(35);
    fill(255, 255, 255, currentAlpha); // 흰색 텍스트, 페이드 효과
    textStyle(BOLD);

    let lineHeight = 60; // 텍스트 크기에 따라 조절
    let totalTextHeight = OPENING_TEXT_LINES.length * lineHeight;
    let startTextDrawY = openingTextScrollY;

    for (let i = 0; i < OPENING_TEXT_LINES.length; i++) {
        text(OPENING_TEXT_LINES[i], BASE_WIDTH / 2 - 380, startTextDrawY + i * lineHeight, BASE_WIDTH * 0.8);
    }

    // 시퀀스 완료 확인
    // 텍스트가 화면 위로 충분히 스크롤되어 사라지고, 완전히 페이드아웃되면 게임 플레이 상태로 전환
    if (openingTextScrollY + totalTextHeight < 350 && openingTextFadeProgress <= 0.5) {
        resetGame(); // 게임 상태 초기화 (플레이어, 퀴즈 등)
        gameState = "PLAYING"; // 플레이 상태로 전환
        playGameMusic(); // 게임 음악 시작
    }
}


function drawRankingInputScreen() { /* ... (same as before) ... */ 
    fill(0, 0, 0, 180); rect(0, 0, BASE_WIDTH, BASE_HEIGHT);
}
function drawRankingDisplayScreen() { /* ... (same as before) ... */
    // --- ⬇️ 보정된 마우스 좌표 계산 ---
    const mx = mouseX / scaleFactor;
    const my = mouseY / scaleFactor; 
    let overlayColor = color(26, 35, 39, 245); background(overlayColor);
    textAlign(CENTER, CENTER); fill(UI_ACCENT_COLOR); textSize(48); text("명예의 전당", BASE_WIDTH / 2, BASE_HEIGHT * 0.10);
    textAlign(LEFT, TOP); textSize(22); fill(UI_TEXT_COLOR);
    let headerY = BASE_HEIGHT * 0.20; let col1X = BASE_WIDTH * 0.1; let col2X = BASE_WIDTH * 0.2;
    let col3X = BASE_WIDTH * 0.5; let col4X = BASE_WIDTH * 0.65; let col5X = BASE_WIDTH * 0.78;
    text("순위", col1X, headerY); text("닉네임", col2X, headerY); text("점수", col3X, headerY);
    text("하트", col4X, headerY); text("클리어 시간", col5X, headerY);
    let entryStartY = headerY + 40; let lineHeight = 30;
    for (let i = 0; i < rankings.length; i++) {
        if (i >= 10) break; let r = rankings[i]; let yPos = entryStartY + i * lineHeight;
        fill(i < 3 ? UI_SCORE_COLOR : UI_TEXT_COLOR);
        textAlign(CENTER); text(i + 1, col1X + 20, yPos);
        textAlign(LEFT); text(r.nickname, col2X, yPos);
        textAlign(CENTER); text(r.score, col3X + 20, yPos); text(r.hearts, col4X + 20, yPos); text(r.time, col5X + 40, yPos);
    }
    if (rankings.length === 0) { textAlign(CENTER); fill(UI_TEXT_COLOR); textSize(24); text("아직 등록된 랭킹이 없습니다.", BASE_WIDTH / 2, entryStartY + lineHeight * 2); }
    let backButtonWidth = 220; let backButtonHeight = 50; let backButtonX = BASE_WIDTH / 2 - backButtonWidth / 2; let backButtonY = BASE_HEIGHT - 90;
    if (mx > backButtonX && mx < backButtonX + backButtonWidth && my > backButtonY && my < backButtonY + backButtonHeight) { fill(100, 180, 255, 250); stroke(255,255,255, 200); strokeWeight(3); } else { fill(80, 160, 230, 220); stroke(230,230,230, 180); strokeWeight(2); }
    rect(backButtonX, backButtonY, backButtonWidth, backButtonHeight, 10);
    noStroke(); fill(255); textSize(24); textAlign(CENTER, CENTER); text("시작 화면으로", BASE_WIDTH / 2, backButtonY + backButtonHeight / 2);
}


// 기존 draw() 함수를 이 코드로 완전히 교체하세요.

function draw() {
    // 1. 매 프레임 시작 시, 게임 로직을 먼저 업데이트합니다.
    updateGame(); 
    
    // 2. 업데이트된 최신 상태를 바탕으로 화면을 그립니다.
    push();
    scale(scaleFactor); // 전체 캔버스 스케일링
    clear();

    // gameState에 따라 적절한 화면을 그립니다.
    if (gameState === "AUDIO_PROMPT") {
        drawAudioPromptScreen();
    } else if (gameState === "START_SCREEN") {
        drawStartScreen();
        hideNicknameInput();
    } else if (gameState === "PRODUCER_SCREEN") {
        drawProducerScreen();
        hideNicknameInput();
    } else if (gameState === "OPENING_SEQUENCE") {
        drawOpeningSequence();
        hideNicknameInput();
    } else if (gameState === "RANKING_INPUT") {
        drawRankingInputScreen();
    } else if (gameState === "RANKING_DISPLAY") {
        drawRankingDisplayScreen();
        hideNicknameInput();
    } else {
        // --- 인게임 화면 그리기 ---
        hideNicknameInput();
        
        let shakeX = 0, shakeY = 0;
        if (screenShakeTime > 0) {
            shakeX = random(-4, 4);
            shakeY = random(-4, 4);
            screenShakeTime--; 
        }
        
        push();
        translate(floor(shakeX), floor(shakeY));
        
        // 배경 및 월드 요소 그리기
        drawBackground();
        bird.draw(cameraX);
        
        // 게임 오브젝트 그리기 (카메라 적용)
        push();
        translate(floor(-cameraX), 0);
        player.draw();
        for (let quiz of quizzes) { if (!quiz.answered) { quiz.draw(); } }
        for (let heart of heartItems) { if (!heart.collected) heart.draw(); }
        for (let shield of shieldItems) { if (!shield.collected) shield.draw(); }
        for (let obs of obstacles) { obs.draw(); }
        pop();
        
        // 파티클 그리기
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].draw(cameraX);
            if (particles[i].isFinished()) {
                particles.splice(i, 1);
            }
        }
        
        pop();

        // UI 그리기 (화면 최상단)
        if (gameState === "QUIZ_ASKING") {
            drawQuizInterface();
        } else if (gameState === "QUIZ_RESULT") {
            drawQuizResult();
        }
        
        drawUI();
        if (correctEffectTime > 0) {
            let R = lerp(NIGHT_STAR_COLOR.levels[0], DAY_STAR_COLOR.levels[0], transitionProgress);
            let G = lerp(NIGHT_STAR_COLOR.levels[1], DAY_STAR_COLOR.levels[1], transitionProgress);
            let B = lerp(NIGHT_STAR_COLOR.levels[2], DAY_STAR_COLOR.levels[2], transitionProgress);
            fill(R, G, B, map(correctEffectTime, 25, 0, 120, 0));
            rect(0, 0, BASE_WIDTH, BASE_HEIGHT);
            correctEffectTime--;
        }
    }
    
    pop();
}

// --- ⬇️ 이 함수 전체를 교체하세요! ---

function handlePlayingState() {
    if (gameStartTime === 0) { gameStartTime = millis(); }

    // 모든 게임 객체들의 위치를 업데이트합니다.
    for (let q of quizzes) q.update();
    for (let h of heartItems) h.update();
    for (let s of shieldItems) s.update();
    for (let o of obstacles) o.update();

    // 낮/밤 사이클을 업데이트하지 않습니다.
    // updateDayNightCycle();

    // --- 퀴즈, 아이템, 장애물 생성 로직 ---

    quizSpawnTimer--;
    if (!allQuizzesSpawned && quizSpawnTimer <= 0 && quizIndex < questions.length) {
        let spawnX = player.pos.x + BASE_WIDTH + random(100, 300);
        quizzes.push(new Quiz(quizIndex, spawnX, floor(random(2))));
        quizIndex++;
        if (quizIndex >= questions.length) {
            allQuizzesSpawned = true;
        }
        quizSpawnTimer = floor(random(8, 12)) * 60; // 8~12초마다 스폰
    }

    heartSpawnTimer--;
    if (heartSpawnTimer <= 0) {
        let spawnX = player.pos.x + BASE_WIDTH + random(200, 500);
        let spawnY = BASE_HEIGHT * 0.85 - PLAYER_HEIGHT - random(20, 100);
        heartItems.push(new HeartItem(spawnX, spawnY));
        heartSpawnTimer = HEART_SPAWN_INTERVAL + random(-120, 120);
    }

    shieldSpawnTimer--;
    if (shieldSpawnTimer <= 0) {
        let spawnX = player.pos.x + BASE_WIDTH + random(200, 500);
        let spawnY = BASE_HEIGHT * 0.85 - PLAYER_HEIGHT - random(20, 100);
        shieldItems.push(new ShieldItem(spawnX, spawnY));
        shieldSpawnTimer = SHIELD_SPAWN_INTERVAL + random(-120, 120);
    }

    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        let spawnX = player.pos.x + BASE_WIDTH + random(150, 400);
        const obsTypes = ['ground_rock', 'pit_trap', 'falling_rock', 'laser'];
        let type = random(obsTypes);
        obstacles.push(new Obstacle(spawnX, type));
        obstacleSpawnTimer = OBSTACLE_SPAWN_INTERVAL + random(-30, 60);
    }

    // --- 충돌 처리 로직 ---

    for (let i = quizzes.length - 1; i >= 0; i--) {
        let quiz = quizzes[i];
        if (!quiz.answered && player.collidesWith(quiz)) {
            currentQuiz = quiz;
            gameState = "QUIZ_ASKING";
            startQuizTimer();
            break;
        }
        if (quiz.pos.x < cameraX - 100) {
            quizzes.splice(i, 1);
        }
    }

    for (let i = heartItems.length - 1; i >= 0; i--) {
        let heart = heartItems[i];
        if (!heart.collected && player.collidesWithHeart(heart)) {
            heart.collected = true;
            if (player.hp < 3) player.hp++;
            playHeartCollectSound();
        }
        if (heart.pos.x < cameraX - 100 || heart.collected) {
            heartItems.splice(i, 1);
        }
    }

    for (let i = shieldItems.length - 1; i >= 0; i--) {
        let shield = shieldItems[i];
        if (!shield.collected && player.collidesWithShieldItem(shield)) {
            shield.collected = true;
            player.activateShield();
            playShieldGetSound();
        }
        if (shield.pos.x < cameraX - 100 || shield.collected) {
            shieldItems.splice(i, 1);
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        if (!obs.hit && player.collidesWithObstacle(obs)) {
            if (player.shieldActive) {
                playShieldBlockSound();
                player.shieldActive = false;
            } else {
                player.hp--;
                playObstacleHitSound(obs.type === 'laser');
                screenShakeTime = 15;
            }
            obs.hit = true;
        }
        if (obs.isOffScreen(cameraX)) {
            obstacles.splice(i, 1);
        }
    }

    // --- 게임 종료 조건 확인 ---

    if (player.hp <= 0) {
        gameState = "GAME_OVER";
        updateHighScore();
        stopAllMusic();
        playGameOverSound();
        deactivateFeverMode();
    } else if ((allQuizzesSpawned && quizzes.length === 0 && player.hp > 0) || (lastQuizProcessed && player.hp > 0)) {
        gameState = "GAME_CLEAR";
        updateHighScore();
        stopAllMusic();
        playGameClearSound();
        deactivateFeverMode();
    }
}

function handleQuizAskingState() {
    // 타이머(프레임 수)를 매 프레임 1씩 감소시킵니다.
    if (quizTimerValue > 0) {
        quizTimerValue--;
    }

    // 타이머가 0이 되었고, 아직 문제가 처리되지 않았다면 '시간 초과'로 처리합니다.
    if (quizTimerValue <= 0 && currentQuiz && !currentQuiz.answered) {
        processAnswer(-1); // -1은 '시간 초과'를 의미
    }
}

// --- ⬇️ 이 함수를 통째로 교체해주세요. ---

function handleQuizResultState() {
    // 결과 화면 타이머를 1씩 줄입니다.
    quizResultTimer--;

    // 타이머가 0이 되면 다음 상태로 넘어갑니다.
    if (quizResultTimer <= 0) {
        // 게임 종료 조건 먼저 확인
        if (player.hp <= 0) {
            gameState = "GAME_OVER";
            updateHighScore();
            stopAllMusic();
            playGameOverSound();
            deactivateFeverMode();
        } else if ((allQuizzesSpawned && quizzes.length === 0) || (lastQuizProcessed && player.hp > 0)) {
            gameState = "GAME_CLEAR";
            updateHighScore();
            stopAllMusic();
            playGameClearSound();
            deactivateFeverMode();
        } else {
            // 게임이 계속되면 다시 플레이 상태로 돌아갑니다.
            gameState = "PLAYING";
            currentQuiz = null; // 현재 퀴즈를 비워 다음 퀴즈를 만날 수 있도록 준비
        }
    }
}
function handleEndGameState() { 
//     if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    deactivateFeverMode(); 

    // 게임 클리어 시 랭킹 입력으로 전환
    if (gameState === "GAME_CLEAR") {
        gameState = "RANKING_INPUT";
        showNicknameInput(); // 게임 클리어임을 알림 (true)
        return;
    }

    // ⭐ 수정된 부분: 게임 오버 시에도 랭킹 입력으로 전환
    if (gameState === "GAME_OVER") {
        gameState = "RANKING_INPUT";
        showNicknameInput(false); // 게임 오버임을 알림 (false)
        return;
    }

    const mx = mouseX / scaleFactor;
    const my = mouseY / scaleFactor;

    // GAME_OVER 화면
    let overlayAlpha = map(transitionProgress, 0, 1, 200, 220); let currentOverlayColor = lerpColor(color(0,0,0, overlayAlpha), color(10,10,20, overlayAlpha + 20), transitionProgress);
    fill(currentOverlayColor); rect(0, 0, BASE_WIDTH, BASE_HEIGHT); textAlign(CENTER, CENTER);
    fill(INCORRECT_COLOR); textSize(48); text(`게임 오버!`, BASE_WIDTH / 2, BASE_HEIGHT / 2 - 120);
    fill(UI_TEXT_COLOR); textSize(32); text(`최종 점수: ${player.score} / ${questions.length}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 - 60);
    fill(UI_SCORE_COLOR); textSize(28); text(`최고 점수: ${highScore}`, BASE_WIDTH / 2, BASE_HEIGHT / 2 - 10);
    let restartButtonWidth = 220; let restartButtonHeight = 50; let restartButtonX = BASE_WIDTH / 2 - restartButtonWidth / 2; let restartButtonY = BASE_HEIGHT / 2 + 40;
    if (mx > restartButtonX && mx < restartButtonX + restartButtonWidth && my > restartButtonY && my < restartButtonY + restartButtonHeight) { fill(100, 200, 100, 220); stroke(255); strokeWeight(2); } else { fill(80, 180, 80, 200); noStroke(); }
    rect(restartButtonX, restartButtonY, restartButtonWidth, restartButtonHeight, 10); fill(255); textSize(24); noStroke(); text("다시 시작", BASE_WIDTH / 2, restartButtonY + restartButtonHeight / 2);
    let rankingButtonWidth = 220; let rankingButtonHeight = 50; let rankingButtonX = BASE_WIDTH / 2 - rankingButtonWidth / 2; let rankingButtonY = restartButtonY + restartButtonHeight + 20;
    if (mx > rankingButtonX && mx < rankingButtonX + rankingButtonWidth && my > rankingButtonY && my < rankingButtonY + rankingButtonHeight) { fill(100, 180, 255, 250); stroke(255,255,255, 200); strokeWeight(3); } else { fill(80, 160, 230, 220); stroke(230,230,230, 180); strokeWeight(2); }
    rect(rankingButtonX, rankingButtonY, rankingButtonWidth, rankingButtonHeight, 10); noStroke(); fill(255); textSize(24); text("랭킹 보기", BASE_WIDTH / 2, rankingButtonY + rankingButtonHeight / 2);
}

function drawBackground() {
    let groundRatio = 0.85;
    let groundY = floor(BASE_HEIGHT * groundRatio);

    // 1. 하늘 그리기
    // 옵션 A: 기존 그라데이션 하늘 유지 (또는 bgSkyImage 사용)
    // currentSkyTop = lerpColor(NIGHT_SKY_TOP, DAY_SKY_TOP, transitionProgress);
    // currentSkyBot = lerpColor(NIGHT_SKY_BOT, DAY_SKY_BOT, transitionProgress);
    // if (feverModeActive) {
    //     let feverColor1 = color(255, 100, 0, 150);
    //     let feverColor2 = color(255, 50, 50, 180);
    //     currentSkyTop = lerpColor(currentSkyTop, feverColor1, 0.5 + sin(frameCount * 0.1) * 0.2);
    //     currentSkyBot = lerpColor(currentSkyBot, feverColor2, 0.5 + cos(frameCount * 0.1) * 0.2);
    // }
    // for (let y = 0; y < groundY; y++) { // groundY까지만 하늘을 그림
    //     let inter = map(y, 0, groundY, 0, 1);
    //     let c = lerpColor(currentSkyTop, currentSkyBot, inter);
    //     stroke(c);
    //     line(0, y, BASE_WIDTH, y);
    // }
    noStroke(); // 이후 stroke 필요시 다시 설정

    // 옵션 B: 하늘 이미지 사용 예시 (위 그라데이션 대신 사용)
    drawScrollingLayer(bgFarImage, 0.05, 0, groundY, () => applyNightTintForLayer(transitionProgress));


    // 2. 별과 유성 그리기 (하늘 위에 그려짐)
    currentStarColor = lerpColor(NIGHT_STAR_COLOR, DAY_STAR_COLOR, transitionProgress);
    fill(currentStarColor);
    for (let star of stars) {
        let screenX = floor((star.x - cameraX * 0.1 % (BASE_WIDTH * 2) + (BASE_WIDTH * 2)) % (BASE_WIDTH * 2));
        if (screenX > BASE_WIDTH) screenX -= BASE_WIDTH * 2;
        let alpha = currentStarColor.levels[3];
        if (feverModeActive) alpha = min(255, alpha + 100);
        fill(currentStarColor.levels[0], currentStarColor.levels[1], currentStarColor.levels[2], alpha * (0.5 + abs(sin(frameCount * 0.02 + star.x * 0.1)) * 0.5) );
        ellipse(screenX, star.y, 2, 2);
    }
    if (!isDay && transitionProgress < 0.5 && !feverModeActive) {
        for (let ss of shootingStars) {
            ss.update();
            ss.draw(cameraX); // shootingStar.draw에서 자체적으로 parallax 처리 가정
        }
    }

    // --- 중요: 기존 절차적 배경 요소 그리는 코드 대부분 제거 ---
    // backgroundElements.sort(...) 및 해당 루프,
    // 산(mountainPeakHeights), 언덕(hillData) 그리는 코드 등을 여기서 제거합니다.
    // 이들이 새로운 이미지 레이어로 대체됩니다.

    // 3. 로드한 이미지 레이어들 그리기 (먼 것부터 가까운 순서대로)
    // Y 위치(yPos)와 높이(layerHeight)는 각 이미지에 맞게 조절하세요.
    // 예를 들어, 산 이미지는 화면 상단에, 언덕은 그 앞에, 특정 건물은 더 앞에 배치될 수 있습니다.
    // yPos는 보통 0이거나, 지면에서부터 얼마나 떨어져 시작할지를 groundY 기준으로 계산할 수 있습니다.
    
    // 예시: 먼 산 레이어 (하늘 바로 위 또는 하늘 일부를 포함한 이미지일 수 있음)
    // 산 이미지가 화면 전체 높이가 아니고, 하늘 이미지 위에 특정 y 위치부터 그려져야 한다면 yPos 조정
    drawScrollingLayer(bgMountainsImage, 0.20, BASE_HEIGHT - (bgMountainsImage ? bgMountainsImage.height : 0) - (BASE_HEIGHT - groundY), -1, () => applyNightTintForLayer(transitionProgress));
    
    // 예시: 중간 언덕/건물 레이어
    drawScrollingLayer(bgMidImage, 0.45, BASE_HEIGHT - (bgMidImage ? bgMidImage.height : 0) - (BASE_HEIGHT - groundY), -1, () => applyNightTintForLayer(transitionProgress));

    // 예시: 가까운 디테일 레이어
    drawScrollingLayer(bgNearImage, 0.70, BASE_HEIGHT - (bgNearImage ? bgNearImage.height : 0) - (BASE_HEIGHT - groundY), -1, () => applyNightTintForLayer(transitionProgress));

// 43
    // 4. 구름 그리기 (적절한 레이어 위에)
    // 구름은 자체 parallax 값을 가지므로, 이미지 레이어들과의 깊이 순서를 고려하여 그립니다.
    for (let cloud of clouds) {
        cloud.update(cameraX);
        applyNightTintForLayer(transitionProgress); // 구름에도 밤/낮 틴트 적용
        cloud.draw(transitionProgress); // cloud.draw 내부에서 틴트가 해제되지 않도록 주의하거나, 여기서 noTint()
        noTint(); // 구름 그린 후 틴트 해제
    }

    // 5. 지면 그리기
    // 옵션 A: 기존 단색 지면 유지
    currentGround = lerpColor(NIGHT_GROUND, DAY_GROUND, transitionProgress);
    fill(currentGround);
    rect(0, groundY, BASE_WIDTH, BASE_HEIGHT * (1 - groundRatio));

    // 옵션 B: 지면 텍스처 이미지 사용 (위 단색 지면 대신 사용)
    drawScrollingLayer(bgGroundImage, 1.0, groundY, BASE_HEIGHT - groundY, () => applyNightTintForLayer(transitionProgress));
}

function drawUI() {
    textSize(26); textAlign(LEFT, TOP);

    // HP Display
    fill(UI_TEXT_COLOR);
    let hpDisplay = "HP: ";
    for(let i=0; i<player.hp; i++) hpDisplay += "❤️"; 
    text(hpDisplay, 30, 30);

    // Shield Display
    if (player.shieldActive) {
        fill(SHIELD_ITEM_COLOR);
        ellipse(35, 65, 25, 25); // Shield icon
        fill(UI_TEXT_COLOR);
        textSize(16);
        text(`${ceil(player.shieldTimer / 60)}s`, 55, 58);
        textSize(26);
    }
    
    // Score Display
    fill(UI_SCORE_COLOR); 
    text(`점수: ${player.score} / ${questions.length}`, 30, player.shieldActive ? 95 : 65); // 보호막 있으면 아래로

    // High Score Display
    fill(UI_TEXT_COLOR); 
    text(`최고: ${highScore}`, BASE_WIDTH - 130, 30);

    // Fever Mode Gauge
    if (feverModeActive) {
        fill(UI_FEVER_GAUGE_COLOR);
        let feverGaugeWidth = map(feverTimer, 0, FEVER_DURATION, 0, 150);
        rect(BASE_WIDTH - 160, 60, feverGaugeWidth, 20, 5);
        fill(UI_TEXT_COLOR); textSize(14);
        text("FEVER!", BASE_WIDTH - 155, 63);
        textSize(26);
    } else if (correctStreak > 0 && correctStreak < CORRECT_STREAK_FOR_FEVER) {
        // 피버 발동 전 연속 정답 표시 (옵션)
        fill(UI_ACCENT_COLOR);
        let streakBarWidth = map(correctStreak, 0, CORRECT_STREAK_FOR_FEVER, 0, 100);
        rect(BASE_WIDTH - 110, 60, streakBarWidth, 10, 3);
    }
}


// --- 3. 퀴즈 UI 그리는 함수 (타이머 표시 방법 수정) ---
function drawQuizInterface() {
    let currentOverlay = lerpColor(color(0,0,0,210), OVERLAY_COLOR, transitionProgress);
    fill(currentOverlay); rect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    
    let boxWidth = BASE_WIDTH * 0.80; let boxHeight = BASE_HEIGHT * 0.75;
    let boxX = (BASE_WIDTH - boxWidth) / 2; let boxY = (BASE_HEIGHT - boxHeight) / 2 + BASE_HEIGHT * 0.05;

    push(); translate(boxX, boxY); 
    let currentUiBg = lerpColor(color(20,20,25,235), UI_BG_COLOR, transitionProgress);
    fill(currentUiBg); stroke(UI_ACCENT_COLOR); strokeWeight(4);
    rect(0, 0, boxWidth, boxHeight, 23); 
    noStroke(); fill(UI_TEXT_COLOR); textAlign(CENTER, TOP); textSize(25); textWrap(WORD);
    text(`Q${currentQuiz.qIdx + 1}. ${questions[currentQuiz.qIdx].q}`, 35, 65, boxWidth - 60);

    // [수정된 부분] 남은 프레임 수를 60으로 나누고 올림(ceil)하여 초 단위로 표시합니다.
    // 예: 899프레임 / 60 = 14.98 -> 15초로 표시
    // 예: 1프레임 / 60 = 0.016 -> 1초로 표시
    let secondsLeft = ceil(quizTimerValue / 60);
    
    fill(secondsLeft <= 5 ? color(255,0,0,220) : color(255, 228, 0, 200)); 
    textSize(30); textAlign(RIGHT, TOP);
    text(secondsLeft, boxWidth - 40, 25); // 계산된 초를 표시

    textSize(20); textAlign(LEFT, CENTER);
    let qData = questions[currentQuiz.qIdx];
    let questionAreaHeight = 100; let optionPaddingTop = 20;
    let optionAreaHeight = boxHeight - questionAreaHeight - optionPaddingTop - 20 - 50; 
    let optionHeight = optionAreaHeight / qData.opts.length;
    let optionStartY = questionAreaHeight + optionPaddingTop + 50; 

    for (let i = 0; i < qData.opts.length; i++) {
        let optContentX = 50; let optContentY = optionStartY + i * optionHeight + optionHeight / 2;
        let optText = `${i + 1}. ${qData.opts[i]}`;
        let hoverOptLeft = 30; let hoverOptRight = boxWidth - 30;
        let hoverOptTop = optionStartY + i * optionHeight + 3;
        let hoverOptBottom = optionStartY + (i + 1) * optionHeight - 3;
        
        // 마우스 좌표는 스케일링 되지 않은 실제 좌표를 사용해야 합니다.
        // draw 함수 최상단에서 scale()을 사용하므로, 여기서는 mouseX/mouseY를 그대로 사용합니다.
        let isMouseOver = mouseX > (boxX * scaleFactor + hoverOptLeft * scaleFactor) && mouseX < (boxX * scaleFactor + hoverOptRight * scaleFactor) && 
                          mouseY > (boxY * scaleFactor + hoverOptTop * scaleFactor) && mouseY < (boxY * scaleFactor + hoverOptBottom * scaleFactor);

        push();
        if (isMouseOver) {
            fill(UI_ACCENT_COLOR);
            rect(hoverOptLeft, hoverOptTop, hoverOptRight - hoverOptLeft, hoverOptBottom - hoverOptTop, 10);
            fill(currentUiBg.levels[0] > 100 ? color(20,20,20) : color(230,230,230));
            textStyle(BOLD);
        } else { fill(UI_TEXT_COLOR); textStyle(NORMAL); }
        text(optText, optContentX, optContentY, boxWidth - 100);
        pop();
    }
    textStyle(NORMAL); pop(); 
}

function drawQuizResult() { /* ... (same as before) ... */ 
    let currentOverlay = lerpColor(color(0,0,0,210), OVERLAY_COLOR, transitionProgress);
    fill(currentOverlay); rect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    let boxWidth = BASE_WIDTH * 0.65; let boxHeight = BASE_HEIGHT * 0.45;
    let boxX = (BASE_WIDTH - boxWidth) / 2; let boxY = (BASE_HEIGHT - boxHeight) / 2 + BASE_HEIGHT * 0.05;
    let resultBgColor = quizFeedback === "정답!" ? CORRECT_COLOR : INCORRECT_COLOR;
    fill(resultBgColor); stroke(UI_TEXT_COLOR); strokeWeight(3);
    rect(boxX, boxY, boxWidth, boxHeight, 25);
    noStroke(); fill(UI_TEXT_COLOR); textAlign(CENTER, CENTER); textSize(40);
    text(quizFeedback, boxX + boxWidth / 2, boxY + boxHeight * 0.3);
    textSize(20); textWrap(WORD);
    text(quizExplanation, boxX + 35, boxY + boxHeight * 0.6, boxWidth - 70);
}

class Player {
    constructor() { 
        this.w = PLAYER_WIDTH; this.h = PLAYER_HEIGHT; 
        this.pos = createVector(120, BASE_HEIGHT * 0.85); 
        this.vel = createVector(0, 0); 
        this.hp = 3; this.score = 0; this.onGround = true; 
        this.walkFrame = 0; this.jumpTime = 0; this.idleBob = 0; 
        this.isJumping = false; this.jumpStartY = 0;
        this.shieldActive = false;
        this.shieldTimer = 0;
        this.maxShieldTime = 10 * 60; // 10초
        this.currentHeight = PLAYER_HEIGHT; // 스쿼시 & 스트레치용
        this.helmetShineAngle = 0;
        this.facing = 1; // 1: 오른쪽, -1: 왼쪽
        // --- ⬇️ 눈 깜빡임 변수 추가 ---
        this.blinkTimer = random(120, 300); // 다음 깜빡임까지 남은 시간 (프레임 단위, 2~5초)
        this.isBlinking = false;         // 현재 깜빡이는 중인지 여부
        this.blinkDuration = 6;          // 깜빡임 지속 시간 (6 프레임)
        this.blinkCurrent = 0;           // 현재 깜빡임 지속 시간 타이머
        // --- ⬆️ 눈 깜빡임 변수 추가 ---
    }
    handleInput() {
        if (keyIsDown(LEFT_ARROW) || keyIsDown(65) || touchControl.left) {
            this.vel.x = -currentPlayerSpeed;
            this.facing = -1;
        } else if (keyIsDown(RIGHT_ARROW) || keyIsDown(68) || touchControl.right) {
            this.vel.x = currentPlayerSpeed;
            this.facing = 1;
        } else {
            this.vel.x = 0;
        }
    }
    update() { 
        this.pos.x += this.vel.x; 
        this.pos.x = constrain(this.pos.x, cameraX + this.w / 2, cameraX + BASE_WIDTH - this.w/2); 
        this.vel.y += GRAVITY; this.pos.y += this.vel.y; 
        let groundY = BASE_HEIGHT * 0.85; 
        if (this.pos.y >= groundY) { 
            if (!this.onGround) { // 착지 시
                for (let i = 0; i < 8; i++) { particles.push(new Particle(this.pos.x, this.pos.y)); } 
                if(this.isJumping) { this.isJumping = false; }
                this.currentHeight = PLAYER_HEIGHT * 0.8; // 착지 스쿼시
                anime({ targets: this, currentHeight: PLAYER_HEIGHT, duration: 200, easing: 'easeOutElastic(1, .8)' });
            }
            this.pos.y = groundY; this.vel.y = 0; this.onGround = true; this.jumpTime = 0; 
        } else { 
            this.jumpTime++; 
        } 
        if (abs(this.vel.x) < 0.1 && this.onGround) { this.idleBob = sin(frameCount * 0.05) * 2; } 
        else { this.idleBob = 0; } 
        if (abs(this.vel.x) > 0.1 && this.onGround) this.walkFrame = (this.walkFrame + 0.3) % 6; 
        else if (!this.onGround) this.walkFrame = 0; 
        else this.walkFrame = 0; 

        this.helmetShineAngle += 0.05;

        // --- ⬇️ 눈 깜빡임 로직 추가 ---
        if (this.isBlinking) {
            // 깜빡이는 중일 때
            this.blinkCurrent--;
            if (this.blinkCurrent <= 0) {
                this.isBlinking = false; // 깜빡임 끝
                this.blinkTimer = random(120, 300); // 다음 깜빡임 시간 설정
            }
        } else {
            // 눈 뜨고 있을 때
            this.blinkTimer--;
            if (this.blinkTimer <= 0) {
                this.isBlinking = true; // 깜빡임 시작
                this.blinkCurrent = this.blinkDuration; // 깜빡임 지속 시간 설정
            }
        }
        // --- ⬆️ 눈 깜빡임 로직 추가 ---
    }
    activateShield() {
        this.shieldActive = true;
        this.shieldTimer = this.maxShieldTime;
    }
    updateShield() {
        if (this.shieldActive) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shieldActive = false;
            }
        }
    }
    drawShield() {
        if (this.shieldActive) {
            push();
            translate(0, -this.currentHeight * 0.8); // 플레이어 중심에 맞게 조정
            let shieldAlpha = map(this.shieldTimer, 0, this.maxShieldTime, 50, 150);
            shieldAlpha = constrain(shieldAlpha, 50, 150);
            fill(SHIELD_EFFECT_COLOR.levels[0], SHIELD_EFFECT_COLOR.levels[1], SHIELD_EFFECT_COLOR.levels[2], shieldAlpha * (0.7 + sin(frameCount*0.2)*0.3));
            noStroke();
            ellipse(0, 0, this.w * 1.8, this.currentHeight * 1.7);
            pop();
        }
    }
    jump() { 
        if (this.onGround) { 
            this.vel.y = -JUMP_FORCE; this.onGround = false; this.isJumping = true; this.jumpStartY = this.pos.y; 
            playJumpSound(); 
            this.currentHeight = PLAYER_HEIGHT * 1.2; // 점프 스트레치
            anime({ targets: this, currentHeight: PLAYER_HEIGHT, duration: 350, easing: 'easeOutElastic(1, .8)' });

            const jumpParticleOptions = { particles: { number: { value: 10 }, color: { value: ["#FFFFFF", "#DDDDFF", "#BBBBFF"] }, shape: { type: "circle" }, opacity: { value: {min: 0.3, max: 0.8} }, size: { value: {min: 2, max: 4} }, move: { speed: 2, gravity: { enable: true, acceleration: -2 }, decay: 0.1, direction: "top", spread: 60 }, life: { duration: { value: 0.6 }, count: 1 } } }; 
            triggerInteractionParticles(jumpParticleOptions, this.pos.x - cameraX, this.pos.y); 
        } 
    }
    draw() {
        push();
        translate(floor(this.pos.x), floor(this.pos.y + this.idleBob));
        scale(this.facing, 1); // 플레이어 방향에 따라 좌우 반전

        // 보호막 먼저 그리기 (플레이어 뒤)
        this.drawShield();

        // 그림자
        fill(0, 0, 0, 40 * transitionProgress + 20 * (1-transitionProgress));
        noStroke();
        ellipse(0, 0, this.w * 0.8, this.w * 0.15); // 그림자

        // --- 플레이어 그리기 시작 (옆모습) ---
        stroke(0, 0, 0, 150);
        strokeWeight(1.5);

        // 신체 비율 정의
        let bodyH = this.currentHeight * 0.5;
        let bodyW = this.w * 0.5; // 옆모습이므로 폭을 약간 줄임
        let headR = this.w * 0.4; // 머리 반지름
        let legH = this.currentHeight * 0.45;
        let armH = this.currentHeight * 0.35;
        let bootH = this.currentHeight * 0.1;
        let bootW = this.w * 0.3;

        // 애니메이션 각도 계산 (기존 로직 활용 + 옆모습에 맞게 조정)
        let legAngle1 = 0, legAngle2 = 0;
        let armAngle1 = 0, armAngle2 = 0;
        if (!this.onGround) {
            let jumpCycle = sin(this.jumpTime * 0.15);
            legAngle1 = -15 + jumpCycle * 10;
            legAngle2 = 15 - jumpCycle * 10;
            armAngle1 = 15 + jumpCycle * 15;
            armAngle2 = -15 - jumpCycle * 15;
        } else if (abs(this.vel.x) > 0.1) {
            let walkCycle = sin(frameCount * 0.25);
            legAngle1 = walkCycle * 40;
            legAngle2 = -walkCycle * 40;
            armAngle1 = -walkCycle * 35;
            armAngle2 = walkCycle * 35;
        }

        // 1. 뒤쪽 다리 그리기 (약간 어둡게)
        push();
        translate(0, -legH * 1.15); // 몸통 아래 위치
        rotate(radians(legAngle2));
        fill(lerpColor(PLAYER_LIMB_COLOR, color(0), 0.15)); // 약간 어둡게
        rect(-bodyW * 0.1, 0, bodyW * 0.25, legH - bootH, 3);
        fill(lerpColor(PLAYER_BOOT_COLOR, color(0), 0.15));
        rect(-bootW * 0.3, legH - bootH, bootW, bootH, 2); // 안전화
        pop();

        // 2. 뒤쪽 팔 그리기 (약간 어둡게)
        push();
        translate(0, -bodyH * 1.3); // 어깨 위치
        rotate(radians(armAngle2));
        fill(lerpColor(PLAYER_LIMB_COLOR, color(0), 0.15));
        rect(-bodyW * 0.08, 0, bodyW * 0.2, armH * 0.9, 3);
        fill(lerpColor(PLAYER_GLOVE_COLOR, color(0), 0.15));
        ellipse(0, armH * 0.9, 8, 8); // 장갑/손
        pop();

        // 3. 몸통 및 조끼 그리기
        let bodyY = -bodyH * 1.5;
        fill(PLAYER_BODY_COLOR);
        rect(-bodyW / 2, bodyY, bodyW, bodyH, 5, 2, 2, 5); // 몸통 (옆모습)
        fill(PLAYER_VEST_COLOR);
        rect(-bodyW / 2 * 0.9, bodyY + bodyH * 0.1, bodyW * 0.9, bodyH * 0.8, 4, 1, 1, 4); // 조끼
        // 반사띠
        fill(220, 220, 220, 200);
        rect(-bodyW / 2 * 0.9, bodyY + bodyH * 0.3, bodyW * 0.9, 4);
        rect(-bodyW / 2 * 0.9, bodyY + bodyH * 0.6, bodyW * 0.9, 4);

         // 4. 머리 및 안전모 그리기 (수정된 버전)

        // --- 비율 및 크기 조정 ---
        let headScale = 1.7; // 머리 크기를 1.7배 키움 (원하는 비율로 조절)
        let currentHeadR = headR * headScale; // 실제 그릴 머리 반지름
        let helmetW = currentHeadR * 0.7; // 헬멧 너비 (머리보다 넓게)
        let helmetH = currentHeadR * 0.8; // 헬멧 높이

        // --- 위치 계산 ---
        let headX = 0; // <<< --- 🚨 이 줄을 추가하세요! (X좌표는 0) ---
        let bodyTopY = bodyY; // 몸통 상단 Y좌표 (이전에 계산된 값 사용)
        let headDrawY = bodyTopY - currentHeadR * 0.4; // 머리를 그릴 Y좌표 (몸통 위에 위치)
        // 헬멧 Y좌표: 머리 Y좌표보다 살짝 위로 이동하여 헬멧 돔의 중심을 잡고,
        // arc() 함수가 머리 위쪽을 덮도록 크기를 키웁니다.
        let helmetDrawY = headDrawY - currentHeadR * 0.3;

        // --- 🚨 머리와 헬멧 모두에 적용할 테두리 설정 ---
        stroke(0); // 검은색
        strokeWeight(1.5); // 두께 2 (또는 1.5)
        // --- 🚨 테두리 설정 끝 ---

        // --- 그리기 ---
        // (1) 머리 먼저 그리기 (더 크게)
        fill(255, 193, 158); // 피부색
        // noStroke();///
        ellipse(headX, headDrawY, currentHeadR, currentHeadR * 1.1); // 살짝 타원형 머리

        // (2) 헬멧 그리기 (머리를 덮도록)
        fill(PLAYER_HELMET_COLOR); // 흰색 헬멧
        // stroke(0, 0, 0, 255);      // 테두리
        // strokeWeight(2);
        // arc(중심X, 중심Y, 너비, 높이, 시작각도, 끝각도)
        // 헬멧 돔을 머리 윗부분을 충분히 덮을 만큼 크게 그립니다.
        arc(headX, helmetDrawY, helmetW * 2, helmetH * 2, PI + 0.1, TWO_PI - 0.1); // PI ~ TWO_PI는 위쪽 반원, 약간 좁혀서 헬멧 느낌

        // --- 🚨 헬멧 돔 아랫선 추가 ---
        // arc가 그린 호의 양 끝점을 연결하여 헬멧 바닥 테두리를 만듭니다.
        // helmetW는 반지름에 가까우므로, 왼쪽 끝은 -helmetW, 오른쪽 끝은 +helmetW 입니다.
        line(headX - helmetW, helmetDrawY, headX + helmetW, helmetDrawY);
        // --- 🚨 아랫선 추가 끝 ---

        // (3) 헬멧 챙 그리기 (헬멧 너비에 맞게)
        // 헬멧 돔의 아래 라인에 맞춰 챙을 그립니다. Y좌표는 helmetDrawY 입니다.
        rect(headX - helmetW * 0.1, helmetDrawY, helmetW * 1.1, currentHeadR * 0.2, 2); // 오른쪽 보기 기준

        // (4) 눈 그리기 (깜빡임 추가)
        let eyeX = headX + currentHeadR * 0.3;
        let eyeY = headDrawY + currentHeadR * 0.1;
        let eyeW = 10; // 눈 흰자 가로 크기
        let eyeH = 12; // 눈 흰자 세로 크기
        let pupilSize = 5; // 눈동자 크기

        noStroke(); // 눈에는 테두리 없이

        if (this.isBlinking) {
            // --- 깜빡일 때: 검은색 가로선 ---
            stroke(0); // 선은 검은색으로
            strokeWeight(1.5); // 선 두께
            line(eyeX - eyeW / 3, eyeY, eyeX + eyeW / 3, eyeY);
            noStroke(); // 다시 테두리 없이
        } else {
            // --- 평소: 흰자 + 검은 눈동자 ---
            // 흰자 그리기
            fill(255); // 흰색
            ellipse(eyeX, eyeY, eyeW, eyeH);
            // 검은 눈동자 그리기
            fill(0); // 검은색
            // this.facing 값에 따라 눈동자 위치를 살짝 조절할 수도 있습니다.
            // 여기서는 살짝 오른쪽 아래를 보도록 했습니다.
            ellipse(eyeX + 1, eyeY + 1, pupilSize, pupilSize);
        }

        // 다른 부분을 위해 테두리 복구
        stroke(0, 0, 0, 150);
        strokeWeight(1.5);

        // 5. 앞쪽 다리 그리기
        push();
        translate(0, -legH * 1.15);
        rotate(radians(legAngle1));
        fill(PLAYER_LIMB_COLOR);
        rect(-bodyW * 0.1, 0, bodyW * 0.25, legH - bootH, 3);
        fill(PLAYER_BOOT_COLOR);
        rect(-bootW * 0.3, legH - bootH, bootW * 1.2, bootH, 2); // 안전화 (앞쪽이 약간 길게)
        fill(80); // 안전화 앞코
        rect(bootW * 0.7, legH - bootH, 6, bootH, 1);
        pop();

        // 6. 앞쪽 팔 그리기
        push();
        translate(0, -bodyH * 1.3);
        rotate(radians(armAngle1));
        fill(PLAYER_LIMB_COLOR);
        rect(-bodyW * 0.08, 0, bodyW * 0.2, armH * 0.9, 3);
        fill(PLAYER_GLOVE_COLOR);
        ellipse(0, armH * 0.9, 10, 10); // 장갑/손
        pop();

        pop();
    }
    collidesWith(quiz) { let playerHitbox = { left: this.pos.x - this.w * 0.25, right: this.pos.x + this.w * 0.25, top: this.pos.y - this.currentHeight * 0.9, bottom: this.pos.y }; let quizHitbox = { left: quiz.pos.x, right: quiz.pos.x + quiz.size, top: quiz.pos.y, bottom: quiz.pos.y + quiz.size }; return playerHitbox.right > quizHitbox.left && playerHitbox.left < quizHitbox.right && playerHitbox.bottom > quizHitbox.top && playerHitbox.top < quizHitbox.bottom; }
    collidesWithHeart(heart) { let playerHitbox = { left: this.pos.x - this.w * 0.3, right: this.pos.x + this.w * 0.3, top: this.pos.y - this.currentHeight, bottom: this.pos.y }; let heartHitbox = { left: heart.pos.x, right: heart.pos.x + heart.size, top: heart.pos.y, bottom: heart.pos.y + heart.size }; return playerHitbox.right > heartHitbox.left && playerHitbox.left < heartHitbox.right && playerHitbox.bottom > heartHitbox.top && playerHitbox.top < heartHitbox.bottom; }
    collidesWithShieldItem(shield) { let playerHitbox = { left: this.pos.x - this.w * 0.3, right: this.pos.x + this.w * 0.3, top: this.pos.y - this.currentHeight, bottom: this.pos.y }; let shieldHitbox = { left: shield.pos.x, right: shield.pos.x + shield.size, top: shield.pos.y, bottom: shield.pos.y + shield.size }; return playerHitbox.right > shieldHitbox.left && playerHitbox.left < shieldHitbox.right && playerHitbox.bottom > shieldHitbox.top && playerHitbox.top < shieldHitbox.bottom; }
    collidesWithObstacle(obstacle) { 
        let playerHitbox = { left: this.pos.x - this.w * 0.25, right: this.pos.x + this.w * 0.25, top: this.pos.y - this.currentHeight, bottom: this.pos.y }; 
        let obsHitbox = obstacle.getHitbox(); // 장애물 클래스에 getHitbox() 메소드 필요
        return playerHitbox.right > obsHitbox.left && playerHitbox.left < obsHitbox.right && playerHitbox.bottom > obsHitbox.top && playerHitbox.top < obsHitbox.bottom; 
    }
}
class Quiz { 
    constructor(qIdx, x, type = 0) { 
        this.qIdx = qIdx; this.quizType = type; 
        this.baseSize = (type === 0) ? 55 : 50; 
        this.size = this.baseSize; // 애니메이션용 현재 크기
        this.pos = createVector(x, BASE_HEIGHT * 0.85 - this.baseSize - 8); 
        this.velX = -QUIZ_SPEED; this.answered = false; 
        this.initialY = this.pos.y; this.bobbingOffset = random(TWO_PI); 
        this.eyeSize = this.baseSize * ( (type === 0) ? 0.14 : 0.18 ); 
        this.pupilOffset = 0; this.blinkTimer = random(50, 160); 
        this.rotation = 0; this.legAngle = 0; 
        this.isSpawning = false; 
        this.interactionScale = 1; // 플레이어 근접 시 커지는 효과
    }
    update() { 
        if(this.isSpawning) return; 
        this.pos.x += this.velX * (feverModeActive ? 1.2 : 1); // 피버 시 퀴즈도 약간 빠르게
        this.pos.y = this.initialY + sin(frameCount * 0.07 + this.bobbingOffset) * 10; 
        
        let distToPlayer = abs(player.pos.x - (this.pos.x + this.size/2));
        if (distToPlayer < 150) {
            this.interactionScale = lerp(this.interactionScale, 1.15, 0.1);
        } else {
            this.interactionScale = lerp(this.interactionScale, 1.0, 0.1);
        }

        if (player.pos.x < this.pos.x - cameraX) this.pupilOffset = -this.eyeSize * 0.18; 
        else this.pupilOffset = this.eyeSize * 0.18; 
        this.blinkTimer--; if (this.blinkTimer <= 0) { this.blinkTimer = random(25, 200); } 
        if (this.quizType === 1) { this.rotation = sin(frameCount * 0.05 + this.qIdx) * 5; this.legAngle = sin(frameCount * 0.15 + this.qIdx) * 15; } 
    }
    draw() { 
        push(); 
        translate(floor(this.pos.x + this.size/2), floor(this.pos.y + this.size/2)); // 중심으로 이동
        scale(this.interactionScale); // 상호작용 스케일 적용
        translate(floor(-this.size/2), floor(-this.size/2)); // 다시 원래 위치로

        let currentQuizBodyColor, currentAccentColor, currentEyeColor, currentFeatureColor; 
        if (this.quizType === 0) { 
            currentQuizBodyColor = lerpColor(NIGHT_BUILDING_PALETTE[0], QUIZ_BODY_COLOR_A, transitionProgress); 
            currentAccentColor = QUIZ_ACCENT_COLOR_A; currentEyeColor = QUIZ_EYE_COLOR_A; 
            fill(currentQuizBodyColor); stroke(lerpColor(color(30,30,40), color(80,20,30), transitionProgress)); strokeWeight(1); 
            ellipse(floor(this.size / 2), floor(this.size / 2), floor(this.size), floor(this.size * 0.9)); 
            let eyeY = floor(this.size * 0.4); let eyeLX = floor(this.size * 0.3); let eyeRX = floor(this.size * 0.7); 
            noStroke(); 
            if (this.blinkTimer < 8) { fill(currentQuizBodyColor); ellipse(eyeLX, eyeY, floor(this.eyeSize * 1.1), floor(this.eyeSize * 0.25)); ellipse(eyeRX, eyeY, floor(this.eyeSize * 1.1), floor(this.eyeSize * 0.25)); } 
            else { fill(currentEyeColor); ellipse(eyeLX, eyeY, floor(this.eyeSize), floor(this.eyeSize * 1.1)); ellipse(eyeRX, eyeY, floor(this.eyeSize), floor(this.eyeSize * 1.1)); fill(0); ellipse(floor(eyeLX + this.pupilOffset), eyeY, floor(this.eyeSize * 0.45), floor(this.eyeSize * 0.55)); ellipse(floor(eyeRX + this.pupilOffset), eyeY, floor(this.eyeSize * 0.45), floor(this.eyeSize * 0.55)); } 
            stroke(currentAccentColor); strokeWeight(2.5); noFill(); 
            arc(floor(this.size/2), floor(this.size * 0.65), floor(this.size * 0.28), floor(this.size*0.18), 0, PI); 
            fill(currentAccentColor); noStroke(); 
            ellipse(floor(this.size * 0.3), floor(this.size * 0.05), floor(this.size * 0.08), floor(this.size * 0.18)); 
            ellipse(floor(this.size * 0.7), floor(this.size * 0.05), floor(this.size * 0.08), floor(this.size * 0.18)); 
        } else { 
            currentQuizBodyColor = lerpColor(NIGHT_BUILDING_PALETTE[0], QUIZ_BODY_COLOR_B, transitionProgress); 
            currentAccentColor = QUIZ_ACCENT_COLOR_B; currentFeatureColor = QUIZ_FEATURE_COLOR_B; 
            push(); // 회전을 위해 push/pop 추가
            translate(this.size/2, this.size/2); // 중심으로 이동 후 회전
            rotate(radians(this.rotation));
            translate(-this.size/2, -this.size/2); // 다시 원래 위치로

            fill(currentQuizBodyColor); stroke(lerpColor(color(40,60,70), color(60,150,190), transitionProgress)); strokeWeight(1.5); 
            rectMode(CENTER); rect(this.size/2, this.size/2, this.size * 0.9, this.size * 0.9, 8); rectMode(CORNER); // rectMode 원복
            noStroke(); fill(255); ellipse(this.size/2, this.size * 0.4, this.eyeSize * 1.5, this.eyeSize * 1.5); 
            fill(0); ellipse(this.size/2 + this.pupilOffset * 0.5, this.size * 0.4, this.eyeSize * 0.7, this.eyeSize * 0.7); 
            fill(255,255,255,200); ellipse(this.size/2 + this.eyeSize*0.2 + this.pupilOffset*0.3, this.size * 0.35, this.eyeSize*0.3, this.eyeSize*0.3); 
            fill(currentFeatureColor); 
            push(); translate(this.size * 0.3, this.size * 0.85); rotate(radians(this.legAngle)); rect(0,0, this.size * 0.1, this.size * 0.25, 3); pop(); 
            push(); translate(this.size * 0.7, this.size * 0.85); rotate(radians(-this.legAngle)); rect(0,0, this.size * 0.1, this.size * 0.25, 3); pop(); 
            pop(); // 회전 pop
        } 
        pop(); 
    } 
}

// --- Item Classes ---
class Item {
    constructor(x, y, itemSize, itemSpeed) {
        this.pos = createVector(x, y);
        this.size = itemSize;
        this.velX = -itemSpeed;
        this.collected = false;
        this.bobbingOffset = random(TWO_PI);
        this.initialY = y;
    }
    update() {
        this.pos.x += this.velX * (feverModeActive ? 1.1 : 1);
        this.pos.y = this.initialY + sin(frameCount * 0.1 + this.bobbingOffset) * 5;
    }
    // draw() will be implemented by subclasses
}

class HeartItem extends Item {
    constructor(x, y) {
        super(x, y, 30, HEART_SPEED);
    }
    draw() {
        push();
        translate(floor(this.pos.x), floor(this.pos.y));
        fill(HEART_ITEM_COLOR);
        noStroke();
        beginShape();
        vertex(this.size / 2, this.size * 0.2);
        bezierVertex(this.size / 2, 0, 0, 0, 0, this.size * 0.3);
        bezierVertex(0, this.size * 0.6, this.size / 2, this.size * 0.8, this.size / 2, this.size);
        bezierVertex(this.size / 2, this.size * 0.8, this.size, this.size * 0.6, this.size, this.size * 0.3);
        bezierVertex(this.size, 0, this.size / 2, 0, this.size / 2, this.size * 0.2);
        endShape(CLOSE);
        pop();
    }
}

class ShieldItem extends Item {
    constructor(x, y) {
        super(x, y, 32, SHIELD_SPEED);
    }
    draw() {
        push();
        translate(floor(this.pos.x + this.size / 2), floor(this.pos.y + this.size / 2));
        fill(SHIELD_ITEM_COLOR);
        stroke(255, 255, 255, 200);
        strokeWeight(2);
        ellipse(0, 0, this.size, this.size);
        fill(255,255,255, 230);
        textAlign(CENTER, CENTER);
        textSize(this.size * 0.6);
        text("S", 0, 1); // 간단한 'S' 텍스트
        pop();
    }
}


class Obstacle { 
    constructor(x, type) { 
        this.type = type; this.hit = false; 
        let groundY = floor(BASE_HEIGHT * 0.85); 
        this.vel = createVector(-QUIZ_SPEED * 0.9, 0); // 기본 속도

        if (type === 'ground_rock') { 
            this.width = floor(random(35, 55)); this.height = floor(random(25, 45)); 
            this.pos = createVector(floor(x), floor(groundY - this.height)); 
            this.shapePoints = []; let numPoints = floor(random(5,8)); 
            for(let i=0; i<numPoints; i++){ let angle = map(i, 0, numPoints, 0, TWO_PI); let r = this.width/2 * random(0.6, 1.1); if(i % 2 === 0) r = this.height/2 * random(0.6, 1.1); this.shapePoints.push(createVector(floor(cos(angle) * r), floor(sin(angle) * r))); } 
        } else if (type === 'pit_trap') { 
            this.width = floor(random(70, 110)); this.height = floor(random(15, 25)); 
            this.visualDepth = floor(this.height * 4 + random(10,30)); 
            this.pos = createVector(floor(x), floor(groundY - this.height)); 
            this.vel = createVector(-QUIZ_SPEED * 0.8, 0); 
        } else if (type === 'falling_rock') { 
            this.width = floor(random(30, 50)); this.height = floor(this.width * random(0.8, 1.2)); 
            this.pos = createVector(floor(x), floor(-this.height - random(60, 250))); 
            this.vel = createVector(-QUIZ_SPEED * 0.4, random(3.5, 6.5)); 
            this.angle = random(TWO_PI); this.rotationSpeed = random(-0.06, 0.06); 
            this.shapePoints = []; let numPoints = floor(random(6,9)); 
            for(let i=0; i<numPoints; i++){ let angle = map(i, 0, numPoints, 0, TWO_PI); let r = this.width/2 * random(0.5, 1.0); this.shapePoints.push(createVector(floor(cos(angle) * r), floor(sin(angle) * r))); } 
        } else if (type === 'laser') {
            this.width = random(80, 150); // 레이저 길이
            this.height = 8; // 레이저 두께
            this.isVertical = random() < 0.5; // 수직 또는 수평
            if (this.isVertical) {
                this.pos = createVector(floor(x), floor(random(BASE_HEIGHT * 0.2, BASE_HEIGHT * 0.7 - this.width)));
                this.laserEnd = createVector(this.pos.x, this.pos.y + this.width);
            } else {
                this.pos = createVector(floor(x), floor(random(BASE_HEIGHT * 0.3, BASE_HEIGHT * 0.8 - this.height)));
                this.laserEnd = createVector(this.pos.x + this.width, this.pos.y);
            }
            this.vel = createVector(-QUIZ_SPEED * 1.1, 0); // 레이저는 약간 빠르게
            this.active = false;
            this.chargeTime = 60; // 1초 충전
            this.activeTime = 90; // 1.5초 활성화
            this.timer = this.chargeTime;
            this.isCharging = true;
        }
    } 
    update() { 
        this.pos.add(this.vel); 
        if (this.type === 'falling_rock') { 
            this.angle += this.rotationSpeed; 
            if (this.pos.y + this.height > floor(BASE_HEIGHT * 0.85)) { 
                this.pos.y = floor(BASE_HEIGHT * 0.85 - this.height); 
                this.vel.y = 0; this.vel.x = 0; 
                if(!this.hit){ for(let i=0; i<8; i++) particles.push(new Particle(this.pos.x + this.width/2, this.pos.y + this.height)); this.hit = true; } 
            } 
        } else if (this.type === 'laser') {
            this.timer--;
            if (this.timer <= 0) {
                if (this.isCharging) {
                    this.isCharging = false;
                    this.active = true;
                    this.timer = this.activeTime;
                } else { // active
                    this.active = false;
                    // 레이저가 화면을 벗어나면 재활용하거나 삭제 (isOffScreen에서 처리)
                    // 여기서는 일단 비활성화만.
                    this.hit = true; // 한번 발사 후 비활성화 (재사용 안함)
                }
            }
            if (this.isVertical) this.laserEnd.set(this.pos.x, this.pos.y + this.width);
            else this.laserEnd.set(this.pos.x + this.width, this.pos.y);
        }
    } 
    getHitbox() {
        if (this.type === 'laser' && !this.active) { // 비활성 레이저는 충돌 없음
            return { left: -1, right: -1, top: -1, bottom: -1 };
        }
        let hitbox = { 
            left: this.pos.x, 
            right: this.pos.x + (this.isVertical && this.type === 'laser' ? this.height : this.width), 
            top: this.pos.y, 
            bottom: this.pos.y + (this.isVertical && this.type === 'laser' ? this.width : this.height)
        };
        if (this.type === 'falling_rock') { hitbox.top -= this.height * 0.2; }
        return hitbox;
    }
    draw() { 
        if (this.hit && this.type !== 'pit_trap' && this.type !== 'laser') return; 
        if (this.type === 'laser' && this.hit && !this.active && !this.isCharging) return; // 완전히 끝난 레이저

        push(); translate(floor(this.pos.x), floor(this.pos.y)); 
        let currentRockFill = lerpColor(OBSTACLE_ROCK_FILL_NIGHT, OBSTACLE_ROCK_FILL_DAY, transitionProgress); 
        let currentRockStroke = lerpColor(OBSTACLE_ROCK_STROKE_NIGHT, OBSTACLE_ROCK_STROKE_DAY, transitionProgress); 
        let currentFallingRockFill = lerpColor(OBSTACLE_FALLING_ROCK_FILL_NIGHT, OBSTACLE_FALLING_ROCK_FILL_DAY, transitionProgress); 
        let currentFallingRockStroke = lerpColor(OBSTACLE_FALLING_ROCK_STROKE_NIGHT, OBSTACLE_FALLING_ROCK_STROKE_DAY, transitionProgress); 
        let currentPitOuter = lerpColor(OBSTACLE_PIT_OUTER_NIGHT, OBSTACLE_PIT_OUTER_DAY, transitionProgress); 
        let currentPitInner = lerpColor(OBSTACLE_PIT_INNER_NIGHT, OBSTACLE_PIT_INNER_DAY, transitionProgress); 
        let currentPitEdge = lerpColor(OBSTACLE_PIT_EDGE_NIGHT, OBSTACLE_PIT_EDGE_DAY, transitionProgress); 
        let currentLaserColor = lerpColor(LASER_COLOR_NIGHT, LASER_COLOR_DAY, transitionProgress);

        if (this.type === 'ground_rock') { 
            fill(currentRockFill); stroke(currentRockStroke); strokeWeight(2); 
            beginShape(); for(let pt of this.shapePoints){ vertex(floor(this.width/2 + pt.x), floor(this.height/2 + pt.y)); } endShape(CLOSE); 
            noStroke(); for(let i=0; i<5; i++){ fill(lerpColor(currentRockStroke, currentRockFill, 0.5), 150); ellipse(floor(this.width/2 + random(-this.width*0.3, this.width*0.3)), floor(this.height/2 + random(-this.height*0.3, this.height*0.3)), random(2,5)); } 
        } else if (this.type === 'pit_trap') { 
            noStroke(); let pitTopVisualY = this.height; 
            for(let i = 0; i < 6; i++){ let insetX = floor(this.width * 0.05 * i); let insetY = floor(this.visualDepth * 0.05 * i); fill(red(currentPitInner) - i*8, green(currentPitInner) - i*8, blue(currentPitInner) - i*8, 220 - i*15); rect(insetX, pitTopVisualY + insetY, floor(this.width - insetX*2), floor(this.visualDepth - insetY*1.5), 3); } 
            fill(red(currentPitInner)*0.5, green(currentPitInner)*0.5, blue(currentPitInner)*0.5, 180); 
            for(let i = 0; i < this.width; i+= floor(this.width/5)){ triangle(i, pitTopVisualY + this.visualDepth, i + floor(this.width/10), pitTopVisualY + this.visualDepth - 10, i + floor(this.width/5), pitTopVisualY + this.visualDepth); } 
            noStroke(); for(let i=0; i < this.width; i+= floor(random(6,12))){ fill(currentPitEdge); let h = random(8,18); let w = random(6,12); triangle(floor(i), pitTopVisualY, floor(i + w), pitTopVisualY, floor(i + w/2), pitTopVisualY - h); fill(lerpColor(currentPitEdge, currentGround, 0.3)); ellipse(floor(i + random(-3,3)), pitTopVisualY + random(-2,3), random(3,8), random(2,6)); } 
            fill(currentPitOuter); rect(0, pitTopVisualY - this.height*0.1, this.width, this.height * 0.3, 2); 
        } else if (this.type === 'falling_rock') { 
            fill(0,0,0, 25 * transitionProgress + 5 * (1-transitionProgress)); noStroke(); 
            ellipse(floor(this.width/2), floor(this.height/2 + this.height * 0.7 + (BASE_HEIGHT * 0.85 - (this.pos.y + this.height)) * 0.15) , this.width * 0.7, this.width * 0.15); 
            fill(currentFallingRockFill); stroke(currentFallingRockStroke); strokeWeight(2); 
            translate(floor(this.width / 2), floor(this.height / 2)); rotate(this.angle); 
            beginShape(); for(let pt of this.shapePoints){ vertex(floor(pt.x), floor(pt.y)); } endShape(CLOSE); 
            noStroke(); fill(255,255,255, 30 * transitionProgress); arc(0,0, this.width*0.8, this.height*0.8, PI+this.angle+0.5, TWO_PI+this.angle+0.5); 
            fill(0,0,0, 30 * (1-transitionProgress)); arc(0,0, this.width*0.8, this.height*0.8, HALF_PI+this.angle+0.5, PI+this.angle+0.5); 
        } else if (this.type === 'laser') {
            let laserX1 = 0; // this.pos.x는 이미 translate로 적용됨
            let laserY1 = 0; // this.pos.y도 마찬가지
            let laserX2 = this.isVertical ? 0 : this.width;
            let laserY2 = this.isVertical ? this.width : 0; // 레이저 길이만큼

            if (this.isCharging) {
                strokeWeight(2);
                stroke(LASER_WARNING_COLOR.levels[0], LASER_WARNING_COLOR.levels[1], LASER_WARNING_COLOR.levels[2], 100 + sin(frameCount * 0.3) * 50); // 깜빡이는 경고선
                line(laserX1, laserY1 + this.height/2, laserX2, laserY2 + this.height/2);
            }
            if (this.active) {
                strokeWeight(this.height);
                let coreAlpha = 255;
                let glowAlpha = 150;
                if (feverModeActive) { // 피버 시 레이저 강화
                    coreAlpha = 255; glowAlpha = 200;
                    strokeWeight(this.height * 1.5);
                }
                stroke(currentLaserColor.levels[0], currentLaserColor.levels[1], currentLaserColor.levels[2], coreAlpha);
                line(laserX1, laserY1 + this.height/2, laserX2, laserY2 + this.height/2);
                // Glow effect
                strokeWeight(this.height * 2.5);
                stroke(currentLaserColor.levels[0], currentLaserColor.levels[1], currentLaserColor.levels[2], glowAlpha * (0.6 + sin(frameCount*0.4)*0.4));
                line(laserX1, laserY1 + this.height/2, laserX2, laserY2 + this.height/2);
            }
        }
        pop(); 
    } 
    isOffScreen(camX) { 
        let screenRightEdge = this.pos.x + (this.isVertical && this.type === 'laser' ? this.height : this.width);
        return (screenRightEdge < camX - 200 || this.pos.y > BASE_HEIGHT + 50); 
    } 
}
class Particle { /* ... (same as before) ... */ constructor(x, y, isJump = false) { this.pos = createVector(x, y); if (isJump) { this.vel = createVector(random(-0.8, 0.8), random(-1.8, -0.4)); } else { this.vel = createVector(random(-1.2, 1.2), random(-0.8, 0.4)); } this.acc = createVector(0, 0.04); this.lifespan = 255; this.size = random(2, 6); this.color = PARTICLE_COLOR; } update() { this.vel.add(this.acc); this.pos.add(this.vel); this.lifespan -= 6; } draw(camX) { push(); translate(floor(-camX), 0); noStroke(); let particleAlpha = this.lifespan * (0.6 + 0.4 * (1 - transitionProgress)); fill(this.color.levels[0], this.color.levels[1], this.color.levels[2], particleAlpha); ellipse(floor(this.pos.x), floor(this.pos.y), floor(this.size), floor(this.size)); pop(); } isFinished() { return this.lifespan < 0; } }
class Cloud { /* ... (same as before) ... */ constructor(x, y) { this.pos = createVector(x, y); this.parts = []; let numParts = floor(random(3, 5)); for (let i = 0; i < numParts; i++) { this.parts.push({ offX: floor(random(-35, 35)), offY: floor(random(-12, 12)), size: floor(random(35, 70)) }); } this.speed = random(0.08, 0.25); } update(camX) { this.pos.x -= (this.speed + camX * 0.0004) * (feverModeActive ? 1.8 : 1); if (this.pos.x < -80) { this.pos.x = BASE_WIDTH + 80; this.pos.y = floor(random(30, BASE_HEIGHT * 0.25)); } } draw(tp) { noStroke(); let currentCloudColor = lerpColor(color(60,70,90,90), CLOUD_COLOR, tp); fill(currentCloudColor); for (let part of this.parts) { ellipse(floor(this.pos.x + part.offX), floor(this.pos.y + part.offY), part.size, floor(part.size * 0.65)); } } }
class Bird { /* ... (same as before) ... */ constructor() { this.reset(); this.size = 28; this.wingAngle = 0; this.showMessage = false; this.messageTimer = 0; this.message = "랭킹 안에 들면 선물을 드려요~"; this.active = false; } reset() { this.pos = createVector(-80, floor(random(BASE_HEIGHT * 0.1, BASE_HEIGHT * 0.22))); this.vel = createVector(random(3.0, 5.0), 0); this.showMessage = false; this.messageTimer = 0; this.spawnTimer = random(200, 400); this.active = false; } update() { if (gameState === "QUIZ_ASKING" || gameState === "QUIZ_RESULT") { return; } if (this.spawnTimer > 0) { this.spawnTimer--; if(this.spawnTimer <= 0) this.active = true; return; } if(!this.active) return; this.pos.add(this.vel); this.wingAngle = sin(frameCount * 0.28) * 28; if (this.pos.x > BASE_WIDTH * 0.3 && this.pos.x < BASE_WIDTH * 0.7 && !this.showMessage) { this.showMessage = true; this.messageTimer = 720; } if (this.showMessage) { this.messageTimer--; if (this.messageTimer <= 0) { this.showMessage = false; } } if (this.pos.x > BASE_WIDTH + this.size * 2 && (!this.showMessage || this.messageTimer <= 0)) { this.reset(); } } draw(camX) { if (!this.active || gameState === "QUIZ_ASKING" || gameState === "QUIZ_RESULT") { return; } let displayX = floor(this.pos.x - cameraX * 0.08); let currentBirdColor = lerpColor(color(20,20,30), BIRD_COLOR, transitionProgress); push(); translate(displayX, floor(this.pos.y)); fill(currentBirdColor); noStroke(); ellipse(0, 0, this.size, floor(this.size * 0.55)); ellipse(floor(this.size * 0.38), floor(-this.size * 0.1), floor(this.size * 0.45), floor(this.size * 0.38)); fill(lerpColor(color(200,100,0), color(255,165,0), transitionProgress)); triangle(floor(this.size*0.55), floor(-this.size*0.1), floor(this.size*0.75), floor(-this.size*0.15), floor(this.size*0.65), 0); fill(currentBirdColor); push(); translate(floor(-this.size * 0.1), floor(-this.size * 0.1)); rotate(radians(this.wingAngle)); ellipse(0, floor(-this.size * 0.18), floor(this.size * 0.75), floor(this.size * 0.28)); pop(); push(); translate(floor(-this.size * 0.1), floor(-this.size * 0.1)); rotate(radians(-this.wingAngle - 8)); ellipse(0, floor(-this.size * 0.14), floor(this.size * 0.65), floor(this.size * 0.23)); pop(); if (this.showMessage) { let 말풍선배경색 = lerpColor(color(200,200,220,230), color(255,255,255,240), transitionProgress); let 말풍선테두리색 = lerpColor(color(50,50,50,230), color(0,0,0,240), transitionProgress); let 말풍선글자색 = lerpColor(color(30,30,30), color(0,0,0), transitionProgress); fill(말풍선배경색); stroke(말풍선테두리색); strokeWeight(1); rectMode(CORNER); let msgWidth = textWidth(this.message) + 40; let msgHeight = 36; beginShape(); vertex(0, floor(this.size * 0.3)); vertex(10, floor(this.size * 0.3 + 12)); vertex(-10, floor(this.size * 0.3 + 12)); endShape(CLOSE); rect(floor(-msgWidth/2), floor(this.size * 0.3 + 12), floor(msgWidth), floor(msgHeight), 8); fill(말풍선글자색); noStroke(); textAlign(CENTER, CENTER); textSize(14); text(this.message, 0, floor(this.size * 0.3 + 12 + msgHeight/2)); } pop(); } }
class ShootingStar {
    constructor() { this.reset(); }
    reset() {
        this.pos = createVector(random(BASE_WIDTH * 1.5), random(BASE_HEIGHT * 0.05, BASE_HEIGHT * 0.3));
        this.len = random(15, 30);
        this.speed = random(8, 15);
        this.angle = random(PI + QUARTER_PI * 0.8, PI + QUARTER_PI * 1.2); // 대각선 아래로
        this.life = random(30, 60); // 지속 시간
        this.active = false;
        this.spawnDelay = random(120, 600); // 다음 스폰까지 딜레이
    }
    update() {
        if (!this.active) {
            this.spawnDelay--;
            if (this.spawnDelay <= 0) {
                this.active = true;
                this.pos = createVector(random(BASE_WIDTH * 1.2, BASE_WIDTH * 1.8), random(BASE_HEIGHT * 0.05, BASE_HEIGHT * 0.2)); // 화면 오른쪽 바깥에서 시작
            }
            return;
        }
        this.pos.x += cos(this.angle) * this.speed * (feverModeActive ? 1.5 : 1);
        this.pos.y += sin(this.angle) * this.speed * (feverModeActive ? 1.5 : 1);
        this.life--;
        if (this.life <= 0 || this.pos.x < -this.len || this.pos.y > BASE_HEIGHT + this.len) {
            this.active = false;
            this.spawnDelay = random(300, 900); // 다음 스폰까지 긴 딜레이
            this.reset(); // 위치 등 초기화
        }
    }
    draw(camX) {
        if (!this.active) return;
        let displayX = this.pos.x - camX * 0.05; // 약간의 패럴랙스
        let displayY = this.pos.y;

        let tailX = displayX - cos(this.angle) * this.len;
        let tailY = displayY - sin(this.angle) * this.len;
        
        let alpha = map(this.life, 0, 30, 0, SHOOTING_STAR_COLOR.levels[3]);
        alpha = constrain(alpha, 0, SHOOTING_STAR_COLOR.levels[3]);

        stroke(SHOOTING_STAR_COLOR.levels[0], SHOOTING_STAR_COLOR.levels[1], SHOOTING_STAR_COLOR.levels[2], alpha);
        strokeWeight(2.5);
        line(displayX, displayY, tailX, tailY);
        
        // 머리 부분 반짝임
        fill(255, 255, 255, alpha * 1.2);
        noStroke();
        ellipse(displayX, displayY, 5, 5);
    }
}


// --- 1. 퀴즈 타이머 시작 함수 (단위를 초 -> 프레임으로 변경) ---
function startQuizTimer() {
    // QUIZ_TIME_LIMIT (예: 15초)에 60fps를 곱해서 전체 프레임 수를 계산합니다.
    // 예: 15초 * 60프레임 = 900프레임
    quizTimerValue = QUIZ_TIME_LIMIT * 60; 
}

// --- Ranking Functions --- (Flask 연동)
async function loadRankingsFromServer() { /* ... (same as before) ... */ 
    console.log(`Attempting to load rankings from: https://api.dreamofenc.com/api/get_rankings`);
    try {
        const response = await fetch(`https://api.dreamofenc.com/api/get_rankings`);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        rankings = data;
        sortRankings();
        console.log("Rankings loaded from Flask server:", rankings);
    } catch (error) {
        console.error("Could not load rankings from server, using localStorage or empty:", error);
        const storedRankings = localStorage.getItem('encQuizRankings');
        if (storedRankings) {
            try {
                rankings = JSON.parse(storedRankings);
                if (!Array.isArray(rankings)) rankings = [];
            } catch (e) { rankings = []; }
        } else {
            rankings = [];
        }
        sortRankings();
    }
}
async function saveRankingToServer(nickname, score, hearts, timeMillis) { /* ... (same as before) ... */ 
    const newEntry = {
        nickname: nickname,
        score: score,
        hearts: hearts,
        time: formatTime(timeMillis),
        rawTime: timeMillis,
    };
    console.log(`Attempting to save ranking to server: https://api.dreamofenc.com/api/add_ranking`, newEntry);
    try {
        const response = await fetch(`https://api.dreamofenc.com/api/add_ranking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(newEntry),
        });
        const result = await response.json();
        if (response.ok && result.status === "success") {
            console.log("Ranking successfully sent to server:", result.message);
            await loadRankingsFromServer();
        } else {
            console.error("Failed to save ranking to server:", result.message, "Status:", response.status);
            saveRankingLocally(nickname, score, hearts, timeMillis);
        }
    } catch (error) {
        console.error("Error sending ranking to server:", error);
        saveRankingLocally(nickname, score, hearts, timeMillis);
    }
}
function saveRankingLocally(nickname, score, hearts, timeMillis) { /* ... (same as before) ... */ 
    const newEntry = {
        nickname: nickname, score: score, hearts: hearts,
        time: formatTime(timeMillis), rawTime: timeMillis,
        date: new Date().toLocaleDateString()
    };
    rankings.push(newEntry);
    sortRankings();
//     rankings = rankings.slice(0, 10);
    localStorage.setItem('encQuizRankings', JSON.stringify(rankings));
    console.log("Ranking saved to localStorage (server fallback):", newEntry);
}
function sortRankings() { /* ... (same as before) ... */ 
    rankings.sort((a, b) => {
        if (b.score === a.score) {
            return a.rawTime - b.rawTime;
        }
        return b.score - a.score;
    });
}
function formatTime(ms) { /* ... (same as before) ... */ 
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;
    let milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
}
function showNicknameInput(isClear = true) { // ⭐ isClear 파라미터 추가 (기본값 true)
    let container = select('#rankingInputDOMContainer');
    if (!container) {
        console.error("#rankingInputDOMContainer 요소를 HTML에서 찾을 수 없습니다!");
        return;
    }
    hideNicknameInput(); 
    container = select('#rankingInputDOMContainer');
    if (!container) { console.error("#rankingInputDOMContainer 요소를 재선택할 수 없습니다."); return; }
    container.html('');

    // ⭐ 게임 상태에 따라 다른 제목과 점수 표시
    let titleText = isClear ? '🎉 게임 클리어! 🎉' : '😥 게임 오버! 😥';
    let scoreText = `최종 점수: ${player.score} / ${questions.length}`;

    // ⭐ 점수 표시 요소 추가
    nicknamePopupScoreElement = createElement('p', scoreText);
    nicknamePopupScoreElement.style('font-size', '15px'); // 스타일 예시
    nicknamePopupScoreElement.style('margin-bottom', '15px');

    nicknamePopupTitleElement = createElement('h2', titleText);
    nicknamePopupTitleElement.parent(container);
    nicknamePopupInstructionElement = createElement('p', '랭킹에 직번/성명을 남겨주세요:');
    nicknamePopupInstructionElement.parent(container);
    nicknameInputElement = createInput('');
    nicknameInputElement.parent(container);
    nicknameInputElement.attribute('maxlength', '10');
    submitNicknameButtonElement = createButton('등록');
    submitNicknameButtonElement.parent(container);
    submitNicknameButtonElement.mousePressed(submitNickname);
    container.style('display', 'block');
}
function hideNicknameInput() { /* ... (same as before) ... */ 
    let container = select('#rankingInputDOMContainer');
    if (container) { container.style('display', 'none'); }
    if (nicknamePopupTitleElement) { nicknamePopupTitleElement.remove(); nicknamePopupTitleElement = null; }
    if (nicknamePopupScoreElement) { nicknamePopupScoreElement.remove(); nicknamePopupScoreElement = null; } // ⭐ 추가된 점수 요소 제거
    if (nicknamePopupInstructionElement) { nicknamePopupInstructionElement.remove(); nicknamePopupInstructionElement = null; }
    if (nicknameInputElement) { nicknameInputElement.remove(); nicknameInputElement = null; }
    if (submitNicknameButtonElement) { submitNicknameButtonElement.remove(); submitNicknameButtonElement = null; }
    if (container) { container.html(''); }
}
async function submitNickname() { /* ... (same as before) ... */ 
    if (!nicknameInputElement) return;
    const nickname = nicknameInputElement.value();
    if (nickname.trim() === "") { 
        // Use custom modal instead of alert
        showCustomAlert("닉네임을 입력해주세요!"); 
        return; 
    }
    let clearTime = millis() - gameStartTime;
    await saveRankingToServer(nickname, player.score, player.hp, clearTime);
    hideNicknameInput();
    gameState = "RANKING_DISPLAY";
}

// Custom alert function (simple example)
function showCustomAlert(message) {
    // This is a placeholder. You'd implement a proper modal UI here.
    console.warn("ALERT (custom):", message); 
    // For a real implementation, you might create a div, style it, and add it to the DOM.
    // For now, we'll just log it and perhaps show a temporary text on canvas if possible.
    let tempAlert = select('#temp-alert-message');
    if (!tempAlert) {
        tempAlert = createDiv(message);
        tempAlert.id('temp-alert-message');
        tempAlert.style('position', 'absolute');
        tempAlert.style('top', '10px');
        tempAlert.style('left', '50%');
        tempAlert.style('transform', 'translateX(-50%)');
        tempAlert.style('background-color', 'rgba(255,100,100,0.9)');
        tempAlert.style('color', 'white');
        tempAlert.style('padding', '10px 20px');
        tempAlert.style('border-radius', '5px');
        tempAlert.style('z-index', '1000');
        tempAlert.parent('game-container'); // Ensure it's within the game container
    } else {
        tempAlert.html(message);
        tempAlert.style('display', 'block');
    }
    setTimeout(() => {
        if (tempAlert) tempAlert.style('display', 'none');
    }, 3000);
}


function keyPressed() {
    if (gameState === "PLAYING") { if (keyCode === UP_ARROW || keyCode === 87 || keyCode === 32) player.jump(); }
    else if (gameState === "QUIZ_ASKING") { if (keyCode >= 49 && keyCode <= 52) processAnswer(keyCode - 49); }
    else if (gameState === "GAME_OVER" || gameState === "GAME_CLEAR" || gameState === "RANKING_DISPLAY" || gameState === "RANKING_INPUT") {
        if (key === 'r' || key === 'R') {
            if (musicContextStarted) {
                stopAllMusic(); resetGame(); gameState = "PLAYING"; playGameMusic();
            } else { gameState = "AUDIO_PROMPT"; }
        }
    }
}
// 기존 mousePressed() 함수를 이 코드로 완전히 교체하세요.

function mousePressed() {
    // 모든 클릭/터치 좌표를 게임 내부 좌표계로 변환
    const mx = mouseX / scaleFactor;
    const my = mouseY / scaleFactor;

    // 1. 오디오 시작 (가장 먼저 처리)
    if (gameState === "AUDIO_PROMPT") {
        // 이미 오디오 컨텍스트가 실행 중인지 확인합니다.
        if (Tone.context.state === 'running') {
            musicContextStarted = true;
            gameState = "START_SCREEN";
            playStartScreenMusic();
            return; // 이미 실행 중이면 바로 다음으로 넘어갑니다.
        }
        
        // Tone.start()는 Promise를 반환하므로, 비동기 방식으로 처리합니다.
        Tone.start().then(() => {
            // 오디오 시작에 '성공'했을 때만 다음 로직을 실행합니다.
            console.log("AudioContext started successfully!");
            musicContextStarted = true;
            gameState = "START_SCREEN";
            playStartScreenMusic();
        }).catch(e => {
            // 오디오 시작에 '실패'하면 콘솔에 에러를 기록합니다.
            // (사용자에게 다시 클릭해달라는 메시지를 보여줄 수도 있습니다)
            console.error("Could not start AudioContext:", e);
        });
        return; // 다른 로직이 실행되지 않도록 여기서 종료합니다.
    }

    // 2. 시작 화면
    if (gameState === "START_SCREEN") {
        let startButtonWidth = 250, startButtonHeight = 70;
        let startButtonX = BASE_WIDTH / 2 - startButtonWidth / 2;
        let startButtonY = BASE_HEIGHT / 2;
        let rankingButtonWidth = 200, rankingButtonHeight = 50;
        let rankingButtonX = BASE_WIDTH / 2 - rankingButtonWidth / 2;
        let rankingButtonY = startButtonY + startButtonHeight + 20;

        if (mx > startButtonX && mx < startButtonX + startButtonWidth && my > startButtonY && my < startButtonY + startButtonHeight) {
            gameState = "PRODUCER_SCREEN";
            // ... (관련 변수 초기화) ...
        } else if (mx > rankingButtonX && mx < rankingButtonX + rankingButtonWidth && my > rankingButtonY && my < rankingButtonY + rankingButtonHeight) {
            loadRankingsFromServer().then(() => { gameState = "RANKING_DISPLAY"; });
        }
    } 
    // 3. 퀴즈 정답 선택
    else if (gameState === "QUIZ_ASKING" && currentQuiz) {
        let qData = questions[currentQuiz.qIdx];
        let boxWidth = BASE_WIDTH * 0.80, boxHeight = BASE_HEIGHT * 0.75;
        let boxX = (BASE_WIDTH - boxWidth) / 2, boxY = (BASE_HEIGHT - boxHeight) / 2 + BASE_HEIGHT * 0.05;
        let optionHeight = (boxHeight - 170) / qData.opts.length;
        let firstOptionStartY = boxY + 170;

        for (let i = 0; i < qData.opts.length; i++) {
            let optClickableTopY = firstOptionStartY + i * optionHeight;
            let optClickableBottomY = firstOptionStartY + (i + 1) * optionHeight;
            let optClickableLeftX = boxX + 30, optClickableRightX = boxX + boxWidth - 30;
            if (mx > optClickableLeftX && mx < optClickableRightX && my > optClickableTopY && my < optClickableBottomY) {
                processAnswer(i);
                break;
            }
        }
    } 
    // 4. 랭킹 화면에서 돌아가기
    else if (gameState === "RANKING_DISPLAY") {
        let backButtonWidth = 220, backButtonHeight = 50;
        let backButtonX = BASE_WIDTH / 2 - backButtonWidth / 2;
        let backButtonY = BASE_HEIGHT - 90;
        if (mx > backButtonX && mx < backButtonX + backButtonWidth && my > backButtonY && my < backButtonY + backButtonHeight) {
            stopAllMusic();
            gameState = "START_SCREEN";
            playStartScreenMusic();
        }
    }
    // 5. 게임 오버 화면에서 다시 시작/랭킹 보기
    else if (gameState === "GAME_OVER") {
        let restartButtonWidth = 220, restartButtonHeight = 50;
        let restartButtonX = BASE_WIDTH / 2 - restartButtonWidth / 2;
        let restartButtonY = BASE_HEIGHT / 2 + 40;
        let rankingButtonWidth = 220, rankingButtonHeight = 50;
        let rankingButtonX = BASE_WIDTH / 2 - rankingButtonWidth / 2;
        let rankingButtonY = restartButtonY + restartButtonHeight + 20;

        if (mx > restartButtonX && mx < restartButtonX + restartButtonWidth && my > restartButtonY && my < restartButtonY + restartButtonHeight) {
            resetGame(); 
            gameState = "PLAYING"; 
            playGameMusic();
        } else if (mx > rankingButtonX && mx < rankingButtonX + rankingButtonWidth && my > rankingButtonY && my < rankingButtonY + rankingButtonHeight) {
            loadRankingsFromServer().then(() => { gameState = "RANKING_DISPLAY"; });
        }
    }
}

function playStartScreenMusic() { /* ... (same as before) ... */ if (musicContextStarted) { stopAllMusic(); if (!startMusicPlaying) { Tone.Transport.bpm.value = 90; if (startMusicLoop) startMusicLoop.mute = false; else console.error("startMusicLoop not initialized"); if (Tone.Transport.state !== "started") Tone.Transport.start(); startMusicPlaying = true; console.log("Start screen music playing."); } } else { console.log("Cannot play start screen music: AudioContext not started."); } }
function playGameMusic() { /* ... (same as before) ... */ if (musicContextStarted) { stopAllMusic(); if (!gameMusicPlaying) { Tone.Transport.bpm.value = 150; if (gameMusicLoop) gameMusicLoop.mute = false; else console.error("gameMusicLoop not initialized"); if (Tone.Transport.state !== "started") Tone.Transport.start(); gameMusicPlaying = true; console.log("Game music playing."); } } else { console.log("Cannot play game music: AudioContext not started."); } }

// --- 4. 정답 처리 함수 (가장 중요! 이전과 동일하지만 다시 한번 확인) ---
function processAnswer(selectedOptIndex) {
    // [핵심] 퀴즈가 없거나, 이미 답변 처리된 문제라면 즉시 함수를 종료하여 중복 실행을 막습니다.
    if (!currentQuiz || currentQuiz.answered) {
        return;
    }

    // [핵심] 이 함수가 호출되자마자 '답변 완료' 상태로 만듭니다. 이것이 잠금 장치입니다.
    currentQuiz.answered = true;

    // (이하 로직은 이전과 동일)
    if (currentQuiz.qIdx === questions.length - 1) {
        lastQuizProcessed = true;
    }

    const qData = questions[currentQuiz.qIdx];
    if (!qData) {
        console.error(`Error: No question data for quiz index ${currentQuiz.qIdx}`);
        return;
    }

    const isTimeout = (selectedOptIndex === -1);
    const isCorrect = !isTimeout && (selectedOptIndex + 1 === qData.ans);

    if (isCorrect) {
        player.score++;
        quizFeedback = "정답!";
        playCorrectAnswerSound();
        correctEffectTime = 25;
        correctStreak++;
        if (correctStreak >= CORRECT_STREAK_FOR_FEVER && !feverModeActive) {
            activateFeverMode();
        }
    } else {
        player.hp--;
        quizFeedback = isTimeout ? "시간 초과!" : "오답!";
        playIncorrectAnswerSound();
        screenShakeTime = 12;
        correctStreak = 0;
        if (feverModeActive) deactivateFeverMode();
    }

    quizExplanation = qData.exp;

    // 모든 로직 처리 후, 게임 상태를 '결과 화면'으로 확실하게 변경합니다.
    gameState = "QUIZ_RESULT";
    quizResultTimer = 160; // 결과 화면 표시 시간 (프레임)
}

function updateHighScore() { if (player.score > highScore) { highScore = player.score; localStorage.setItem('encQuizAdventureHighScore', highScore); } }
function shuffleArray(array) { /* ... (same as before) ... */ 
  let currentIndex = array.length,  randomIndex;
  while (currentIndex > 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}
function generateArpeggioPattern(baseChordNoteNames, startOctave, synthInstance, baseVelocity, startTimeBar) { /* ... (same as before) ... */ 
    const NUM_ASCENDING = 16;
    const NUM_PEAK = 1;
    const NUM_DESCENDING = 15;
    const TOTAL_NOTES_PER_PATTERN = NUM_ASCENDING + NUM_PEAK + NUM_DESCENDING;

    const generatedPattern = [];
    const noteParts = []; 

    const pitchClassMap = { "C":0, "C#":1, "Db":1, "D":2, "D#":3, "Eb":3, "E":4, "F":5, "F#":6, "Gb":6, "G":7, "G#":8, "Ab":8, "A":9, "A#":10, "Bb":10, "B":11 };

    let currentOctave = startOctave;
    let chordToneIdx = 0;
    let previousNotePitchClass = -1; 

    for (let i = 0; i < NUM_ASCENDING; i++) {
        const noteName = baseChordNoteNames[chordToneIdx % baseChordNoteNames.length];
        const currentNotePitchClass = pitchClassMap[noteName];
        if (i > 0 && currentNotePitchClass <= previousNotePitchClass) {
            currentOctave++;
        }
        noteParts.push({ name: noteName, octave: currentOctave });
        previousNotePitchClass = currentNotePitchClass; 
        chordToneIdx++;
    }

    const lastAscendingNotePart = noteParts[NUM_ASCENDING - 1];
    let peakNoteName = baseChordNoteNames[chordToneIdx % baseChordNoteNames.length];  
    let peakOctave = lastAscendingNotePart.octave; 
    if (pitchClassMap[peakNoteName] <= pitchClassMap[lastAscendingNotePart.name]) {
        peakOctave++;
    }
    noteParts.push({ name: peakNoteName, octave: peakOctave });

    for (let i = 0; i < NUM_DESCENDING; i++) {
        noteParts.push(noteParts[ (NUM_ASCENDING - 1) - (i + 1) ]);
    }

    for (let i = 0; i < TOTAL_NOTES_PER_PATTERN; i++) {
        const barOffset = Math.floor(i / 16);
        const beat = Math.floor((i % 16) / 4);
        const sixteenth = i % 4;
        
        let currentVelocity = baseVelocity;
        if (i < NUM_ASCENDING) { 
            currentVelocity = lerp(baseVelocity, baseVelocity + 0.2, i / (NUM_ASCENDING -1));
        } else if (i === NUM_ASCENDING) { 
            currentVelocity = baseVelocity + 0.25;
        } else { 
            let descentProgress = 0;
            if (NUM_DESCENDING > 1) {
                descentProgress = (i - (NUM_ASCENDING + NUM_PEAK)) / (NUM_DESCENDING - 1);
            } else if (NUM_DESCENDING === 1 && i === (NUM_ASCENDING + NUM_PEAK)) {
                descentProgress = 0;  
            }
            currentVelocity = lerp(baseVelocity + 0.15, baseVelocity, descentProgress);
        }
        
        generatedPattern.push({
            time: `${startTimeBar + barOffset}:${beat}:${sixteenth}`,
            note: `${noteParts[i].name}${noteParts[i].octave}`,
            duration: "16n",
            synth: synthInstance,
            velocity: constrain(currentVelocity, 0.3, 0.9)
        });
    }
    return generatedPattern;
}

// 패럴랙스 스크롤링 레이어를 그리는 헬퍼 함수
// img: 로드된 p5.Image 객체
// parallaxFactor: 패럴랙스 계수 (0.0 ~ 1.0, 0에 가까울수록 느리게 스크롤)
// yPos: 해당 레이어의 y축 시작 위치 (기본값 0)
// layerHeight: 해당 레이어 이미지의 높이 (기본값은 이미지 원래 높이). 이미지 비율을 유지하려면 img.height를 사용하세요.
// tintColorFunc: (optional) 현재 transitionProgress 등을 받아 tint를 적용하는 함수
function drawScrollingLayer(img, parallaxFactor, yPos = 0, layerHeight = -1, tintColorFunc = null) {
    if (!img || img.width === 0) { // 이미지가 로드되지 않았거나 너비가 0이면 그리지 않음
        // console.warn("drawScrollingLayer: Image not loaded or has zero width.", img); // 디버깅용
        return;
    }

    let effectiveLayerHeight = (layerHeight === -1) ? img.height : layerHeight;
    let scaledImgWidth = img.width; // 실제 이미지 너비 사용 (세로 크기만 조절하고 가로는 비율 유지 가정 시)
                                    // 만약 가로 크기도 layerHeight에 맞춰 비율 조절하려면 계산 필요: img.width * (effectiveLayerHeight / img.height)

    // 1. 레이어의 총 스크롤된 X 위치 계산
    let scrolledX = cameraX * parallaxFactor;

    // 2. 화면에 첫 번째 이미지를 그리기 시작할 X 좌표 계산 (이미지 반복을 위해)
    //    scrolledX를 이미지 너비로 나눈 나머지를 사용하여, 이미지가 계속 이어지도록 시작점을 잡습니다.
    //    음수 나머지를 처리하여 왼쪽으로 벗어난 부분부터 그릴 수 있도록 합니다.
    let startX = (-scrolledX % scaledImgWidth);
    // JavaScript의 % 연산자는 음수에 대해 음수 결과를 반환할 수 있습니다.
    // 예: -5 % 100 = -5.   -105 % 100 = -5.
    // 만약 startX가 양수가 되면 (scrolledX가 음수일 때), 왼쪽으로 한 칸 더 밀어주어야 할 수 있습니다.
    // (현재 게임에서는 cameraX가 0 이상이므로 scrolledX도 0 이상이라 이 경우는 드뭅니다.)
    // 그러나 가장 확실한 방법은 startX가 항상 0 또는 음수 값을 가지도록 조정하는 것입니다.
    if (startX > 0) {
        startX -= scaledImgWidth;
    }

    // 3. 틴트 적용 (필요한 경우)
    if (tintColorFunc) {
        tintColorFunc(); // 제공된 함수를 호출하여 tint 적용
    }

    // 4. 이미지를 반복해서 그려 화면을 채움
    //    startX부터 시작하여 이미지 너비만큼 간격을 두고 화면 너비(BASE_WIDTH)를 채울 때까지 반복합니다.
    for (let x = startX; x < BASE_WIDTH; x += scaledImgWidth) {
        image(img, x, yPos, scaledImgWidth, effectiveLayerHeight);
    }

    // 5. 틴트 해제 (다른 요소에 영향 없도록)
    if (tintColorFunc) {
        noTint();
    }
}

// 밤/낮 전환에 따른 틴트 적용을 위한 수정된 헬퍼 함수
function applyNightTintForLayer(currentTransitionProgress) {
    // 밤일 때 적용될 기본 틴트 색상 (예: 어두운 푸른색)
    let nightTintColorR = 30;
    let nightTintColorG = 30;
    let nightTintColorB = 80;
    // 완전한 밤일 때 틴트의 최대 투명도 (0~255 사이 값, 높을수록 진함)
    let maxNightTintAlpha = 170; // 이 값을 조절하여 밤의 어두운 정도를 조절할 수 있습니다.

    // currentTransitionProgress 값에 따라 현재 적용될 틴트의 투명도를 계산합니다.
    // currentTransitionProgress가 1 (완전한 낮)이면 currentTintAlpha는 0 (틴트 없음)
    // currentTransitionProgress가 0 (완전한 밤)이면 currentTintAlpha는 maxNightTintAlpha (최대 틴트)
    // 그 사이 값에서는 부드럽게 보간됩니다.
    let currentTintAlpha = map(currentTransitionProgress, 0, 1, maxNightTintAlpha, 0);

    // 계산된 투명도 값이 유효한 범위 내에 있도록 보정합니다.
    currentTintAlpha = constrain(currentTintAlpha, 0, maxNightTintAlpha);

    if (currentTintAlpha > 0) {
        // 계산된 색상과 투명도로 틴트를 적용합니다.
        tint(nightTintColorR, nightTintColorG, nightTintColorB, currentTintAlpha);
    } else {
        // 투명도가 0이면 틴트를 적용하지 않습니다 (낮 상태).
        noTint();
    }
}

function loadQuestions() {
    let allAvailableQuestions = [];

    // 1. 모든 문제 세트의 문제를 하나의 배열로 합칩니다.
    // 각 문제 객체에 해당 문제의 키워드를 추가하여 나중에 필터링할 수 있도록 합니다.
    allQuestionSets.forEach(set => {
        set.questions.forEach(q => {
            allAvailableQuestions.push({ ...q, keyword: set.keyword });
        });
    });

    let filteredQuestions = [];

    // 2. 키워드가 지정된 경우, 해당 키워드의 문제만 필터링합니다.
    if (SELECTED_QUIZ_KEYWORD && SELECTED_QUIZ_KEYWORD.trim() !== "") {
        filteredQuestions = allAvailableQuestions.filter(q => q.keyword === SELECTED_QUIZ_KEYWORD);
        if (filteredQuestions.length === 0) {
            console.warn(`Warning: No questions found for keyword: "${SELECTED_QUIZ_KEYWORD}". Loading all questions instead.`);
            filteredQuestions = allAvailableQuestions; // 필터링 결과가 없으면 모든 문제 사용
        } else {
            console.log(`Filtering questions by keyword: "${SELECTED_QUIZ_KEYWORD}". Found ${filteredQuestions.length} questions.`);
        }
    } else {
        // 키워드가 지정되지 않았거나 빈 문자열인 경우, 모든 사용 가능한 문제를 사용합니다.
        filteredQuestions = allAvailableQuestions;
        console.log(`No specific keyword. Using all ${filteredQuestions.length} available questions.`);
    }

    if (filteredQuestions.length === 0) {
        console.error("Error: No questions available after filtering. Please check questionsData.js or keyword settings.");
        questions = [];
        return;
    }

    // 3. 문제들을 무작위로 섞습니다.
    shuffleArray(filteredQuestions);

    // 4. 원하는 개수만큼의 문제를 선택합니다.
    // 실제 문제 개수가 요청된 개수보다 적을 경우, 있는 문제만 가져옵니다.
    questions = filteredQuestions.slice(0, Math.min(NUMBER_OF_QUIZZES_TO_LOAD, filteredQuestions.length));

    console.log(`Final set loaded: ${questions.length} questions.`);
    // console.log("Selected Questions:", questions); // 디버깅 시 필요하면 주석 해제
}

// New function for Producer Screen (제작자 화면을 그리는 새로운 함수) - ⭐ 수정된 부분
function drawProducerScreen() {
    // 배경 그리기
    if (startScreenBackgroundImage) {
        image(startScreenBackgroundImage, 0, 0, BASE_WIDTH, BASE_HEIGHT);
    } else {
        background(0); // 대체 배경
    }

    // 타이머 및 상태 업데이트
    producerFadeTimer++;

    if (producerFadeState === "FADING_IN") {
        producerFadeProgress = map(producerFadeTimer, 0, PRODUCER_FADE_IN_DURATION, 0, 1);
        if (producerFadeTimer >= PRODUCER_FADE_IN_DURATION) {
            producerFadeState = "HOLDING";
            producerFadeTimer = 0;
            producerFadeProgress = 1;
        }
    } else if (producerFadeState === "HOLDING") {
        if (producerFadeTimer >= PRODUCER_HOLD_DURATION) {
            producerFadeState = "FADING_OUT";
            producerFadeTimer = 0;
        }
    } else if (producerFadeState === "FADING_OUT") {
        producerFadeProgress = map(producerFadeTimer, 0, PRODUCER_FADE_OUT_DURATION, 1, 0);
        if (producerFadeTimer >= PRODUCER_FADE_OUT_DURATION) {
            // ⭐ 다음 크레딧 화면으로 넘어가거나 오프닝으로 전환하는 로직
            if (currentCreditIndex < CREDITS_SCREENS.length - 1) {
                // 다음 크레딧 화면으로
                currentCreditIndex++;
                producerFadeState = "FADING_IN";
                producerFadeTimer = 0;
                producerFadeProgress = 0;
            } else {
                // 모든 크레딧이 끝났으므로 오프닝 시퀀스로 전환
                openingTextScrollY = BASE_HEIGHT + 50;
                openingTextFadeProgress = 0;
                openingSequenceTimer = 0;
                gameState = "OPENING_SEQUENCE";
            }
            return; // 상태 전환 후 즉시 종료
        }
    }

    producerFadeProgress = constrain(producerFadeProgress, 0, 1);
    let currentAlpha = producerFadeProgress * 255;

    // ⭐ 현재 인덱스의 크레딧 정보 가져오기
    let currentCredit = CREDITS_SCREENS[currentCreditIndex];

    // 텍스트 그리기
    textAlign(CENTER, CENTER);
    textStyle(BOLD);

    // 부제목 그리기 (예: "Directed by")
    if (currentCredit.sub && currentCredit.sub !== "") {
        textSize(30);
        fill(255, 255, 255, currentAlpha * 0.8);
        text(currentCredit.sub, BASE_WIDTH / 2, BASE_HEIGHT / 2 - 35);
    }

    // 메인 텍스트 그리기 (예: "Jang")
    textSize(60);
    fill(255, 255, 255, currentAlpha);
    text(currentCredit.main, BASE_WIDTH / 2, BASE_HEIGHT / 2 + (currentCredit.sub && currentCredit.sub !== "" ? 25 : 0));

    textStyle(NORMAL); // 스타일 초기화
}

// 게임 화면 크기를 조절하는 함수
function resizeGame() {
    const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
    
    // ⬇️ --- 게임의 최대 너비를 960px로 설정 ---
    const maxGameWidth = 960;
    // ⬆️ --- 이 값을 조절하여 원하는 최대 크기를 정할 수 있습니다. ---

    // 1. 브라우저 창 크기를 기반으로 이상적인 너비와 높이를 계산합니다.
    let newWidth = window.innerWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > window.innerHeight) {
        newHeight = window.innerHeight;
        newWidth = newHeight * aspectRatio;
    }

    // 2. ⬇️ --- 만약 계산된 너비가 우리가 정한 최대 너비보다 크다면, 최대 너비로 고정합니다. ---
    if (newWidth > maxGameWidth) {
        newWidth = maxGameWidth;
        newHeight = newWidth / aspectRatio;
    }
    // ⬆️ --- 이 부분이 핵심입니다! ---

    // 3. 최종 계산된 크기로 캔버스와 스케일 비율을 설정합니다.
    resizeCanvas(newWidth, newHeight);
    scaleFactor = newWidth / BASE_WIDTH;
}

// 브라우저 창 크기가 변경될 때마다 호출되는 p5.js 내장 함수
function windowResized() {
    resizeGame();
}

// --- ⬇️ 이 함수 전체를 교체하세요! ---

function updateGame() {
    // player 객체가 생성되기 전에는 아무것도 하지 않도록 안전장치를 추가합니다.
    if (!player) return;

    // 1. 카메라 위치 업데이트 (가장 중요!)
    // 플레이어가 화면의 특정 지점(여기서는 120px)에 오면 카메라가 따라가도록 설정합니다.
    let targetCameraX = player.pos.x - 120;
    // 카메라는 앞으로만 가도록 설정 (뒤로 가지 않음)
    if (targetCameraX > cameraX) {
        cameraX = targetCameraX;
    }

    // 2. 게임 상태에 따른 업데이트 로직 분기
    // 퀴즈나 결과 화면이 아닐 때만 플레이어의 움직임, 새의 움직임 등을 업데이트합니다.
    if (!(gameState === "QUIZ_ASKING" || gameState === "QUIZ_RESULT")) {
        bird.update();
        player.handleInput();
        player.update();
        player.updateShield();
    } else {
        // 퀴즈 중에는 플레이어가 좌우로 움직이지 않도록 속도를 0으로 고정합니다.
        player.vel.x = 0;
    }

    // 3. 현재 게임 상태에 맞는 핸들러 함수를 호출합니다.
    if (gameState === "PLAYING") {
        handlePlayingState();
    } else if (gameState === "QUIZ_ASKING") {
        handleQuizAskingState();
    } else if (gameState === "QUIZ_RESULT") {
        handleQuizResultState();
    } else if (gameState === "GAME_OVER" || gameState === "GAME_CLEAR") {
        handleEndGameState();
    }

    // 4. 피버 모드 타이머를 업데이트합니다.
    if (feverModeActive) {
        feverTimer--;
        if (feverTimer <= 0) {
            deactivateFeverMode();
        }
    }
}
