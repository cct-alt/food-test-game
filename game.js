// ================= Firebase 資料庫設定 =================
const firebaseConfig = {  
  apiKey: "AIzaSyBx_GLc9kjPpq0Z62ANuqhIBKPnR-B6-lk",  
  authDomain: "foodtestgame.firebaseapp.com",  
  projectId: "foodtestgame",  
  storageBucket: "foodtestgame.firebasestorage.app",  
  messagingSenderId: "25433458086",  
  appId: "1:25433458086:web:e4337550c29053aa707b67"  
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= 終極穩定音效系統 (專治 iPad Safari) =================
const sfx = {
  correct: new Audio('correct.mp3'),
  wrong: new Audio('wrong.mp3'),
  swoosh: new Audio('swoosh.mp3'),
  click: new Audio('click.mp3')
};

let isAudioUnlocked = false;

// 核心解法：利用學生的「第一次點擊螢幕」來強制喚醒所有音效
function unlockAudio() {
  if (isAudioUnlocked) return;
  for (let key in sfx) {
    sfx[key].volume = 0; // 先設為完全靜音
    let playPromise = sfx[key].play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        sfx[key].pause();
        sfx[key].currentTime = 0;
        sfx[key].volume = 0.5; // 恢復正常音量
      }).catch(() => {});
    }
  }
  isAudioUnlocked = true;
  document.removeEventListener('touchstart', unlockAudio);
  document.removeEventListener('mousedown', unlockAudio);
}

document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('mousedown', unlockAudio, { once: true });

function playSound(name) {
  if (!sfx[name]) return;
  const soundClone = sfx[name].cloneNode();
  soundClone.volume = 0.5;
  soundClone.play().catch(e => {
    console.log("等待玩家第一次點擊解鎖音效...");
  });
}

// ================= SVG 素材庫 =================
const svgs = {
  strip: `<svg width="60" height="200" viewBox="0 0 40 150" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="-10" width="20" height="150" rx="3" fill="#F8F9FA" stroke="#D1D5DB" stroke-width="2"/><rect id="dynamic-color" x="12" y="110" width="16" height="30" rx="2" fill="gold" style="transition: fill 0.5s;" /></svg>`,
  tube: `<svg width="80" height="200" viewBox="0 0 60 160" xmlns="http://www.w3.org/2000/svg"><path id="dynamic-color" d="M 17 95 L 17 135 A 13 13 0 0 0 43 135 L 43 95 Z" fill="royalblue" style="transition: fill 0.5s;" stroke="rgba(255,255,255,0.5)" stroke-width="1"/><path d="M 15 10 L 15 135 A 15 15 0 0 0 45 135 L 45 10" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="4" stroke-linecap="round"/><ellipse cx="30" cy="10" rx="18" ry="4" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="3"/><path d="M 20 20 L 20 120" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>`,
  paper: `<svg width="150" height="150" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"><circle cx="60" cy="60" r="55" fill="#FDFDFD" stroke="#D1D5DB" stroke-width="2"/><circle id="dynamic-color" cx="60" cy="60" r="20" fill="#EAB308" opacity="0.4" filter="blur(3px)"/></svg>`
};

const questions = [
  { substance: 'glucose', has: true, reagent: '尿糖試紙', tool: 'strip', color: '#32CD32' },
  { substance: 'glucose', has: false, reagent: '尿糖試紙', tool: 'strip', color: 'gold' },
  { substance: 'protein', has: true, reagent: '尿蛋白試紙', tool: 'strip', color: '#32CD32' },
  { substance: 'protein', has: false, reagent: '尿蛋白試紙', tool: 'strip', color: 'gold' },
  { substance: 'starch', has: true, reagent: '碘液', tool: 'tube', color: '#191970' },
  { substance: 'starch', has: false, reagent: '碘液', tool: 'tube', color: '#8B4513' },
  { substance: 'vitc', has: true, reagent: 'DCPIP 溶液', tool: 'tube', color: 'rgba(226, 232, 240, 0.8)' },
  { substance: 'vitc', has: false, reagent: 'DCPIP 溶液', tool: 'tube', color: 'royalblue' },
  { substance: 'lipid', has: true, reagent: '濾紙', tool: 'paper', fadeOut: false },
  { substance: 'lipid', has: false, reagent: '濾紙', tool: 'paper', fadeOut: true }
];

// ================= 玩家與遊戲狀態 =================
let playerClass = '';
let playerNum = '';
let playerId = '';

let userAnswers = { glucose: 0, starch: 0, lipid: 0, protein: 0, vitc: 0 };
let expectedAnswers = { glucose: 0, starch: 0, lipid: 0, protein: 0, vitc: 0 };
const substanceNames = { glucose: '葡萄糖', starch: '澱粉', lipid: '脂質', protein: '蛋白質', vitc: '維生素C' };

let score = 0; let hp = 3; let combo = 0; let currentDifficultyLevel = 1;
let timeLimit = 10.0; let timerInterval = null; let isAnimating = false;

// ================= DOM 元素綁定 =================
const mainMenu = document.getElementById('main-menu');
const setupScreen = document.getElementById('setup-screen');
const notesScreen = document.getElementById('notes-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const tutorialScreen = document.getElementById('tutorial-screen'); // 教學面板

const classSelect = document.getElementById('class-select');
const numSelect = document.getElementById('num-select');
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
const gameBody = document.getElementById('game-body');

// ================= UI 導航邏輯 =================
['3A', '3B', '3C', '3D'].forEach(c => classSelect.innerHTML += `<option value="${c}">${c}</option>`);
for(let i=1; i<=40; i++) numSelect.innerHTML += `<option value="${i}">${i}</option>`;

function showSetup() { playSound('click'); mainMenu.classList.add('hidden'); setupScreen.classList.remove('hidden'); }
function hideSetup() { playSound('click'); setupScreen.classList.add('hidden'); mainMenu.classList.remove('hidden'); }

// 教學面板控制
function showTutorial() { playSound('click'); mainMenu.classList.add('hidden'); tutorialScreen.classList.remove('hidden'); }
function hideTutorial() { playSound('click'); tutorialScreen.classList.add('hidden'); mainMenu.classList.remove('hidden'); }

function showNotes() { playSound('click'); mainMenu.classList.add('hidden'); notesScreen.classList.remove('hidden'); }
function hideNotes() { playSound('click'); notesScreen.classList.add('hidden'); mainMenu.classList.remove('hidden'); }
function showLeaderboard() { playSound('click'); mainMenu.classList.add('hidden'); leaderboardScreen.classList.remove('hidden'); loadLeaderboard(); }
function hideLeaderboard() { playSound('click'); leaderboardScreen.classList.add('hidden'); mainMenu.classList.remove('hidden'); }
function backToMenu() { playSound('click'); gameOverScreen.classList.add('hidden'); mainMenu.classList.remove('hidden'); }

function confirmSetupAndStart() {
  playSound('click');
  playerClass = classSelect.value;
  playerNum = numSelect.value;
  playerId = `${playerClass}_${playerNum}`;
  setupScreen.classList.add('hidden');
  startGame();
}

// ================= Firebase 資料庫邏輯 =================
function saveScoreToDatabase() {
  if (!playerId) return;
  
  // 1. 排行榜 (只保留最高分)
  const leaderboardRef = db.collection("leaderboard").doc(playerId);
  leaderboardRef.get().then((doc) => {
    if (!doc.exists || doc.data().score < score) {
      leaderboardRef.set({
        class: playerClass,
        number: parseInt(playerNum),
        score: score,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }).catch(e => console.log("DB Error:", e));

  // 2. 歷史紀錄 (記錄每次遊玩)
  db.collection("play_history").add({
    class: playerClass,
    number: parseInt(playerNum),
    score: score,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(e => console.log("History DB Error:", e));
}

function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-body');
  const loading = document.getElementById('loading-leaderboard');
  tbody.innerHTML = '';
  loading.classList.remove('hidden');

  db.collection("leaderboard").orderBy("score", "desc").limit(20).get()
    .then((querySnapshot) => {
      loading.classList.add('hidden');
      let rank = 1;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let rowColor = rank <= 3 ? 'text-amber-600 font-bold bg-amber-50' : 'text-slate-600';
        let medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        tbody.innerHTML += `<tr class="border-b border-slate-100 ${rowColor}"><td class="py-3">${medal}</td><td class="py-3">${data.class}</td><td class="py-3">${data.number}</td><td class="py-3">${data.score}</td></tr>`;
        rank++;
      });
      if (tbody.innerHTML === '') tbody.innerHTML = '<tr><td colspan="4" class="py-6 text-slate-400">目前還沒有紀錄，快來挑戰首殺！</td></tr>';
    }).catch((error) => {
      loading.innerText = "讀取失敗，請檢查網絡連線";
    });
}

// ================= 遊戲核心邏輯 =================
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function updateHP() { hpDisplay.innerText = '❤️'.repeat(hp) + '🖤'.repeat(3 - hp); }

function startGame() {
  playSound('click');
  score = 0; hp = 3; combo = 0; currentDifficultyLevel = 1;
  scoreDisplay.innerText = score;
  updateScoreUI(); updateHP();
  gameOverScreen.classList.add('hidden');
  nextQuestion();
}

function updateScoreUI() {
  scoreDisplay.innerText = score;
  if (combo >= 2) { comboDisplay.classList.remove('hidden'); comboText.innerText = combo; } 
  else { comboDisplay.classList.add('hidden'); }
}

function resetButtons() {
  for (let key in userAnswers) { userAnswers[key] = 0; updateButtonUI(key); }
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
  btn.className = `btn-substance ${substance === 'vitc' ? 'col-span-2' : ''}`;
  if (state === 0) btn.innerHTML = substanceNames[substance];
  else if (state === 1) { btn.classList.add('btn-state-on'); btn.innerHTML = `${substanceNames[substance]} ✔️`; }
  else if (state === -1) { btn.classList.add('btn-state-off'); btn.innerHTML = `${substanceNames[substance]} ❌`; }
}

function generateSequence() {
  let level = 1;
  if (score >= 350) level = 5;
  else if (score >= 200) level = 4;
  else if (score >= 100) level = 3;
  else if (score >= 40) level = 2;
  
  let availableSubs = Object.keys(substanceNames).sort(() => Math.random() - 0.5); 
  let selectedSubs = availableSubs.slice(0, level); 
  let sequence = [];
  expectedAnswers = { glucose: 0, starch: 0, lipid: 0, protein: 0, vitc: 0 };
  
  selectedSubs.forEach(sub => {
    let hasSub = Math.random() > 0.5; 
    sequence.push(questions.find(item => item.substance === sub && item.has === hasSub));
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

  if (level > currentDifficultyLevel) {
    currentDifficultyLevel = level;
    showFeedback(`難度提升 (Level ${level})🔥`, 'text-amber-500 drop-shadow-md');
    playSound('correct');
    await wait(1500);
  }

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
    if (timeLeft <= 3.0 && timeLeft > 0) timerDisplay.classList.add('text-red-500', 'animate-pulse');
    if (timeLeft <= 0) { clearInterval(timerInterval); submitAnswer(); }
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
    if (userAnswers[key] !== expectedAnswers[key]) { isCorrect = false; break; }
  }

  if (isCorrect) {
    combo++;
    const pointsGained = 10 + (combo > 1 ? (combo - 1) * 5 : 0);
    score += pointsGained;
    playSound('correct');
    createParticles(window.innerWidth / 2, window.innerHeight / 2);
    showFloatingText(`+${pointsGained}`, window.innerWidth / 2, window.innerHeight / 2 - 50);
    updateScoreUI();
    showFeedback('PERFECT! ✅', 'text-green-500 drop-shadow-md');
    setTimeout(nextQuestion, 1500);
  } else {
    combo = 0; updateScoreUI();
    handleWrongAnswer('ERROR! ❌');
  }
}

function handleWrongAnswer(msg) {
  isAnimating = true; clearInterval(timerInterval);
  controls.classList.add('pointer-events-none', 'opacity-50');
  playSound('wrong');
  gameBody.classList.add('shake-screen'); 
  setTimeout(() => gameBody.classList.remove('shake-screen'), 400);
  showFeedback(msg, 'text-red-500 drop-shadow-md');
  hp -= 1; updateHP();
  
  if (hp <= 0) setTimeout(gameOver, 1500);
  else setTimeout(nextQuestion, 1500); 
}

function gameOver() {
  saveScoreToDatabase();
  document.getElementById('final-player').innerText = `${playerClass} (${playerNum})`;
  document.getElementById('final-score-val').innerText = score;
  gameOverScreen.classList.remove('hidden');
}

function showFeedback(text, colorClass) {
  feedback.innerText = text;
  feedback.className = `absolute top-1/3 text-4xl sm:text-5xl font-black z-20 pointer-events-none transition-opacity duration-200 ${colorClass}`;
  feedback.style.opacity = 1;
  setTimeout(() => { feedback.style.opacity = 0; }, 1000);
}

function createParticles(x, y) {
  const colors = ['#34d399', '#fcd34d', '#38bdf8', '#fbbf24'];
  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = x + 'px'; particle.style.top = y + 'px';
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
  el.className = 'floating-text'; el.innerText = text;
  el.style.left = (x - 20) + 'px'; el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ================= 教師專用：匯出所有歷史紀錄為 CSV =================
window.exportData = async function() {
  alert("正在讀取資料，請稍候...");
  try {
    const snapshot = await db.collection("play_history").orderBy("timestamp", "desc").get();
    let csvContent = "\uFEFF班別,學號,分數,遊玩時間\n";
    snapshot.forEach(doc => {
      const data = doc.data();
      const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleString('zh-HK') : "未知時間";
      csvContent += `${data.class},${data.number},${data.score},${dateStr}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "學生食物檢測歷史紀錄.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error(error);
    alert("匯出失敗，請檢查網絡或 Firebase 設定。");
  }
};
