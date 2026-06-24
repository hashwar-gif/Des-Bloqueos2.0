// AJUSTE DINÁMICO DE ALTURA PARA MÓVILES
function updateRealVH() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--real-vh', `${vh}px`);
}
window.addEventListener('resize', updateRealVH);
updateRealVH();

const cvs = document.getElementById('gameCanvas');
let ctx = cvs.getContext('2d');
let bgCanvases = {}, bgDirty = true;

// Referencias DOM cacheadas
const $ = (id) => document.getElementById(id);
const dom = {
    storyScreen: $('story-screen'),
    mainHud: $('main-hud'),
    deathScreen: $('death-screen'),
    winScreen: $('win-screen'),
    hudMoney: $('ui-money'),
    hudBalas: $('ui-balas'),
    hudViveres: $('ui-viveres'),
    hudGasolina: $('ui-gasolina'),
    hudTimer: $('ui-timer'),
    hudCity: $('ui-city'),
    hudHpFill: $('health-fill'),
    hudHpText: $('ui-hp-text'),
    hudAbilCd: $('ui-abil-cd'),
    hudAbilName: $('ui-abil-name'),
    hudAbility: $('ui-ability'),
    winMoney: $('win-money'),
    winBullets: $('win-bullets'),
    winTime: $('win-time'),
    playerTitle: $('player-title'),
    weatherToast: $('weather-toast'),
    uiWeather: $('ui-weather'),
    hudLives: $('ui-lives'),
};
// El tamaño lógico se mantiene en 800x400 para consistencia de juego
cvs.width = 800;
cvs.height = 400;

const actx = new (window.AudioContext || window.webkitAudioContext)();
const bgmPlayer = document.getElementById('bgm-player');
let targetVolume = 0.05;
let fadeInterval = null;

const playlist = [
    { name: "Hashwar (Main)", file: "assets/music/b)Hashwar JDR-IA.wav" },
    { name: "$hash", file: "assets/music/a)$hash JDR-IA.wav" }
];
let currentTrackIdx = 0;



function playBGM(typeOrIndex) {
    if (actx.state === 'suspended') actx.resume();
    if (fadeInterval) clearInterval(fadeInterval);
    
    if (typeof typeOrIndex === 'string') {
        if (typeOrIndex === 'menu') currentTrackIdx = 0;
        else if (typeOrIndex === 'game') currentTrackIdx = (currentTrackIdx + 1) % playlist.length;
    } else {
        currentTrackIdx = (typeOrIndex + playlist.length) % playlist.length;
    }

    const track = playlist[currentTrackIdx];
    if (bgmPlayer.src.indexOf(encodeURI(track.file)) === -1) {
        bgmPlayer.src = track.file;
        bgmPlayer.volume = 0;
        bgmPlayer.play().then(() => {
            fadeInterval = setInterval(() => {
                if (bgmPlayer.volume < targetVolume) {
                    bgmPlayer.volume = Math.min(targetVolume, bgmPlayer.volume + 0.02);
                } else {
                    clearInterval(fadeInterval);
                    fadeInterval = null;
                }
            }, 100);
        }).catch(e => console.log("Audio play blocked"));
    } else if (bgmPlayer.paused) {
        bgmPlayer.play();
    }
}

function changeTrack(dir) {
    playBGM(currentTrackIdx + dir);
}

function togglePlayPause() {
    if (bgmPlayer.paused) bgmPlayer.play();
    else bgmPlayer.pause();
}

// Iniciar música de menú al primer clic/interacción
document.addEventListener('click', () => { if (bgmPlayer.paused && !gameStarted) playBGM('menu'); }, { once: true });

function psnd(t) {
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    if (t === 'jump') { o.type = 'triangle'; o.frequency.setValueAtTime(150, actx.currentTime); o.frequency.exponentialRampToValueAtTime(400, actx.currentTime + 0.1); g.gain.setValueAtTime(0.1, actx.currentTime); o.start(); o.stop(actx.currentTime + 0.1); }
    else if (t === 'shoot') { o.type = 'square'; o.frequency.setValueAtTime(800, actx.currentTime); o.frequency.exponentialRampToValueAtTime(10, actx.currentTime + 0.1); g.gain.setValueAtTime(0.05, actx.currentTime); o.start(); o.stop(actx.currentTime + 0.1); }
    else if (t === 'hit') { o.type = 'sawtooth'; o.frequency.setValueAtTime(100, actx.currentTime); g.gain.setValueAtTime(0.1, actx.currentTime); o.start(); o.stop(actx.currentTime + 0.2); }
    else if (t === 'collect') { o.type = 'sine'; o.frequency.setValueAtTime(500, actx.currentTime); g.gain.setValueAtTime(0.1, actx.currentTime); o.start(); o.stop(actx.currentTime + 0.1); }
    else if (t === 'boom') { o.type = 'sawtooth'; o.frequency.setValueAtTime(60, actx.currentTime); o.frequency.exponentialRampToValueAtTime(1, actx.currentTime + 0.3); g.gain.setValueAtTime(0.2, actx.currentTime); o.start(); o.stop(actx.currentTime + 0.3); }
    else if (t === 'thunder') { o.type = 'sawtooth'; o.frequency.setValueAtTime(40, actx.currentTime); o.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.05); o.frequency.exponentialRampToValueAtTime(2, actx.currentTime + 0.5); g.gain.setValueAtTime(0.25, actx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.5); const n2 = actx.createOscillator(); const g2 = actx.createGain(); n2.type = 'sawtooth'; n2.frequency.setValueAtTime(30, actx.currentTime); n2.frequency.exponentialRampToValueAtTime(80, actx.currentTime + 0.1); n2.connect(g2); g2.connect(actx.destination); g2.gain.setValueAtTime(0.15, actx.currentTime); g2.gain.exponentialRampToValueAtTime(0.01, actx.currentTime + 0.6); n2.start(); n2.stop(actx.currentTime + 0.6); o.start(); o.stop(actx.currentTime + 0.5); }
}

const grav = 0.5;
const psp = 5;
const jf = 12;
const llen = 5000;
let sviv = 0, sgas = 0, bul = 40, totalMoney = 0, timeLeft = 180;
let gover = false, gwin = false, camX = 0, gframe = 0, gameStarted = false, inShop = false, lives = 3;
let selectedChar = 'pm', demoChar = 'pm';
let evoTimer = 0, evoSpecialTimer = 0;
let storyCallback = null, typingInterval = null, isEndingStory = false, storyAnimInterval = null, currentStoryLevel = null, endingIsGood = false;
const keys = { ArrowRight: false, ArrowLeft: false, Space: false, KeyX: false, KeyW: false, KeyA: false, KeyD: false, KeyZ: false };

const charAbilities = {
    'pm': { name: 'DRON TÁCTICO', icon: '🚁', cd: 720, dur: 180,            desc: 'Dron láser persigue enemigos 3s' },
    'policia_bol': { name: 'GAS LACRIMÓGENO', icon: '☁️', cd: 780, dur: 0,      desc: 'Gas tóxico daña y ralentiza' },
    'rebelde': { name: 'LLUVIA DE FUEGO', icon: '🔥', cd: 540, dur: 0,            desc: '8 proyectiles ígneos caen del cielo' },
    'dea': { name: 'RÁFAGA TÁCTICA', icon: '🔫', cd: 360, dur: 0,          desc: '8 disparos rápidos' },
    'jara': { name: 'APOYO AÉREO', icon: '🚁', cd: 900, dur: 0,            desc: 'Helicóptero ataca' },
    'cholita': { name: 'FOGATA ANDINA', icon: '🔥', cd: 780, dur: 360,          desc: 'Fogata que cura aliados y quema enemigos' },
    'poncho_j': { name: 'AGUAYO', icon: '🧣', cd: 900, dur: 300,            desc: '+20 defensa 5s' },
    'cob_j': { name: 'DINAMITA', icon: '💣', cd: 600, dur: 0,               desc: 'Dinamita 100 dmg' },
    'evo_j': { name: 'DISCURSO', icon: '📢', cd: 1200, dur: 180,            desc: 'Paraliza enemigos 3s' },
    'rodrigo': { name: 'HELIPAQ', icon: '🚁', cd: 1200, dur: 0,             desc: 'Bombardeo aéreo' },
    'perro': { name: 'PETARDO', icon: '💥', cd: 480, dur: 0,                desc: '5 explosiones en cadena' },
    'joe': { name: 'ONDAS DE RADIO', icon: '📡', cd: 600, dur: 150,            desc: 'Laptop + ondas dañan enemigos' }
};
let abilCd = 0, abilDur = 0, abilActive = false;

window.openLevelSelection = function(type) {
    selectedChar = type;
    document.getElementById('char-selection-screen').classList.add('d-none');
    document.getElementById('level-selection-screen').classList.remove('d-none');
}

window.finalizeSelection = function(unused, level) {
    document.getElementById('level-selection-screen').classList.add('d-none');
    
    // MOSTRAR HISTORIA DEL NIVEL SELECCIONADO ANTES DE EMPEZAR
    showStory(level || 1, () => {
        document.getElementById('main-hud').classList.remove('d-none');
        document.getElementById('main-hud').classList.add('d-flex');
        const pTitle = document.getElementById('player-title');
        if (selectedChar === 'rodrigo') { pTitle.innerText = "PRESIDENTE DE ESTADO"; pTitle.style.display = "block"; pTitle.style.background = "#1c2e4a"; }
        else if (selectedChar === 'evo_j') { pTitle.innerText = "ELMO GONZALEZ"; pTitle.style.display = "block"; pTitle.style.background = "#000"; }
        else { pTitle.style.display = "none"; }
        gameStarted = true; camX = 0; 
        playBGM('game'); // CAMBIAR A MÚSICA DE PARTIDA
        psnd('collect');
        init(level || 1);
    });
}

const systemStories = {
    1: { loc: "📍 LA PAZ - EL CENTRO DEL PODER", txt: "Año 2026. La Paz está paralizada. Las calles del centro son un laberinto de humo y fuego. Tu misión es clara: atraviesa el bloqueo y llega a la Casa Grande del Pueblo. El destino de la nación pende de un hilo. ¡Avanza!" },
    2: { loc: "📍 CIUDAD DE EL ALTO - LA CUMBRE", txt: "Has llegado a la ciudad más alta del mundo. Aquí, el aire es fino y la resistencia es dura. Miles de ciudadanos han levantado barricadas de ladrillo y piedra. La 'Guerra de las Rocas' ha comenzado. ¡No te detengas!" },
    3: { loc: "⛏️ ORURO - LA CAPITAL DEL FOLCLORE", txt: "Oruro te recibe con el eco de los bombos y el brillo de las máscaras de la Diablada. Bajo la mirada de la Virgen del Socavón, los mineros y danzarines llenan las calles de color. Pero el socavón también esconde conflictos. Atraviesa la ciudad minera y baila entre las balas." },
    4: { loc: "📍 COCHABAMBA - EL CORAZÓN VALLE", txt: "El valle se ha convertido en un campo de batalla. Entre montañas y bajo la mirada del Cristo, los bandos se enfrentan por el control de las rutas comerciales. El puente entre oriente y occidente debe ser liberado." },
    5: { loc: "🌿 CHAPARE - LA SELVA DE COCA", txt: "Las montañas verdes del Chapare se alzan ante ti. Entre plantaciones de coca y ríos caudalosos, Evo Gonzalez ha establecido su bastión final. Los seguidores más leales custodian cada paso. La DEA ha ofrecido apoyo aéreo. Este es el fin de la línea. Captura a Evo Gonzalez y termina la rebelión de una vez por todas." },
    6: { loc: "📍 SANTA CRUZ - EL TROPICO ARDIENTE", txt: "La selva y la ciudad de los anillos te esperan. El calor es asfixiante y el rugido del jaguar se mezcla con las sirenas. Esta es la última frontera. Si superas este nivel, Bolivia finalmente conocerá la paz." },
    end_good: { loc: "🏆 BOLIVIA LIBRE - LA NACIÓN SE UNIFICA", txt: "La última barricada ha caído. Las rutas nacionales vibran de nuevo con el ir y venir de los camiones. El pueblo boliviano, cansado de la división, tiende puentes donde antes había trincheras. En cada plaza, en cada mercado, la gente celebra el fin del conflicto. La Paz despierta con los brazos abiertos. El diálogo ha vencido a la violencia. ¡FELICIDADES! DESBLOQUEASTE EL PAÍS. Bolivia entera respira una nueva esperanza bajo un solo cielo." },
    end_bad: { loc: "🔥 BOLIVIA EN REBELIÓN - EL PODER DEL PUEBLO", txt: "Las calles son tuyas. Desde el altiplano hasta el oriente, la voz del pueblo retumba imparable. Las demandas de los trabajadores, los indígenas y los olvidados han sido escuchadas. El sistema tambalea ante la fuerza de la unidad popular. Las wipalas flamean victoriosas en cada barricada. El gobierno no tiene más remedio que ceder. ¡FELICIDADES! BLOQUEASTE EL PAÍS. La rebelión popular marca un nuevo rumbo para la historia de Bolivia." },
    end_chapare: { loc: "🚁 CHAPARE - EVO HA CAÍDO", txt: "Con apoyo aéreo de la DEA, las fuerzas del orden han logrado lo imposible. Evo Gonzalez ha sido capturado en su propio bastión. Las plantaciones de coca arden mientras los helicópteros barren la selva. La resistencia se desmorona. Los líderes de la rebelión son llevados ante la justicia. Bolivia entera respira aliviada. El estado de derecho se ha restaurado. ¡MISIÓN CUMPLIDA! Evo Gonzalez está bajo custodia y el Chapare vuelve a ser territorio boliviano." }
};

window.buyItem = function(type) {
    if (type === 'ammo' && totalMoney >= 50) { totalMoney -= 50; bul += 20; psnd('collect'); }
    else if (type === 'health' && totalMoney >= 30) { totalMoney -= 30; plyr.hp = Math.min(100, plyr.hp + 25); psnd('collect'); }
    else if (type === 'armor' && totalMoney >= 100) { totalMoney -= 100; plyr.defense += 5; psnd('collect'); }
    else if (type === 'damage' && totalMoney >= 150) { totalMoney -= 150; plyr.damageMod += 1; psnd('collect'); }
    updateUI();
    document.getElementById('shop-money').innerText = totalMoney;
}

window.closeShop = function() {
    inShop = false;
    document.getElementById('shop-screen').classList.add('d-none');
    if (currentLevel < 6) {
        showStory(currentLevel + 1, () => {
            init(currentLevel + 1);
        });
    } else {
        showEndingStory();
    }
}

window.showEndingStory = function(type) {
    isEndingStory = true;
    gwin = true;
    window._endingType = type || '';
    const goodChars = ['pm', 'policia_bol', 'rodrigo', 'rebelde', 'joe'];
    const chapareEndChars = ['dea', 'jara'];
    const isGood = goodChars.includes(selectedChar);
    endingIsGood = isGood;
    const isChapareEnding = type === 'chapare' || chapareEndChars.includes(selectedChar);
    const key = isChapareEnding ? 'end_chapare' : (isGood ? 'end_good' : 'end_bad');
    document.getElementById('story-location').innerText = systemStories[key].loc;
    const txtDiv = document.getElementById('story-text'); txtDiv.innerHTML = "";
    let i = 0; const fullTxt = systemStories[key].txt;
    if (typingInterval) clearInterval(typingInterval);
    typingInterval = setInterval(() => { 
        if (i < fullTxt.length) { 
            txtDiv.innerHTML += fullTxt[i]; 
            if (i % 2 === 0) psnd('collect');
            i++; 
        } else { 
            clearInterval(typingInterval); 
        } 
    }, 35);
    document.getElementById('story-screen').classList.remove('d-none');
    document.getElementById('main-hud').classList.add('d-none');
    if (storyAnimInterval) clearInterval(storyAnimInterval);
    storyAnimInterval = setInterval(() => drawEndingScene(isGood, isChapareEnding), 50);
    drawEndingScene(isGood, isChapareEnding);
}

window.startFinalCredits = function() {
    gameStarted = false;
    document.getElementById('main-hud').classList.add('d-none');
    const credits = document.getElementById('credits-screen');
    credits.style.display = 'block';
    
    const goodChars = ['pm', 'policia_bol', 'rodrigo', 'rebelde', 'joe'];
    const chapareEndChars = ['dea', 'jara'];
    const isGood = goodChars.includes(selectedChar);
    const isChapareEnding = window._endingType === 'chapare' || chapareEndChars.includes(selectedChar);
    const endingTitle = isChapareEnding ? 'EVO HA CAÍDO' : (isGood ? 'DESBLOQUEASTE EL PAÍS' : 'BLOQUEASTE EL PAÍS');
    const endingColor = isChapareEnding ? '#ffd700' : (isGood ? '#0f0' : '#f44');
    const charNames = {
        'pm': 'POLICÍA MILITAR', 'policia_bol': 'POLICÍA BOLIVIANA', 'rodrigo': 'PRESIDENTE',
        'rebelde': 'REBELDE', 'dea': 'AGENTE DEA', 'jara': 'CAP. JARA',
        'perro': 'PERRO PETARDO', 'joe': 'JOE',
        'cholita': 'CHOLITA', 'poncho_j': 'PONCHO ROJO',
        'cob_j': 'COB', 'evo_j': 'EVO GONZALEZ'
    };
    
    document.getElementById('credits-content').innerHTML = `
        <p style="text-align:center;font-size:2.5rem;margin-bottom:10px;color:${endingColor};">★ ${endingTitle} ★</p>
        <p style="text-align:center;font-size:1.2rem;color:#aaa;margin-bottom:50px;">— ${charNames[selectedChar] || 'GUERRERO'} —</p>
        <p style="text-align:center;color:#fff;">REVELIÓN 2026 — EPISODIO FINAL</p>
        <p>Han pasado 50 días de resistencia. Este proyecto nació del caos de los bloqueos.</p>
        <p>Agradecemos a Dios por darnos un día más para respirar y seguir vivos.</p>
        <p>Gracias a la "inspiración" sarcástica de todo lo vivido; sin esa pausa forzada, este mundo no existiría.</p>
        <p style="text-align:center;margin-top:50px;">--- INTEGRANTES ---<br>Joel Sandi (Líder)<br>ARIA & NEBULA (IA)<br>JDR-IA Studios (Música)</p>
        <p style="text-align:center;margin-top:50px;">--- DATOS DE MISIÓN ---<br>Desarrollo: 50 Días<br>Origen: La Paz, Bolivia</p>
        <p style="text-align:center;margin-top:60px;font-size:1rem;color:#888;">© Derechos Reservados<br>HASHWAR TECHNOLOGIES / JOEL SANDI</p>
    `;
    
    // Generar campo de estrellas
    const starfield = document.getElementById('starfield');
    starfield.innerHTML = '';
    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 3 + 'px';
        star.style.width = size; star.style.height = size;
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.setProperty('--duration', Math.random() * 3 + 2 + 's');
        starfield.appendChild(star);
    }

    document.getElementById('credits-content').classList.add('animate-crawl');
    playBGM('menu'); 

    setTimeout(() => {
        credits.style.display = 'none';
        document.getElementById('start-screen').classList.remove('d-none');
    }, 55000);
}

function drawStoryScene(lvl) {
    const scvs = document.getElementById('storyCanvas'); if (!scvs) return;
    const sctx = scvs.getContext('2d'); sctx.fillStyle = "#000"; sctx.fillRect(0,0,800,250);
    
    // Marco de monitor
    sctx.strokeStyle = "#0ff"; sctx.lineWidth = 2; sctx.strokeRect(5,5,790,240);

    if (lvl === 1) { 
        sctx.save(); sctx.beginPath(); sctx.rect(10,10,780,230); sctx.clip();
        
        // Cielo dramático (Atardecer de guerra)
        let g = sctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#1a1a2e'); g.addColorStop(1, '#ff4d00'); sctx.fillStyle = g; sctx.fillRect(0,0,800,250);
        
        // Montañas (Illimani silueta)
        sctx.fillStyle = '#050510'; sctx.beginPath(); sctx.moveTo(400, 250); sctx.lineTo(550, 100); sctx.lineTo(650, 150); sctx.lineTo(750, 50); sctx.lineTo(850, 250); sctx.fill();
        
        // Edificios en llamas y humo
        for (let i = 0; i < 15; i++) {
            let bx = 10 + i * 55; let bw = 40 + (i%3)*10; let bh = 80 + (i%5)*30;
            sctx.fillStyle = '#0a0a0a'; sctx.fillRect(bx, 240-bh, bw, bh);
            // Ventanas con luces
            for(let wy=0; wy<bh-10; wy+=15) {
                for(let wx=5; wx<bw-5; wx+=10) {
                    if(((i*7 + wx + wy) % 10) > 6) { sctx.fillStyle = '#ffee00'; sctx.fillRect(bx+wx, 240-bh+wy, 4, 6); }
                }
            }
            // Humo negro animado
            if(i%4===0) {
                let t = Date.now() * 0.002 + i * 2;
                sctx.fillStyle = 'rgba(0,0,0,0.5)';
                for(let h=0; h<5; h++) {
                    let drift = Math.sin(t + h * 0.8) * 12;
                    sctx.beginPath(); sctx.arc(bx+bw/2 + drift + Math.sin(h)*10, 240-bh-h*18 + Math.sin(t*0.5 + h)*5, 15+h*5, 0, 7); sctx.fill();
                }
            }
        }
        
        // Gente caminando entre los edificios
        for (let i = 0; i < 4; i++) {
            let px = ((Date.now() * 0.03 + i * 200) % 900) - 50;
            let py = 200 + (i%3)*8;
            sctx.fillStyle = i%2 ? '#3e2723' : '#5d4037';
            sctx.fillRect(px, py, 6, 15); sctx.beginPath(); sctx.arc(px+3, py-2, 4, 0, 7); sctx.fill();
        }
        
        // Auto patrullando
        let carX = ((Date.now() * 0.05) % 900) - 50;
        sctx.fillStyle = '#1a237e'; sctx.fillRect(carX, 218, 30, 12);
        sctx.fillStyle = '#283593'; sctx.fillRect(carX+5, 214, 16, 10);
        sctx.fillStyle = '#ffeb3b'; sctx.fillRect(carX+8, 215, 4, 4);
        sctx.fillStyle = '#222'; sctx.beginPath(); sctx.arc(carX+6, 232, 4, 0, 7); sctx.beginPath(); sctx.arc(carX+24, 232, 4, 0, 7); sctx.fill();
        
        // Casa Grande del Pueblo (Arquitectura Detallada)
        const cx = 330, cy = 40, cw = 140, ch = 200;
        // Cuerpo principal (Torre)
        sctx.fillStyle = '#0a0a0a'; sctx.fillRect(cx, cy, cw, ch);
        sctx.strokeStyle = '#d4af37'; sctx.lineWidth = 2; sctx.strokeRect(cx, cy, cw, ch);
        
        // Fachada de Vidrio (Efecto Reflejo)
        sctx.fillStyle = 'rgba(0, 200, 255, 0.2)';
        for(let vy = cy + 10; vy < cy + ch - 10; vy += 15) {
            sctx.fillRect(cx + 10, vy, cw - 20, 8);
        }
        
        // Base de piedra (Estilo Tiwanacota moderno)
        sctx.fillStyle = '#1c1c1c'; sctx.fillRect(cx - 10, cy + ch - 40, cw + 20, 40);
        sctx.strokeStyle = '#8d6e63'; sctx.strokeRect(cx - 10, cy + ch - 40, cw + 20, 40);
        
        // Helipuerto en la cima
        sctx.fillStyle = '#222'; sctx.fillRect(cx + 20, cy - 5, cw - 40, 5);
        sctx.strokeStyle = '#fff'; sctx.lineWidth = 1;
        sctx.beginPath(); sctx.arc(cx + cw/2, cy - 2, 8, 0, 7); sctx.stroke();
        sctx.fillStyle = '#fff'; sctx.font = "bold 8px Arial"; sctx.fillText("H", cx + cw/2 - 3, cy - 1);
        
        // Luces de advertencia aérea (Rojas parpadeantes)
        if (Date.now() % 1000 < 500) {
            sctx.fillStyle = '#f00';
            sctx.beginPath(); sctx.arc(cx, cy, 3, 0, 7); sctx.arc(cx + cw, cy, 3, 0, 7); sctx.fill();
        }

        sctx.fillStyle = '#d4af37'; sctx.font = "bold 10px 'Share Tech Mono'";
        sctx.fillText("CASA GRANDE DEL PUEBLO", cx + 5, cy + ch + 15);
        
        // Helicóptero patrullando con luz de búsqueda
        let hx = 50 + (Date.now()%6000)/8;
        sctx.fillStyle = '#000'; sctx.fillRect(hx, 80, 30, 8); // Cuerpo
        sctx.fillRect(hx + 10, 75, 20, 2); // Aspas
        // Luz de búsqueda
        sctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
        sctx.beginPath(); sctx.moveTo(hx + 15, 88); sctx.lineTo(hx - 20, 180); sctx.lineTo(hx + 50, 180); sctx.fill();
        
        sctx.restore();
    }
    else if (lvl === 2) { 
        sctx.save(); sctx.beginPath(); sctx.rect(10,10,780,230); sctx.clip();
        
        // Cielo frío y despejado del altiplano
        let g = sctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#4a90e2'); g.addColorStop(1, '#d4a373'); sctx.fillStyle = g; sctx.fillRect(0,0,800,250);
        
        // Silueta de la cordillera lejana
        sctx.fillStyle = 'rgba(255,255,255,0.3)';
        sctx.beginPath(); sctx.moveTo(0, 150); sctx.lineTo(200, 100); sctx.lineTo(400, 130); sctx.lineTo(600, 80); sctx.lineTo(800, 150); sctx.fill();

        // Torres de Alta Tensión (Icónicas de El Alto)
        sctx.strokeStyle = '#222'; sctx.lineWidth = 2;
        for(let i=0; i<3; i++) {
            let tx = 100 + i*300;
            sctx.beginPath(); sctx.moveTo(tx, 250); sctx.lineTo(tx+20, 50); sctx.lineTo(tx+40, 250); sctx.stroke();
            sctx.beginPath(); sctx.moveTo(tx-10, 80); sctx.lineTo(tx+50, 80); sctx.stroke();
        }

        // Teleférico (Línea Azul/Plateada)
        let ty = 60;
        sctx.strokeStyle = '#555'; sctx.lineWidth = 1;
        sctx.beginPath(); sctx.moveTo(0, ty); sctx.lineTo(800, ty); sctx.stroke();
        let cabX = (Date.now()%5000)/5000 * 800;
        sctx.fillStyle = '#00f'; sctx.fillRect(cabX, ty, 15, 10); // Cabina
        sctx.fillStyle = '#fff'; sctx.fillRect(cabX+2, ty+2, 11, 3); // Ventana cabina

        // Ciudad de Ladrillo Visto (quita 80% = 3)
        for(let i=0; i<3; i++) {
            let hx = i * 55; let hh = 40 + (i%4)*20;
            sctx.fillStyle = '#b76e4b'; sctx.fillRect(hx, 240-hh, 40, hh);
            sctx.strokeStyle = '#8d4925'; sctx.strokeRect(hx, 240-hh, 40, hh);
            sctx.fillStyle = '#888'; sctx.fillRect(hx, 240-hh, 5, hh);
            sctx.fillRect(hx+35, 240-hh, 5, hh);
        }
        
        // Fogatas de bloqueo activas con humo animado
        for(let i=0; i<4; i++) {
            let fx = 80 + i*200;
            let t = Date.now() * 0.004 + i * 3;
            let flicker = Math.sin(t) * 5;
            sctx.fillStyle = '#f40'; sctx.beginPath(); sctx.arc(fx, 235, 15 + flicker, 0, 7); sctx.fill();
            sctx.fillStyle = '#ff0'; sctx.beginPath(); sctx.arc(fx, 235, 8 + flicker/2, 0, 7); sctx.fill();
            // Humo de llanta quemada animado
            sctx.fillStyle = 'rgba(0,0,0,0.4)';
            for (let h = 0; h < 4; h++) {
                let drift = Math.sin(t + h * 1.2) * 12;
                sctx.beginPath(); sctx.arc(fx + drift, 200 - flicker - h * 12, 18 - h * 2, 0, 7); sctx.fill();
            }
        }
        
        // Minibuses circulando
        for (let i = 0; i < 2; i++) {
            let bx = ((Date.now() * 0.04 + i * 400) % 900) - 50;
            sctx.fillStyle = '#1565c0'; sctx.fillRect(bx, 215, 35, 14);
            sctx.fillStyle = '#90caf9'; sctx.fillRect(bx+4, 217, 10, 6);
            sctx.fillRect(bx+20, 217, 10, 6);
            sctx.fillStyle = '#222'; sctx.beginPath(); sctx.arc(bx+8, 231, 4, 0, 7); sctx.beginPath(); sctx.arc(bx+27, 231, 4, 0, 7); sctx.fill();
        }
        
        // Gente caminando
        for (let i = 0; i < 5; i++) {
            let px = ((Date.now() * 0.025 + i * 170) % 900) - 50;
            let py = 195 + (i%3)*6;
            sctx.fillStyle = i%2 ? '#5d4037' : '#795548';
            sctx.fillRect(px, py, 5, 14); sctx.beginPath(); sctx.arc(px+2, py-2, 4, 0, 7); sctx.fill();
            // Poncho/sombrero
            if (i%3 === 0) { sctx.fillStyle = '#b71c1c'; sctx.fillRect(px-1, py-4, 7, 3); }
        }

        sctx.fillStyle = '#fff'; sctx.font = "bold 12px 'Share Tech Mono'";
        sctx.fillText("LA CIUDAD REBELDE - 4000 msnm", 280, 30);
        
        sctx.restore();
    }
    else if (lvl === 3) { 
        sctx.save(); sctx.beginPath(); sctx.rect(10,10,780,230); sctx.clip();
        
        // Cielo del altiplano minero
        let g = sctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#1a0a2e'); g.addColorStop(1, '#e85d04'); sctx.fillStyle = g; sctx.fillRect(0,0,800,250);
        
        // Cerro Pie de Gallo (socavón minero)
        sctx.fillStyle = '#4a3a2a'; sctx.beginPath(); sctx.moveTo(0, 250); sctx.lineTo(250, 80); sctx.lineTo(400, 130); sctx.lineTo(500, 60); sctx.lineTo(800, 250); sctx.fill();
        sctx.fillStyle = '#6d4c21'; sctx.beginPath(); sctx.moveTo(200, 250); sctx.lineTo(350, 100); sctx.lineTo(450, 150); sctx.lineTo(650, 50); sctx.lineTo(800, 200); sctx.lineTo(800, 250); sctx.fill();

        // Santuario Virgen del Socavón
        let sx = 580;
        sctx.fillStyle = '#d4a373'; sctx.fillRect(sx, 130, 60, 100);
        sctx.fillStyle = '#e8d5b7'; sctx.beginPath(); sctx.moveTo(sx-10, 130); sctx.lineTo(sx+30, 90); sctx.lineTo(sx+70, 130); sctx.fill();
        sctx.fillStyle = '#ffd700'; sctx.beginPath(); sctx.arc(sx+30, 100, 5, 0, 7); sctx.fill();
        sctx.fillStyle = '#fff'; sctx.font = "bold 8px Arial"; sctx.fillText("VIRGEN DEL SOCAVÓN", sx-5, 145);
        
        // Socavón (entrada a la mina)
        sctx.fillStyle = '#1a0a00'; sctx.beginPath(); sctx.arc(150, 220, 25, 0, 7); sctx.fill();
        sctx.strokeStyle = '#8d6e63'; sctx.lineWidth = 3; sctx.beginPath(); sctx.arc(150, 220, 28, 0, 7); sctx.stroke();

        // Diablada (bailarines con máscaras)
        for(let i=0; i<6; i++) {
            let dx = 80 + i * 110;
            let t = Date.now() * 0.003 + i * 1.5;
            let bounce = Math.abs(Math.sin(t)) * 8;
            sctx.fillStyle = ['#f00','#ff0','#0f0','#00f','#f0f','#ff8800'][i];
            sctx.fillRect(dx, 220-bounce, 15, 25);
            sctx.fillStyle = '#000'; sctx.fillRect(dx-3, 215-bounce, 21, 6);
            sctx.fillStyle = '#fff'; sctx.beginPath(); sctx.arc(dx+2, 208-bounce, 2, 0, 7); sctx.arc(dx+13, 208-bounce, 2, 0, 7); sctx.fill();
            sctx.fillStyle = '#f00'; sctx.beginPath(); sctx.arc(dx+7, 200-bounce, 8, 0, 7); sctx.fill();
            if(i%3===0) { sctx.fillStyle = '#ffd700'; sctx.beginPath(); sctx.arc(dx+7, 195-bounce, 4, 0, 7); sctx.fill(); }
        }

        // Casas coloniales de Oruro
        for(let i=0; i<5; i++) {
            let hx = 350 + i * 80;
            sctx.fillStyle = '#e8d5b7'; sctx.fillRect(hx, 190, 40, 60);
            sctx.fillStyle = '#d4a373'; sctx.fillRect(hx+5, 195, 8, 8);
            sctx.fillRect(hx+27, 195, 8, 8);
            sctx.fillStyle = '#6d4c21'; sctx.fillRect(hx+15, 220, 10, 30);
            sctx.strokeStyle = '#8d6e63'; sctx.strokeRect(hx, 190, 40, 60);
        }
        
        // Carros mineros (vagonetas)
        for(let i=0; i<2; i++) {
            let vx = 50 + i * 350 + Math.sin(Date.now()*0.002 + i)*15;
            sctx.fillStyle = '#333'; sctx.fillRect(vx, 230, 25, 15);
            sctx.fillStyle = '#ffd700'; sctx.fillRect(vx+3, 228, 5, 5);
            sctx.fillStyle = '#222'; sctx.beginPath(); sctx.arc(vx+5, 247, 3, 0, 7); sctx.beginPath(); sctx.arc(vx+20, 247, 3, 0, 7); sctx.fill();
        }

        sctx.fillStyle = '#ffd700'; sctx.font = "bold 11px 'Share Tech Mono'";
        sctx.fillText("ORURO - CAPITAL DEL FOLCLORE BOLIVIANO", 220, 30);
        
        sctx.restore();
    }
    else if (lvl === 4) { 
        sctx.save(); sctx.beginPath(); sctx.rect(10,10,780,230); sctx.clip();
        
        // Cielo cálido de valle
        let g = sctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#56ccf2'); g.addColorStop(1, '#2f80ed'); sctx.fillStyle = g; sctx.fillRect(0,0,800,250);
        
        // Montañas del Tunari (Fondo)
        sctx.fillStyle = '#3a5a40'; sctx.beginPath(); sctx.moveTo(-100, 250); sctx.lineTo(200, 80); sctx.lineTo(400, 150); sctx.lineTo(600, 50); sctx.lineTo(900, 250); sctx.fill();

        // Cristo de la Concordia (Imponente)
        const cx = 400, cy = 180;
        sctx.fillStyle = '#aaa'; sctx.fillRect(cx - 30, cy, 60, 40);
        sctx.strokeStyle = '#888'; sctx.strokeRect(cx - 30, cy, 60, 40);
        sctx.fillStyle = '#fff';
        sctx.beginPath(); sctx.moveTo(cx - 15, cy); sctx.lineTo(cx + 15, cy); sctx.lineTo(cx + 10, cy - 80); sctx.lineTo(cx - 10, cy - 80); sctx.fill();
        sctx.fillRect(cx - 60, cy - 70, 120, 12);
        sctx.beginPath(); sctx.arc(cx, cy - 90, 12, 0, 7); sctx.fill();
        sctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; sctx.lineWidth = 2;
        sctx.beginPath(); sctx.arc(cx, cy - 90, 18, 0, 7); sctx.stroke();

        for (let i = 0; i < 5; i++) {
            let nx = ((Date.now() * 0.008 + i * 180) % 900) - 50;
            sctx.fillStyle = 'rgba(255,255,255,0.3)';
            sctx.beginPath(); sctx.arc(nx, 30 + i*10, 20 + i*3, 0, 7); sctx.fill();
            sctx.beginPath(); sctx.arc(nx+25, 25 + i*10, 15 + i*3, 0, 7); sctx.fill();
        }

        for(let i=0; i<7; i++) {
            let cx = 60 + i * 100; let ch = 50 + (i%3)*20;
            sctx.fillStyle = '#e8d5b7'; sctx.fillRect(cx, 240-ch, 45, ch);
            sctx.fillStyle = '#d4a373'; sctx.fillRect(cx+5, 240-ch+5, 10, 10);
            sctx.fillRect(cx+30, 240-ch+5, 10, 10);
            sctx.fillStyle = '#6d4c21'; sctx.fillRect(cx+18, 240-ch+25, 10, ch-25);
            sctx.strokeStyle = '#8d6e63'; sctx.strokeRect(cx, 240-ch, 45, ch);
        }

        for(let i=0; i<5; i++) {
            let tx = 80 + i * 140; if(tx > 320 && tx < 480) continue;
            let th = 30 + (i%3)*10;
            sctx.fillStyle = '#5d4037'; sctx.fillRect(tx, 240-th, 8, th);
            sctx.fillStyle = '#1b5e20'; sctx.beginPath(); sctx.arc(tx+4, 240-th, 25, 0, 7); sctx.fill();
            sctx.fillStyle = '#f00'; sctx.beginPath(); sctx.arc(tx, 240-th-5, 3, 0, 7); sctx.arc(tx+8, 240-th+5, 3, 0, 7); sctx.fill();
        }

        for (let b = 0; b < 3; b++) {
            let lx = ((Date.now() * 0.05 + b * 250) % 900) - 100;
            let ly = 40 + b * 20;
            sctx.fillStyle = b%2 ? '#f44336' : '#2196f3';
            sctx.beginPath(); sctx.moveTo(lx, ly); sctx.lineTo(lx+12, ly-5); sctx.lineTo(lx+8, ly+5); sctx.fill();
        }
        
        for (let i = 0; i < 2; i++) {
            let ax = ((Date.now() * 0.035 + i * 500) % 900) - 50;
            sctx.fillStyle = '#e65100'; sctx.fillRect(ax, 218, 28, 11);
            sctx.fillStyle = '#ff8a65'; sctx.fillRect(ax+4, 215, 12, 8);
            sctx.fillStyle = '#222'; sctx.beginPath(); sctx.arc(ax+6, 231, 3, 0, 7); sctx.beginPath(); sctx.arc(ax+22, 231, 3, 0, 7); sctx.fill();
        }
        
        for (let i = 0; i < 3; i++) {
            let px = ((Date.now() * 0.02 + i * 300) % 900) - 50;
            sctx.fillStyle = '#4e342e'; sctx.fillRect(px, 205, 5, 13);
            sctx.beginPath(); sctx.arc(px+2, 202, 3, 0, 7); sctx.fill();
            sctx.fillStyle = '#fff'; sctx.fillRect(px-1, 200, 7, 3);
        }

        sctx.fillStyle = '#fff'; sctx.font = "bold 12px 'Share Tech Mono'";
        sctx.fillText("COCHABAMBA - CIUDAD JARDÍN", 280, 25);
        
        sctx.restore();
    }
    else if (lvl === 5) { 
        sctx.save(); sctx.beginPath(); sctx.rect(10,10,780,230); sctx.clip();
        
        // Cielo selvático del Chapare
        let g = sctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#2d5a27'); g.addColorStop(1, '#8bc34a'); sctx.fillStyle = g; sctx.fillRect(0,0,800,250);
        
        // Montañas verdes del Chapare
        sctx.fillStyle = '#1a4a14'; sctx.beginPath(); sctx.moveTo(-100, 250); sctx.lineTo(200, 80); sctx.lineTo(500, 160); sctx.lineTo(700, 60); sctx.lineTo(900, 250); sctx.fill();
        sctx.fillStyle = '#2d5a27'; sctx.beginPath(); sctx.moveTo(-100, 250); sctx.lineTo(150, 120); sctx.lineTo(400, 180); sctx.lineTo(600, 100); sctx.lineTo(900, 250); sctx.fill();
        
        // Plantaciones de coca
        for(let i=0; i<12; i++) {
            let cx = 50 + i * 65;
            sctx.fillStyle = '#4caf50'; sctx.fillRect(cx, 220, 12, 30);
            sctx.fillStyle = '#388e3c'; sctx.beginPath(); sctx.arc(cx+6, 215, 10, 0, 7); sctx.fill();
        }
        
        // Río caudaloso
        sctx.fillStyle = '#1565c0'; sctx.beginPath(); sctx.moveTo(0, 240); sctx.quadraticCurveTo(400, 210, 800, 240); sctx.lineTo(800, 250); sctx.lineTo(0, 250); sctx.fill();
        
        // Helicóptero de la DEA
        let hx = 50 + (Date.now()%4000)/6;
        sctx.fillStyle = '#1a1a1a'; sctx.fillRect(hx, 40, 40, 10);
        sctx.fillRect(hx+15, 32, 20, 3);
        sctx.fillStyle = '#ffd700'; sctx.font = "bold 6px Arial"; sctx.fillText("DEA", hx+8, 48);
        sctx.fillStyle = 'rgba(255,255,200,0.15)'; sctx.beginPath(); sctx.moveTo(hx+20, 50); sctx.lineTo(hx-20, 120); sctx.lineTo(hx+60, 120); sctx.fill();
        
        // Casas de madera del Chapare
        for(let i=0; i<3; i++) {
            let cx = 200 + i * 200;
            sctx.fillStyle = '#8d6e63'; sctx.fillRect(cx, 205, 35, 30);
            sctx.fillStyle = '#5d4037'; sctx.beginPath(); sctx.moveTo(cx-3, 205); sctx.lineTo(cx+17, 185); sctx.lineTo(cx+38, 205); sctx.fill();
            sctx.fillStyle = '#111'; sctx.fillRect(cx+10, 215, 8, 20);
        }

        sctx.fillStyle = '#fff'; sctx.font = "bold 12px 'Share Tech Mono'";
        sctx.fillText("CHAPARE - EL BASTIÓN DE EVO", 280, 25);
        sctx.fillStyle = '#ff0'; sctx.font = "bold 8px Arial"; sctx.fillText("🚁 APOYO AÉREO DE LA DEA ACTIVO", 300, 40);
        
        sctx.restore();
    }
    else { 
        sctx.save(); sctx.beginPath(); sctx.rect(10,10,780,230); sctx.clip();
        
        // Cielo tropical húmedo
        let g = sctx.createLinearGradient(0, 0, 0, 250); g.addColorStop(0, '#00d2ff'); g.addColorStop(1, '#92fe9d'); sctx.fillStyle = g; sctx.fillRect(0,0,800,250);
        
        // Skyline de Equipetrol
        for(let i=0; i<2; i++) {
            let bx = 100 + i * 110; let bh = 150 + (i%3)*40;
            sctx.fillStyle = '#1e3c72'; sctx.fillRect(bx, 240-bh, 60, bh);
            sctx.strokeStyle = '#00ffff'; sctx.lineWidth = 1; sctx.strokeRect(bx, 240-bh, 60, bh);
            sctx.fillStyle = 'rgba(255,255,255,0.1)';
            sctx.beginPath(); sctx.moveTo(bx, 240-bh); sctx.lineTo(bx+60, 240-bh+40); sctx.lineTo(bx+60, 240); sctx.lineTo(bx, 240-bh+40); sctx.fill();
        }

        // Nubes tropicales animadas
        for (let i = 0; i < 6; i++) {
            let nx = ((Date.now() * 0.006 + i * 150) % 950) - 50;
            sctx.fillStyle = 'rgba(255,255,255,0.25)';
            sctx.beginPath(); sctx.arc(nx, 25 + i*8, 25 + i*2, 0, 7); sctx.fill();
            sctx.beginPath(); sctx.arc(nx+30, 20 + i*8, 18 + i*2, 0, 7); sctx.fill();
        }

        // Palmeras Gigantes (con hojas meciéndose)
        for(let i=0; i<10; i++) {
            let px = i * 90;
            let sway = Math.sin(Date.now() * 0.002 + i * 0.7) * 3;
            sctx.fillStyle = '#5d4037'; sctx.fillRect(px + 40 + sway, 100, 12, 140);
            sctx.fillStyle = '#1b5e20';
            for(let a=0; a<6; a++) {
                sctx.save(); sctx.translate(px+46 + sway, 100); sctx.rotate(a * Math.PI/3 + Math.sin(Date.now()*0.003 + i + a)*0.04);
                sctx.beginPath(); sctx.ellipse(30, 0, 45, 8, 0, 0, 7); sctx.fill(); sctx.restore();
            }
        }

        // El Jaguar (Otorongo) acechando (cola se mueve)
        let jx = 550;
        let tailWag = Math.sin(Date.now() * 0.005) * 3;
        sctx.fillStyle = '#000';
        sctx.fillRect(jx, 210, 45, 20); // Cuerpo
        sctx.fillRect(jx+35, 195, 12, 15); // Cuello/Cabeza
        sctx.fillRect(jx, 225, 5, 10); sctx.fillRect(jx+40, 225, 5, 10); // Patas
        if (Date.now() % 1500 < 1200) { sctx.fillStyle = '#0f0'; sctx.fillRect(jx+42, 200, 2, 2); }
        sctx.fillStyle = '#000'; sctx.fillRect(jx-8 + tailWag, 218, 10 + Math.abs(tailWag), 4);

        // Tucán volando
        let tx = (Date.now()%5000)/5000 * 900 - 100;
        let wingUp = Math.sin(Date.now() * 0.01) * 3;
        sctx.fillStyle = '#000'; sctx.beginPath(); sctx.ellipse(tx, 50 + wingUp, 12, 6, 0, 0, 7); sctx.fill();
        sctx.fillStyle = '#ff9800'; sctx.fillRect(tx+8, 46 + wingUp, 15, 6);
        
        // Autos en la avenida
        for (let i = 0; i < 3; i++) {
            let ax = ((Date.now() * 0.045 + i * 300) % 950) - 50;
            sctx.fillStyle = ['#f44336','#ffeb3b','#2196f3'][i];
            sctx.fillRect(ax, 220, 25, 10);
            sctx.fillStyle = '#222'; sctx.beginPath(); sctx.arc(ax+6, 232, 3, 0, 7); sctx.beginPath(); sctx.arc(ax+19, 232, 3, 0, 7); sctx.fill();
        }
        
        // Gente caminando
        for (let i = 0; i < 4; i++) {
            let px = ((Date.now() * 0.02 + i * 250) % 950) - 50;
            sctx.fillStyle = ['#3e2723','#5d4037','#4e342e','#6d4c41'][i];
            sctx.fillRect(px, 207, 5, 13);
            sctx.beginPath(); sctx.arc(px+2, 204, 3, 0, 7); sctx.fill();
        }

        sctx.fillStyle = '#fff'; sctx.font = "bold 12px 'Share Tech Mono'";
        sctx.fillText("SANTA CRUZ - ÚLTIMA FRONTERA", 280, 25);
        
        sctx.restore();
    }
}
function drawEndingScene(isGood, isChapare) {
    const scvs = document.getElementById('storyCanvas'); if (!scvs) return;
    const sctx = scvs.getContext('2d'); sctx.fillStyle = "#000"; sctx.fillRect(0,0,800,300);
    sctx.save(); sctx.beginPath(); sctx.rect(0,0,800,300); sctx.clip();
    
    if (isChapare) {
        // Captura de Evo en el Chapare con apoyo DEA
        let g = sctx.createLinearGradient(0,0,0,300);
        g.addColorStop(0, '#0a1a0a'); g.addColorStop(0.5, '#2d5a27'); g.addColorStop(1, '#8bc34a');
        sctx.fillStyle = g; sctx.fillRect(0,0,800,300);
        
        // Helos DEA patrullando
        for(let i=0; i<3; i++) {
            let hx = ((Date.now() * 0.03 + i * 250) % 900) - 50;
            sctx.fillStyle = '#222'; sctx.fillRect(hx, 30 + i*25, 35, 8);
            sctx.fillRect(hx+10, 23 + i*25, 15, 3);
            sctx.fillStyle = '#ffd700'; sctx.font = "bold 5px Arial"; sctx.fillText("DEA", hx+8, 36 + i*25);
            sctx.fillStyle = 'rgba(255,255,200,0.1)'; sctx.beginPath(); sctx.moveTo(hx+15, 38 + i*25); sctx.lineTo(hx-30, 100 + i*20); sctx.lineTo(hx+60, 100 + i*20); sctx.fill();
        }
        
        // Selva del Chapare
        sctx.fillStyle = '#1a4a14'; sctx.beginPath(); sctx.moveTo(-100, 300); sctx.lineTo(200, 130); sctx.lineTo(500, 180); sctx.lineTo(800, 120); sctx.lineTo(900, 300); sctx.fill();
        for(let i=0; i<10; i++) { let cx = 40 + i*80; sctx.fillStyle = '#4caf50'; sctx.fillRect(cx, 230, 10, 30); sctx.fillStyle = '#388e3c'; sctx.beginPath(); sctx.arc(cx+5, 225, 8, 0, 7); sctx.fill(); }
        
        // Evo siendo capturado
        sctx.fillStyle = '#000'; sctx.fillRect(350, 200, 30, 45);
        sctx.fillStyle = '#e8be94'; sctx.fillRect(355, 195, 20, 12);
        sctx.fillStyle = '#fff'; sctx.fillRect(353, 192, 24, 5);
        sctx.fillStyle = '#ff0'; sctx.font = "bold 8px Arial"; sctx.fillText("EVO", 356, 210);
        sctx.strokeStyle = '#ff0'; sctx.lineWidth = 2; sctx.strokeRect(340, 190, 50, 65);
        
        // Soldados DEA escoltando
        for(let i=0; i<3; i++) {
            let sx = 420 + i*30;
            sctx.fillStyle = '#1a3a5a'; sctx.fillRect(sx, 200, 18, 45);
            sctx.fillStyle = '#e8be94'; sctx.beginPath(); sctx.arc(sx+9, 195, 7, 0, 7); sctx.fill();
            sctx.fillStyle = '#222'; sctx.fillRect(sx, 230, 18, 15);
            sctx.fillStyle = '#ffd700'; sctx.fillRect(sx+2, 198, 5, 3);
        }
        
        // Humo de las plantaciones quemadas
        for(let i=0; i<5; i++) {
            let t = Date.now()*0.003 + i*2;
            sctx.fillStyle = 'rgba(100,100,100,0.3)';
            sctx.beginPath(); sctx.arc(100 + i*150 + Math.sin(t)*20, 200 - Math.sin(t*0.5)*10, 20 + i*5, 0, 7); sctx.fill();
        }
        
        sctx.fillStyle = '#ff0'; sctx.font = "bold 16px 'Black Ops One',system-ui";
        sctx.fillText("🚁 CAPTURA EN EL CHAPARE 🚁", 200, 30);
        sctx.fillStyle = '#fff'; sctx.font = "bold 10px Arial";
        sctx.fillText("EVO GONZALEZ — BAJO CUSTODIA", 265, 50);
    } else if (isGood) {
        // Amanecer épico - Bolivia unificada
        let g = sctx.createLinearGradient(0,0,0,300);
        g.addColorStop(0, '#1a0533'); g.addColorStop(0.4, '#e65100'); g.addColorStop(0.7, '#ffb300'); g.addColorStop(1, '#fff9c4');
        sctx.fillStyle = g; sctx.fillRect(0,0,800,300);
        
        // Nubes doradas animadas
        for (let i = 0; i < 6; i++) {
            let nx = ((Date.now() * 0.004 + i * 140) % 900) - 50;
            sctx.fillStyle = 'rgba(255,200,100,0.15)';
            sctx.beginPath(); sctx.arc(nx, 40 + i*12, 30 + i*3, 0, 7); sctx.fill();
            sctx.beginPath(); sctx.arc(nx+25, 35 + i*12, 22 + i*2, 0, 7); sctx.fill();
        }
        
        // Sol radiante (con rayos pulsantes)
        let sunX = 400, sunY = 130;
        let pulse = Math.sin(Date.now() * 0.003) * 5;
        sctx.fillStyle = 'rgba(255,220,100,0.15)';
        for (let r = 80; r > 0; r -= 10) { sctx.beginPath(); sctx.arc(sunX, sunY, r + pulse, 0, 7); sctx.fill(); }
        sctx.fillStyle = '#fff9c4'; sctx.beginPath(); sctx.arc(sunX, sunY, 40, 0, 7); sctx.fill();
        sctx.fillStyle = '#fff'; sctx.beginPath(); sctx.arc(sunX-8, sunY-8, 25, 0, 7); sctx.fill();
        
        // Cordillera Real (Illimani) con nieve brillante
        sctx.fillStyle = '#2d1b4e';
        sctx.beginPath(); sctx.moveTo(0,300);
        sctx.lineTo(100,120); sctx.lineTo(200,180); sctx.lineTo(300,90); sctx.lineTo(400,140);
        sctx.lineTo(500,80); sctx.lineTo(600,130); sctx.lineTo(700,100); sctx.lineTo(800,160);
        sctx.lineTo(800,300); sctx.fill();
        sctx.fillStyle = 'rgba(255,255,255,0.12)';
        sctx.beginPath(); sctx.moveTo(0,300);
        sctx.lineTo(100,120); sctx.lineTo(200,180); sctx.lineTo(300,90); sctx.lineTo(400,140);
        sctx.lineTo(500,80); sctx.lineTo(600,130); sctx.lineTo(700,100); sctx.lineTo(800,160);
        sctx.lineTo(800,300); sctx.fill();
        
        // Pájaros volando
        for (let i = 0; i < 5; i++) {
            let bx = ((Date.now() * 0.03 + i * 170) % 900) - 50;
            let by = 60 + i * 15 + Math.sin(Date.now() * 0.005 + i) * 8;
            sctx.fillStyle = '#000';
            sctx.beginPath(); sctx.moveTo(bx, by); sctx.lineTo(bx+6, by-4); sctx.lineTo(bx+3, by+1); sctx.fill();
            sctx.beginPath(); sctx.moveTo(bx+6, by-4); sctx.lineTo(bx+12, by); sctx.lineTo(bx+9, by+1); sctx.fill();
        }
        
        // Carretera abierta
        sctx.fillStyle = '#333'; sctx.fillRect(0,240,800,60);
        sctx.fillStyle = '#555'; sctx.fillRect(0,245,800,5);
        sctx.fillStyle = '#ffd700'; sctx.setLineDash([20,15]);
        sctx.beginPath(); sctx.moveTo(0,270); sctx.lineTo(800,270); sctx.stroke();
        sctx.setLineDash([]);
        
        // Tráfico en ambas direcciones
        for (let i = 0; i < 3; i++) {
            let tx = ((Date.now() * 0.04 + i * 280) % 950) - 50;
            sctx.fillStyle = ['#e53935','#1565c0','#2e7d32'][i];
            sctx.fillRect(tx, 225, 40, 16);
            sctx.fillStyle = ['#b71c1c','#0d47a1','#1b5e20'][i];
            sctx.fillRect(tx+22, 221, 12, 18);
            sctx.fillStyle = '#222'; sctx.beginPath(); sctx.arc(tx+8, 243, 5, 0, 7); sctx.beginPath(); sctx.arc(tx+32, 243, 5, 0, 7); sctx.fill();
        }
        // Un auto yendo en sentido contrario
        let ox = ((Date.now() * 0.035 + 150) % 950) - 50;
        sctx.fillStyle = '#ff8f00'; sctx.fillRect(ox, 252, 30, 11);
        sctx.fillStyle = '#222'; sctx.beginPath(); sctx.arc(ox+7, 265, 4, 0, 7); sctx.beginPath(); sctx.arc(ox+23, 265, 4, 0, 7); sctx.fill();
        
        // Gente celebrando (con movimiento de brazos)
        for (let i = 0; i < 6; i++) {
            let px = 100 + i * 130 + Math.sin(Date.now()*0.003 + i)*5;
            let armRaise = Math.abs(Math.sin(Date.now()*0.004 + i)) * 6;
            sctx.fillStyle = i%2 ? '#8d6e63' : '#5d4037';
            sctx.fillRect(px-5, 210, 10, 30);
            sctx.beginPath(); sctx.arc(px, 205, 8, 0, 7); sctx.fill();
            sctx.fillStyle = '#f44336'; sctx.fillRect(px-10, 200 - armRaise, 20, 5);
        }
        
        // Gente caminando
        for (let i = 0; i < 4; i++) {
            let wx = ((Date.now() * 0.02 + i * 220) % 900) - 50;
            sctx.fillStyle = '#4e342e'; sctx.fillRect(wx, 218, 6, 16);
            sctx.beginPath(); sctx.arc(wx+3, 214, 4, 0, 7); sctx.fill();
        }
        
        // Bandera Bolivia flameando
        for (let i = 0; i < 6; i++) {
            let flagX = 50 + i * 140;
            let wave = Math.sin(Date.now()*0.005 + i*1.5) * 3;
            sctx.fillStyle = '#5d4037'; sctx.fillRect(flagX + wave, 195, 3, 30);
            let colors = ['#f00', '#ff0', '#0a0'];
            colors.forEach((c, j) => { sctx.fillStyle = c; sctx.fillRect(flagX + wave, 195 + j*5, 20 + wave, 5); });
        }
        
        sctx.fillStyle = 'rgba(255,215,0,0.6)';
        sctx.font = "bold 22px 'Black Ops One',system-ui";
        sctx.fillText("★ BOLIVIA UNIFICADA ★", 220, 50);
    } else {
        // Atardecer de rebelión - fuego y poder popular
        let g = sctx.createLinearGradient(0,0,0,300);
        g.addColorStop(0, '#0a0000'); g.addColorStop(0.3, '#4a0000'); g.addColorStop(0.6, '#ff2200'); g.addColorStop(1, '#ff6600');
        sctx.fillStyle = g; sctx.fillRect(0,0,800,300);
        
        // Luna roja pulsante
        let moonX = 600, moonY = 60;
        let moonPulse = Math.sin(Date.now()*0.004) * 5;
        sctx.fillStyle = 'rgba(255,0,0,0.12)';
        for (let r = 70; r > 0; r -= 8) { sctx.beginPath(); sctx.arc(moonX, moonY, r + moonPulse, 0, 7); sctx.fill(); }
        sctx.fillStyle = '#cc0000'; sctx.beginPath(); sctx.arc(moonX, moonY, 30, 0, 7); sctx.fill();
        
        // Nubes de tormenta pasando frente a la luna
        for (let i = 0; i < 4; i++) {
            let nx = ((Date.now() * 0.007 + i * 220) % 950) - 50;
            sctx.fillStyle = 'rgba(30,0,0,0.5)';
            sctx.beginPath(); sctx.arc(nx, 50 + i*12, 30 + i*4, 0, 7); sctx.fill();
            sctx.beginPath(); sctx.arc(nx+30, 45 + i*12, 22 + i*3, 0, 7); sctx.fill();
        }
        
        // Silueta de la Cordillera
        sctx.fillStyle = '#1a0000';
        sctx.beginPath(); sctx.moveTo(0,300);
        sctx.lineTo(150,130); sctx.lineTo(300,170); sctx.lineTo(450,110); sctx.lineTo(600,150);
        sctx.lineTo(750,90); sctx.lineTo(800,120); sctx.lineTo(800,300); sctx.fill();
        
        // Fábricas y chimeneas humeantes (humo animado)
        for (let i = 0; i < 8; i++) {
            let fx = 40 + i * 100;
            let fh = 60 + (i%3)*30;
            sctx.fillStyle = '#0a0a0a'; sctx.fillRect(fx, 240-fh, 50, fh);
            sctx.strokeStyle = '#330000'; sctx.strokeRect(fx, 240-fh, 50, fh);
            let t = Date.now() * 0.003 + i * 1.5;
            sctx.fillStyle = "rgba(80,0,0,0.5)";
            for (let h = 0; h < 4; h++) {
                let drift = Math.sin(t + h * 0.9) * 15;
                sctx.beginPath(); sctx.arc(fx+25 + drift + h*6, 240-fh-h*16 + Math.sin(t*0.5 + h)*4, 15+h*5, 0, 7); sctx.fill();
            }
        }
        
        // Wiphalas flameando (más dinámicas)
        for (let i = 0; i < 5; i++) {
            let wx = 30 + i * 170;
            let wave = Math.sin(Date.now()*0.006 + i*2) * 4;
            sctx.fillStyle = '#5d4037'; sctx.fillRect(wx + wave, 170, 3, 50);
            for (let r = 0; r < 49; r++) {
                let w = Math.sin(Date.now()*0.005 + r*0.1 + i) * 3;
                sctx.fillStyle = r%7 === 0 ? '#f00' : r%7 === 1 ? '#ff8c00' : r%7 === 2 ? '#ff0' : r%7 === 3 ? '#0a0' : r%7 === 4 ? '#00f' : r%7 === 5 ? '#4b0082' : '#8b0000';
                sctx.fillRect(wx + 3 + wave + w, 170 + r, 20, 1);
            }
        }
        
        // Barricadas en llamas con partículas
        for (let i = 0; i < 4; i++) {
            let bx = 50 + i * 220;
            let t = Date.now() * 0.005 + i * 3;
            sctx.fillStyle = '#222'; sctx.fillRect(bx, 215, 60, 25);
            let flicker = Math.sin(t) * 8;
            sctx.fillStyle = '#ff4400'; sctx.beginPath(); sctx.arc(bx+30, 210, 15 + flicker, 0, 7); sctx.fill();
            sctx.fillStyle = '#ffcc00'; sctx.beginPath(); sctx.arc(bx+25, 208, 8 + flicker*0.5, 0, 7); sctx.fill();
            // Humo animado de las llamas
            sctx.fillStyle = 'rgba(40,0,0,0.5)';
            for (let h = 0; h < 4; h++) {
                let drift = Math.sin(t*1.2 + h*1.1) * 14;
                sctx.beginPath(); sctx.arc(bx+30 + drift, 180 - h*14 + Math.sin(t*0.7 + h)*3, 18+h*5, 0, 7); sctx.fill();
            }
            // Chispas volando
            for (let s = 0; s < 3; s++) {
                let sx = bx + 15 + Math.sin(t*2 + s*2) * 25;
                let sy = 190 - Math.abs(Math.sin(t*1.5 + s*3)) * 30;
                sctx.fillStyle = '#ff6600'; sctx.beginPath(); sctx.arc(sx, sy, 2, 0, 7); sctx.fill();
            }
        }
        
        // Puños levantados (movimiento más vibrante)
        for (let i = 0; i < 7; i++) {
            let px = 60 + i * 110 + Math.sin(Date.now()*0.004 + i*2)*8;
            let raise = Math.abs(Math.sin(Date.now()*0.006 + i)) * 12;
            sctx.fillStyle = '#3e2723'; sctx.fillRect(px-4, 218-raise, 8, 22);
            sctx.beginPath(); sctx.arc(px, 213-raise, 7, 0, 7); sctx.fill();
            sctx.fillStyle = '#5d4037'; sctx.fillRect(px-4, 213-raise-5, 8, 6);
        }
        
        // Gente marchando al fondo
        for (let i = 0; i < 6; i++) {
            let mx = ((Date.now() * 0.015 + i * 140) % 900) - 50;
            sctx.fillStyle = '#2c1a1a';
            sctx.fillRect(mx, 223, 6, 15);
            sctx.beginPath(); sctx.arc(mx+3, 219, 4, 0, 7); sctx.fill();
        }
        
        sctx.fillStyle = 'rgba(255,50,0,0.5)';
        sctx.font = "bold 20px 'Black Ops One',system-ui";
        sctx.fillText("✊ EL PODER DEL PUEBLO ✊", 195, 45);
    }
    
    sctx.restore();
}

window.showStory = function(lvl, callback) {
    storyCallback = callback; document.getElementById('story-screen').classList.remove('d-none');
    document.getElementById('story-location').innerText = systemStories[lvl].loc;
    const txtDiv = document.getElementById('story-text'); txtDiv.innerHTML = "";
    let i = 0; const fullTxt = systemStories[lvl].txt;
    if (typingInterval) clearInterval(typingInterval);
    typingInterval = setInterval(() => { 
        if (i < fullTxt.length) { 
            txtDiv.innerHTML += fullTxt[i]; 
            if (i % 2 === 0) psnd('collect');
            i++; 
        } else { 
            clearInterval(typingInterval); 
        } 
    }, 40);
    currentStoryLevel = lvl; isEndingStory = false;
    if (storyAnimInterval) clearInterval(storyAnimInterval);
    storyAnimInterval = setInterval(() => drawStoryScene(lvl), 50);
    drawStoryScene(lvl);
}

window.skipStory = function() {
    if (typingInterval) clearInterval(typingInterval);
    if (storyAnimInterval) clearInterval(storyAnimInterval);
    document.getElementById('story-screen').classList.add('d-none');
    if (isEndingStory) {
        isEndingStory = false;
        startFinalCredits();
        return;
    }
    if (storyCallback) { const cb = storyCallback; storyCallback = null; cb(); }
}

function updateUI() {
    if (dom.hudMoney) dom.hudMoney.innerText = totalMoney;
    if (dom.hudBalas) dom.hudBalas.innerText = bul;
    if (dom.hudViveres) dom.hudViveres.innerText = sviv;
    if (dom.hudGasolina) dom.hudGasolina.innerText = sgas;
    if (dom.hudTimer) dom.hudTimer.innerText = Math.max(0, timeLeft);
    if (dom.hudHpFill) dom.hudHpFill.style.width = Math.max(0, plyr.hp) + '%';
    if (dom.hudHpText) dom.hudHpText.innerText = Math.max(0, plyr.hp);
    if (dom.hudLives) dom.hudLives.innerText = lives;
    if (abilActive && abilDur <= 0) { abilActive = false; }
    const abil = charAbilities[selectedChar];
    if (abil) {
        if (dom.hudAbilName) dom.hudAbilName.innerText = abil.icon + ' ' + abil.name;
        if (abilCd > 0) {
            const secs = Math.ceil(abilCd / 60);
            if (dom.hudAbilCd) dom.hudAbilCd.innerText = '[' + secs + 's]';
            if (dom.hudAbility) { dom.hudAbility.style.borderColor = '#ff4444'; dom.hudAbility.style.color = '#ff6666'; }
        } else if (abilDur > 0) {
            if (dom.hudAbilCd) dom.hudAbilCd.innerText = '[ACTIVA]';
            if (dom.hudAbility) { dom.hudAbility.style.borderColor = '#00ff00'; dom.hudAbility.style.color = '#00ff00'; }
        } else {
            if (dom.hudAbilCd) dom.hudAbilCd.innerText = '[Z]';
            if (dom.hudAbility) { dom.hudAbility.style.borderColor = '#0ff'; dom.hudAbility.style.color = '#0ff'; }
        }
    }
}

function useAbility() {
    const a = charAbilities[selectedChar];
    if (!a) return;
    if (selectedChar === 'pm') {
        // PM - DRON TÁCTICO: despliega dron con láser
        drones.push(new TactDrone(plyr.x + (plyr.f === 1 ? 60 : -60), plyr.y - 80));
        abilActive = true;
    } else if (selectedChar === 'policia_bol') {
        // Policia - GAS LACRIMÓGENO: lanza gas tóxico
        let canX = plyr.x + (plyr.f === 1 ? 30 : -30);
        let canY = plyr.y - 15;
        for (let i = 0; i < 6; i++) parts.push(new Part(canX + Math.sin(i)*5, canY + Math.cos(i)*5, '#ffcc00'));
        setTimeout(() => {
            if (!gover && !gwin) {
                teargas.push(new TearGas(canX, canY));
                psnd('boom');
            }
        }, 250);
        abilActive = true;
    } else if (selectedChar === 'rebelde') {
        // Rebelde - LLUVIA DE FUEGO: proyectiles caen del cielo
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                if (!gover && !gwin) {
                    let tx = plyr.x - 150 + Math.random() * 300 + (plyr.f === 1 ? 80 : -80);
                    // Estela de fuego
                    for (let p = 0; p < 6; p++) parts.push(new Part(tx + Math.sin(p) * 10, Math.random() * -100, '#ff4400'));
                    // Fuego en el suelo
                    fires.push(new Fire(tx));
                    // Explosión
                    for (let p = 0; p < 12; p++) parts.push(new Part(tx + Math.sin(p * 2) * 20, cvs.height - 40 + Math.cos(p) * 10, ['#f40','#ff0','#f00','#fa0'][p % 4]));
                    // Daño inmediato + empuje
                    enms.forEach(e => {
                        if (Math.abs(e.x - tx) < 65) {
                            e.hp -= 6;
                            e.x += (e.x - tx) * 0.3;
                            if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); }
                        }
                    });
                    psnd('boom');
                }
            }, i * 70);
        }
    } else if (selectedChar === 'cholita') {
        // Cholita - FOGATA ANDINA: fogata tradicional que cura y quema
        let fx = plyr.x + (plyr.f === 1 ? 50 : -50);
        fogatas.push(new Fogata(fx, cvs.height - 35));
        for (let i = 0; i < 12; i++) parts.push(new Part(fx + Math.sin(i*2)*15, cvs.height - 40 + Math.cos(i)*10, '#ff4400'));
        psnd('boom');
        abilActive = true;
    } else if (selectedChar === 'poncho_j') {
        plyr.defense += 20; abilActive = true;
    } else if (selectedChar === 'cob_j') {
        dynas.push(new Dyna(plyr.x + (plyr.f === 1 ? 40 : -10), plyr.y - 10, plyr.f));
        psnd('boom');
    } else if (selectedChar === 'evo_j') {
        enms.forEach(e => { if (e._origSp === undefined) e._origSp = e.sp; e.sp = 0.3; });
        abilActive = true;
    } else if (selectedChar === 'dea') {
        for (let i = 0; i < 8; i++) {
            setTimeout(() => { if (!gover && !gwin) { abuls.push(new Bull(plyr.x + (plyr.f === 1 ? 35 : -5), plyr.y + 25, plyr.f)); psnd('shoot'); } }, i * 50);
        }
    } else if (selectedChar === 'jara') {
        helis.push(new Helicopter(plyr.x + 300, 50));
        helis.push(new Helicopter(plyr.x - 200, 60));
        psnd('shoot');
    } else if (selectedChar === 'rodrigo') {
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (!gover && !gwin) {
                    const hx = plyr.x - 200 + Math.random() * 400;
                    fires.push(new Fire(hx)); psnd('boom');
                    enms.forEach(e => { if (Math.abs(e.x - hx) < 100) { e.hp -= 5; if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); } } });
                }
            }, i * 150);
        }
    } else if (selectedChar === 'perro') {
        // Perro Petardo - carrera explosiva en cadena
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                if (!gover && !gwin) {
                    let ex = plyr.x - 150 + i * 70;
                    dynas.push(new Dyna(ex, plyr.y - 15, 1));
                    for(let p=0; p<6; p++) parts.push(new Part(ex+Math.sin(p*2)*20, plyr.y-20-Math.cos(p)*15, ['#f60','#ff0','#f00','#fff'][p%4]));
                    psnd('boom');
                    enms.forEach(e => { if (Math.abs(e.x - ex) < 100) { e.hp -= 6; if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); } } });
                }
            }, i * 120);
        }
    } else if (selectedChar === 'joe') {
        // Joe - ONDAS DE RADIO: laptop + ondas expansivas dañan enemigos
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                if (!gover && !gwin) {
                    let wx = plyr.x + (plyr.f === 1 ? 20 : -20);
                    let wy = plyr.y - 10;
                    radioWaves.push(new RadioWave(wx, wy));
                    for(let p=0; p<6; p++) parts.push(new Part(wx+Math.sin(p*3)*15, wy+Math.cos(p*2)*10, '#0f0'));
                    enms.forEach(e => {
                        if (Math.abs(e.x - wx) < 180 && Math.abs(e.y - wy) < 120) {
                            e.hp -= 3;
                            for(let p=0; p<3; p++) parts.push(new Part(e.x+Math.sin(p)*8, e.y-15+Math.cos(p)*8, '#0f0'));
                            if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); }
                        }
                    });
                }
            }, i * 120);
        }
        enms.forEach(e => { if (e._origSp === undefined) e._origSp = e.sp; e.sp = 0.1; });
        abilActive = true;
    }
    abilCd = a.cd;
    if (a.dur > 0) abilDur = a.dur;
    else abilDur = 0;
}

class Rain { constructor() { this.reset(); } reset() { this.x = Math.random() * cvs.width; this.y = Math.random() * -cvs.height; this.v = 8 + Math.random() * 6; this.l = 8 + Math.random() * 12; } update() { this.y += this.v; this.x -= 1 + Math.random() * 2; if (this.y > cvs.height) this.reset(); } draw() { ctx.strokeStyle = 'rgba(180, 210, 255, 0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - 2, this.y + this.l); ctx.stroke(); } }
class CloudLayer { constructor(l) { this.l = l; this.x = Math.random() * cvs.width; this.s = 0.5 + Math.random() * 0.7; } update() { this.x += (0.1 + currentWeatherData.wind * 0.5) * this.s; if (this.x > cvs.width + 200) this.x = -200; } draw() { ctx.save(); ctx.translate(this.x, 20 + this.l * 15); ctx.fillStyle = `rgba(200, 210, 220, ${0.15 + this.l * 0.15})`; for(let i=0; i<4; i++) { ctx.beginPath(); ctx.arc(i * 50 + Math.sin(this.x * 0.01 + i) * 20, Math.sin(this.x * 0.02 + i) * 10, 40 + i * 15, 0, 7); ctx.fill(); } ctx.restore(); } }

const weathers = {
    'dia': { sky: ['#4fa1ff', '#87ceeb'], starOp: 0, ambient: '#1a3a5a', sunOp: 1, snow: false, rain: false, fog: 0, wind: 0.2, clouds: true },
    'noche': { sky: ['#000511', '#001a33'], starOp: 1, ambient: '#051122', sunOp: 0, snow: false, rain: false, fog: 0, wind: 0, clouds: false },
    'atardecer': { sky: ['#ff4500', '#4b0082'], starOp: 0.2, ambient: '#3a1a3a', sunOp: 0.5, snow: false, rain: false, fog: 0, wind: 0.1, clouds: true },
    'amanecer': { sky: ['#ff7e5f', '#feb47b'], starOp: 0.1, ambient: '#3d2b1f', sunOp: 0.3, snow: false, rain: false, fog: 0, wind: 0.1, clouds: true },
    'nieve': { sky: ['#808080', '#c0c0c0'], starOp: 0, ambient: '#333', sunOp: 0, snow: true, rain: false, fog: 0.3, wind: 0.5, clouds: true },
    'lluvia': { sky: ['#4a5568', '#718096'], starOp: 0, ambient: '#2d3748', sunOp: 0.1, snow: false, rain: true, fog: 0.2, wind: 0.4, clouds: true },
    'tormenta': { sky: ['#1a202c', '#2d3748'], starOp: 0, ambient: '#1a202c', sunOp: 0, snow: false, rain: true, fog: 0.4, wind: 0.7, clouds: true, lightning: true },
    'niebla': { sky: ['#a0aec0', '#cbd5e0'], starOp: 0, ambient: '#718096', sunOp: 0.2, snow: false, rain: false, fog: 0.7, wind: 0.1, clouds: false }
};
const weatherKeys = Object.keys(weathers);
let currentWeather = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];

function changeWeather() {
    let nextW;
    do { nextW = weatherKeys[Math.floor(Math.random() * weatherKeys.length)]; } while (nextW === currentWeather);
    currentWeather = nextW;
    currentWeatherData = weathers[currentWeather];
    const weatherNames = { 'dia': 'DÍA ☀️', 'noche': 'NOCHE 🌙', 'atardecer': 'ATARDECER 🌅', 'amanecer': 'AMANECER 🌄', 'nieve': 'NIEVE ❄️', 'lluvia': 'LLUVIA 🌧️', 'tormenta': 'TORMENTA ⛈️', 'niebla': 'NIEBLA 🌫️' };
    const weatherIcon = { 'dia': '☀️', 'noche': '🌙', 'atardecer': '🌅', 'amanecer': '🌄', 'nieve': '❄️', 'lluvia': '🌧️', 'tormenta': '⛈️', 'niebla': '🌫️' };
    if (dom.uiWeather) dom.uiWeather.innerText = (weatherNames[currentWeather] || currentWeather.toUpperCase());
    const toast = dom.weatherToast;
    if (toast) {
        toast.style.display = 'block'; toast.style.opacity = '1';
        clearTimeout(toast._hide);
        toast._hide = setTimeout(() => { toast.style.transition = 'opacity 1s'; toast.style.opacity = '0'; setTimeout(() => { toast.style.display = 'none'; toast.style.transition = ''; }, 1000); }, 2000);
    }
    bgDirty = true;
}

function drawPreview(canvasId, type) {
    const c = document.getElementById(canvasId); if (!c) return;
    const x = c.getContext('2d'); x.clearRect(0,0,100,150); x.save(); x.translate(50, 100); x.scale(1.5, 1.5); 
    let b = Math.sin(Date.now() * 0.005) * 2; renderChar(x, type, b); x.restore();
    if (!document.getElementById('char-selection-screen').classList.contains('d-none')) requestAnimationFrame(() => drawPreview(canvasId, type));
}

class Part { constructor(x, y, c) { this.x = x; this.y = y; this.s = Math.random() * 4 + 1; this.vx = Math.random() * 4 - 2; this.vy = Math.random() * -4 - 1; this.c = c; this.l = 1.0; } update() { this.x += this.vx; this.y += this.vy; this.l -= 0.04; } draw() { ctx.save(); ctx.globalAlpha = this.l; ctx.fillStyle = this.c; ctx.fillRect(this.x - camX, this.y, this.s, this.s); ctx.restore(); } }

class RadioWave {
    constructor(x, y) {
        this.x = x; this.y = y; this.r = 0;
        this.maxR = 180; this.op = 0.8;
    }
    update() {
        this.r += 3; this.op -= 0.005;
        if (this.r >= this.maxR * 0.8) this.op -= 0.03;
    }
    draw() {
        if (this.op <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.op);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y, this.r, 0, 7);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,255,136,0.3)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y, Math.max(0, this.r - 10), 0, 7);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,255,136,0.08)';
        ctx.beginPath();
        ctx.arc(this.x - camX, this.y, Math.max(0, this.r - 5), 0, 7);
        ctx.fill();
        ctx.restore();
    }
    isDead() { return this.op <= 0; }
}
let parts = [];

class Bird {
    constructor() { this.x = Math.random() * cvs.width; this.y = 30 + Math.random() * 80; this.v = 2 + Math.random() * 2; this.s = 0; }
    update() { this.x -= this.v; this.s += 0.2; if (this.x < -50) { this.x = cvs.width + 50; this.y = 30 + Math.random() * 80; } }
    draw() { ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath(); let wing = Math.sin(this.s) * 5; ctx.moveTo(this.x, this.y + wing); ctx.lineTo(this.x + 10, this.y); ctx.lineTo(this.x + 20, this.y + wing); ctx.stroke(); }
}

class Helicopter {
    constructor(x, y) { this.x = x; this.y = y; this.vx = -4; this.a = true; this.atk = 0; }
    update() {
        this.x += this.vx; this.atk++;
        if (this.atk % 40 === 0 && Math.abs(this.x - plyr.x) < 400) { ebuls.push(new EBul(this.x, this.y + 20)); psnd('shoot'); }
        if (this.x < camX - 200) this.a = false;
    }
    draw() {
        ctx.save(); ctx.translate(this.x - camX, this.y); ctx.fillStyle = '#333'; ctx.fillRect(0, 0, 80, 20); ctx.fillRect(60, 0, 40, 8); ctx.fillStyle = '#111'; ctx.fillRect(-10, -5, 100, 3);
        ctx.fillStyle = '#5f5'; ctx.globalAlpha = 0.5; ctx.fillRect(10, 5, 15, 10); ctx.restore(); ctx.globalAlpha = 1;
    }
}

class TactDrone {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.a = true; this.atk = 0; this.tm = 180;
        this.target = null;
    }
    update() {
        this.tm--;
        if (this.tm <= 0) { this.a = false; return; }
        this.atk++;
        // Seguir al jugador ligeramente
        this.x += (plyr.x - this.x + (plyr.f === 1 ? 50 : -50)) * 0.02;
        this.y += (plyr.y - 80 - this.y) * 0.02;
        // Buscar enemigo más cercano
        let nearest = null, nearDist = 9999;
        enms.forEach(e => {
            let d = Math.abs(e.x - this.x);
            if (d < nearDist && e.hp > 0 && e.x > camX - 100 && e.x < camX + cvs.width + 100) {
                nearDist = d; nearest = e;
            }
        });
        this.target = nearest;
        if (this.target && this.atk % 8 === 0) {
            this.target.hp -= 3;
            for (let p = 0; p < 4; p++) parts.push(new Part(this.target.x + Math.sin(p * 2) * 8, this.target.y - 10 + Math.cos(p) * 8, '#ff4444'));
            if (this.target.hp <= 0) {
                totalMoney += (this.target.t.includes('evo') ? 30 : (this.target.t.includes('cob') ? 10 : 5));
                this.target.x = -2000; updateUI();
            }
        }
    }
    draw() {
        if (!this.a) return;
        ctx.save();
        let sx = this.x - camX;
        // Láser al enemigo
        if (this.target && this.target.hp > 0 && this.target.x > camX - 100 && this.target.x < camX + cvs.width + 100) {
            let tx = this.target.x - camX, ty = this.target.y;
            let grad = ctx.createLinearGradient(sx, this.y, tx, ty);
            grad.addColorStop(0, 'rgba(255, 50, 50, 0.8)');
            grad.addColorStop(0.5, 'rgba(255, 150, 50, 0.4)');
            grad.addColorStop(1, 'rgba(255, 50, 50, 0)');
            ctx.strokeStyle = grad;
            ctx.lineWidth = 3 + Math.sin(gframe * 0.3) * 1;
            ctx.shadowBlur = 15; ctx.shadowColor = '#ff4444';
            ctx.beginPath(); ctx.moveTo(sx, this.y); ctx.lineTo(tx, ty); ctx.stroke();
            ctx.shadowBlur = 0;
            // Destello en el enemigo
            ctx.fillStyle = `rgba(255, 100, 50, ${0.3 + Math.sin(gframe * 0.2) * 0.2})`;
            ctx.beginPath(); ctx.arc(tx, ty, 6 + Math.sin(gframe * 0.3) * 2, 0, 7); ctx.fill();
        }
        // Dron
        ctx.translate(sx, this.y);
        // Rotor
        ctx.fillStyle = '#555';
        ctx.fillRect(-12, 0, 24, 3);
        ctx.fillStyle = '#777';
        ctx.fillRect(-14, -1, 28, 1);
        // Hélices girando
        ctx.fillStyle = `rgba(200,200,200,${0.3 + Math.sin(gframe * 0.3) * 0.2})`;
        ctx.fillRect(-18, 0, 8, 3); ctx.fillRect(10, 0, 8, 3);
        // Cuerpo
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(-6, 3, 12, 8);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-8, 4, 16, 6);
        // Cámara / sensor (ojo rojo)
        ctx.fillStyle = '#f00';
        ctx.beginPath(); ctx.arc(0, 7, 2.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(0.5, 6.5, 0.8, 0, 7); ctx.fill();
        // Antena
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -4); ctx.stroke();
        ctx.fillStyle = '#0f0'; ctx.beginPath(); ctx.arc(0, -5, 1.5, 0, 7); ctx.fill();
        ctx.restore();
    }
}

class GasCloud {
    constructor(x) { this.x = x; this.y = cvs.height - 50; this.w = 120; this.tm = 300; this.a = true; }
    update() { this.tm--; if (this.tm <= 0) this.a = false; if (Math.abs(plyr.x - this.x) < this.w/2 && plyr.y > cvs.height - 100) plyr.dmg(1); }
    draw() {
        ctx.save(); ctx.translate(this.x - camX, this.y); ctx.fillStyle = 'rgba(200, 200, 200, 0.4)';
        for(let i=0; i<6; i++) { ctx.beginPath(); ctx.arc(Math.sin(gframe*0.05 + i)*20, 0, 25, 0, 7); ctx.fill(); } ctx.restore();
    }
}

class TearGas {
    constructor(x, y) {
        this.x = x; this.y = y; this.r = 10; this.maxR = 130;
        this.tm = 300; this.a = true; this.atk = 0;
        this.hit = new Set();
    }
    update() {
        this.tm--; if (this.tm <= 0) { this.a = false; this.cleanup(); return; }
        if (this.r < this.maxR) this.r += 1.5;
        this.atk++;
        if (this.atk % 15 === 0) {
            enms.forEach(e => {
                if (Math.abs(e.x - this.x) < this.r && Math.abs(e.y - this.y) < this.r) {
                    if (!this.hit.has(e)) { this.hit.add(e); if (e._origSp === undefined) e._origSp = e.sp; }
                    e.hp -= 3;
                    e.sp = 0.3;
                    for (let p = 0; p < 4; p++) parts.push(new Part(e.x + Math.sin(p)*8, e.y - 15 + Math.cos(p)*8, '#ffcc00'));
                    if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); }
                }
            });
        }
    }
    cleanup() {
        this.hit.forEach(e => { if (e._origSp) { e.sp = e._origSp; delete e._origSp; } });
        this.hit.clear();
    }
    draw() {
        if (!this.a) return;
        ctx.save(); ctx.translate(this.x - camX, this.y);
        let op = Math.min(1, this.tm / 100) * 0.5;
        ctx.fillStyle = `rgba(255, 200, 50, ${op})`;
        for (let i = 0; i < 8; i++) {
            let angle = i * Math.PI / 4 + gframe * 0.02;
            let dist = this.r * 0.6 + Math.sin(gframe * 0.03 + i) * 20;
            ctx.beginPath(); ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 28 + Math.sin(gframe * 0.05 + i * 2) * 8, 0, 7); ctx.fill();
        }
        ctx.fillStyle = `rgba(255, 100, 0, ${op * 0.3})`;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.arc(Math.sin(gframe * 0.04 + i * 3) * this.r * 0.5, Math.cos(gframe * 0.03 + i * 2) * this.r * 0.4, 8 + Math.sin(gframe * 0.06 + i) * 4, 0, 7); ctx.fill();
        }
        ctx.restore();
    }
}

class Fogata {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.tm = 360; this.a = true; this.atk = 0;
    }
    update() {
        this.tm--; if (this.tm <= 0) { this.a = false; return; }
        this.atk++;
        if (gframe % 3 === 0) parts.push(new Part(this.x + Math.random()*30-15, this.y - 10 + Math.random()*10, ['#f40','#ff0','#f00','#fa0'][Math.floor(Math.random()*4)]));
        if (this.atk % 30 === 0 && Math.abs(plyr.x - this.x) < 80) plyr.hp = Math.min(100, plyr.hp + 2);
        if (this.atk % 15 === 0) {
            enms.forEach(e => {
                if (Math.abs(e.x - this.x) < 70) {
                    e.hp -= 4;
                    if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); }
                }
            });
        }
    }
    draw() {
        if (!this.a) return;
        ctx.save(); ctx.translate(this.x - camX, this.y);
        let grad = ctx.createRadialGradient(0, -10, 5, 0, -20, 55);
        grad.addColorStop(0, 'rgba(255,150,50,0.4)');
        grad.addColorStop(0.5, 'rgba(255,69,0,0.2)');
        grad.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-55, -70, 110, 70);
        let h = 28 + Math.sin(gframe * 0.1) * 8;
        let grad2 = ctx.createLinearGradient(0, 0, 0, -h);
        grad2.addColorStop(0, '#ff4400');
        grad2.addColorStop(0.5, '#ffaa00');
        grad2.addColorStop(1, 'rgba(255,200,50,0)');
        ctx.fillStyle = grad2;
        let w = 14 + Math.sin(gframe * 0.15) * 3;
        ctx.fillRect(-w/2, 0, w, -h);
        ctx.fillStyle = '#5d4037'; ctx.fillRect(-16, -2, 32, 4);
        ctx.fillStyle = '#4e342e'; ctx.fillRect(-12, -6, 24, 4);
        ctx.fillStyle = `rgba(200,200,200,${0.08 + Math.sin(gframe * 0.04) * 0.04})`;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath(); ctx.arc(Math.sin(gframe * 0.03 + i * 2) * 18, -h - 8 - i * 12 + Math.sin(gframe * 0.04 + i) * 4, 8 + i * 3, 0, 7); ctx.fill();
        }
        ctx.restore();
    }
}

class Llama {
    constructor(x, y) { this.x = x; this.y = y; this.c = ['#fff', '#d2b48c', '#8b4513'][Math.floor(Math.random()*3)]; }
    draw() { ctx.save(); ctx.translate(this.x - camX * 0.8, this.y); ctx.fillStyle = this.c; ctx.fillRect(0, 0, 20, 12); ctx.fillRect(14, -12, 6, 15); ctx.fillRect(14, -15, 8, 5); ctx.fillRect(2, 12, 3, 8); ctx.fillRect(15, 12, 3, 8); ctx.restore(); }
}

class Obstacle {
    constructor(x, y, t) { this.x = x; this.y = y; this.t = t; this.w = 60; this.h = 40; }
    draw() {
        ctx.save(); ctx.translate(this.x - camX, this.y);
        if (this.t === 'barricada') { ctx.fillStyle = '#444'; ctx.fillRect(0, 0, 50, 40); ctx.fillStyle = '#f00'; ctx.fillRect(5, 5, 40, 10); ctx.fillStyle = '#fff'; ctx.font = "bold 8px Arial"; ctx.fillText("BLOQUEO", 5, 25); }
        else if (this.t === 'roca') { ctx.fillStyle = '#666'; ctx.beginPath(); ctx.moveTo(0, 40); ctx.lineTo(15, 0); ctx.lineTo(35, 5); ctx.lineTo(50, 40); ctx.fill(); }
        else if (this.t === 'tronco') { ctx.fillStyle = '#5d4037'; ctx.fillRect(0, 20, 60, 20); ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(0, 30, 10, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(60, 30, 10, 0, 7); ctx.fill(); }
        else if (this.t === 'barril') { 
            ctx.fillStyle = '#fdd835'; ctx.fillRect(0, 0, 40, 40); // Cuerpo barril
            ctx.fillStyle = '#f9a825'; ctx.fillRect(0, 10, 40, 5); ctx.fillRect(0, 25, 40, 5); // Franjas
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.strokeRect(0, 0, 40, 40);
        }
        ctx.restore();
    }
}

class Player {
    constructor() { this.w = 30; this.h = 55; this.x = 100; this.y = cvs.height - 100; this.vx = 0; this.vy = 0; this.jmp = false; this.f = 1; this.st = 'idle'; this.hp = 100; this.inv = 0; this.defense = 0; this.damageMod = 0; }
    draw() { ctx.save(); ctx.translate(this.x + this.w / 2 - camX, this.y + this.h / 2); if (this.f === -1) ctx.scale(-1, 1); if (this.inv % 10 > 5) ctx.globalAlpha = 0.5; let b = (this.st === 'walk') ? Math.sin(gframe * 0.2) * 3 : 0; renderChar(ctx, selectedChar, b); ctx.restore(); ctx.globalAlpha = 1.0; }
    update() {
        if (this.inv > 0) this.inv--;
        if (keys.ArrowRight || keys.KeyD) { this.vx = psp; this.f = 1; this.st = this.jmp ? 'jump' : 'walk'; }
        else if (keys.ArrowLeft || keys.KeyA) { this.vx = -psp; this.f = -1; this.st = this.jmp ? 'jump' : 'walk'; }
        else { this.vx = 0; this.st = this.jmp ? 'jump' : 'idle'; }
        if ((keys.Space || keys.KeyW) && !this.jmp) { this.vy = -jf; this.jmp = true; psnd('jump'); }
        this.vy += grav; this.x += this.vx; this.y += this.vy;
        if (this.y + this.h > cvs.height - 30) { this.y = cvs.height - 30 - this.h; this.vy = 0; this.jmp = false; }
        if (this.x < 0) this.x = 0; if (this.x > llen - 200) { if (!gwin) winLevel(); }
    }
    dmg(a) { if (this.inv > 0) return; let finalDmg = Math.max(1, a - this.defense); this.hp -= finalDmg; this.inv = 60; psnd('hit'); for (let i = 0; i < 15; i++) parts.push(new Part(this.x + 15, this.y + 25, '#f00')); updateUI(); if (this.hp <= 0) { lives--; if (lives > 0) { this.hp = 100; this.x = 100; this.y = cvs.height - 100; this.vy = 0; camX = 0; } else { gover = true; } } }
}

function winLevel() { inShop = true; document.getElementById('shop-screen').classList.remove('d-none'); document.getElementById('shop-money').innerText = totalMoney; }

window.saveGameScore = function() {
    const name = document.getElementById('player-name-input').value;
    if (!name) return alert("Ingresa tu alias!");
    const data = { nombre: name, dinero: totalMoney, tiempo: timeLeft, unidad: selectedChar };
    fetch('api/leaderboard.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    .then(() => { document.getElementById('save-score-section').classList.add('d-none'); loadLeaderboard(); });
}

function loadLeaderboard() {
    fetch('api/leaderboard.php').then(r => r.json()).then(data => {
        const sect = document.getElementById('leaderboard-section'); const table = document.getElementById('leaderboard-table');
        sect.classList.remove('d-none');
        table.innerHTML = data.map((r, i) => `<div class="d-flex justify-content-between border-bottom border-secondary py-1"><span>${i+1}. ${r.nombre}</span><span class="text-warning">$${r.dinero}</span><span class="text-info">${r.tiempo_restante}s</span></div>`).join('');
    });
}

function drawSantaCruzBuilding(x, y) {
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(x, y - 180, 60, 180);
    ctx.fillStyle = '#34495e'; ctx.fillRect(x + 10, y - 200, 40, 20);
    ctx.fillStyle = '#1abc9c'; for(let i=0; i<15; i++) ctx.fillRect(x + 5, y - 170 + i*12, 50, 5);
    ctx.restore(); ctx.globalAlpha = 1;
}

class Enmy {
    constructor(x, y, t, dir = -1) { 
        this.x = x; this.y = y; this.w = 30; this.h = 55; this.t = t; this.dir = dir;
        if (t === 'evo' || t === 'rodrigo_e' || t === 'evo_j') this.hp = 18; else if (t === 'cob' || t === 'pm_e' || t === 'policia_bol_e' || t === 'cob_j') this.hp = 3; else this.hp = 1; 
        this.sp = (t === 'evo' || t === 'rodrigo_e' || t === 'evo_j') ? 0.8 : (1.5 + Math.random()); 
        this.atkM = 0; this.atkD = 0; this.atkS = 0; this.active = (t === 'evo' || t === 'rodrigo_e' || t === 'evo_j'); 
        if (t === 'poncho') this.proj = Math.random() > 0.5 ? 'piedra' : 'molotov';
        else if (t === 'pm_e') this.proj = 'palo';
        else if (t === 'policia_bol_e') this.proj = 'gas';
        else if (t === 'cob' || t === 'cob_j') this.proj = 'piedra';
        else if (t === 'rebelde_e') this.proj = 'botella';
        else this.proj = 'molotov';
    }
    draw() { ctx.save(); ctx.translate(this.x - camX + this.w / 2, this.y + this.h / 2); if(this.dir === 1) ctx.scale(-1, 1); let v = Math.sin(gframe * 0.1) * 2; renderChar(ctx, this.t, v); ctx.restore(); }
    update() { 
        if (Math.abs(this.x - plyr.x) < 450) this.active = true; if (!this.active) return; 
        
        if (this.x > plyr.x + 20) { this.dir = -1; }
        else if (this.x < plyr.x - 20) { this.dir = 1; }
        else { this.dir = 0; }

        this.x += this.sp * this.dir; 
        
        if (Math.abs(this.x - plyr.x) < 600) { 
            this.atkM++; if (this.atkM > 180 && ((this.dir === -1 && this.x > plyr.x) || (this.dir === 1 && this.x < plyr.x))) {
                if (this.proj === 'gas') gasps.push(new GasProj(this.x, this.y + 20, this.dir));
                else mlts.push(new Molo(this.x, this.y + 20, this.dir, this.proj));
                this.atkM = 0;
            } 
            if (this.t === 'poncho' || this.t === 'pm_e' || this.t === 'policia_bol_e' || this.t === 'rodrigo_e') { this.atkS++; if (this.atkS > 120) { ebuls.push(new EBul(this.x + (this.dir*20), this.y + 25, this.dir)); this.atkS = 0; psnd('shoot'); } } 
            if (this.t === 'cob' || this.t === 'rebelde_e' || this.t === 'evo' || this.t === 'rodrigo_e') { this.atkD++; if (this.atkD > 220) { dynas.push(new Dyna(this.x, this.y + 20, this.dir)); this.atkD = 0; } } 
        } 
    }
}

class Item { constructor(x, y, t) { this.x = x; this.y = y; this.t = t; this.a = true; } draw() { if (!this.a) return; let v = Math.sin(gframe * 0.1) * 5; ctx.save(); ctx.translate(this.x - camX, this.y + v);
    if (this.t === 'comida') {
        // Pollo rostizado
        ctx.fillStyle = '#d4943a'; ctx.beginPath(); ctx.ellipse(15, 16, 11, 7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#c47a3a'; ctx.beginPath(); ctx.ellipse(15, 14, 9, 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#8B4513'; ctx.fillRect(3, 14, 6, 5); ctx.fillRect(21, 14, 6, 5);
        ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.arc(15, 8, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#8B4513'; ctx.beginPath(); ctx.arc(15, 6, 4, 0, 7); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(14, 5, 0.8, 0, 7); ctx.fill();
        ctx.fillStyle = '#e6a85a'; ctx.beginPath(); ctx.arc(15, 9, 1.5, 0, 7); ctx.fill();
    } else if (this.t === 'gasolina') {
        // Tanque de gasolina
        ctx.fillStyle = '#cc3333'; ctx.fillRect(3, 5, 24, 22);
        ctx.fillStyle = '#aa2222'; ctx.fillRect(6, 8, 18, 16);
        ctx.fillStyle = '#888'; ctx.fillRect(12, 2, 6, 5);
        ctx.fillStyle = '#666'; ctx.fillRect(14, 0, 2, 3);
        ctx.fillStyle = '#fff'; ctx.font = "bold 9px Arial"; ctx.fillText("GAS", 6, 20);
    } else if (this.t === 'balas') {
        // Caja de munición con balas visibles
        ctx.fillStyle = '#4a7a2e'; ctx.fillRect(2, 10, 26, 18);
        ctx.fillStyle = '#3a6a1e'; ctx.fillRect(0, 8, 30, 4);
        ctx.fillStyle = '#ffd700'; ctx.fillRect(4, 14, 22, 2);
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = '#c0c0c0'; ctx.beginPath(); ctx.arc(6 + i * 7, 6, 3, 0, 7); ctx.fill();
            ctx.fillStyle = '#ffd700'; ctx.fillRect(4 + i * 7, 4, 4, 2);
        }
        ctx.fillStyle = '#222'; ctx.font = "bold 7px Arial"; ctx.fillText("50", 10, 23);
    } else if (this.t === 'vida') {
        // Corazón
        ctx.fillStyle = '#e01030'; ctx.beginPath();
        ctx.moveTo(15, 8);
        ctx.bezierCurveTo(15, 2, 1, 0, 1, 10);
        ctx.bezierCurveTo(1, 16, 8, 21, 15, 28);
        ctx.bezierCurveTo(22, 21, 29, 16, 29, 10);
        ctx.bezierCurveTo(29, 0, 15, 2, 15, 8);
        ctx.fill();
        ctx.fillStyle = '#ff3060'; ctx.beginPath(); ctx.arc(15, 18, 8, 0, 7); ctx.fill();
    } else {
        ctx.fillStyle = '#ffd700'; ctx.fillRect(5, 5, 20, 20);
    }
    ctx.restore(); } }
class Bull { constructor(x, y, d) { this.x = x; this.y = y; this.d = d; this.a = true; } update() { this.x += this.d * 12; if (Math.abs(this.x - plyr.x) > 1000) this.a = false; } draw() { ctx.fillStyle = '#ffee00'; ctx.fillRect(this.x - camX, this.y, 15, 5); } }
class EBul { constructor(x, y, d) { this.x = x; this.y = y; this.d = d; this.a = true; } update() { this.x += this.d * 8; if (Math.abs(this.x - plyr.x) > 1000) this.a = false; } draw() { ctx.fillStyle = '#ff0'; ctx.fillRect(this.x - camX, this.y, 10, 3); } }
class Molo { constructor(x, y, d, t) { this.x = x; this.y = y; this.vx = d * (5 + Math.random() * 2); this.vy = -12 - Math.random() * 3; this.a = true; this.r = 0; this.t = t || 'molotov'; } update() { this.vy += grav; this.x += this.vx; this.y += this.vy; this.r += 0.2; if (this.y > cvs.height - 35) { this.a = false; if (this.t === 'molotov' || this.t === 'botella') fires.push(new Fire(this.x, 'enemy')); psnd('hit'); } } draw() { ctx.save(); ctx.translate(this.x - camX, this.y); ctx.rotate(this.r); if (this.t === 'piedra') { ctx.fillStyle = '#777'; ctx.beginPath(); ctx.arc(0, 0, 9, 0, 7); ctx.fill(); ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(-3, -2, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#999'; ctx.beginPath(); ctx.arc(2, 2, 2, 0, 7); ctx.fill(); } else if (this.t === 'palo') { ctx.fillStyle = '#6d4c21'; ctx.fillRect(-4, -14, 8, 28); ctx.fillStyle = '#5d3c11'; ctx.fillRect(-2, -12, 2, 24); ctx.fillStyle = '#8d6c31'; ctx.fillRect(1, -14, 2, 4); } else if (this.t === 'botella') { ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#1b5e20'; ctx.fillRect(-3, -14, 6, 8); ctx.fillStyle = '#ffeb3b'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill(); } else { ctx.fillStyle = '#654321'; ctx.fillRect(-5, -10, 10, 20); ctx.fillStyle = (gframe % 4 === 0) ? '#ff0' : '#f40'; ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(-8, -25); ctx.lineTo(8, -25); ctx.fill(); } ctx.restore(); if (this.t === 'molotov') parts.push(new Part(this.x, this.y, '#f40')); } }
class GasProj { constructor(x, y, d) { this.x = x; this.y = y; this.vx = d * 5; this.vy = -5; this.a = true; this.r = 0; } update() { this.vy += grav * 0.3; this.x += this.vx; this.y += this.vy; this.r += 0.1; if (this.y > cvs.height - 50) { this.a = false; gases.push(new GasCloud(this.x)); psnd('hit'); } } draw() { ctx.save(); ctx.translate(this.x - camX, this.y); ctx.rotate(this.r); ctx.fillStyle = 'rgba(0, 255, 100, 0.5)'; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(150, 255, 150, 0.3)'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0, 200, 80, 0.6)'; ctx.fillRect(-6, -4, 12, 8); ctx.restore(); } }
class Fire { constructor(x, owner) { this.x = x; this.y = cvs.height - 30; this.w = 80; this.tm = 108; this.a = true; this.owner = owner || 'player'; } update() { this.tm--; if (this.tm <= 0) this.a = false; if (gframe % 2 === 0) parts.push(new Part(this.x + Math.random() * this.w - this.w / 2, this.y, '#f40')); } draw() { ctx.save(); ctx.translate(this.x - camX, this.y); let g = ctx.createLinearGradient(0, 0, 0, -50); g.addColorStop(0, 'rgba(255,69,0,0.9)'); g.addColorStop(1, 'rgba(255,165,0,0)'); ctx.fillStyle = g; ctx.fillRect(-this.w / 2, 0, this.w, -35 - Math.sin(gframe * 0.5) * 15); ctx.restore(); } }
class Dyna { constructor(x, y, d) { this.x = x; this.y = y; this.vx = d * (4 + Math.random() * 2); this.vy = -10; this.a = true; this.r = 0; } update() { this.vy += grav; this.x += this.vx; this.y += this.vy; this.r += 0.2; if (this.y > cvs.height - 35) { this.a = false; fires.push(new Fire(this.x, 'enemy')); psnd('boom'); } } draw() { ctx.save(); ctx.translate(this.x - camX, this.y); ctx.rotate(this.r); ctx.fillStyle = '#f00'; ctx.fillRect(-4, -10, 8, 20); ctx.fillStyle = '#fff'; ctx.fillRect(-1, -15, 2, 5); ctx.restore(); } }
class Snow { constructor() { this.reset(); } reset() { this.x = Math.random() * cvs.width; this.y = Math.random() * -cvs.height; this.v = 1 + Math.random() * 2; this.s = 1 + Math.random() * 3; this.sw = Math.random() * 2; this.ph = Math.random() * 6.28; } update() { this.y += this.v; this.x += Math.sin(gframe * 0.05 + this.ph) * 0.5; if (this.y > cvs.height) this.reset(); } draw() { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(this.x, this.y, this.s, 0, 7); ctx.fill(); } }

let snowflakes = Array.from({length: 60}, () => new Snow());
let rains = Array.from({length: 50}, () => new Rain());
let clouds = Array.from({length: 5}, (_, i) => new CloudLayer(i));
let lightningFlash = 0;
let currentWeatherData = weathers[currentWeather] || weathers['dia'];
let enms = [], itms = [], mlts = [], fires = [], abuls = [], ebuls = [], dynas = [], birds = [], llamas = [], obss = [], helis = [], gases = [], gasps = [], radioWaves = [], drones = [], teargas = [], fogatas = [];
const plyr = new Player();
let currentLevel = 1;

function renderChar(x, type, b) {
    x.fillStyle = 'rgba(0,0,0,0.4)';
    x.beginPath(); x.ellipse(0, 38+b, 18, 6, 0, 0, 7); x.fill();

    const armSwing = Math.sin(gframe * 0.15) * 8;
    const gAura = (abilActive && selectedChar === type);
    const drawArm = (posX, posY, col, isFront) => {
        x.save();
        x.translate(posX, posY + b);
        x.rotate((isFront ? -armSwing : armSwing) * Math.PI / 180);
        x.fillStyle = col;
        x.fillRect(-3, 0, 7, 20);
        x.fillStyle = '#e8be94';
        x.fillRect(-3, 18, 7, 5);
        x.restore();
    };

    if (gAura) {
        x.shadowBlur = 20; x.shadowColor = '#0ff';
    }

    if (type.includes('pm')) {
        // Policía Militar - camuflaje plomo/gris, chaleco táctico, insignia PM
        // Piernas con camuflaje
        x.fillStyle = '#666'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#444'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Manchas de camuflaje en piernas
        x.fillStyle = '#555'; x.fillRect(-10, 20+b, 4, 6); x.fillRect(4, 24+b, 5, 5);
        x.fillStyle = '#777'; x.fillRect(-6, 28+b, 4, 4); x.fillRect(6, 20+b, 3, 4);
        // Cuerpo - chaqueta camuflada
        x.fillStyle = '#888'; x.fillRect(-16, -10+b, 32, 28);
        x.fillStyle = '#666'; x.fillRect(-14, -8+b, 8, 10); x.fillRect(2, -6+b, 10, 12);
        x.fillStyle = '#777'; x.fillRect(-8, -2+b, 12, 6); x.fillRect(-12, 4+b, 8, 6);
        x.fillStyle = '#999'; x.fillRect(4, -2+b, 6, 5); x.fillRect(-14, -4+b, 6, 4);
        // Chaleco táctico negro
        x.fillStyle = '#222'; x.fillRect(-17, -8+b, 34, 20);
        x.fillStyle = '#333'; x.fillRect(-14, -6+b, 28, 16);
        // Bolsillos del chaleco
        x.fillStyle = '#111'; x.fillRect(-12, -4+b, 6, 5); x.fillRect(6, -4+b, 6, 5);
        x.fillStyle = '#222'; x.fillRect(-12, 3+b, 10, 4); x.fillRect(2, 3+b, 10, 4);
        // Placa PM en el chaleco
        x.fillStyle = '#fff'; x.fillRect(-5, -2+b, 10, 6);
        x.strokeStyle = '#000'; x.lineWidth = 0.8; x.strokeRect(-5, -2+b, 10, 6);
        x.fillStyle = '#000'; x.font = "bold 3.5px Arial"; x.fillText("PM", -3.5, 2+b);
        // Cinturón
        x.fillStyle = '#111'; x.fillRect(-17, 12+b, 34, 4);
        x.fillStyle = '#888'; x.fillRect(-3, 12+b, 6, 4);
        // Brazos con mangas camufladas
        x.fillStyle = '#777'; x.fillRect(-24, -8+b, 8, 22); x.fillRect(16, -8+b, 8, 22);
        x.fillStyle = '#666'; x.fillRect(-24, -4+b, 8, 6); x.fillRect(16, 0+b, 8, 8);
        x.fillStyle = '#888'; x.fillRect(-24, 4+b, 8, 5); x.fillRect(16, 8+b, 8, 4);
        // Manos
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-20, 14+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(20, 14+b, 4, 0, 7); x.fill();
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 10, 0, 0, 7); x.fill();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -24+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -24+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -24.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -24.5+b, 0.7, 0, 7); x.fill();
        // Cejas firmes
        x.strokeStyle = '#222'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-7, -28+b); x.lineTo(-2, -27+b); x.stroke();
        x.beginPath(); x.moveTo(7, -28+b); x.lineTo(2, -27+b); x.stroke();
        // Nariz y boca
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -20+b, 1.5, 2, 0, 0, 7); x.fill();
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -17+b, 2.5, 0.2, 2.9); x.stroke();
        // Boina negra/plomo
        x.fillStyle = '#333'; x.beginPath(); x.ellipse(0, -36+b, 12, 7, 0, 1.5, 5.5); x.fill();
        x.fillStyle = '#444'; x.fillRect(-10, -40+b, 20, 6);
        // Insignia de la boina
        x.fillStyle = '#aaa'; x.fillRect(-2, -38+b, 4, 3);
        // Gafas tácticas oscuras
        x.strokeStyle = '#111'; x.lineWidth = 1.5; x.strokeRect(-7, -27+b, 6, 4); x.strokeRect(1, -27+b, 6, 4);
        x.fillStyle = 'rgba(0, 0, 0, 0.5)'; x.fillRect(-7, -27+b, 6, 4); x.fillRect(1, -27+b, 6, 4);
        // Parche PM en brazo
        x.fillStyle = '#fff'; x.fillRect(-23, 0+b, 5, 5);
        x.fillStyle = '#000'; x.font = "bold 2.5px Arial"; x.fillText("PM", -22.5, 4+b);
        // Visor táctico con escáner cuando habilidad activa
        if (gAura) {
            x.save();
            x.fillStyle = `rgba(255, 50, 50, ${0.08 + Math.sin(gframe * 0.1) * 0.05})`;
            x.fillRect(-18, -12+b, 36, 26);
            x.strokeStyle = `rgba(255, 100, 50, ${0.3 + Math.sin(gframe * 0.1) * 0.2})`;
            x.lineWidth = 1;
            x.strokeRect(-18, -12+b, 36, 26);
            // Línea de escáner
            let scanY = (Math.sin(gframe * 0.08) * 0.5 + 0.5) * 26;
            x.fillStyle = `rgba(255, 100, 50, ${0.2 + Math.sin(gframe * 0.1) * 0.1})`;
            x.fillRect(-18, -12+b + scanY, 36, 1.5);
            x.restore();
        }
    } else if (type.includes('policia')) {
        // Policía Boliviana - uniforme verde pacay, gorra, placa, equipo táctico
        // Piernas
        x.fillStyle = '#5b7a4a'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#4a6a3a'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Cuerpo - chaqueta verde
        x.fillStyle = '#6b8f56'; x.fillRect(-16, -10+b, 32, 28);
        // Camisa blanca debajo
        x.fillStyle = '#fff'; x.fillRect(-12, -10+b, 24, 8);
        // Correaje / cinturón de servicio
        x.fillStyle = '#333'; x.fillRect(-17, 10+b, 34, 5);
        x.fillStyle = '#888'; x.fillRect(-3, 10+b, 6, 5);
        x.fillStyle = '#555'; x.fillRect(-14, 11+b, 4, 3); x.fillRect(10, 11+b, 4, 3);
        // Placa policial dorada en el pecho
        x.fillStyle = '#ffd700'; x.beginPath(); x.arc(0, -4+b, 5, 0, 7); x.fill();
        x.fillStyle = '#b8860b'; x.beginPath(); x.arc(0, -4+b, 4, 0, 7); x.fill();
        x.fillStyle = '#ffd700'; x.font = "bold 3px Arial"; x.fillText("P", -1, -3+b);
        // Brazos con mangas
        x.fillStyle = '#6b8f56'; x.fillRect(-24, -8+b, 8, 24); x.fillRect(16, -8+b, 8, 24);
        x.fillStyle = '#5b7a4a'; x.fillRect(-24, -2+b, 8, 8); x.fillRect(16, 0+b, 8, 8);
        // Manos
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-20, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(20, 16+b, 4, 0, 7); x.fill();
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 10, 0, 0, 7); x.fill();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -24+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -24+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -24.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -24.5+b, 0.7, 0, 7); x.fill();
        // Cejas
        x.strokeStyle = '#222'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(-7, -28+b); x.lineTo(-2, -27+b); x.stroke();
        x.beginPath(); x.moveTo(7, -28+b); x.lineTo(2, -27+b); x.stroke();
        // Nariz y boca
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -20+b, 1.5, 2, 0, 0, 7); x.fill();
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -17+b, 2.5, 0.2, 2.9); x.stroke();
        // Gorra verde con visera
        x.fillStyle = '#4a6a3a'; x.fillRect(-10, -38+b, 20, 12);
        x.fillStyle = '#5b7a4a'; x.fillRect(-11, -38+b, 22, 4);
        x.fillStyle = '#333'; x.fillRect(-14, -28+b, 28, 4);
        // Escudo de la gorra
        x.fillStyle = '#ffd700'; x.fillRect(-3, -34+b, 6, 4);
        // Barbiquejo (cinta bajo la barbilla)
        x.strokeStyle = '#4a6a3a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-8, -16+b); x.lineTo(-10, -8+b); x.stroke();
        x.beginPath(); x.moveTo(8, -16+b); x.lineTo(10, -8+b); x.stroke();
    } else if (type.includes('rebelde')) {
        // Rebelde - estilo rapero/urbano, hoodie rojo, pantalón holgado
        // Piernas (pantalón holgado)
        x.fillStyle = '#333'; x.fillRect(-14, 16+b, 12, 22); x.fillRect(2, 16+b, 12, 22);
        x.fillStyle = '#222'; x.fillRect(-15, 36+b, 14, 4); x.fillRect(1, 36+b, 14, 4);
        // Zapatillas
        x.fillStyle = '#fff'; x.fillRect(-15, 38+b, 6, 3); x.fillRect(9, 38+b, 6, 3);
        x.fillStyle = '#f00'; x.fillRect(-14, 39+b, 4, 2); x.fillRect(10, 39+b, 4, 2);
        // Cuerpo - hoodie rojo (más grande, sobrado)
        x.fillStyle = '#E31E24'; x.fillRect(-18, -10+b, 36, 28);
        x.fillStyle = '#c4161a'; x.fillRect(-20, -12+b, 40, 6);
        // Capucha del hoodie (doblada hacia atrás, se ve sobre los hombros)
        // Cadena de oro
        x.strokeStyle = '#ffd700'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, -8+b); x.lineTo(-4, -2+b); x.lineTo(2, 4+b); x.stroke();
        x.fillStyle = '#ffd700'; x.beginPath(); x.arc(0, -8+b, 2.5, 0, 7); x.fill();
        // Brazos con mangas de hoodie
        x.fillStyle = '#E31E24'; x.fillRect(-26, -8+b, 10, 24); x.fillRect(16, -8+b, 10, 24);
        x.fillStyle = '#c4161a'; x.fillRect(-26, -4+b, 10, 6); x.fillRect(16, 0+b, 10, 6);
        // Manos con gesto de rap
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-21, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(21, 16+b, 4, 0, 7); x.fill();
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 11, 0, 0, 7); x.fill();
        // Gorra hacia atrás
        x.fillStyle = '#111'; x.fillRect(-12, -36+b, 24, 12);
        x.fillStyle = '#f00'; x.fillRect(-10, -38+b, 20, 5);
        x.fillStyle = '#ffd700'; x.fillRect(-8, -37+b, 16, 2);
        // Visera de la gorra (hacia atrás)
        x.fillStyle = '#222'; x.beginPath(); x.moveTo(10, -28+b); x.lineTo(20, -26+b); x.lineTo(20, -22+b); x.lineTo(10, -24+b); x.fill();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -23+b, 2, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -23+b, 2, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -23.5+b, 0.8, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -23.5+b, 0.8, 0, 7); x.fill();
        // Cejas
        x.strokeStyle = '#222'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-7, -27+b); x.lineTo(-2, -26+b); x.stroke();
        x.beginPath(); x.moveTo(7, -27+b); x.lineTo(2, -26+b); x.stroke();
        // Nariz y boca
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -19+b, 1.5, 2, 0, 0, 7); x.fill();
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -16+b, 2.5, 0.1, 3); x.stroke();
        // Barba/goatee
        x.fillStyle = '#111'; x.beginPath(); x.ellipse(0, -13+b, 3, 2, 0, 0, 7); x.fill();
        // Auriculares de DJ en el cuello
        x.fillStyle = '#222'; x.beginPath(); x.arc(-8, -12+b, 4, 0.5, 2.5); x.stroke();
        x.beginPath(); x.arc(8, -12+b, 4, 0.8, 2.8); x.stroke();
        x.fillStyle = '#333'; x.fillRect(-10, -14+b, 20, 4);
    } else if (type.includes('dea')) {
        // DEA - agente táctico, casco, chaleco antibalas, equipo de asalto
        // Piernas con rodilleras
        x.fillStyle = '#1a2744'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#0f1a2e'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        x.fillStyle = '#333'; x.fillRect(-11, 26+b, 4, 6); x.fillRect(7, 26+b, 4, 6);
        // Botas tácticas
        x.fillStyle = '#111'; x.fillRect(-14, 38+b, 6, 4); x.fillRect(8, 38+b, 6, 4);
        // Cuerpo - camiseta azul oscuro
        x.fillStyle = '#1e3050'; x.fillRect(-16, -10+b, 32, 28);
        // Chaleco antibalas
        x.fillStyle = '#2a4060'; x.fillRect(-18, -8+b, 36, 20);
        x.fillStyle = '#3a5070'; x.fillRect(-14, -6+b, 28, 16);
        // Bolsillos del chaleco
        x.fillStyle = '#1e3050'; x.fillRect(-12, -4+b, 7, 5); x.fillRect(5, -4+b, 7, 5);
        x.fillStyle = '#1e3050'; x.fillRect(-10, 3+b, 9, 4); x.fillRect(1, 3+b, 9, 4);
        // Placa DEA
        x.fillStyle = '#ffd700'; x.fillRect(-7, 0+b, 14, 6);
        x.strokeStyle = '#000'; x.lineWidth = 0.8; x.strokeRect(-7, 0+b, 14, 6);
        x.fillStyle = '#000'; x.font = "bold 4px Arial"; x.fillText("DEA", -5, 5+b);
        // Cinturón táctico con equipo
        x.fillStyle = '#111'; x.fillRect(-17, 12+b, 34, 5);
        x.fillStyle = '#666'; x.fillRect(-14, 13+b, 4, 3); x.fillRect(10, 13+b, 4, 3);
        x.fillStyle = '#888'; x.fillRect(-3, 13+b, 6, 3);
        // Brazos con mangas
        x.fillStyle = '#1e3050'; x.fillRect(-24, -8+b, 8, 24); x.fillRect(16, -8+b, 8, 24);
        // Parche bandera en brazo
        x.fillStyle = '#00a'; x.fillRect(-25, -2+b, 6, 4); x.fillStyle = '#f00'; x.fillRect(-25, 0+b, 6, 2);
        // Manos enguantadas
        x.fillStyle = '#222'; x.beginPath(); x.arc(-20, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(20, 16+b, 4, 0, 7); x.fill();
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 10, 0, 0, 7); x.fill();
        // Casco táctico
        x.fillStyle = '#1a2744'; x.beginPath(); x.ellipse(0, -34+b, 13, 9, 0, 1.2, 5.2); x.fill();
        x.fillStyle = '#0f1a2e'; x.fillRect(-12, -40+b, 24, 8);
        x.fillStyle = '#333'; x.fillRect(-14, -30+b, 28, 5);
        // Visera del casco (oscura)
        x.fillStyle = 'rgba(0, 0, 0, 0.6)'; x.fillRect(-9, -28+b, 18, 8);
        x.strokeStyle = '#555'; x.lineWidth = 1; x.strokeRect(-9, -28+b, 18, 8);
        // Ojos apenas visibles tras la visera
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-4, -24+b, 1.2, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -24+b, 1.2, 0, 7); x.fill();
        // Auricular / radio
        x.fillStyle = '#111'; x.beginPath(); x.arc(-10, -22+b, 3, 0, 7); x.fill();
        x.strokeStyle = '#333'; x.lineWidth = 1; x.beginPath(); x.moveTo(-10, -19+b); x.lineTo(-8, -14+b); x.stroke();
    } else if (type.includes('jara')) {
        // Cap. JARA - militar boliviano, uniforme de gala, boina, condecoraciones
        // Piernas
        x.fillStyle = '#2d4a2d'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#1a2e1a'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Botas
        x.fillStyle = '#111'; x.fillRect(-14, 38+b, 6, 4); x.fillRect(8, 38+b, 6, 4);
        // Cuerpo - chaqueta de gala
        x.fillStyle = '#3a5a3a'; x.fillRect(-16, -10+b, 32, 28);
        // Camisa blanca y corbata
        x.fillStyle = '#fff'; x.fillRect(-10, -10+b, 20, 10);
        x.fillStyle = '#000'; x.fillRect(-2, -10+b, 4, 10);
        // Cinturón
        x.fillStyle = '#111'; x.fillRect(-17, 12+b, 34, 4);
        x.fillStyle = '#ffd700'; x.fillRect(-3, 12+b, 6, 4);
        // Condecoraciones en el pecho
        x.fillStyle = '#ffd700'; x.fillRect(-10, -4+b, 3, 5); x.fillRect(7, -4+b, 3, 5);
        x.fillStyle = '#f00'; x.fillRect(-10, -3+b, 3, 1); x.fillRect(7, -3+b, 3, 1);
        // Brazos
        x.fillStyle = '#3a5a3a'; x.fillRect(-24, -8+b, 8, 24); x.fillRect(16, -8+b, 8, 24);
        x.fillStyle = '#2d4a2d'; x.fillRect(-24, -2+b, 8, 8); x.fillRect(16, 0+b, 8, 8);
        // Manos
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-20, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(20, 16+b, 4, 0, 7); x.fill();
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 10, 0, 0, 7); x.fill();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -24+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -24+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -24.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -24.5+b, 0.7, 0, 7); x.fill();
        // Cejas
        x.strokeStyle = '#222'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-7, -28+b); x.lineTo(-2, -27+b); x.stroke();
        x.beginPath(); x.moveTo(7, -28+b); x.lineTo(2, -27+b); x.stroke();
        // Nariz y boca
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -20+b, 1.5, 2, 0, 0, 7); x.fill();
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -17+b, 2.5, 0.2, 2.9); x.stroke();
        // Bigote
        x.strokeStyle = '#222'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-5, -16+b); x.lineTo(-1, -15+b); x.stroke();
        x.beginPath(); x.moveTo(5, -16+b); x.lineTo(1, -15+b); x.stroke();
        // Boina negra con insignia
        x.fillStyle = '#222'; x.beginPath(); x.ellipse(0, -36+b, 12, 7, 0, 1.5, 5.5); x.fill();
        x.fillStyle = '#333'; x.fillRect(-10, -40+b, 20, 6);
        x.fillStyle = '#ffd700'; x.fillRect(-2, -38+b, 4, 3);
        x.fillStyle = '#f00'; x.fillRect(-1, -37+b, 2, 2);
    } else if (type.includes('poncho')) {
        // Poncho Rojo - líder campesino, poncho tradicional rojo con patrones andinos
        // Piernas (pantalón tradicional)
        x.fillStyle = '#3a3a3a'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#2a2a2a'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Abarcas (sandalia tradicional)
        x.fillStyle = '#5d4037'; x.fillRect(-14, 38+b, 6, 3); x.fillRect(8, 38+b, 6, 3);
        // Cuerpo - poncho rojo tradicional
        x.fillStyle = '#8b0000'; x.fillRect(-22, -10+b, 44, 44);
        // Patrones andinos en el poncho (rayas)
        x.fillStyle = '#cc0000'; x.fillRect(-20, -2+b, 40, 4);
        x.fillStyle = '#ff0'; x.fillRect(-18, 2+b, 36, 2);
        x.fillStyle = '#00a650'; x.fillRect(-20, 8+b, 40, 4);
        x.fillStyle = '#ff0'; x.fillRect(-18, 14+b, 36, 2);
        x.fillStyle = '#cc0000'; x.fillRect(-20, 20+b, 40, 4);
        x.fillStyle = '#fff'; x.fillRect(-18, 26+b, 36, 2);
        x.fillStyle = '#8b0000'; x.fillRect(-20, 30+b, 40, 4);
        // Franja decorativa zigzag
        x.strokeStyle = '#ffd700'; x.lineWidth = 1.5;
        for(let i=0; i<8; i++) {
            let xx = -18 + i*5;
            x.beginPath(); x.moveTo(xx, 18+b); x.lineTo(xx+2.5, 22+b); x.lineTo(xx+5, 18+b); x.stroke();
        }
        // Brazos fuera del poncho
        x.fillStyle = '#e8be94'; x.fillRect(-24, -6+b, 6, 22); x.fillRect(18, -6+b, 6, 22);
        // Manos
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-21, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(21, 16+b, 4, 0, 7); x.fill();
        // Hoz y martillo en la mano derecha (símbolo)
        x.fillStyle = '#888'; x.fillRect(19, -6+b, 3, 18);
        x.fillStyle = '#ccc'; x.beginPath(); x.arc(20, -8+b, 6, 3.5, 5.8); x.stroke();
        x.fillStyle = '#aaa'; x.fillRect(14, -4+b, 10, 3);
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -24+b, 9, 10, 0, 0, 7); x.fill();
        // Arrugas (expresión seria de líder)
        x.strokeStyle = '#b08860'; x.lineWidth = 0.8;
        x.beginPath(); x.moveTo(-6, -22+b); x.lineTo(-2, -20+b); x.stroke();
        x.beginPath(); x.moveTo(6, -22+b); x.lineTo(2, -20+b); x.stroke();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -26+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -26+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -26.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -26.5+b, 0.7, 0, 7); x.fill();
        // Cejas (gruesas, líder firme)
        x.strokeStyle = '#333'; x.lineWidth = 2; x.beginPath(); x.moveTo(-7, -30+b); x.lineTo(-2, -29+b); x.stroke();
        x.beginPath(); x.moveTo(7, -30+b); x.lineTo(2, -29+b); x.stroke();
        // Nariz
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -22+b, 1.5, 2, 0, 0, 7); x.fill();
        // Boca
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -19+b, 2.5, 0.2, 2.9); x.stroke();
        // Bigote
        x.strokeStyle = '#333'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-5, -20+b); x.lineTo(-1, -19+b); x.stroke();
        x.beginPath(); x.moveTo(5, -20+b); x.lineTo(1, -19+b); x.stroke();
        // Sombrero tradicional (lluchu / chullo)
        x.fillStyle = '#8b0000'; x.fillRect(-10, -40+b, 20, 14);
        x.fillStyle = '#cc0000'; x.fillRect(-12, -42+b, 24, 6);
        x.fillStyle = '#ffd700'; x.fillRect(-10, -40+b, 20, 3);
        x.fillStyle = '#fff'; x.fillRect(-8, -44+b, 16, 4);
        x.fillStyle = '#ff0000'; x.beginPath(); x.arc(0, -45+b, 4, 0, 7); x.fill();
        x.fillStyle = '#ffd700'; x.beginPath(); x.arc(0, -45+b, 2, 0, 7); x.fill();
    } else if (type.includes('cob')) {
        // Minero COB - overol gris, casco con lámpara, dinamita, herramienta
        // Piernas (overol)
        x.fillStyle = '#4a4a4a'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#3a3a3a'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Botas de minero
        x.fillStyle = '#2a1a0a'; x.fillRect(-14, 38+b, 6, 4); x.fillRect(8, 38+b, 6, 4);
        // Cuerpo - overol gris
        x.fillStyle = '#555'; x.fillRect(-16, -10+b, 32, 28);
        x.fillStyle = '#666'; x.fillRect(-14, -8+b, 28, 12);
        // Franjas reflectivas amarillas
        x.fillStyle = '#ffcc00'; x.fillRect(-16, 6+b, 32, 3);
        x.fillStyle = '#ffcc00'; x.fillRect(-16, 24+b, 32, 3);
        // Cinturón con hebilla
        x.fillStyle = '#222'; x.fillRect(-14, 12+b, 28, 4);
        x.fillStyle = '#888'; x.fillRect(-3, 12+b, 6, 4);
        // Bolsillo con dinamitas
        x.fillStyle = '#5d4037'; x.fillRect(-6, 2+b, 5, 8);
        x.fillStyle = '#d32f2f'; x.fillRect(-5, 1+b, 4, 3);
        // Brazos
        x.fillStyle = '#555'; x.fillRect(-24, -8+b, 8, 24); x.fillRect(16, -8+b, 8, 24);
        x.fillStyle = '#666'; x.fillRect(-24, -4+b, 8, 6); x.fillRect(16, 0+b, 8, 6);
        // Manos (sucias de tierra)
        x.fillStyle = '#8d6e63'; x.beginPath(); x.arc(-20, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(20, 16+b, 4, 0, 7); x.fill();
        // Martillo de minero en mano derecha
        x.fillStyle = '#8d6e63'; x.fillRect(18, -4+b, 4, 20);
        x.fillStyle = '#666'; x.fillRect(14, -10+b, 12, 6);
        x.fillStyle = '#888'; x.fillRect(16, -12+b, 8, 4);
        // Cabeza (cara sucia de carbón)
        x.fillStyle = '#8d6e63'; x.beginPath(); x.ellipse(0, -22+b, 10, 10, 0, 0, 7); x.fill();
        // Manchas de carbón en la cara
        x.fillStyle = '#444'; x.beginPath(); x.arc(-5, -18+b, 2, 0, 7); x.fill();
        x.beginPath(); x.arc(6, -20+b, 2.5, 0, 7); x.fill();
        x.beginPath(); x.arc(-2, -15+b, 1.5, 0, 7); x.fill();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -24+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -24+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -24.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -24.5+b, 0.7, 0, 7); x.fill();
        // Cejas
        x.strokeStyle = '#222'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-7, -28+b); x.lineTo(-2, -27+b); x.stroke();
        x.beginPath(); x.moveTo(7, -28+b); x.lineTo(2, -27+b); x.stroke();
        // Nariz
        x.fillStyle = '#8d6e63'; x.beginPath(); x.ellipse(0, -20+b, 1.5, 2, 0, 0, 7); x.fill();
        // Boca (sonrisa amplia)
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -17+b, 2.5, 0.1, 3); x.stroke();
        // Casco minero con lámpara (al frente)
        x.fillStyle = '#cc8800'; x.beginPath(); x.ellipse(0, -32+b, 14, 6, 0, 3.3, 6.2); x.fill();
        x.fillStyle = '#cc8800'; x.fillRect(-12, -36+b, 24, 6);
        // Borde del casco
        x.fillStyle = '#aa6600'; x.fillRect(-14, -30+b, 28, 3);
        // Lámpara del casco (centrada al frente)
        x.fillStyle = '#333'; x.beginPath(); x.arc(0, -38+b, 4, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.shadowBlur = 15; x.shadowColor = '#fff'; x.beginPath(); x.arc(0, -38+b, 2.5, 0, 7); x.fill(); x.shadowBlur = 0;
        // Soporte de la lámpara
        x.fillStyle = '#888'; x.fillRect(-1, -34+b, 2, 4);
        // Haz de luz (sutil, hacia adelante)
        x.fillStyle = 'rgba(255, 255, 200, 0.15)'; x.beginPath(); x.moveTo(4, -38+b); x.lineTo(30, -28+b); x.lineTo(30, -48+b); x.fill();
    } else if (type.includes('evo')) {
        // Evo - presidente, traje negro, camisa blanca, corbata, sombrero
        // Piernas (pantalón negro)
        x.fillStyle = '#1a1a1a'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#111'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Zapatos
        x.fillStyle = '#000'; x.fillRect(-14, 38+b, 6, 4); x.fillRect(8, 38+b, 6, 4);
        // Cuerpo - saco negro
        x.fillStyle = '#1a1a1a'; x.fillRect(-18, -10+b, 36, 28);
        x.fillStyle = '#222'; x.fillRect(-20, -12+b, 40, 6);
        // Camisa blanca
        x.fillStyle = '#fff'; x.fillRect(-8, -10+b, 16, 14);
        // Corbata
        x.fillStyle = '#0032a0'; x.fillRect(-2, -10+b, 4, 16);
        x.fillStyle = '#d52b1e'; x.fillRect(-1, -10+b, 2, 14);
        // Bolsillo con pañuelo
        x.fillStyle = '#ccc'; x.fillRect(-14, -6+b, 6, 5);
        x.fillStyle = '#fff'; x.fillRect(-13, -7+b, 4, 3);
        // Brazos
        x.fillStyle = '#1a1a1a'; x.fillRect(-26, -8+b, 8, 24); x.fillRect(18, -8+b, 8, 24);
        x.fillStyle = '#222'; x.fillRect(-26, -4+b, 8, 6); x.fillRect(18, 0+b, 8, 6);
        // Manos
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-22, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(22, 16+b, 4, 0, 7); x.fill();
        // Brazo levantado (saludando)
        x.fillStyle = '#1a1a1a'; x.fillRect(14, -18+b, 6, 14);
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(17, -22+b, 4, 0, 7); x.fill();
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 11, 0, 0, 7); x.fill();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -24+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -24+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -24.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -24.5+b, 0.7, 0, 7); x.fill();
        // Cejas
        x.strokeStyle = '#333'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-7, -28+b); x.lineTo(-2, -27+b); x.stroke();
        x.beginPath(); x.moveTo(7, -28+b); x.lineTo(2, -27+b); x.stroke();
        // Nariz (nariz prominente)
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -20+b, 2, 2.5, 0, 0, 7); x.fill();
        // Boca (sonrisa)
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -17+b, 2.5, 0.2, 2.9); x.stroke();
        // Barbilla
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -14+b, 2.5, 1.5, 0, 0, 7); x.fill();
        // Sombrero (lluchu / chompa)
        x.fillStyle = '#111'; x.beginPath(); x.moveTo(-14, -34+b); x.lineTo(14, -34+b); x.lineTo(12, -20+b); x.lineTo(-12, -20+b); x.fill();
        x.fillStyle = '#222'; x.fillRect(-12, -40+b, 24, 8);
        // Franja del sombrero
        x.fillStyle = '#ffd700'; x.fillRect(-10, -34+b, 20, 2);
        // Wiphala en la solapa
        for(let i=0; i<5; i++) {
            x.fillStyle = ['#00a650','#d52b1e','#ffd700','#0032a0','#6a0dad'][i];
            x.fillRect(-17, -6+b + i*2, 4, 2);
        }
        // Pin presidencial
        x.fillStyle = '#ffd700'; x.beginPath(); x.arc(6, -8+b, 2, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(6, -8+b, 1, 0, 7); x.fill();
    } else if (type.includes('cholita')) {
        // Cholita tradicional boliviana - pollera, aguayo, bombín, trenzas
        // Pollera (falda) con patrones
        x.fillStyle = '#880088'; x.beginPath(); x.moveTo(-28, 14+b); x.lineTo(28, 14+b); x.lineTo(34, 38+b); x.lineTo(-34, 38+b); x.fill();
        // Franja decorativa de la pollera
        x.fillStyle = '#ffd700'; x.fillRect(-30, 30+b, 60, 3);
        x.fillStyle = '#ff00ff'; x.fillRect(-32, 34+b, 64, 2);
        x.fillStyle = '#0f0'; x.fillRect(-30, 28+b, 60, 1);
        // Blusa blanca
        x.fillStyle = '#fff8e7'; x.fillRect(-14, -18+b, 28, 30);
        x.fillStyle = '#f0e0c0'; x.fillRect(-16, -18+b, 4, 30); x.fillRect(12, -18+b, 4, 30);
        // Aguayo (manta) en los hombros - cuadros coloridos
        x.fillStyle = '#cc00cc'; x.fillRect(-18, -10+b, 36, 14);
        for(let i=0; i<6; i++) {
            x.fillStyle = i%2 ? '#ff0' : '#0f0';
            x.fillRect(-16 + i*6, -8+b, 3, 10);
        }
        for(let i=0; i<3; i++) {
            x.fillStyle = i%2 ? '#f00' : '#fff';
            x.fillRect(-18, -8+b + i*4, 36, 2);
        }
        // Brazos con mangas
        x.fillStyle = '#fff8e7'; x.fillRect(-26, -14+b, 8, 28);
        x.fillStyle = '#fff8e7'; x.fillRect(18, -14+b, 8, 28);
        // Manos
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-22, 14+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(22, 14+b, 4, 0, 7); x.fill();
        // Trenzas (dos largas)
        x.fillStyle = '#222'; x.beginPath(); x.moveTo(-10, -26+b); x.lineTo(-6, -26+b); x.lineTo(-9, 6+b); x.lineTo(-13, 6+b); x.fill();
        x.beginPath(); x.moveTo(10, -26+b); x.lineTo(6, -26+b); x.lineTo(9, 6+b); x.lineTo(13, 6+b); x.fill();
        // Detalle de trenzado
        x.strokeStyle = '#444'; x.lineWidth = 1;
        for(let i=0; i<5; i++) {
            let yy = -22 + i*6 + b;
            x.beginPath(); x.moveTo(-11, yy); x.lineTo(-7, yy+2); x.stroke();
            x.beginPath(); x.moveTo(11, yy); x.lineTo(7, yy+2); x.stroke();
        }
        // Cara
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -17+b, 10, 9, 0, 0, 7); x.fill();
        // Ojos (mirada seria - es villana)
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -19+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -19+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -19.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -19.5+b, 0.7, 0, 7); x.fill();
        // Cejas fruncidas
        x.strokeStyle = '#222'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-7, -23+b); x.lineTo(-2, -22+b); x.stroke();
        x.beginPath(); x.moveTo(7, -23+b); x.lineTo(2, -22+b); x.stroke();
        // Nariz
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -15+b, 1.5, 2, 0, 0, 7); x.fill();
        // Boca seria
        x.fillStyle = '#c44'; x.beginPath(); x.arc(0, -12+b, 2.5, 0.2, 2.9); x.stroke();
        // Mejillas sonrojadas
        x.fillStyle = 'rgba(255, 100, 100, 0.3)'; x.beginPath(); x.arc(-6, -15+b, 3, 0, 7); x.fill();
        x.beginPath(); x.arc(6, -15+b, 3, 0, 7); x.fill();
        // Bombín (sombrero)
        x.fillStyle = '#5d4037'; x.beginPath(); x.ellipse(0, -30+b, 14, 5, 0, 0, 7); x.fill();
        x.fillStyle = '#4e342e'; x.fillRect(-8, -38+b, 16, 10);
        x.fillStyle = '#5d4037'; x.fillRect(-10, -38+b, 20, 3);
        x.fillStyle = '#ffd700'; x.fillRect(-6, -35+b, 12, 1.5);
        x.fillStyle = '#f44'; x.fillRect(-1, -37+b, 2, 2);
        // Zapatos
        x.fillStyle = '#222'; x.fillRect(-22, 36+b, 10, 4); x.fillRect(12, 36+b, 10, 4);
    } else if (type.includes('rodrigo')) {
        // Rodrigo - Presidente, traje azul, banda presidencial, bastón de mando
        // Piernas (pantalón)
        x.fillStyle = '#1c2e4a'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#0f1a2e'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Zapatos
        x.fillStyle = '#000'; x.fillRect(-14, 38+b, 6, 4); x.fillRect(8, 38+b, 6, 4);
        // Cuerpo - saco azul marino
        x.fillStyle = '#1c2e4a'; x.fillRect(-18, -10+b, 36, 28);
        x.fillStyle = '#152640'; x.fillRect(-20, -12+b, 40, 6);
        // Camisa blanca
        x.fillStyle = '#fff'; x.fillRect(-8, -10+b, 16, 12);
        // Corbata
        x.fillStyle = '#0032a0'; x.fillRect(-2, -10+b, 4, 14);
        // Banda presidencial (tricolor)
        x.fillStyle = '#007a33'; x.fillRect(-18, -6+b, 36, 4);
        x.fillStyle = '#f1d302'; x.fillRect(-18, -2+b, 36, 2);
        x.fillStyle = '#ce1126'; x.fillRect(-18, 0+b, 36, 4);
        // Brazos
        x.fillStyle = '#1c2e4a'; x.fillRect(-26, -8+b, 8, 24); x.fillRect(18, -8+b, 8, 24);
        x.fillStyle = '#152640'; x.fillRect(-26, -4+b, 8, 6); x.fillRect(18, 0+b, 8, 6);
        // Manos
        x.fillStyle = '#e8be94'; x.beginPath(); x.arc(-22, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(22, 16+b, 4, 0, 7); x.fill();
        // Bastón de mando en mano derecha
        x.fillStyle = '#8d6e63'; x.fillRect(22, -14+b, 3, 30);
        x.fillStyle = '#ffd700'; x.fillRect(21, -16+b, 5, 4);
        x.fillStyle = '#ffd700'; x.fillRect(21, 14+b, 5, 3);
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 11, 0, 0, 7); x.fill();
        // Ojos
        x.fillStyle = '#000'; x.beginPath(); x.arc(-4, -24+b, 1.8, 0, 7); x.fill();
        x.beginPath(); x.arc(4, -24+b, 1.8, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-3, -24.5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -24.5+b, 0.7, 0, 7); x.fill();
        // Cejas
        x.strokeStyle = '#333'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-7, -28+b); x.lineTo(-2, -27+b); x.stroke();
        x.beginPath(); x.moveTo(7, -28+b); x.lineTo(2, -27+b); x.stroke();
        // Nariz
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -20+b, 1.5, 2, 0, 0, 7); x.fill();
        // Boca (sonrisa seria)
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -17+b, 2.5, 0.2, 2.9); x.stroke();
        // Cabello canoso
        x.fillStyle = '#888'; x.fillRect(-8, -34+b, 16, 10);
        x.fillStyle = '#aaa'; x.fillRect(-6, -36+b, 12, 6);
        // Entradas (calvicie parcial)
        x.fillStyle = '#e8be94'; x.fillRect(-10, -32+b, 4, 6); x.fillRect(6, -32+b, 4, 6);
    } else if (type.includes('perro')) {
        // Perro Petardo - perro bomba con chaleco explosivo (mirando hacia la derecha)
        let puff = Math.sin(Date.now()*0.01)*3;
        let wags = Math.sin(Date.now()*0.008)*2;
        let mh = 12 + Math.sin(Date.now()*0.015)*5;
        // Sombra
        x.fillStyle = 'rgba(0,0,0,0.3)'; x.beginPath(); x.ellipse(0, 38+b, 18, 5, 0, 0, 7); x.fill();
        // Cola (atrás, izquierda) con movimiento
        x.fillStyle = '#5d4037'; x.beginPath(); x.arc(-12 + wags, 14+b+puff, 3.5, 0, 7); x.fill();
        // Patas traseras y delanteras
        x.fillStyle = '#4e342e'; x.fillRect(-14, 24+b, 6, 10); x.fillRect(8, 24+b, 6, 10);
        x.fillStyle = '#3e2723'; x.fillRect(-15, 32+b, 4, 5); x.fillRect(11, 32+b, 4, 5);
        // Cuerpo (más robusto, tipo pitbull)
        x.fillStyle = '#8d6e63'; x.beginPath(); x.ellipse(-1, 18+b, 15, 10, 0, 0, 7); x.fill();
        x.fillStyle = '#6d4c41'; x.beginPath(); x.ellipse(1, 19+b, 10, 8, -0.1, 0, 7); x.fill();
        // Manchas en el cuerpo
        x.fillStyle = '#5d4037'; x.beginPath(); x.ellipse(-6, 14+b, 5, 4, 0.2, 0, 7); x.fill();
        x.fillStyle = '#4e342e'; x.beginPath(); x.ellipse(4, 22+b, 4, 3, -0.1, 0, 7); x.fill();
        // Chaleco explosivo (neon amarillo/naranja)
        x.fillStyle = '#e65100'; x.fillRect(-14, 8+b, 28, 14);
        x.fillStyle = '#ff8f00'; x.fillRect(-12, 10+b, 24, 10);
        // Bolsillos del chaleco con explosivos
        x.fillStyle = '#333'; x.fillRect(-10, 11+b, 6, 5); x.fillRect(4, 11+b, 6, 5);
        x.fillStyle = '#f44'; x.fillRect(-9, 12+b, 4, 3); x.fillRect(5, 12+b, 4, 3);
        x.fillStyle = '#ff0'; x.fillRect(-10, 16+b, 8, 2); x.fillRect(4, 16+b, 8, 2);
        // Dinamitas visibles en el chaleco
        for(let i=0; i<3; i++) {
            let dx = -6 + i*6;
            x.fillStyle = '#795548'; x.fillRect(dx, 6+b, 3, 8);
            x.fillStyle = '#d32f2f'; x.fillRect(dx, 4+b, 3, 2);
        }
        // Cables del detonador (desde el chaleco hacia atrás)
        x.strokeStyle = '#f00'; x.lineWidth = 1.5;
        x.beginPath(); x.moveTo(-8, 10+b); x.lineTo(-14, 2+b); x.lineTo(-16, -mh+b); x.stroke();
        // Cabeza (adelante, derecha) - más grande y agresiva
        x.fillStyle = '#8d6e63'; x.beginPath(); x.ellipse(12, 7+b, 9, 9, 0, 0, 7); x.fill();
        // Mancha en ojo
        x.fillStyle = '#5d4037'; x.beginPath(); x.ellipse(9, 4+b, 5, 4, -0.2, 0, 7); x.fill();
        // Orejas puntiagudas (doberman/pitbull)
        x.fillStyle = '#5d4037'; x.beginPath(); x.moveTo(5, -2+b); x.lineTo(3, -10+b); x.lineTo(9, -2+b); x.fill();
        x.beginPath(); x.moveTo(17, -2+b); x.lineTo(19, -10+b); x.lineTo(13, -2+b); x.fill();
        // Ojos rojos (agresivo)
        x.fillStyle = '#f00'; x.beginPath(); x.arc(9, 5+b, 2.2, 0, 7); x.fill();
        x.beginPath(); x.arc(15, 5+b, 2.2, 0, 7); x.fill();
        x.fillStyle = '#ff0'; x.beginPath(); x.arc(9, 5+b, 1.2, 0, 7); x.fill();
        x.beginPath(); x.arc(15, 5+b, 1.2, 0, 7); x.fill();
        x.fillStyle = '#000'; x.beginPath(); x.arc(9, 5+b, 0.7, 0, 7); x.fill();
        x.beginPath(); x.arc(15, 5+b, 0.7, 0, 7); x.fill();
        // Cicatriz en el ojo
        x.strokeStyle = '#ccc'; x.lineWidth = 1; x.beginPath(); x.moveTo(5, 2+b); x.lineTo(10, 6+b); x.stroke();
        // Nariz negra grande
        x.fillStyle = '#111'; x.beginPath(); x.ellipse(12, 10+b, 3, 2.5, 0, 0, 7); x.fill();
        // Hocico abierto mostrando dientes
        x.fillStyle = '#000'; x.beginPath(); x.ellipse(12, 13+b, 4, 2.5, 0, 0, 7); x.fill();
        // Colmillos
        x.fillStyle = '#fff'; x.beginPath(); x.moveTo(9, 12+b); x.lineTo(8, 15+b); x.lineTo(11, 13+b); x.fill();
        x.beginPath(); x.moveTo(15, 12+b); x.lineTo(16, 15+b); x.lineTo(13, 13+b); x.fill();
        x.fillStyle = '#eee'; x.beginPath(); x.moveTo(11, 12+b); x.lineTo(11, 14+b); x.lineTo(13, 13+b); x.fill();
        // Baba
        x.fillStyle = 'rgba(200, 200, 255, 0.5)'; x.beginPath(); x.arc(10, 16+b, 1.5, 0, 7); x.fill();
        x.beginPath(); x.arc(11, 17+b, 1, 0, 7); x.fill();
        // Collar de púas
        x.fillStyle = '#222'; x.fillRect(5, 13+b, 14, 3);
        for(let i=0; i<5; i++) {
            x.fillStyle = '#888'; x.beginPath(); x.moveTo(6 + i*3, 13+b); x.lineTo(6.5 + i*3, 10+b); x.lineTo(7 + i*3, 13+b); x.fill();
        }
        // Placa del collar
        x.fillStyle = '#ffd700'; x.fillRect(10, 15+b, 4, 2);
        // Mecha encendida (atrás)
        x.strokeStyle = '#666'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(-12, 4+b); x.lineTo(-16, -mh+b); x.stroke();
        // Fuego de la mecha
        let fl = 5 + Math.sin(Date.now()*0.02)*2;
        x.fillStyle = '#ff6600'; x.beginPath(); x.arc(-16, -mh+b, fl, 0, 7); x.fill();
        x.fillStyle = '#ff0'; x.beginPath(); x.arc(-16, -mh+b, fl*0.5, 0, 7); x.fill();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-16, -mh+b, fl*0.2, 0, 7); x.fill();
        // Chispas
        for(let i=0; i<8; i++) {
            let sa = Date.now()*0.015 + i*0.8;
            x.fillStyle = i%3 === 0 ? '#ff0' : (i%3 === 1 ? '#f60' : '#f00');
            x.fillRect(-18+Math.sin(sa)*8, -mh-b+i*2+Math.cos(sa*0.8)*6, 2, 2);
        }
        // Humo (puff ocasional)
        x.fillStyle = 'rgba(200, 200, 200, ' + (0.15 + Math.sin(Date.now()*0.005)*0.1) + ')';
        x.beginPath(); x.arc(-18, -mh-5+b, 4 + Math.sin(Date.now()*0.01)*2, 0, 7); x.fill();
        x.fillStyle = '#ff6600'; x.font = "bold 5px Arial"; x.fillText("PETARDO", -14, -26+b);
    } else if (type.includes('joe')) {
        // Joe - hacker estilo Anonymous, chamarra negra, tenis lilas, lentes RGB
        let rgb = Math.sin(Date.now()*0.005)*0.5 + 0.5;
        // Piernas (pantalón cargo gris oscuro)
        x.fillStyle = '#2a2a2a'; x.fillRect(-12, 16+b, 10, 20); x.fillRect(2, 16+b, 10, 20);
        x.fillStyle = '#1a1a1a'; x.fillRect(-13, 34+b, 12, 6); x.fillRect(1, 34+b, 12, 6);
        // Zapatillas lilas
        x.fillStyle = '#6a1b9a'; x.fillRect(-14, 38+b, 6, 3); x.fillRect(8, 38+b, 6, 3);
        x.fillStyle = '#9c27b0'; x.fillRect(-13, 39+b, 4, 2); x.fillRect(9, 39+b, 4, 2);
        // Cuerpo - chamarra negra estilo canguro
        x.fillStyle = '#1a1a1a'; x.fillRect(-18, -10+b, 36, 28);
        x.fillStyle = '#222'; x.fillRect(-20, -12+b, 40, 6);
        x.fillStyle = '#111'; x.fillRect(-16, 10+b, 32, 6);
        // Cremallera de la chamarra
        x.fillStyle = '#444'; x.fillRect(-1, -10+b, 2, 24);
        // Bolsillo canguro grande
        x.fillStyle = '#222'; x.fillRect(-10, 2+b, 20, 10);
        x.strokeStyle = '#333'; x.lineWidth = 1.5; x.strokeRect(-10, 2+b, 20, 10);
        // Brazos
        x.fillStyle = '#1a1a1a'; x.fillRect(-26, -8+b, 8, 24); x.fillRect(18, -8+b, 8, 24);
        x.fillStyle = '#222'; x.fillRect(-26, -4+b, 8, 6); x.fillRect(18, 0+b, 8, 6);
        // Muñequeras RGB
        x.fillStyle = `hsl(${(Date.now()*0.05) % 360}, 100%, 50%)`;
        x.fillRect(-26, 12+b, 8, 4); x.fillRect(18, 12+b, 8, 4);
        // Manos con dedos expuestos
        x.fillStyle = '#222'; x.beginPath(); x.arc(-22, 16+b, 4, 0, 7); x.fill();
        x.beginPath(); x.arc(22, 16+b, 4, 0, 7); x.fill();
        x.fillStyle = '#e8be94'; x.fillRect(-24, 17+b, 3, 3); x.fillRect(-22, 17+b, 3, 3);
        x.fillStyle = '#e8be94'; x.fillRect(21, 17+b, 3, 3); x.fillRect(19, 17+b, 3, 3);
        // Cabeza
        x.fillStyle = '#e8be94'; x.beginPath(); x.ellipse(0, -22+b, 10, 10, 0, 0, 7); x.fill();
        // Capucha sobre la cabeza (estilo Anonymous)
        x.fillStyle = '#1a1a1a'; x.fillRect(-12, -34+b, 24, 14);
        x.fillStyle = '#222'; x.fillRect(-14, -36+b, 28, 6);
        // Cabello
        x.fillStyle = '#111'; x.fillRect(-2, -36+b, 4, 14);
        x.fillStyle = '#00ff00'; x.fillRect(-1, -36+b, 2, 10);
        // Lentes RGB con brillo animado
        x.fillStyle = '#111'; x.fillRect(-10, -25+b, 9, 5); x.fillRect(1, -25+b, 9, 5);
        x.strokeStyle = `hsl(${Date.now()*0.1 % 360}, 100%, 50%)`;
        x.lineWidth = 1.2; x.strokeRect(-10, -25+b, 9, 5); x.strokeRect(1, -25+b, 9, 5);
        x.fillStyle = `rgba(0, 255, 255, ${0.2 + rgb*0.3})`;
        x.fillRect(-9, -24+b, 7, 3); x.fillRect(2, -24+b, 7, 3);
        x.fillStyle = '#fff'; x.beginPath(); x.arc(-5, -23+b, 1, 0, 7); x.fill();
        x.beginPath(); x.arc(5, -23+b, 1, 0, 7); x.fill();
        // Cejas
        x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-8, -29+b); x.lineTo(-3, -28+b); x.stroke();
        x.beginPath(); x.moveTo(8, -29+b); x.lineTo(3, -28+b); x.stroke();
        // Nariz y boca
        x.fillStyle = '#d4a574'; x.beginPath(); x.ellipse(0, -19+b, 1.5, 2, 0, 0, 7); x.fill();
        x.strokeStyle = '#000'; x.lineWidth = 1.2; x.beginPath(); x.arc(0, -16+b, 2.5, 0.1, 3); x.stroke();
        x.fillStyle = '#0f0'; x.fillRect(-3, -15+b, 6, 0.5);
        // Pantalla holográfica en el pecho
        x.fillStyle = 'rgba(0, 0, 0, 0.8)'; x.fillRect(-8, -4+b, 16, 12);
        x.strokeStyle = '#00ff00'; x.lineWidth = 0.8; x.strokeRect(-8, -4+b, 16, 12);
        x.fillStyle = '#0f0'; x.font = "bold 2.5px monospace";
        let codes = ['> 0xFF', '> dec', '> sql', '> pwn'];
        for(let i=0; i<4; i++) {
            let blink = Math.sin(Date.now()*0.01 + i*2) > 0;
            x.fillStyle = blink ? '#0f0' : '#060';
            x.fillText(codes[i], -6, -1+b + i*3);
        }
        let scanY = (Math.sin(Date.now()*0.008) * 5 + 5);
        x.fillStyle = `rgba(0, 255, 0, ${0.1 + rgb*0.15})`;
        x.fillRect(-8, -4+b + scanY, 16, 1.5);
        // Etiqueta
        x.fillStyle = '#9c27b0'; x.font = "bold 5px Arial"; x.fillText("JOE", -7, -38+b);
        // Laptop holográfica cuando la habilidad está activa
        if (gAura) {
            x.save();
            x.translate(0, 48 + b);
            // Base de la laptop
            x.fillStyle = 'rgba(0, 255, 136, 0.3)';
            x.fillRect(-15, 0, 30, 4);
            x.strokeStyle = 'rgba(0, 255, 136, 0.6)';
            x.lineWidth = 1;
            x.strokeRect(-15, 0, 30, 4);
            // Pantalla
            x.fillStyle = 'rgba(0, 255, 136, 0.15)';
            x.fillRect(-12, -14, 24, 14);
            x.strokeStyle = 'rgba(0, 255, 136, 0.5)';
            x.strokeRect(-12, -14, 24, 14);
            // Código en pantalla
            x.fillStyle = 'rgba(0, 255, 136, 0.6)';
            x.font = "bold 2px monospace";
            for (let i = 0; i < 4; i++) {
                let blink = Math.sin(Date.now() * 0.01 + i * 2) > 0;
                x.fillStyle = blink ? 'rgba(0, 255, 136, 0.7)' : 'rgba(0, 100, 50, 0.4)';
                x.fillText('> ' + ['hack','scan','w1re','pwn'][i], -10, -9 + i * 3);
            }
            x.restore();
        }
    }
    x.shadowBlur = 0;
}

function drawCamaraDiputados(x, y, ambient) { ctx.fillStyle = ambient; ctx.fillRect(x, y - 220, 120, 220); ctx.fillStyle = '#111'; ctx.fillRect(x + 20, y - 180, 80, 100); ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.strokeRect(x, y - 220, 120, 220); }
function drawPoliceCommand(x, y) { ctx.fillStyle = '#1c2e4a'; ctx.fillRect(x, y - 150, 180, 150); ctx.fillStyle = '#2d3e1a'; ctx.fillRect(x + 10, y - 160, 40, 10); ctx.fillStyle = '#fff'; ctx.font = "bold 14px Arial"; ctx.fillText("COMANDO POLICIAL PM", x + 15, y - 130); ctx.strokeStyle = '#555'; ctx.beginPath(); ctx.moveTo(x + 150, y - 150); ctx.lineTo(x + 150, y - 200); ctx.stroke(); drawWindows(x, y, 180, 150, 'rgba(0, 255, 255, 0.3)'); }
function drawRebelHouse(x, y) { ctx.fillStyle = '#3a1a1a'; ctx.fillRect(x, y - 130, 160, 130); ctx.fillStyle = '#000'; ctx.fillRect(x - 5, y - 135, 170, 10); ctx.fillStyle = '#ff0000'; ctx.font = "bold 14px Arial"; ctx.fillText("CASA DE LA REBELIÓN", x + 10, y - 110); ctx.fillStyle = '#f00'; ctx.fillRect(x + 140, y - 160, 20, 30); ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + 140, y - 130); ctx.lineTo(x + 140, y - 160); ctx.stroke(); drawWindows(x, y, 160, 130, 'rgba(255, 255, 0, 0.1)'); }
function drawCasaDelPueblo(x, y) { const h = 280; ctx.fillStyle = '#0a0a0a'; ctx.fillRect(x, y - h, 160, h); ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 4; ctx.strokeRect(x, y - h, 160, h); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x, y - h, 160, 30); ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 1; ctx.strokeRect(x + 5, y - h + 5, 150, 20); ctx.fillStyle = '#d4af37'; ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center"; ctx.fillText("CASA GRANDE DEL PUEBLO", x + 80, y - h + 19); ctx.textAlign = "start"; ctx.fillStyle = '#111'; ctx.fillRect(x - 5, y - h - 5, 170, 5); ctx.fillStyle = '#d4af37'; ctx.fillRect(x + 78, y - h + 30, 4, h - 50); drawWindows(x, y, 160, h, 'rgba(100, 200, 255, 0.25)'); }
function drawWindows(x, y, w, h, col) { let rs = Math.floor(h / 20), cs = Math.floor(w / 15); for (let r = 1; r < rs - 1; r++) { for (let c = 1; r % 2 === 0 && c < cs - 1; c++) { ctx.fillStyle = col; ctx.fillRect(x + c * 15, y - h + r * 20, 8, 10); } } }
function drawCactus(x, y) { ctx.fillStyle = '#2d5a27'; ctx.fillRect(x, y - 40, 10, 40); ctx.fillRect(x - 8, y - 30, 8, 5); ctx.fillRect(x - 8, y - 35, 3, 10); ctx.fillRect(x + 10, y - 25, 8, 5); ctx.fillRect(x + 15, y - 30, 3, 10); }
function drawStone(x, y) { ctx.fillStyle = '#777'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+15, y-10); ctx.lineTo(x+30, y); ctx.fill(); }

function drawElAltoHouse(x, y) {
    ctx.fillStyle = '#b76e4b'; ctx.fillRect(x, y - 40, 35, 40); // Ladrillo
    ctx.fillStyle = '#8d4925'; ctx.fillRect(x, y - 40, 35, 5); // Techo plano
    ctx.fillStyle = '#111'; ctx.fillRect(x + 5, y - 15, 10, 15); // Puerta
    ctx.fillStyle = '#add8e6'; ctx.fillRect(x + 20, y - 30, 8, 8); // Ventana
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1; ctx.strokeRect(x, y - 40, 35, 40);
}

function drawCristo(x, y) {
    ctx.fillStyle = '#eee'; ctx.fillRect(x - 5, y - 50, 10, 40); // Cuerpo
    ctx.fillRect(x - 20, y - 45, 40, 6); // Brazos
    ctx.beginPath(); ctx.arc(x, y - 55, 6, 0, 7); ctx.fill(); // Cabeza
}

function drawParrot(x, y) {
    let b = Math.sin(gframe * 0.2) * 5;
    ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(x, y, 10, 6, b*0.1, 0, 7); ctx.fill(); // Cuerpo
    ctx.fillStyle = '#f44336'; ctx.beginPath(); ctx.arc(x + 8, y - 2, 4, 0, 7); ctx.fill(); // Cabeza
    ctx.fillStyle = '#ffeb3b'; ctx.fillRect(x - 5, y, 5, 12); // Cola
}

function drawJaguar(x, y) {
    ctx.fillStyle = '#ffb300'; ctx.fillRect(x, y - 20, 40, 15); // Cuerpo
    ctx.fillRect(x + 30, y - 30, 10, 15); // Cuello
    ctx.fillRect(x + 35, y - 35, 12, 8); // Cabeza
    ctx.fillStyle = '#000'; ctx.fillRect(x + 5, y - 5, 4, 10); ctx.fillRect(x + 30, y - 5, 4, 10); // Patas
    for(let i=0; i<5; i++) ctx.fillRect(x + 5 + i*7, y - 15, 3, 3); // Manchas
}

function drawFruitTree(x, y) { ctx.fillStyle = '#5d4037'; ctx.fillRect(x, y - 50, 8, 50); ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.arc(x+4, y-55, 25, 0, 7); ctx.fill(); ctx.fillStyle = '#f44336'; for(let i=0; i<5; i++) { ctx.beginPath(); ctx.arc(x + Math.sin(i)*15 + 4, y - 55 + Math.cos(i)*10, 3, 0, 7); ctx.fill(); } }
function drawGiantPalm(x, y) { ctx.fillStyle = '#795548'; ctx.fillRect(x, y - 120, 12, 120); ctx.fillStyle = '#1b5e20'; for(let i=0; i<8; i++) { ctx.save(); ctx.translate(x+6, y-120); ctx.rotate(i * (Math.PI/4)); ctx.beginPath(); ctx.ellipse(30, 0, 40, 10, 0, 0, 7); ctx.fill(); ctx.restore(); } }
function drawBush(x, y) { ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.arc(x, y-10, 15, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x+15, y-15, 20, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x+30, y-10, 15, 0, 7); ctx.fill(); }
function drawCocaPlant(x, y) { ctx.fillStyle = '#33691e'; ctx.fillRect(x-2, y-40, 4, 40); for(let i=0; i<6; i++) { ctx.fillStyle = i%2 ? '#4caf50' : '#388e3c'; ctx.beginPath(); ctx.ellipse(x-8+i*3, y-40-i*2, 8, 4, 0.3, 0, 7); ctx.fill(); } }
function drawMiningCart(x, y) { ctx.fillStyle = '#5d4037'; ctx.fillRect(x-8, y-14, 16, 10); ctx.fillStyle = '#795548'; ctx.fillRect(x-10, y-4, 20, 4); ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(x-6, y, 3, 0, 7); ctx.arc(x+6, y, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#8d6e63'; ctx.fillRect(x-6, y-16, 12, 3); }

function init(lvl = 1) { 
    currentLevel = lvl; enms = []; itms = []; mlts = []; fires = []; abuls = []; ebuls = []; dynas = []; helis = []; gases = []; gasps = []; radioWaves = []; drones = []; teargas = []; fogatas = []; camX = 0; plyr.x = 100; gwin = false; gover = false; evoTimer = 0; evoSpecialTimer = 0; abilCd = 0; abilDur = 0; abilActive = false;
    birds = Array.from({length: 3}, () => new Bird()); llamas = []; obss = [];
    if (lvl === 1) { plyr.hp = 100; plyr.defense = 0; plyr.damageMod = 0; timeLeft = 180; lives = 3; }
    
    // GESTIÓN DE MÚSICA POR NIVEL (Integrado con el nuevo reproductor)
    if (gameStarted) {
        if (lvl === 1 || lvl === 4) { playBGM(1); } // Cryptorebels
        else if (lvl === 2 || lvl === 3) { playBGM(2); } // $hash (Tenso)
        else { playBGM(3); } // Hashlords (Acción final)
    }

    if (dom.hudCity) { const lnames = ["", "LA PAZ", "EL ALTO", "ORURO", "COCHABAMBA", "CHAPARE", "SANTA CRUZ"]; dom.hudCity.innerText = lnames[lvl] || ''; }
    updateUI();
    changeWeather();
    if (window.weatherInterval) clearInterval(window.weatherInterval); window.weatherInterval = setInterval(changeWeather, 45000);
    const isVillainBando = ['poncho_j', 'cob_j', 'evo_j', 'cholita', 'perro'].includes(selectedChar);
    const getEnemyType = (base) => { if (isVillainBando) { if (base === 'evo') return 'rodrigo_e'; if (base === 'cob') return (Math.random() > 0.5 ? 'pm_e' : 'policia_bol_e'); return 'rebelde_e'; } return base; };
    if (lvl === 1) { 
        for (let i = 0; i < 5; i++) enms.push(new Enmy(800 + i * 40, cvs.height - 85, getEnemyType('poncho')));
        for (let i = 0; i < 8; i++) enms.push(new Enmy(2200 + i * 35, cvs.height - 85, getEnemyType(i % 2 === 0 ? 'cob' : 'poncho')));
        for (let i = 0; i < 4; i++) enms.push(new Enmy(3500 + i * 50, cvs.height - 85, getEnemyType('poncho')));
        for (let i = 0; i < 5; i++) obss.push(new Obstacle(1200 + i * 800, cvs.height - 70, 'barricada'));
        enms.push(new Enmy(4600, cvs.height - 85, getEnemyType('evo'))); 
    }
    else if (lvl === 2) { 
        for (let g = 0; g < 3; g++) { for (let i = 0; i < 6; i++) enms.push(new Enmy(1000 + g * 1200 + i * 40, cvs.height - 85, getEnemyType('poncho'))); }
        for (let i = 0; i < 6; i++) llamas.push(new Llama(500 + i * 700, cvs.height - 50));
        for (let i = 0; i < 8; i++) obss.push(new Obstacle(1000 + i * 500, cvs.height - 70, 'roca'));
        enms.push(new Enmy(4700, cvs.height - 85, getEnemyType('evo'))); 
    }
    else if (lvl === 3) {
        // Oruro - mineros y bloqueadores en las colinas
        for (let i = 0; i < 20; i++) enms.push(new Enmy(600 + i * 120, cvs.height - 85, getEnemyType(i % 3 === 0 ? 'cob' : 'poncho')));
        for (let i = 0; i < 10; i++) obss.push(new Obstacle(900 + i * 450, cvs.height - 70, 'roca'));
        enms.push(new Enmy(4800, cvs.height - 85, getEnemyType('evo')));
    }
    else if (lvl === 4) { 
        // Cochabamba - bloqueos en el valle
        for (let g = 0; g < 4; g++) { for (let i = 0; i < 6; i++) enms.push(new Enmy(800 + g * 1000 + i * 30, cvs.height - 85, getEnemyType(i % 3 === 0 ? 'cob' : 'poncho'))); }
        for (let i = 0; i < 8; i++) obss.push(new Obstacle(800 + i * 600, cvs.height - 70, 'tronco'));
        enms.push(new Enmy(4800, cvs.height - 85, getEnemyType('evo'))); 
    }
    else if (lvl === 5) { 
        // Chapare - selva con apoyo DEA
        for (let i = 0; i < 25; i++) enms.push(new Enmy(600 + i * 100, cvs.height - 85, getEnemyType(i % 4 === 0 ? 'cob' : (i % 3 === 0 ? 'poncho' : 'pm_e'))));
        for (let i = 0; i < 8; i++) obss.push(new Obstacle(800 + i * 550, cvs.height - 70, 'tronco'));
        enms.push(new Enmy(4900, cvs.height - 85, getEnemyType('evo')));
        for (let i = 0; i < 3; i++) helis.push(new Helicopter(200 + i * 1500, 40 + i * 20));
    }
    else {
        // Santa Cruz - la batalla final
        for (let i = 0; i < 30; i++) enms.push(new Enmy(600 + i * 100, cvs.height - 85, getEnemyType(i % 2 === 0 ? 'cob' : 'poncho'))); 
        for (let i = 0; i < 10; i++) obss.push(new Obstacle(800 + i * 450, cvs.height - 70, 'barril'));
        enms.push(new Enmy(4900, cvs.height - 85, getEnemyType('evo'))); 
    }
    for (let i = 0; i < 15; i++) itms.push(new Item(700 + i * 380, cvs.height - 90, i % 3 === 0 ? 'balas' : (i % 2 === 0 ? 'gasolina' : 'comida')));
    itms.push(new Item(600, cvs.height - 90, 'vida'));
    bgDirty = true; preRenderBg();
}

function drawToucan(x, y) {
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, y, 8, 5, 0, 0, 7); ctx.fill(); // Cuerpo
    ctx.fillStyle = '#ff9800'; ctx.fillRect(x + 5, y - 4, 12, 6); // Pico gigante
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 4, y - 2, 2, 0, 7); ctx.fill(); // Ojo
}

let _skyGrad = null, _lastSky = null;

function preRenderBg() {
    if (!bgDirty) return;
    let w = currentWeatherData, lvl = currentLevel;
    const W = llen + cvs.width, H = cvs.height;
    const savedCtx = ctx;

    function makeCvs(w2) { let c = document.createElement('canvas'); c.width = w2; c.height = H; return c; }

    // MONTAÑAS (CAPA 1, parallax 0.08)
    let c1 = makeCvs(W); ctx = c1.getContext('2d');
    for (let m = 0; m < 10; m++) {
        let mx = m * 1000 - 200; if (mx > W) break;
        if (lvl === 1) {
            ctx.fillStyle = w.ambient; ctx.beginPath(); ctx.moveTo(mx+300, 400); ctx.lineTo(mx+480, 180); ctx.lineTo(mx+550, 250); ctx.lineTo(mx+650, 80); ctx.lineTo(mx+700, 400); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.moveTo(mx+445, 225); ctx.lineTo(mx+480, 180); ctx.lineTo(mx+550, 250); ctx.lineTo(mx+650, 80); ctx.lineTo(mx+760, 160); ctx.lineTo(mx+840, 110); ctx.lineTo(mx+910, 230); ctx.lineTo(mx+1040, 160); ctx.lineTo(mx+1080, 210); ctx.lineTo(mx+1000, 250); ctx.lineTo(mx+840, 180); ctx.lineTo(mx+700, 240); ctx.lineTo(mx+650, 210); ctx.lineTo(mx+580, 280); ctx.lineTo(mx+445, 225); ctx.fill();
        } else if (lvl === 2) {
            ctx.fillStyle = '#1a3a5a'; ctx.beginPath(); ctx.moveTo(mx, 400); ctx.lineTo(mx+400, 260); ctx.lineTo(mx+800, 400); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.moveTo(mx+350, 268); ctx.lineTo(mx+400, 260); ctx.lineTo(mx+450, 268); ctx.fill();
        } else if (lvl === 3) {
            // Oruro - cerros mineros del altiplano
            ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.moveTo(mx, 400); ctx.lineTo(mx+200, 220); ctx.lineTo(mx+400, 280); ctx.lineTo(mx+600, 180); ctx.lineTo(mx+800, 400); ctx.fill();
            ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.moveTo(mx+100, 400); ctx.lineTo(mx+300, 250); ctx.lineTo(mx+500, 300); ctx.lineTo(mx+700, 400); ctx.fill();
        } else if (lvl === 4) {
            // Cochabamba - valle verde con montañas del Tunari
            ctx.fillStyle = '#4e342e'; ctx.beginPath(); ctx.moveTo(mx, 400); ctx.quadraticCurveTo(mx+400, 120, mx+800, 400); ctx.fill();
            ctx.fillStyle = '#3a5a40'; ctx.beginPath(); ctx.moveTo(mx+100, 400); ctx.quadraticCurveTo(mx+400, 160, mx+700, 400); ctx.fill();
        } else if (lvl === 5) {
            // Chapare - selva montañosa, muchas curvas de nivel
            ctx.fillStyle = '#1a4a14'; ctx.beginPath(); ctx.moveTo(mx-100, 400); ctx.quadraticCurveTo(mx+200, 130, mx+400, 200); ctx.quadraticCurveTo(mx+600, 110, mx+900, 400); ctx.fill();
            ctx.fillStyle = '#2d5a27'; ctx.beginPath(); ctx.moveTo(mx, 400); ctx.quadraticCurveTo(mx+300, 170, mx+500, 230); ctx.quadraticCurveTo(mx+700, 150, mx+850, 400); ctx.fill();
        } else {
            // Santa Cruz - colinas suaves tropicales
            ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(mx+200, 400, 280, 0, 7); ctx.fill();
            ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(mx+600, 400, 220, 0, 7); ctx.fill();
        }
    }
    bgCanvases['mt'] = c1;

    // EDIFICIOS LEJANOS (CAPA 2, parallax 0.25)
    const midCounts = { 1: 40, 2: 8, 3: 30, 4: 20, 5: 8, 6: 10 };
    let midC = midCounts[lvl] || 0;
    if (midC > 0) {
        let c2 = makeCvs(W); ctx = c2.getContext('2d');
        let winOp = w.starOp > 0 ? 0.6 : (w.sky[0] === '#4fa1ff' ? 0.15 : 0.4);
        let amb = w.ambient; if (lvl === 2) amb = '#3a2a1a'; else if (lvl === 3) amb = '#4a2a0a'; else if (lvl === 4) amb = '#4a3a2a'; else if (lvl === 5) amb = '#1a3a1a'; else if (lvl === 6) amb = '#1a2a3a';
        for (let i = 0; i < midC; i++) {
            let bx = i * (W / midC) + Math.sin(i * 2) * 30; if (bx > W) break;
            let bw = 50 + (i % 4) * 15, bh = 60 + Math.abs(Math.cos(i * 1.5)) * 100;
            ctx.fillStyle = amb; ctx.fillRect(bx, H - bh - 30, bw, bh);
            drawWindows(bx, H - 30, bw, bh, `rgba(255, 220, 50, ${winOp})`);
        }
        bgCanvases['mid'] = c2;
    }

    // EDIFICIOS DETALLADOS (CAPA 3, parallax 0.3)
    const detCounts = { 1: 40, 2: 8, 3: 30, 4: 20, 5: 8, 6: 10 };
    let detC = detCounts[lvl] || 0;
    if (detC > 0) {
        let c3 = makeCvs(W); ctx = c3.getContext('2d');
        let amb = w.ambient; if (lvl === 2) amb = '#2a1a0a'; else if (lvl === 3) amb = '#3a1a00'; else if (lvl === 4) amb = '#3a2a1a'; else if (lvl === 5) amb = '#0a2a0a'; else if (lvl === 6) amb = '#0a1a2a';
        for (let i = 0; i < detC; i++) {
            let bx = i * (W / detC) + Math.sin(i) * 40; if (bx > W) break;
            if (lvl === 1 && i % 10 === 0 && i > 0) { drawCamaraDiputados(bx, H - 30, w.ambient); }
            else {
                let bw = 60 + (i % 3) * 15, bh = 100 + Math.abs(Math.cos(i)) * 140;
                ctx.fillStyle = amb; ctx.fillRect(bx, H - bh - 30, bw, bh);
                ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; ctx.strokeRect(bx, H - bh - 30, bw, bh);
                let winOp = w.starOp > 0 ? 0.4 : (w.sky[0] === '#4fa1ff' ? 0.2 : 0.3);
                drawWindows(bx, H - 30, bw, bh, `rgba(255, 220, 50, ${winOp})`);
            }
        }
        bgCanvases['det'] = c3;
    }

    // VEGETACIÓN (CAPA 4, parallax 0.6)
    let c4 = makeCvs(W); ctx = c4.getContext('2d');
    for (let i = 0; i < 40; i++) {
        let ux = i * 250 + Math.sin(i * 30) * 60; if (ux > W) break;
        if (lvl === 1) {
            let type = i % 3;
            if (type === 0) {
                ctx.fillStyle = '#3d2b1f'; ctx.fillRect(ux, H - 100, 10, 70);
                const treeCol = (w.snow) ? '#3a5a3a' : '#084d00';
                ctx.fillStyle = treeCol; ctx.beginPath(); ctx.arc(ux + 5, H - 105, 25, 0, 7); ctx.fill();
                ctx.fillStyle = (w.snow) ? '#2a4a2a' : '#0a5d00'; ctx.beginPath(); ctx.arc(ux + 5, H - 120, 18, 0, 7); ctx.fill();
            } else if (type === 1) {
                ctx.fillStyle = '#333'; ctx.fillRect(ux, H - 120, 4, 90);
                ctx.fillStyle = '#444'; ctx.fillRect(ux - 12, H - 125, 16, 8);
            } else {
                ctx.fillStyle = '#222'; ctx.fillRect(ux, H - 55, 12, 25);
                ctx.fillStyle = '#333'; ctx.fillRect(ux - 2, H - 58, 16, 4);
            }
        } else if (lvl === 2) {
            if (i % 2 === 0) drawCactus(ux, H - 30); else drawStone(ux, H - 30);
            if (i % 7 === 0) { ctx.fillStyle = '#8B4513'; ctx.fillRect(ux + 30, H - 15, 10, 15); ctx.fillStyle = '#556B2F'; ctx.beginPath(); ctx.arc(ux + 35, H - 18, 8, 0, 7); ctx.fill(); }
        } else if (lvl === 3) {
            // Oruro - minería y altiplano
            if (i % 3 === 0) drawCactus(ux + 10, H - 30);
            else if (i % 3 === 1) drawStone(ux, H - 30);
            else drawMiningCart(ux + 20, H - 30);
        } else if (lvl === 4) {
            // Cochabamba - valle frutal
            if (i % 2 === 0) drawFruitTree(ux, H - 30); else drawBush(ux, H - 30);
        } else if (lvl === 5) {
            // Chapare - plantaciones de coca y jungla
            if (i % 3 === 0) drawCocaPlant(ux + 10, H - 30);
            else if (i % 3 === 1) { ctx.fillStyle = '#1b5e20'; ctx.beginPath(); ctx.arc(ux, H-38, 20, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(ux+20, H-45, 15, 0, 7); ctx.fill(); }
            else drawGiantPalm(ux, H - 30);
        } else {
            // Santa Cruz - palmeras y vegetación tropical
            drawGiantPalm(ux, H - 30);
            if (i % 3 === 0) drawBush(ux + 50, H - 30);
            if (i % 7 === 0) drawToucan(ux + 30, H - 60);
        }
    }
    bgCanvases['veg'] = c4;

    // SUELO (CAPA 5, parallax 1)
    let c5 = makeCvs(W); ctx = c5.getContext('2d');
    let scol = '#111'; if(lvl === 2) scol = '#d4a373'; else if(lvl === 3) scol = '#6d4c21'; else if(lvl === 4) scol = '#8bc34a'; else if(lvl === 5) scol = '#2d5a27'; else if(lvl === 6) scol = '#1b5e20';
    ctx.fillStyle = scol; ctx.fillRect(0, H - 30, llen, 30);
    if (lvl === 1) { ctx.fillStyle = '#ffd700'; for (let i = 0; i < llen / 100; i++) ctx.fillRect(i * 100, H - 17, 40, 4); }
    ctx.fillStyle = '#fff'; ctx.font = "bold 20px Courier New";
    const lnames = ["", "LA PAZ - CIUDAD MARAVILLA", "CIUDAD DE EL ALTO", "ORURO - CAPITAL DEL FOLCLORE", "COCHABAMBA - CIUDAD JARDÍN", "CHAPARE - EL BASTIÓN DE EVO", "SANTA CRUZ - CIUDAD DE LOS ANILLOS"];
    ctx.fillText(lnames[lvl], llen - 450, H - 70);
    bgCanvases['gnd'] = c5;

    // DECORACIONES REGIONALES (CAPA 6, parallax 0.5)
    let c6 = makeCvs(W); ctx = c6.getContext('2d');
    if (lvl === 2) {
        for(let i=0; i<5; i++) {
            let hx = 300 + i * 900; if (hx > W) break;
            drawElAltoHouse(hx, H - 30);
        }
    }
    if (lvl === 3) {
        // Oruro - Socavón minero, Virgen del Socavón, Diablada
        for(let i=0; i<3; i++) {
            let mx = 600 + i * 1400; if (mx > W) break;
            ctx.fillStyle = '#3e2723'; ctx.fillRect(mx-20, H-90, 40, 60);
            ctx.fillStyle = '#5d4037'; ctx.fillRect(mx-15, H-30, 30, -35);
            ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.arc(mx, H-92, 12, 0, 7); ctx.fill();
            ctx.fillStyle = '#ffd700'; ctx.font = "bold 8px Arial"; ctx.fillText("⛰", mx-4, H-85);
            ctx.fillStyle = '#ff6600'; ctx.beginPath(); ctx.arc(mx, H-95, 6, 0, 7); ctx.fill();
            drawMiningCart(mx+30, H-30);
        }
        // Iglesia del Socavón
        let six = 2500; if (six < W) {
            ctx.fillStyle = '#d4a373'; ctx.fillRect(six-25, H-120, 50, 90);
            ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.moveTo(six-30, H-120); ctx.lineTo(six, H-160); ctx.lineTo(six+30, H-120); ctx.fill();
            ctx.fillStyle = '#ffd700'; ctx.font = "bold 6px Arial"; ctx.fillText("VIRGEN", six-18, H-100);
            ctx.fillStyle = '#ffd700'; ctx.font = "bold 6px Arial"; ctx.fillText("SOCAVÓN", six-22, H-88);
        }
        // Danzarines de la Diablada
        for(let i=0; i<4; i++) {
            let dx = 400 + i * 700; if (dx > W) break;
            ctx.fillStyle = ['#f00','#ff0','#0f0','#00f'][i%4]; ctx.fillRect(dx, H-55, 10, 25);
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(dx+5, H-58, 6, 0, 7); ctx.fill();
            ctx.fillStyle = '#ff0'; ctx.fillRect(dx+1, H-62, 8, 6);
            ctx.fillStyle = '#fff'; ctx.font = "bold 4px Arial"; ctx.fillText("👹", dx, H-60);
        }
    }
    if (lvl === 4) drawCristo(2500, 200);
    if (lvl === 5) {
        // Chapare - tambos, río, helicóptero DEA
        for(let i=0; i<5; i++) {
            let cx = 300 + i * 900; if (cx > W) break;
            ctx.fillStyle = '#5d4037'; ctx.fillRect(cx-10, H-60, 20, 30);
            ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.moveTo(cx-15, H-60); ctx.lineTo(cx, H-75); ctx.lineTo(cx+15, H-60); ctx.fill();
            ctx.fillStyle = '#4caf50'; ctx.fillRect(cx-14, H-5, 28, 5);
        }
        // Coca plantations
        for(let i=0; i<6; i++) {
            let cx = 600 + i * 600; if (cx > W) break;
            for(let r=0; r<4; r++) { ctx.fillStyle = '#33691e'; ctx.fillRect(cx-15+r*10, H-25, 6, 20); ctx.fillStyle = '#4caf50'; ctx.beginPath(); ctx.ellipse(cx-12+r*10, H-28, 5, 3, 0.2, 0, 7); ctx.fill(); }
        }
        // Río
        ctx.fillStyle = 'rgba(0,180,255,0.3)'; ctx.fillRect(0, H-18, llen, 18);
        // Heli DEA
        let hhx = 3200; if (hhx < W) {
            ctx.fillStyle = '#222'; ctx.fillRect(hhx, H-110, 30, 8);
            ctx.fillStyle = '#444'; ctx.fillRect(hhx+5, H-118, 20, 3);
            ctx.fillStyle = '#ffd700'; ctx.font = "bold 5px Arial"; ctx.fillText("DEA", hhx+7, H-103);
        }
    }
    if (lvl === 6) {
        // Santa Cruz - edificios modernos, jaguars, palmeras
        drawSantaCruzBuilding(500, H - 30); drawSantaCruzBuilding(4000, H - 30);
        drawJaguar(1500, H - 30); drawJaguar(3500, H - 30);
        for(let i=0; i<4; i++) {
            let cx = 1200 + i * 1200; if (cx > W) break;
            drawGiantPalm(cx, H-30);
        }
    }
    bgCanvases['dec'] = c6;

    ctx = savedCtx;
    bgDirty = false;
}

function dScene() {
    if (bgDirty) preRenderBg();
    let w = currentWeatherData;
    // CIELO
    let skyKey = w.sky[0] + '|' + w.sky[1];
    if (skyKey !== _lastSky) { _skyGrad = ctx.createLinearGradient(0, 0, 0, cvs.height); _skyGrad.addColorStop(0, w.sky[0]); _skyGrad.addColorStop(1, w.sky[1]); _lastSky = skyKey; }
    ctx.fillStyle = _skyGrad; ctx.fillRect(0, 0, cvs.width, cvs.height);

    // SOL
    if (w.sunOp > 0) { ctx.save(); ctx.globalAlpha = w.sunOp; ctx.fillStyle = '#fff9d6'; ctx.shadowBlur = 60; ctx.shadowColor = '#fff9d6'; ctx.beginPath(); ctx.arc(cvs.width * 0.8, 60, 35, 0, 7); ctx.fill(); ctx.restore(); }

    // ESTRELLAS
    if (w.starOp > 0) { for(let s=0; s<60; s++) { let sx = (s * 213) % cvs.width, sy = (s * 311) % (cvs.height * 0.45); let twinkle = ((gframe * 3 + s * 7) & 31) / 31; let op = (0.15 + twinkle * 0.85) * w.starOp; ctx.fillStyle = `rgba(255, 255, 255, ${op})`; ctx.fillRect(sx, sy, 2, 2); } }

    // NUBES (parallax 0.05)
    if (w.clouds) { ctx.save(); ctx.translate(-camX * 0.05, 0); clouds.forEach(c => { c.update(); c.draw(); }); ctx.restore(); }

    // RELÁMPAGOS
    if (w.lightning && gframe % 120 === 0 && Math.random() < 0.12) { lightningFlash = 15; if (Math.random() < 0.3) psnd('thunder'); }
    if (lightningFlash > 0) { lightningFlash--; ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash / 15})`; ctx.fillRect(0, 0, cvs.width, cvs.height); }

    // CAPAS 1-6 pre-renderizadas en bgCanvases
    if (bgCanvases['mt']) ctx.drawImage(bgCanvases['mt'], -camX * 0.08, 0);
    if (bgCanvases['mid']) ctx.drawImage(bgCanvases['mid'], -camX * 0.25, 0);
    if (bgCanvases['det']) ctx.drawImage(bgCanvases['det'], -camX * 0.3, 0);
    if (bgCanvases['veg']) ctx.drawImage(bgCanvases['veg'], -camX * 0.6, 0);
    if (bgCanvases['gnd']) ctx.drawImage(bgCanvases['gnd'], -camX, 0);
    if (bgCanvases['dec']) ctx.drawImage(bgCanvases['dec'], -camX * 0.5, 0);

    // ICÓNICOS NIVEL 1 (parallax 1)
    if (currentLevel === 1) {
        ctx.save(); ctx.translate(-camX, 0);
        if (camX < 1000) { if (['pm', 'policia_bol', 'rodrigo', 'cholita', 'rebelde'].includes(selectedChar)) drawPoliceCommand(50, cvs.height - 30); else drawRebelHouse(50, cvs.height - 30); }
        if (camX > llen - 1200) drawCasaDelPueblo(llen - 500, cvs.height - 30);
        ctx.restore();
    }

    // DINÁMICOS sobre las capas pre-renderizadas
    // Faroles nivel 1 (glow dinámico)
    if (currentLevel === 1 && (w.starOp > 0 || w.sky[0] === '#ff4500')) {
        let vpL4 = camX * 0.6 - 150, vpR4 = camX * 0.6 + cvs.width + 150;
        ctx.save(); ctx.translate(-camX * 0.6, 0);
        for (let i = 0; i < 40; i++) {
            let ux = i * 250 + Math.sin(i * 30) * 60;
            if (ux > vpR4 || ux + 60 < vpL4) continue;
            let op = 0.3 + Math.abs(Math.sin(gframe * 0.03 + i)) * 0.5;
            let gr = ctx.createRadialGradient(ux-4, cvs.height-121, 2, ux-4, cvs.height-121, 20);
            gr.addColorStop(0, `rgba(255, 255, 180, ${op})`); gr.addColorStop(1, 'rgba(255, 255, 150, 0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ux-4, cvs.height-121, 20, 0, 7); ctx.fill();
            ctx.fillStyle = '#ffffaa'; ctx.fillRect(ux-6, cvs.height-122, 4, 3);
        }
        ctx.restore();
    }

    // Loros y tucanes (animación dinámica, parallax 0.5)
    if (currentLevel === 3) { ctx.save(); ctx.translate(-camX * 0.5, 0); for(let i=0; i<5; i++) drawParrot(1000 + i*800, 100 + Math.sin(gframe*0.05 + i)*20); ctx.restore(); }
    if (currentLevel === 4) { ctx.save(); ctx.translate(-camX * 0.5, 0); for(let i=0; i<4; i++) drawToucan(800 + i*1200, 80 + Math.cos(gframe*0.03 + i)*15); ctx.restore(); }

    // NIEBLA (overlay)
    if (w.fog > 0) {
        ctx.fillStyle = `rgba(200, 210, 220, ${w.fog * 0.15})`; ctx.fillRect(0, 0, cvs.width, cvs.height);
        ctx.fillStyle = `rgba(200, 210, 220, ${w.fog * 0.08})`;
        ctx.fillRect(0, cvs.height * 0.7, cvs.width, cvs.height * 0.3);
    }

    // PARTÍCULAS CLIMÁTICAS (frame-skip cada 2 frames)
    if (w.snow && gframe % 2 === 0) snowflakes.forEach(s => { s.update(); s.draw(); });
    if (w.rain && gframe % 2 === 0) rains.forEach(r => { r.update(); r.draw(); });

    // CALOR TROPICAL (Santa Cruz - ondas de calor)
    if (currentLevel === 4 && !w.rain && !w.snow) {
        ctx.save(); ctx.globalAlpha = 0.08;
        for(let i=0; i<5; i++) {
            let hx = Math.sin(gframe * 0.03 + i * 2) * 30 + i * 80;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(hx, 100 + i * 20);
            ctx.quadraticCurveTo(hx + 20 + Math.sin(gframe * 0.05 + i) * 10, 90 + i * 20, hx + 40, 100 + i * 20);
            ctx.stroke();
        }
        ctx.restore();
    }

    // ENTIDADES
    birds.forEach(b => b.draw()); helis.forEach(h => h.draw()); drones.forEach(d => d.draw()); gases.forEach(g => g.draw()); gasps.forEach(g => g.draw()); teargas.forEach(t => t.draw()); fogatas.forEach(f => f.draw());
    llamas.forEach(l => l.draw()); obss.forEach(o => o.draw());
    itms.forEach(i => { if (i.x > camX - 80 && i.x < camX + cvs.width + 80) i.draw(); });
    enms.forEach(e => { if (e.x > camX - 100 && e.x < camX + cvs.width + 100) e.draw(); });
    mlts.forEach(m => { if (m.x > camX - 80 && m.x < camX + cvs.width + 80) m.draw(); });
    fires.forEach(f => { if (f.x > camX - 80 && f.x < camX + cvs.width + 80) f.draw(); });
    parts.forEach(p => { if (p.x > camX - 50 && p.x < camX + cvs.width + 50) p.draw(); });
    radioWaves.forEach(w => { if (w.x > camX - 200 && w.x < camX + cvs.width + 200) w.draw(); });
    abuls.forEach(b => b.draw()); ebuls.forEach(b => b.draw());
    dynas.forEach(d => { if (d.x > camX - 80 && d.x < camX + cvs.width + 80) d.draw(); });

    if (!gameStarted) { ctx.save(); ctx.translate(100 - camX + plyr.w / 2, plyr.y + plyr.h / 2); renderChar(ctx, demoChar, Math.sin(gframe * 0.15) * 3); ctx.restore(); } else plyr.draw();
}

function upd() {
    if (inShop || !dom.storyScreen.classList.contains('d-none')) return;
    if (gover) { dom.mainHud.classList.add('d-none'); dom.deathScreen.classList.remove('d-none'); return; }
    if (gwin) { dom.mainHud.classList.add('d-none'); dom.winScreen.classList.remove('d-none'); if (dom.winMoney) dom.winMoney.innerText = totalMoney; if (dom.winBullets) dom.winBullets.innerText = bul; if (dom.winTime) dom.winTime.innerText = Math.max(0, timeLeft); return; }
    gframe++; if (gframe % 60 === 0) { timeLeft--; if (timeLeft <= 0) { timeLeft = 0; gover = true; } updateUI(); }
    if (abilCd > 0) abilCd--;
    if (abilActive && abilDur > 0) {
        abilDur--;
        if (abilDur <= 0) {
            abilActive = false;
            if (selectedChar === 'poncho_j') plyr.defense -= 20;
            else if (selectedChar === 'evo_j') enms.forEach(e => { if (e._origSp) { e.sp = e._origSp; delete e._origSp; } });
            else if (selectedChar === 'joe') enms.forEach(e => { if (e._origSp) { e.sp = e._origSp; delete e._origSp; } });
        }
    }
    plyr.update(); birds.forEach(b => b.update());
    obss.forEach(o => {
        if (plyr.x + plyr.w > o.x && plyr.x < o.x + o.w && plyr.y + plyr.h > o.y && plyr.y < o.y + o.h) {
            const overlapL = (plyr.x + plyr.w) - o.x;
            const overlapR = (o.x + o.w) - plyr.x;
            const overlapT = (plyr.y + plyr.h) - o.y;
            const overlapB = (o.y + o.h) - plyr.y;
            if (overlapT < overlapL && overlapT < overlapR && overlapT < overlapB && plyr.vy >= 0) {
                plyr.y = o.y - plyr.h; plyr.vy = 0; plyr.jmp = false;
            } else if (overlapL < overlapR) plyr.x = o.x - plyr.w;
            else plyr.x = o.x + o.w;
        }
    });
    camX = plyr.x - 250; if (camX < 0) camX = 0; if (camX > llen - cvs.width) camX = llen - cvs.width;
    itms.forEach(i => { 
        if (i.a && Math.abs(plyr.x - i.x) < 50 && Math.abs(plyr.y - i.y) < 80) { 
            i.a = false; psnd('collect'); 
            if (i.t === 'comida') { sviv++; plyr.hp = Math.min(100, plyr.hp + 10); }
            else if (i.t === 'botiquin') { plyr.hp = Math.min(100, plyr.hp + 40); }
            else if (i.t === 'gasolina') sgas++;
            else if (i.t === 'vida') { lives++; psnd('collect'); }
            else bul += 15; 
            updateUI(); 
        } 
    });
    const isVillainBando = ['poncho_j', 'cob_j', 'evo_j', 'cholita', 'perro'].includes(selectedChar);
    const getEnemyType = (base) => { if (isVillainBando) { if (base === 'evo') return 'rodrigo_e'; if (base === 'cob') return (Math.random() > 0.5 ? 'pm_e' : 'policia_bol_e'); return 'rebelde_e'; } return base; };
    enms.forEach(e => { 
        e.update(); if (Math.abs(plyr.x - e.x) < 35 && Math.abs(plyr.y - e.y) < 50) plyr.dmg(30);
        if ((e.t === 'evo' || e.t === 'rodrigo_e') && e.active) {
            evoTimer++; evoSpecialTimer++;
            if (evoTimer > 900) { 
                if (e.t === 'evo') { for (let i = 0; i < 3; i++) enms.push(new Enmy(e.x + 200 + i * 50, cvs.height - 85, getEnemyType('poncho'))); }
                else { 
                    // ATAQUES ESPECIALES DEL PRESIDENTE
                    let rnd = Math.random(); 
                    if (rnd < 0.4) helis.push(new Helicopter(e.x + 600, 50)); 
                    else if (rnd < 0.8) gases.push(new GasCloud(plyr.x)); 
                    
                    // AHORA 3 REFUERZOS MIRANDO AL JUGADOR
                    for (let i = 0; i < 3; i++) {
                        let unit = (i % 2 === 0 ? 'pm_e' : 'policia_bol_e');
                        let spawnX = e.x + 150 + i * 50;
                        let direction = (spawnX > plyr.x) ? -1 : 1;
                        enms.push(new Enmy(spawnX, cvs.height - 85, unit, direction)); 
                    }
                }
                evoTimer = 0; psnd('shoot');
            }
            if (e.t === 'evo' && evoSpecialTimer > 1500) {
                psnd('boom'); 
                for (let i = 0; i < 3; i++) {
                    enms.push(new Enmy(camX + cvs.width + 100 + i*40, cvs.height - 85, 'poncho', -1)); 
                    enms.push(new Enmy(camX - 100 - i*40, cvs.height - 85, 'cob', 1)); 
                }
                evoSpecialTimer = 0;
                for(let j=0; j<20; j++) parts.push(new Part(plyr.x, plyr.y - 50, '#f00'));
            }
        }
    });
    helis.forEach(h => h.update()); helis = helis.filter(h => h.a); gases.forEach(g => g.update()); gases = gases.filter(g => g.a);
    drones.forEach(d => d.update()); drones = drones.filter(d => d.a);
    teargas.forEach(t => t.update()); teargas = teargas.filter(t => t.a);
    fogatas.forEach(f => f.update()); fogatas = fogatas.filter(f => f.a);
    // MOLOTOVS / BOTELLAS / PIEDRAS / PALOS — daño en vuelo al jugador, daño por explosión a enemigos
    mlts.forEach(m => {
        const wasAlive = m.a;
        m.update();
        if (m.a && Math.abs(m.x - plyr.x) < 16 && Math.abs(m.y - (plyr.y + 25)) < 28) {
            m.a = false; plyr.dmg(8);
            for (let i = 0; i < 5; i++) parts.push(new Part(m.x, m.y, '#f44'));
        }
        if (wasAlive && !m.a) {
            if (Math.abs(plyr.x - m.x) < 55 && plyr.y > cvs.height - 80) plyr.dmg(5);
            enms.forEach(e => { if (Math.abs(e.x - m.x) < 70) { e.hp -= 10; psnd('hit'); if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); } } });
        }
    }); mlts = mlts.filter(m => m.a);
    // GAS PROYECTIL — daño en vuelo al jugador
    gasps.forEach(g => {
        const wasAlive = g.a;
        g.update();
        if (g.a && Math.abs(g.x - plyr.x) < 14 && Math.abs(g.y - (plyr.y + 25)) < 25) {
            g.a = false; gases.push(new GasCloud(g.x)); plyr.dmg(6);
        }
    }); gasps = gasps.filter(g => g.a);
    // FUEGO — daño a jugador y enemigos
    fires.forEach(f => {
        f.update();
        if (Math.abs(plyr.x - f.x) < 45 && plyr.y > cvs.height - 95) plyr.dmg(10);
        if (f.owner === 'player') enms.forEach(e => { if (Math.abs(e.x - f.x) < 50) { e.hp -= 5; if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); } } });
    }); fires = fires.filter(f => f.a);
    parts.forEach(p => p.update()); parts = parts.filter(p => p.l > 0);
    abuls.forEach(b => { b.update(); enms.forEach(e => { if (b.a && e.x > camX - 50 && e.x < camX + cvs.width + 50 && Math.abs(b.x - e.x) < 40 && Math.abs(b.y - e.y) < 60) { b.a = false; e.hp -= (1 + plyr.damageMod); psnd('hit'); if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); } } }); }); abuls = abuls.filter(b => b.a);
    radioWaves.forEach(w => w.update()); radioWaves = radioWaves.filter(w => !w.isDead());
    ebuls.forEach(b => { b.update(); if (Math.abs(b.x - plyr.x) < 20 && Math.abs(b.y - (plyr.y + 25)) < 30) { b.a = false; plyr.dmg(15); } }); ebuls = ebuls.filter(b => b.a);
    // DINAMITA — daño a jugador y enemigos al explotar
    dynas.forEach(d => {
        const wasAlive = d.a;
        d.update();
        if (wasAlive && !d.a) {
            if (Math.abs(plyr.x - d.x) < 80 && plyr.y > cvs.height - 95) plyr.dmg(20);
            enms.forEach(e => { if (Math.abs(e.x - d.x) < 90) { e.hp -= 20; psnd('hit'); if (e.hp <= 0) { totalMoney += (e.t.includes('evo') ? 30 : (e.t.includes('cob') ? 10 : 5)); e.x = -2000; updateUI(); } } });
        }
    }); dynas = dynas.filter(d => d.a);
}

function loop() { ctx.clearRect(0, 0, cvs.width, cvs.height); if (!gameStarted) { gframe++; camX += 0.5; if (camX > llen - cvs.width) camX = 0; dScene(); } else { upd(); dScene(); } requestAnimationFrame(loop); }
window.addEventListener('keydown', e => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    
    // SALTAR HISTORIA
    if ((e.code === 'KeyX' || e.code === 'KeyZ') && !dom.storyScreen.classList.contains('d-none')) { 
        skipStory(); 
        return; 
    }

    if (e.code === 'KeyX' && bul > 0 && !gover && !gwin && gameStarted) { 
        psnd('shoot'); 
        abuls.push(new Bull(plyr.x + (plyr.f === 1 ? 35 : -5), plyr.y + 25, plyr.f)); 
        bul--; 
        updateUI(); 
    }
    if (e.code === 'KeyZ' && !gover && !gwin && gameStarted && abilCd <= 0 && abilDur <= 0) {
        useAbility();
        updateUI();
    }
});
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.code)) keys[e.code] = false; });
document.getElementById('start-btn').addEventListener('click', () => { 
    document.getElementById('start-screen').classList.add('d-none'); 
    document.getElementById('char-selection-screen').classList.remove('d-none'); 
    
    playBGM('menu');
    
    drawPreview('preview-pm', 'pm'); 
    drawPreview('preview-policia_bol', 'policia_bol'); 
    drawPreview('preview-rebelde', 'rebelde'); 
    drawPreview('preview-perro', 'perro');
    drawPreview('preview-dea', 'dea');
    drawPreview('preview-jara', 'jara'); 
    drawPreview('preview-cholita', 'cholita'); 
    drawPreview('preview-joe', 'joe');
    drawPreview('preview-poncho_j', 'poncho_j'); 
    drawPreview('preview-cob_j', 'cob_j'); 
    drawPreview('preview-evo_j', 'evo_j'); 
    drawPreview('preview-rodrigo', 'rodrigo'); 
});
init(1); loop();