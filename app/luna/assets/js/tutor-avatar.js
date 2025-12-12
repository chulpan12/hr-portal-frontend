/**
 * LUNA Particle Avatar System
 * p5.js Instance Mode
 * 최적화된 파티클 모핑 시스템 (이미지 -> 원 -> 파동)
 */

const s = (p) => {
  let particles = [];
  let targets = []; // 현재 목표 위치들
  let defaultTargets = []; // 루나 실루엣 타겟
  let circleTargets = []; // 생각중(원형) 타겟
  
  let currentState = 'IDLE'; // IDLE, THINKING, SPEAKING
  let img;
  let canvas;
  
  // 파티클 설정
  const PARTICLE_COUNT = 900; // 성능과 퀄리티 타협점 (800~1000 권장)
  const PARTICLE_SIZE = 2;
  const MOVEMENT_SPEED = 0.08; // 0.0 ~ 1.0 (클수록 빠름)
  const COLOR_CYAN = [0, 255, 255];
  const COLOR_PURPLE = [167, 139, 250];

  p.preload = () => {
    // 실루엣을 딸 이미지를 로드합니다. (배경이 투명한 PNG여야 함)
    // 기존 이미지를 활용하거나, 실루엣 전용 이미지를 넣으시면 더 좋습니다.
    img = p.loadImage('./assets/images/tutor/luna_default.png'); 
  };

  p.setup = () => {
    // 사이드바 컨테이너 크기에 맞춤
    const container = document.getElementById('ai-avatar-wrapper');
    const w = container.clientWidth || 250;
    const h = container.clientHeight || 250;
    
    canvas = p.createCanvas(w, h);
    p.pixelDensity(1); // 고해상도 디스플레이 성능 저하 방지
    p.frameRate(30);   // 30프레임 고정 (배터리 절약)
    
    // 1. 이미지 분석하여 실루엣 좌표 추출
    processImageTargets(w, h);
    
    // 2. 원형 좌표 생성 (생각중 모드)
    generateCircleTargets(w, h);
    
    // 3. 파티클 초기화
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle(p.random(w), p.random(h)));
    }
    
    // 초기 타겟 설정
    targets = defaultTargets;
  };

  p.draw = () => {
    p.clear(); // 투명 배경 유지
    p.blendMode(p.ADD); // 빛나는 효과

    // 말하기 모드일 때의 진동 값
    let vibration = 0;
    if (currentState === 'SPEAKING') {
      // 오디오 분석기가 있다면 좋겠지만, 여기선 사인파로 시뮬레이션
      vibration = p.sin(p.frameCount * 0.5) * 2.5; 
    }

    // 마우스 상호작용 (살짝 피하기)
    let mouse = p.createVector(p.mouseX, p.mouseY);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let pt = particles[i];
      // 타겟이 파티클 수보다 적을 경우 순환해서 할당
      let target = targets[i % targets.length] || {x: p.width/2, y: p.height/2};
      
      // 말할 때는 타겟 자체가 미세하게 떨림 + 파동
      let tx = target.x;
      let ty = target.y;
      
      if (currentState === 'SPEAKING') {
        tx += p.random(-1, 1) + vibration;
        ty += p.random(-1, 1);
      } else if (currentState === 'THINKING') {
        // 생각 중일 때는 천천히 회전
        const angle = p.frameCount * 0.02;
        const cx = p.width / 2;
        const cy = p.height / 2;
        const x = target.x - cx;
        const y = target.y - cy;
        tx = cx + x * p.cos(angle) - y * p.sin(angle);
        ty = cy + x * p.sin(angle) + y * p.cos(angle);
      }

      // 이동 로직 (Lerp)
      pt.acc.x += (tx - pt.pos.x) * MOVEMENT_SPEED * 0.1;
      pt.acc.y += (ty - pt.pos.y) * MOVEMENT_SPEED * 0.1;
      
      // 마우스 회피
      let d = p.dist(p.mouseX, p.mouseY, pt.pos.x, pt.pos.y);
      if (d < 50) {
        let repulse = p.createVector(pt.pos.x - p.mouseX, pt.pos.y - p.mouseY);
        repulse.normalize();
        repulse.mult(2);
        pt.acc.add(repulse);
      }

      pt.update();
      
      // 색상 결정
      let r, g, b;
      if (currentState === 'THINKING') {
        // 생각 중일 땐 보라색/황금색 톤
        r = 167; g = 139; b = 250;
      } else if (currentState === 'SPEAKING') {
        // 말할 땐 밝은 시안색
        r = 100; g = 255; b = 255; 
      } else {
        // 평소엔 딥한 시안
        r = 0; g = 200; b = 255;
      }
      
      // 그리기
      p.noStroke();
      // 알파값을 낮게 주어 잔상 효과 느낌
      p.fill(r, g, b, 180); 
      p.circle(pt.pos.x, pt.pos.y, PARTICLE_SIZE);
    }
  };
  
  // 창 크기 조절 대응
  p.windowResized = () => {
    const container = document.getElementById('ai-avatar-wrapper');
    if(container) {
        p.resizeCanvas(container.clientWidth, container.clientHeight);
        // 타겟 재계산
        processImageTargets(container.clientWidth, container.clientHeight);
        generateCircleTargets(container.clientWidth, container.clientHeight);
        // 상태에 따라 현재 타겟 업데이트
        setTargetByState(currentState);
    }
  };

  // --- Helper Functions ---

  function processImageTargets(w, h) {
    defaultTargets = [];
    if (!img) return;
    
    img.resize(w * 0.8, 0); // 캔버스 크기에 맞춰 리사이즈
    img.loadPixels();
    
    // 이미지 픽셀을 스캔하여 알파값이 높은(불투명한) 부분만 타겟으로 추출
    // 너무 많으면 성능 저하되므로 step을 두어 건너뜀
    const step = 6; 
    const offsetX = (w - img.width) / 2;
    const offsetY = (h - img.height) / 2;

    for (let y = 0; y < img.height; y += step) {
      for (let x = 0; x < img.width; x += step) {
        const index = (y * img.width + x) * 4;
        const alpha = img.pixels[index + 3];
        if (alpha > 128) { // 보이는 픽셀만
          defaultTargets.push({ x: x + offsetX, y: y + offsetY });
        }
      }
    }
    
    // 파티클 수보다 타겟이 적으면 랜덤으로 채움
    if (defaultTargets.length === 0) {
        // 이미지 로드 실패 시 기본 사각형
        for(let i=0; i<PARTICLE_COUNT; i++) {
             defaultTargets.push({x: p.random(w/4, w*0.75), y: p.random(h/4, h*0.75)});
        }
    }
  }

  function generateCircleTargets(w, h) {
    circleTargets = [];
    const radius = Math.min(w, h) * 0.3;
    const cx = w / 2;
    const cy = h / 2;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = p.map(i, 0, PARTICLE_COUNT, 0, p.TWO_PI * 3); // 3바퀴 나선형
      const r = radius + p.random(-10, 10);
      circleTargets.push({
        x: cx + r * p.cos(angle),
        y: cy + r * p.sin(angle)
      });
    }
  }

  class Particle {
    constructor(x, y) {
      this.pos = p.createVector(x, y);
      this.vel = p.createVector(0, 0);
      this.acc = p.createVector(0, 0);
      this.friction = 0.85; // 마찰력 (감속)
    }

    update() {
      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.vel.mult(this.friction);
      this.acc.mult(0);
    }
  }

  // 외부에서 상태 변경 호출용 함수
  p.setAvatarState = (newState) => {
    if (currentState === newState) return;
    currentState = newState;
    setTargetByState(newState);
  };
  
  function setTargetByState(state) {
      if (state === 'THINKING') {
          targets = circleTargets;
      } else {
          // IDLE, SPEAKING, HAPPY 등은 기본 실루엣 유지하되 움직임만 다름
          targets = defaultTargets;
      }
  }
};

// 전역 인스턴스 생성 (DOM 로드 후 실행)
let myP5 = null;
setTimeout(() => {
    const container = document.getElementById('ai-avatar-wrapper');
    if (container) {
        myP5 = new p5(s, container);
        // 전역 함수로 노출하여 다른 JS에서 제어 가능하게 함
        window.updateAvatarState = (state) => {
            if(myP5 && myP5.setAvatarState) myP5.setAvatarState(state);
        };
    }
}, 500);