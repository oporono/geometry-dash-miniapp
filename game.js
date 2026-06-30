// ============================================
// GEOMETRY DASH MINI APP v1.0
// Telegram Mini App
// ============================================

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Размеры канваса
const W = Math.min(window.innerWidth, 480);
const H = Math.min(window.innerHeight, 720);
canvas.width = W;
canvas.height = H;

// Состояния игры
const STATE = { MENU: 0, PLAYING: 1, DEAD: 2 };
let gameState = STATE.MENU;
let attempt = 1;

// Игрок
const player = {
    x: W * 0.2,
    y: H * 0.7,
    vy: 0,
    width: 40,
    height: 40,
    color1: '#00FFFF',
    color2: '#FF00FF',
    iconType: 1,
    isJumping: false,
    gravity: 0.6,
    jumpForce: -9,
    groundY: H * 0.7,
    rotation: 0
};

// Уровень
const level = {
    speed: 4.5,
    blocks: [],
    spikes: [],
    coins: [],
    progress: 0,
    length: 8000,
    camera: 0
};

// Генерация уровня
function generateLevel() {
    level.blocks = [];
    level.spikes = [];
    level.coins = [];

    // Пол
    for (let x = 0; x < level.length; x += 100) {
        level.blocks.push({ x, y: H * 0.75, w: 100, h: 40, type: 'ground' });
    }

    // Платформы
    for (let x = 400; x < level.length; x += 300 + Math.random() * 400) {
        const h = 30 + Math.random() * 60;
        const y = H * 0.5 + Math.random() * (H * 0.25);
        level.blocks.push({ x, y, w: 80 + Math.random() * 120, h, type: 'platform' });
    }

    // Шипы
    for (let x = 600; x < level.length; x += 200 + Math.random() * 300) {
        level.spikes.push({ x, y: H * 0.75 - 25, w: 30, h: 30, type: 'spike' });
    }

    // Монеты
    for (let x = 700; x < level.length; x += 500 + Math.random() * 500) {
        level.coins.push({ x, y: H * 0.4 + Math.random() * (H * 0.3), collected: false });
    }
}

generateLevel();

// Обработка ввода
canvas.addEventListener('click', (e) => {
    e.preventDefault();
    handleInput();
});

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleInput();
    }
});

function handleInput() {
    if (gameState === STATE.MENU) {
        startGame();
    } else if (gameState === STATE.PLAYING) {
        jump();
    }
}

function startGame() {
    gameState = STATE.PLAYING;
    player.y = player.groundY;
    player.vy = 0;
    player.rotation = 0;
    level.progress = 0;
    level.camera = 0;
    level.coins.forEach(c => c.collected = false);
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('death-screen').style.display = 'none';
}

function jump() {
    if (player.y >= player.groundY - player.height) {
        player.vy = player.jumpForce;
        player.isJumping = true;
    }
}

// Игровой цикл
function update() {
    if (gameState !== STATE.PLAYING) return;

    // Движение камеры
    level.camera += level.speed;
    level.progress = Math.floor((level.camera / level.length) * 100);

    // Гравитация
    player.vy += player.gravity;
    player.y += player.vy;

    // Вращение куба
    player.rotation += level.speed * 0.05;

    // Земля
    if (player.y >= player.groundY) {
        player.y = player.groundY;
        player.vy = 0;
        player.isJumping = false;
        player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
    }

    // Проверка шипов
    for (let spike of level.spikes) {
        const sx = spike.x - level.camera;
        if (sx > player.x - 30 && sx < player.x + 40) {
            if (player.y + player.height > spike.y && player.y < spike.y + spike.h) {
                die();
                return;
            }
        }
    }

    // Проверка монет
    for (let coin of level.coins) {
        const cx = coin.x - level.camera;
        if (!coin.collected && cx > player.x - 20 && cx < player.x + 40) {
            if (player.y + player.height > coin.y - 15 && player.y < coin.y + 15) {
                coin.collected = true;
            }
        }
    }

    // Конец уровня
    if (level.progress >= 100) {
        completeLevel();
    }

    document.getElementById('score-display').textContent = level.progress + '%';
}

function die() {
    gameState = STATE.DEAD;
    document.getElementById('death-screen').style.display = 'block';
    document.getElementById('death-percent').textContent = level.progress + '%';

    tg.sendData(JSON.stringify({
        event: 'death',
        percent: level.progress,
        attempt: attempt,
        coins: level.coins.filter(c => c.collected).length
    }));
}

function completeLevel() {
    gameState = STATE.MENU;
    const coins = level.coins.filter(c => c.collected).length;

    tg.sendData(JSON.stringify({
        event: 'complete',
        percent: 100,
        stars: 1 + coins,
        coins: coins,
        diamonds: Math.floor(Math.random() * 5) + 1
    }));

    alert('🎉 УРОВЕНЬ ПРОЙДЕН! ⭐+' + (1 + coins) + ' звёзд');
}

// Отрисовка
function draw() {
    ctx.clearRect(0, 0, W, H);

    // Сетка фона
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = (-level.camera % gridSize); x < W; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
    }
    for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
    }

    // Блоки
    for (let block of level.blocks) {
        const bx = block.x - level.camera;
        if (bx > -100 && bx < W + 100) {
            if (block.type === 'ground') {
                ctx.fillStyle = '#333355';
                ctx.fillRect(bx, block.y, block.w, block.h);
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 2;
                ctx.strokeRect(bx, block.y, block.w, block.h);
            } else {
                ctx.fillStyle = '#444477';
                ctx.fillRect(bx, block.y, block.w, block.h);
                ctx.strokeStyle = '#FF00FF';
                ctx.lineWidth = 1;
                ctx.strokeRect(bx, block.y, block.w, block.h);
            }
        }
    }

    // Шипы
    for (let spike of level.spikes) {
        const sx = spike.x - level.camera;
        if (sx > -50 && sx < W + 50) {
            ctx.fillStyle = '#FF3333';
            ctx.beginPath();
            ctx.moveTo(sx, spike.y + spike.h);
            ctx.lineTo(sx + spike.w / 2, spike.y);
            ctx.lineTo(sx + spike.w, spike.y + spike.h);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#FF6666';
            ctx.stroke();
        }
    }

    // Монеты
    for (let coin of level.coins) {
        const cx = coin.x - level.camera;
        if (!coin.collected && cx > -30 && cx < W + 30) {
            const pulse = Math.sin(Date.now() * 0.005) * 3;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(cx + 15, coin.y + pulse, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    // Игрок
    ctx.save();
    ctx.translate(player.x, player.y + player.height / 2);
    if (player.iconType === 1) {
        ctx.rotate(player.rotation);
        ctx.fillStyle = player.color1;
        ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
        ctx.fillStyle = player.color2;
        ctx.fillRect(-player.width / 4, -player.height / 4, player.width / 2, player.height / 2);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(-player.width / 2, -player.height / 2, player.width, player.height);
    }
    ctx.restore();

    // Прогресс-бар
    const progressWidth = 200;
    const progressX = W / 2 - progressWidth / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(progressX - 2, H - 30, progressWidth + 4, 24);
    ctx.fillStyle = '#00FFFF';
    ctx.fillRect(progressX, H - 28, progressWidth * (level.progress / 100), 20);
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(level.progress + '%', W / 2, H - 13);
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Кнопки
document.getElementById('restart-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    attempt++;
    document.getElementById('attempt-display').textContent = 'Attempt ' + attempt;
    startGame();
});

document.getElementById('menu-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    gameState = STATE.MENU;
    document.getElementById('death-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';
    document.getElementById('score-display').textContent = '0%';
});

// Блокировка скролла на мобильных
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

// Запуск
gameLoop();
console.log('🎮 Geometry Dash Mini App v1.0 запущен');
