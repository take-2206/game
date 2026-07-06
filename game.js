const startBtn = document.getElementById("startBtn");
const startScreen = document.getElementById("startScreen");
const game = document.getElementById("game");

const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");
const livesEl = document.getElementById("lives");

const player = document.getElementById("player");
const playerSprite = document.getElementById("playerSprite");

// nhân vật đi bộ
const walkFrames = [
    "IMAGE/walk1.png",
    "IMAGE/walk2.png",
    "IMAGE/walk3.png",
];

// nhân vật nhảy lên
const jumpFrame = "IMAGE/jump.png";
const world = document.getElementById("world");

let lives = 3;
const maxLives = 3;
let gameStarted = false;

let currentFrame = 0;
let FrameTimer = 0;
let score = 0;
let time = 30;
let timer;
let hurt = false;
let x = 100;
let y = window.innerHeight - 100 - player.offsetHeight;

let velocityY = 0;

const gravity = 0.8;
const jumpPower = -23;
const speed = 5;

let isJumping = false;

// FIX: theo dõi có đứng trên platform không để chống double jump
let onPlatform = false;

const keys = {};

let cameraX = 0;
let lastPlatformX = 300;

// ----------------------------------------------------------------
// LIVES
// ----------------------------------------------------------------
function updateLives() {
    livesEl.innerHTML = "";
    for (let i = 0; i < maxLives; i++) {
        const heart = document.createElement("img");
        heart.src = "IMAGE/heart.png";
        heart.className = "heart";

        // FIX: tim đã mất → mờ đi thay vì dùng ảnh khác
        if (i >= lives) {
            heart.style.opacity = "0.2";
            heart.style.filter = "grayscale(100%)";
        }

        livesEl.appendChild(heart);
    }
}

// ----------------------------------------------------------------
// COINS
// ----------------------------------------------------------------
function createCoins(count, platformList) {
    // FIX: nếu có truyền platformList (nhóm platform vừa tạo) thì chỉ rải coin
    // trong nhóm đó -> coin xuất hiện đều đặn dọc theo map thay vì random
    // trên TOÀN BỘ platform kể cả những cái đã đi qua từ lâu.
    const platforms = (platformList && platformList.length > 0)
        ? platformList
        : document.querySelectorAll(".platform");
    if (platforms.length === 0) return;

    for (let i = 0; i < count; i++) {
        const coin = document.createElement("div");
        coin.className = "coin-item";

        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const px = parseFloat(platform.style.left);
        const py = parseFloat(platform.style.top);

        coin.style.left = (px + 16) + "px";
        coin.style.top  = (py - 50) + "px";  // giữ nguyên

        const img = document.createElement("img");
        img.src = "IMAGE/Coin.png";
        coin.appendChild(img);
        world.appendChild(coin);
    }
}

// ----------------------------------------------------------------
// STAR
// ----------------------------------------------------------------
function createStar(count, platformList) {
    // FIX: giống createCoins - nếu có truyền platformList (nhóm platform vừa tạo)
    // thì chỉ rải star trong nhóm đó, tránh spawn ở platform cũ đã đi qua/bị dọn dẹp
    const platforms = (platformList && platformList.length > 0)
        ? platformList
        : document.querySelectorAll(".platform");
    if (platforms.length === 0) return;

    for (let i = 0; i < count; i++) {
        const star = document.createElement("div");
        star.className = "star-item";

        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const px = parseInt(platform.style.left);
        const py = parseInt(platform.style.top);

        // FIX: star lệch phải +80px so với coin để không chồng
        star.style.left = (px + platform.offsetWidth / 2 + 80) + "px";
        star.style.top  = (py - 80) + "px"; // FIX: cao hơn coin để dễ phân biệt

        const img = document.createElement("img");
        img.src = "IMAGE/star.png";
        star.appendChild(img);
        world.appendChild(star);
    }
}

// ----------------------------------------------------------------
// START
// ----------------------------------------------------------------
startBtn.addEventListener("click", () => {
    startScreen.style.display = "none";
    game.style.display = "block";

    gameStarted = true;
    const initialPlatforms = createPlatforms(2);   // giảm từ 4 → 2 (coin đã được rải kèm theo trong hàm này)
    createStar(1, initialPlatforms); // FIX: rải star đúng trong nhóm platform vừa tạo
    startTimer();
});

// ----------------------------------------------------------------
// TIMER
// ----------------------------------------------------------------
function startTimer() {
    timer = setInterval(() => {
        time--;
        timeEl.textContent = time;

        // FIX: cảnh báo nhấp nháy khi thời gian sắp hết
        const timeBox = timeEl.parentElement;
        if (time <= 5 && time > 0) {
            timeBox.classList.add("time-warning");
        } else {
            timeBox.classList.remove("time-warning");
        }

        if (time <= 0) {
            clearInterval(timer);
            gameOver();
        }
    }, 1000);
}

// ----------------------------------------------------------------
// GAME OVER
// ----------------------------------------------------------------
function gameOver() {
    gameStarted = false;
    clearInterval(timer);

    document.getElementById("gameOverScreen").style.display = "flex";
    document.getElementById("finalScore").innerText = "Score: " + score;

   
    const history = saveResult(score);
    renderHistory(history);

    // dừng vật lý & phím
    velocityY = 0;
    keys["ArrowLeft"]  = false;
    keys["ArrowRight"] = false;
    keys["ArrowUp"]    = false;
}

// ----------------------------------------------------------------
// INPUT
// ----------------------------------------------------------------
// FIX: kiểm tra chính xác player có đang đứng trên nền/platform hay không,
// dựa trực tiếp vào x/y hiện tại thay vì dựa vào isJumping/onPlatform
// (2 biến này chỉ được cập nhật 1 lần mỗi khung hình trong checkPlatforms,
// nên dùng chúng ở đây vẫn có thể lọt qua 1 khung hình và gây nhảy đúp).
function isGrounded() {
    const groundY = window.innerHeight - 100 - player.offsetHeight;
    if (y >= groundY - 1) return true;

    const platforms = document.querySelectorAll(".platform");
    for (const platform of platforms) {
        const pTop   = parseInt(platform.style.top);
        const pLeft  = parseInt(platform.style.left);
        const pRight = pLeft + platform.offsetWidth;

        const playerBottom = y + player.offsetHeight;
        const withinX = (x + player.offsetWidth) > pLeft && x < pRight;
        const onTop   = Math.abs(playerBottom - pTop) < 3;

        if (withinX && onTop) return true;
    }
    return false;
}

document.addEventListener("keydown", (e) => {
    keys[e.code] = true;

    // FIX: chỉ nhảy khi không đang nhảy VÀ thực sự đang đứng trên nền/platform
    // (chống double jump ngay khi vừa rời mép platform)
    if (e.code === "ArrowUp" && !isJumping && isGrounded()) {
        velocityY = jumpPower;
        isJumping = true;
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.code] = false;
});

// ----------------------------------------------------------------
// MOBILE CONTROLS (nút chạm ảo cho trái/phải/nhảy)
// ----------------------------------------------------------------
const btnLeft  = document.getElementById("btnLeft");
const btnRight = document.getElementById("btnRight");
const btnJump  = document.getElementById("btnJump");

function bindHoldButton(btn, code) {
    if (!btn) return;

    const press = (e) => {
        e.preventDefault();
        keys[code] = true;

        // FIX: cùng logic nhảy như bàn phím, tránh double jump
        if (code === "ArrowUp" && !isJumping && isGrounded()) {
            velocityY = jumpPower;
            isJumping = true;
        }
    };

    const release = (e) => {
        e.preventDefault();
        keys[code] = false;
    };

    // Cảm ứng (mobile/tablet)
    btn.addEventListener("touchstart", press, { passive: false });
    btn.addEventListener("touchend", release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });

    // Fallback bằng chuột (test trên desktop hoặc thiết bị hybrid)
    btn.addEventListener("mousedown", press);
    btn.addEventListener("mouseup", release);
    btn.addEventListener("mouseleave", release);
}

bindHoldButton(btnLeft,  "ArrowLeft");
bindHoldButton(btnRight, "ArrowRight");
bindHoldButton(btnJump,  "ArrowUp");

// ----------------------------------------------------------------
// ANIMATION
// ----------------------------------------------------------------
function animatePlayer() {
    if (hurt) return; // giữ frame hurt trong lúc bị thương

    if (isJumping) {
        playerSprite.src = jumpFrame;
        return;
    }

    const isMoving = keys["ArrowRight"] || keys["ArrowLeft"];
    if (!isMoving) {
        playerSprite.src = walkFrames[0];
        currentFrame = 0;
        FrameTimer = 0;
        return;
    }

    FrameTimer++;
    if (FrameTimer >= 8) {
        FrameTimer = 0;
        currentFrame++;
        if (currentFrame >= walkFrames.length) currentFrame = 0;
        playerSprite.src = walkFrames[currentFrame];
    }
}

// ----------------------------------------------------------------
// CHECK COINS
// ----------------------------------------------------------------
function checkCoins() {
    const coins = document.querySelectorAll(".coin-item");
    coins.forEach((coin) => {
        if (coin.style.display === "none") return;

        const coinRect   = coin.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        if (
            playerRect.left   < coinRect.right  &&
            playerRect.right  > coinRect.left   &&
            playerRect.top    < coinRect.bottom &&
            playerRect.bottom > coinRect.top
        ) {
            coin.style.display = "none";
            score++;
            scoreEl.textContent = score;
        }
    });
}

// ----------------------------------------------------------------
// CHECK STAR
// ----------------------------------------------------------------
function checkStar() {
    const stars = document.querySelectorAll(".star-item");
    stars.forEach((star) => {
        if (star.style.display === "none") return;

        const starRect   = star.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        if (
            playerRect.left   < starRect.right  &&
            playerRect.right  > starRect.left   &&
            playerRect.top    < starRect.bottom &&
            playerRect.bottom > starRect.top
        ) {
            star.style.display = "none";
            time += 10;
            timeEl.textContent = time;
        }
    });
}

// ----------------------------------------------------------------
// CHECK ENEMIES
// ----------------------------------------------------------------
function checkEnemies() {
    const enemies = document.querySelectorAll(".enemy");
    const hurtFrame = "IMAGE/hurt.png";

    enemies.forEach((enemy) => {
        const enemyRect  = enemy.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();

        if (
            playerRect.left   < enemyRect.right  &&
            playerRect.right  > enemyRect.left   &&
            playerRect.top    < enemyRect.bottom &&
            playerRect.bottom > enemyRect.top
        ) {
            // FIX: ngưỡng stomp chặt hơn (+20 thay vì +35)
            const stomp = velocityY > 0 && playerRect.bottom < enemyRect.top + 20;

            if (stomp) {
                enemy.remove();
                velocityY = -15;
                score += 5;
                scoreEl.textContent = score;
            } else {
                if (hurt) return;

                // FIX: gán hurt một lần duy nhất, bỏ setTimeout trùng
                hurt = true;
                lives--;
                updateLives();

                playerSprite.src = hurtFrame;

                setTimeout(() => {
                    hurt = false;
                    // FIX: không ép về walkFrames[0] nữa - để animatePlayer() ở frame kế
                    // tự chọn đúng sprite (jump/walk/idle) tùy trạng thái hiện tại,
                    // tránh nháy sai hình khi vừa bị thương vừa đang nhảy
                }, 1000);

                if (lives <= 0) {
                    gameOver();
                }
            }
        }
    });
}

// ----------------------------------------------------------------
// PLATFORMS
// ----------------------------------------------------------------
function createPlatforms(count) {
    const groundY = window.innerHeight - 100;
    const allNewPlatforms = []; // FIX: gom toàn bộ platform vừa tạo để trả về cho createStar dùng

    for (let i = 0; i < count; i++) {
        lastPlatformX += 600 + Math.random() * 800;

        const platformY = groundY - (150 + Math.random() * 150);
        const length    = Math.floor(Math.random() * 3) + 2;

        const groupPlatforms = []; // FIX: lưu lại các platform vừa tạo trong nhóm này

        for (let j = 0; j < length; j++) {
            const platform = document.createElement("div");
            platform.className  = "platform";
            platform.style.left = (lastPlatformX + j * 64) + "px";
            platform.style.top  = platformY + "px";
            world.appendChild(platform);
            groupPlatforms.push(platform);
            allNewPlatforms.push(platform); // FIX: lưu lại cho createStar
        }

        // FIX: rải 2-3 coin ngay trên nhóm platform vừa tạo -> mỗi cụm platform
        // mới xuất hiện đều có coin, coin trải đều xuyên suốt map thay vì
        // dồn cục lúc đầu rồi thưa dần về sau.
        const coinCount = 2 + Math.floor(Math.random() * 2); // 2 hoặc 3
        createCoins(coinCount, groupPlatforms);

        // Sinh enemy một lần mỗi nhóm platform (không lặp theo j)
        if (Math.random() < 0.5) {
            const enemyGroundY = window.innerHeight - 100 - 48;

            // Blue dưới đất
            createEnemy(lastPlatformX, enemyGroundY, 200, "IMAGE/blue.png", "blue");

            // FIX: phạm vi của saw phải khớp với chiều dài thực của nhóm platform
            // (length tile x 64px), trừ đi bề rộng enemy (48px) để không lố ra ngoài rìa
            const platformWidth = length * 64;
            const sawRange = Math.max(16, platformWidth - 48);

            // Saw trên platform
            createEnemy(lastPlatformX, platformY - 48, sawRange, "IMAGE/saw.png", "saw");
        }
    }

    return allNewPlatforms; // FIX: để nơi gọi có thể truyền vào createStar
}

// ----------------------------------------------------------------
// CHECK PLATFORMS
// ----------------------------------------------------------------
function checkPlatforms() {
    const platforms  = document.querySelectorAll(".platform");
    const playerRect = player.getBoundingClientRect();

    // FIX: reset onPlatform mỗi frame trước khi kiểm tra
    onPlatform = false;

    // FIX: biên độ cho phép va chạm ngang (tránh đụng ngang khi đang đứng trên đỉnh)
    const SIDE_MARGIN = 12;

    platforms.forEach(platform => {
        const pRect = platform.getBoundingClientRect();

        const horizontalOverlap = playerRect.right > pRect.left && playerRect.left < pRect.right;

        // Đáp xuống mặt trên platform
        const landingOnTop =
            velocityY > 0 &&
            playerRect.bottom <= pRect.top + 10 &&
            playerRect.bottom + velocityY >= pRect.top &&
            horizontalOverlap;

        if (landingOnTop) {
            y          = parseInt(platform.style.top) - player.offsetHeight;
            velocityY  = 0;
            isJumping  = false;
            onPlatform = true; // FIX: đánh dấu đang đứng trên platform
            return; // FIX: đã xử lý đáp đỉnh thì bỏ qua các kiểm tra va chạm khác của platform này
        }

        // Đụng mặt dưới platform khi nhảy lên
        if (
            velocityY < 0 &&
            playerRect.top >= pRect.bottom - 10 &&
            playerRect.top + velocityY <= pRect.bottom &&
            horizontalOverlap
        ) {
            y         = parseInt(platform.style.top) + 64;
            velocityY = 0;
            return;
        }

        // FIX: chỉ tính va chạm ngang khi thân player thật sự ở giữa chiều cao platform
        // (không phải đang đứng trên đỉnh hay treo dưới đáy), tránh bị đẩy giật khi ở góc
        const verticalOverlapForSide =
            playerRect.bottom > pRect.top + SIDE_MARGIN &&
            playerRect.top    < pRect.bottom - SIDE_MARGIN;

        if (!verticalOverlapForSide) return;

        // Va chạm bên trái
        if (playerRect.right >= pRect.left && playerRect.left < pRect.left) {
            x = parseInt(platform.style.left) - player.offsetWidth;
        }

        // Va chạm bên phải
        if (playerRect.left <= pRect.right && playerRect.right > pRect.right) {
            x = parseInt(platform.style.left) + 64;
        }
    });

    // FIX: nếu không đứng trên platform và không trên mặt đất → đang rơi
    const groundY = window.innerHeight - 100 - player.offsetHeight;
    if (!onPlatform && y < groundY && velocityY >= 0) {
        isJumping = true;
    }
}

// ----------------------------------------------------------------
// RESIZE (FIX: tránh lệch vị trí nếu người chơi resize cửa sổ giữa game)
// ----------------------------------------------------------------
window.addEventListener("resize", () => {
    const groundY = window.innerHeight - 100 - player.offsetHeight;
    if (!isJumping && !onPlatform) {
        y = groundY;
    }
});

// ----------------------------------------------------------------
// CAMERA
// ----------------------------------------------------------------
function updateCamera() {
    const worldWidth = 999999;
    const targetCameraX = x - window.innerWidth * 0.3;
    const maxCamera     = worldWidth - window.innerWidth;
    const target        = Math.max(0, Math.min(targetCameraX, maxCamera));

    cameraX += (target - cameraX) * 0.08;
    world.style.transform = `translateX(${-cameraX}px)`;
}

// ----------------------------------------------------------------
// CLEANUP (FIX: xoá platform/coin/star/enemy đã ở xa phía sau lưng
// người chơi để tránh DOM phình to, tụt hiệu năng khi chơi lâu)
// ----------------------------------------------------------------
let cleanupCounter = 0;

function cleanupOffscreen() {
    const threshold = cameraX - 500; // ngưỡng xa phía sau camera

    document.querySelectorAll(".platform, .coin-item, .star-item, .enemy")
        .forEach((el) => {
            const left = parseFloat(el.style.left);
            if (!Number.isNaN(left) && left < threshold) {
                el.remove();
            }
        });
}

// ----------------------------------------------------------------
// GAME LOOP
// ----------------------------------------------------------------
function gameLoop() {
    if (!gameStarted) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // Sinh thêm nội dung khi đi xa
    if (x > lastPlatformX - 1000) {
        const newPlatforms = createPlatforms(2);   // giảm từ 5 → 2 (coin đã được rải kèm theo trong hàm này)
        if (Math.random() < 0.3) createStar(1, newPlatforms); // FIX: chỉ rải trong nhóm vừa sinh
    }

    // Di chuyển
    if (keys["ArrowRight"]) {
        x += speed;
        playerSprite.style.transform = "scaleX(1)";
    }
    if (keys["ArrowLeft"]) {
        x -= speed;
        playerSprite.style.transform = "scaleX(-1)";
    }

    x = Math.max(0, x);

    // Vật lý
    velocityY += gravity;
    y += velocityY;

    const groundY = window.innerHeight - 100 - player.offsetHeight;
    if (y > groundY) {
        y         = groundY;
        velocityY = 0;
        isJumping = false;
    }

    checkPlatforms();
    updateEnemies();
    animatePlayer();

    player.style.left = x + "px";
    player.style.top  = y + "px";

    updateCamera();
    checkCoins();
    checkStar();
    checkEnemies();

    // FIX: dọn dẹp mỗi 30 khung hình (~2 lần/giây) thay vì mỗi frame
    cleanupCounter++;
    if (cleanupCounter >= 30) {
        cleanupCounter = 0;
        cleanupOffscreen();
    }

    requestAnimationFrame(gameLoop);
}

// ----------------------------------------------------------------
// ENEMY
// ----------------------------------------------------------------
function createEnemy(posX, posY, range, imageSrc, type = "blue") {
    const enemy = document.createElement("div");
    enemy.className = "enemy";

    enemy.style.left = posX + "px";
    enemy.style.top  = posY + "px";

    enemy.dataset.direction = 1;
    enemy.dataset.startX    = posX;
    enemy.dataset.range     = range;
    enemy.dataset.vy        = 0;
    enemy.dataset.type      = type;

    const img = document.createElement("img");
    img.src = imageSrc;
    enemy.appendChild(img);
    world.appendChild(enemy);

    if (type === "saw") img.classList.add("saw");
}

function updateEnemies() {
    const enemies = document.querySelectorAll(".enemy");

    enemies.forEach(enemy => {
        const type   = enemy.dataset.type;
        let ex       = parseFloat(enemy.style.left);
        let ey       = parseFloat(enemy.style.top);
        let dir      = parseInt(enemy.dataset.direction);
        let vy       = parseFloat(enemy.dataset.vy);
        const startX = parseFloat(enemy.dataset.startX);
        const range  = parseFloat(enemy.dataset.range);

        ex += dir * 2;

        if (ex > startX + range) {
            dir = -1;
            if (type === "blue") enemy.style.transform = "scaleX(-1)";
        }
        if (ex < startX) {
            dir = 1;
            if (type === "blue") enemy.style.transform = "scaleX(1)";
        }

        if (type === "blue") {
            vy += 0.5;
            ey += vy;
            const enemyGroundY = window.innerHeight - 100 - 48;
            if (ey > enemyGroundY) {
                ey = enemyGroundY;
                vy = 0;
            }
        }

        enemy.dataset.vy        = vy;
        enemy.dataset.direction = dir;
        enemy.style.left        = ex + "px";
        enemy.style.top         = ey + "px";
    });
}

// ----------------------------------------------------------------
// (localStorage)
// ----------------------------------------------------------------
const bestScoreEl   = document.getElementById("bestScore");
const historyListEl = document.getElementById("historyList");

// ----------------------------------------------------------------
// (localStorage)
// ----------------------------------------------------------------
const STORAGE_KEY = "coinAdventure_history";
const MAX_HISTORY = 5;

function loadHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveResult(finalScoreValue) {
    const history = loadHistory();

    history.unshift({
        score: finalScoreValue,
        date: new Date().toLocaleString("ja-JP", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit"
        })
    });

    // FIX: chỉ giữ lại MAX_HISTORY lần chơi gần nhất
    const trimmed = history.slice(0, MAX_HISTORY);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        // localStorage có thể bị chặn (chế độ ẩn danh...), bỏ qua an toàn
    }

    return trimmed;
}

function getBestScore(history) {
    return history.reduce((max, item) => Math.max(max, item.score), 0);
}

function renderHistory(history) {
    bestScoreEl.textContent = "Best: " + getBestScore(history);

    historyListEl.innerHTML = "";
    history.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${item.date}</span><span>${item.score} </span>`;
        historyListEl.appendChild(li);
    });

    if (history.length === 0) {
        const li = document.createElement("li");
        li.textContent = "Chưa có lượt chơi nào";
        historyListEl.appendChild(li);
    }
}

// ----------------------------------------------------------------
// RESTART
// ----------------------------------------------------------------
const restartBtn = document.getElementById("restartBtn");
restartBtn.addEventListener("click", restartGame);

function restartGame() {
    // FIX: xóa toàn bộ object cũ
    document.querySelectorAll(".platform, .coin-item, .star-item, .enemy")
        .forEach(el => el.remove());

    // FIX: reset vị trí sinh platform
    lastPlatformX = 300;

    // Reset stats
    score = 0;
    scoreEl.textContent = score;

    time = 30;
    timeEl.textContent = time;
    timeEl.parentElement.classList.remove("time-warning"); // FIX: tắt cảnh báo khi restart

    lives = 3;
    updateLives();

    // Reset nhân vật
    x = 100;
    y = window.innerHeight - 100 - player.offsetHeight;

    velocityY  = 0;
    isJumping  = false;
    onPlatform = false;
    hurt       = false;

    // FIX: reset animation
    currentFrame = 0;
    FrameTimer   = 0;
    playerSprite.src = walkFrames[0];

    player.style.opacity   = "1";
    player.style.filter    = "none";
    playerSprite.style.transform = "scaleX(1)";

    // FIX: reset phím
    keys["ArrowLeft"]  = false;
    keys["ArrowRight"] = false;
    keys["ArrowUp"]    = false;

    // Reset camera
    cameraX = 0;
    world.style.transform = "translateX(0px)";

    // Ẩn game over
    document.getElementById("gameOverScreen").style.display = "none";

    // Tạo map mới
    const restartPlatforms = createPlatforms(2);   // coin đã được rải kèm theo trong hàm này
    createStar(1, restartPlatforms); // FIX: rải star đúng trong nhóm platform vừa tạo

    // Bắt đầu lại
    clearInterval(timer);
    startTimer();
    gameStarted = true;
}

// ----------------------------------------------------------------
// KHỞI ĐỘNG
// ----------------------------------------------------------------
gameLoop();