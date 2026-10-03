// --- 音效引擎 ---
const sfx = {
  correct: new Audio('correct.mp3'),
  wrong: new Audio('wrong.mp3'),
  swoosh: new Audio('swoosh.mp3'),
  click: new Audio('click.mp3')
};
Object.values(sfx).forEach(a => { a.volume = 0.5; a.load(); });
function playSound(name) {
  try { sfx[name].currentTime = 0; sfx[name].play().catch(e => {}); } catch(e) {}
}

const svgs = {
  strip: `<svg width="60" height="200" viewBox="0 0 40 150" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="-10" width="20" height="150" rx="3" fill="#F8F9FA" stroke="#D1D5DB" stroke-width="2"/><rect id="dynamic-color" x="12" y="110" width="16" height="30" rx="2" fill="gold" style="transition: fill 0.5s;" /></svg>`,
  tube: `<svg width="80" height="200" viewBox="0 0 60 160" xmlns="http://www.w3.org/2000/svg"><path id="dynamic-color" d="M 17 95 L 17 135 A 13 13 0 0 0 43 135 L 43 95 Z" fill="royalblue" style="transition: fill 0.5s;"/><path d="M 15 10 L 15 135 A 15 15 0 0 0 45 135 L 45 10" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-linecap="round"/><ellipse cx="30" cy="10" rx="18" ry="4" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="3"/><path d="M 20 20 L 20 120" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>`,
  paper: `<svg width="150" height="150" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="55" fill="#FDFDFD" stroke="#D1D5DB" stroke-width="2"/><circle id="dynamic-color" cx="60" cy="60" r="20" fill="#EAB308" opacity="0.4" filter="blur(3px)"/></svg>`
};

const questions = [
  { substance: 'glucose', has: true, reagent: '尿糖試紙', tool: 'strip', color: '#32CD32' },
  { substance: 'glucose', has: false, reagent: '尿糖試紙', tool: 'strip', color: 'gold' },
  { substance: 'protein', has: true, reagent: '尿蛋白試紙', tool: 'strip', color: '#32CD32' },
  { substance: 'protein', has: false, reagent: '尿蛋白試紙', tool: 'strip', color: 'gold' },
  { substance: 'starch', has: true, reagent: '碘液', tool: 'tube', color: '#191970' },
  { substance: 'starch', has: false, reagent: '碘液', tool: 'tube', color: '#8B4513' },
  { substance: 'vitc', has: true, reagent: 'DCPIP 溶液', tool: 'tube', color: 'rgba(255,255,255,0.1)' },
  { substance: 'vitc', has: false, reagent: 'DCPIP 溶液', tool: 'tube', color: 'royalblue' },
  { substance: 'lipid', has: true, reagent: '濾紙', tool: 'paper', fadeOut: false },
  { substance: 'lipid', has: false, reagent: '濾紙', tool: 'paper', fadeOut: true }
];

let userAnswers = { glucose: 0, starch: 0, lipid: 0, protein: 0, vitc: 0 };
let expectedAnswers = { glucose: 0, starch: 0, lipid: 0, protein: 0, vitc: 0 };
const substanceNames = { glucose: '葡萄糖', starch: '澱粉', lipid: '脂質', protein: '蛋白質', vitc: '維生素C' };

let score = 0;
let hp = 3;
let combo = 0;
let currentDifficultyLevel = 1; // 記錄目前最高難度
let timeLimit = 10.0; 
let timerInterval = null;
let isAnimating = false;

const container = document.getElementById('test-item-container');
const svgContainer = document.getElementById('svg-container');
const reagentLabel = document.getElementById('reagent-label');
const scoreDisplay = document.getElementById('score');
const comboDisplay = document.getElementById('combo-display');
const comboText = document.getElementById('combo');
const hpDisplay = document.getElementById('hp-display');
const timerDisplay = document.getElementById('timer');
const feedback = document.getElementById('feedback');
const controls = document.getElementById('game-controls');
const overlayScreen = document.getElementById('overlay-screen');
const gameBody = document.getElementById('game-body');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function updateHP() { hpDisplay.innerText = '❤️'.repeat(hp) + '🖤'.repeat(3 - hp); }

function startGame() {
  playSound('click');
  score = 0;
  hp = 3;
  combo = 0;
  currentDifficultyLevel = 1;
  updateScoreUI();
  updateHP();
  document.getElementById('final-score').classList.add('hidden');
  overlayScreen.classList.add('hidden');
  nextQuestion();
}

function updateScoreUI() {
  scoreDisplay.innerText = score;
  if (combo >= 2) {
    comboDisplay.classList.remove('hidden');
    comboText.innerText = combo;
  } else {
    comboDisplay.classList.add('hidden');
  }
}

function resetButtons() {
  for (let key in userAnswers) {
    userAnswers[key] = 0;
    updateButtonUI(key);
  }
}

function toggleAnswer(substance) {
  if (isAnimating) return;
  playSound('click');
  if (userAnswers[substance] === 0) userAnswers[substance] = 1;
  else if (userAnswers[substance] === 1) userAnswers[substance] = -1;
  else userAnswers[substance] = 0;
  updateButtonUI(substance);
}

function updateButtonUI(substance) {
  const btn = document.getElementById(`btn-${substance}`);
  const state = userAnswers[substance];
  const name = substanceNames[substance];
  
  btn.className = `btn-substance ${substance === 'vitc' ? 'col-span-2' : ''}`;
  if (state === 0) {
    btn.innerHTML = name;
  } else if (state === 1) {
    btn.classList.add('btn-state-on');
    btn.innerHTML = `${name} ✔️`;
  } else if (state === -1) {
    btn.classList.add('btn-state-off');
    btn.innerHTML = `${name} ❌`;
  }
}

function generateSequence() {
  let level = 1;
  // 分數階梯：進階難度給予高分玩家挑戰
  if (score >= 350) level = 5; // 5 個物品
  else if (score >= 200) level = 4; // 4 個物品
  else if (score >= 100) level = 3; // 3 個物品
  else if (score >= 40) level = 2;  // 2 個物品
  
  let availableSubs = Object.keys(substanceNames);
  availableSubs.sort(() => Math.random() - 0.5); 
  let selectedSubs = availableSubs.slice(0, level); 
  
  let sequence = [];
  expectedAnswers = { glucose: 0, starch: 0, lipid: 0, protein: 0, vitc: 0 };
  
  selectedSubs.forEach(sub => {
    let hasSub = Math.random() > 0.5; 
    let q = questions.find(item => item.substance === sub && item.has === hasSub);
    sequence.push(q);
    expectedAnswers[sub] = hasSub ? 1 : -1; 
  });
  
  return { sequence, level };
}

async function nextQuestion() {
  isAnimating = true;
  timerDisplay.innerText = '--';
  timerDisplay.classList.remove('text-red-500', 'animate-pulse');
  resetButtons();
  controls.classList.add('pointer-events-none', 'opacity-50');
  
  const { sequence, level } = generateSequence();

  // 動態難度提升提示
  if (level > currentDifficultyLevel) {
    currentDifficultyLevel = level;
    showFeedback(`難度提升 (Level ${level})🔥`, 'text-amber-500 drop-shadow-md');
    playSound('correct');
    await wait(1500);
  }

  // 作答時間：基礎10秒，每多一個物品加2秒
  timeLimit = 10.0 + (level - 1) * 2.0; 

  for (let i = 0; i < sequence.length; i++) {
    let q = sequence[i];
    
    reagentLabel.innerText = q.reagent;
    reagentLabel.className = "bg-white/90 border-2 border-slate-200 text-slate-700 px-6 py-2 rounded-full font-bold mb-4 shadow-lg transition-all duration-300";
    svgContainer.innerHTML = svgs[q.tool];
    
    const dynamicElement = document.getElementById('dynamic-color');
    if (q.tool !== 'paper') dynamicElement.setAttribute('fill', q.color);

    playSound('swoosh');
    container.classList.add('show');

    if (q.tool === 'paper') {
      await wait(1500); 
      reagentLabel.innerText = '濾紙 (靜置20分鐘)';
      reagentLabel.classList.add('bg-amber-100', 'border-amber-300'); 
      if (q.fadeOut) dynamicElement.classList.add('fade-out-spot');
      await wait(2500); 
    } else {
      await wait(2500); 
    }

    container.classList.remove('show');
    await wait(800); 
  }

  isAnimating = false;
  controls.classList.remove('pointer-events-none', 'opacity-50');
  startTimer();
}

function startTimer() {
  let timeLeft = timeLimit;
  timerDisplay.innerText = timeLeft.toFixed(1);
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft -= 0.1;
    timerDisplay.innerText = Math.max(0, timeLeft).toFixed(1);
    
    if (timeLeft <= 3.0 && timeLeft > 0) {
      timerDisplay.classList.add('text-red-500', 'animate-pulse');
    }
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitAnswer(); 
    }
  }, 100);
}

function submitAnswer() {
  if (isAnimating) return;
  playSound('click');
  isAnimating = true;
  clearInterval(timerInterval);
  controls.classList.add('pointer-events-none', 'opacity-50');

  let isCorrect = true;
  for (let key in userAnswers) {
    if (userAnswers[key] !== expectedAnswers[key]) {
      isCorrect = false;
      break;
    }
  }

  if (isCorrect) {
    combo++;
    // 分數計算：每答對一題得10分，Combo加成隨難度與連擊次數提升
    const pointsGained = 10 + (combo > 1 ? (combo - 1) * 5 : 0);
    score += pointsGained;
    
    playSound('correct');
    createParticles(window.innerWidth / 2, window.innerHeight / 2);
    showFloatingText(`+${pointsGained}`, window.innerWidth / 2, window.innerHeight / 2 - 50);
    
    updateScoreUI();
    showFeedback('PERFECT! ✅', 'text-green-500 drop-shadow-md');
    setTimeout(nextQuestion, 1500);
  } else {
    combo = 0;
    updateScoreUI();
    handleWrongAnswer('ERROR! ❌');
  }
}

function handleWrongAnswer(msg) {
  isAnimating = true;
  clearInterval(timerInterval);
  controls.classList.add('pointer-events-none', 'opacity-50');
  
  playSound('wrong');
  gameBody.classList.add('shake-screen'); 
  setTimeout(() => gameBody.classList.remove('shake-screen'), 400);

  showFeedback(msg, 'text-red-500 drop-shadow-md');
  hp -= 1;
  updateHP();
  
  if (hp <= 0) setTimeout(gameOver, 1500);
  else setTimeout(nextQuestion, 1500); 
}

function gameOver() {
  document.getElementById('screen-title').innerText = '測試結束';
  const finalScoreEl = document.getElementById('final-score');
  finalScoreEl.querySelector('span').innerText = score;
  finalScoreEl.classList.remove('hidden');
  overlayScreen.classList.remove('hidden');
}

function showFeedback(text, colorClass) {
  feedback.innerText = text;
  feedback.className = `absolute top-1/3 text-4xl sm:text-5xl font-black z-20 pointer-events-none transition-opacity duration-200 ${colorClass}`;
  feedback.style.opacity = 1;
  setTimeout(() => { feedback.style.opacity = 0; }, 1000);
}

// --- 粒子特效 ---
function createParticles(x, y) {
  const colors = ['#34d399', '#fcd34d', '#38bdf8', '#fbbf24'];
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = Math.random() * 10 + 5 + 'px';
    particle.style.height = particle.style.width;
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 100 + 50;
    particle.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
    particle.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
    
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 800);
  }
}

function showFloatingText(text, x, y) {
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.innerText = text;
  el.style.left = (x - 20) + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
