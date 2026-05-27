// ===== ESTADO =====
let records = JSON.parse(localStorage.getItem('records')) || [];
let contractionStart = null;
let timerInterval = null;

// ===== LOGIN =====
function login() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const remember = document.getElementById('remember').checked;

    if (!user || !pass) {
        shake(document.querySelector('.login-container'));
        return;
    }

    if (remember) localStorage.setItem('session', user);
    goTo('screen-main');
    updateMini();
    updateSemaforo();
}

function logout() {
    localStorage.removeItem('session');
    goTo('screen-login');
}

window.onload = function () {
    const session = localStorage.getItem('session');
    if (session) {
        goTo('screen-main');
        updateMini();
        updateSemaforo();
    }

    // Restaurar lastContraction desde records
    const lastC = records.find(r => r.type === 'contraction');
    if (lastC) lastContractionTime = new Date(lastC.time);
}

// ===== NAVEGACION =====
function goTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'screen-history') renderHistory();
}

// ===== TIMER CONTRACCION =====
let lastContractionTime = null;
let contractionDuration = 0;

function toggleContraction() {
    if (!contractionStart) {
        // INICIAR
        contractionStart = new Date();
        document.getElementById('contraction-ring').classList.replace('idle', 'active');
        document.getElementById('contraction-label').textContent = 'TOCÁ AL TERMINAR';

        timerInterval = setInterval(() => {
            const elapsed = Math.floor((new Date() - contractionStart) / 1000);
            document.getElementById('contraction-timer').textContent = formatInterval(elapsed);
        }, 1000);

    } else {
        // DETENER
        contractionDuration = Math.floor((new Date() - contractionStart) / 1000);
        clearInterval(timerInterval);
        contractionStart = null;

        document.getElementById('contraction-ring').classList.replace('active', 'idle');
        document.getElementById('contraction-label').textContent = 'CONTRACCIÓN';
        document.getElementById('contraction-timer').textContent = 'Tocá para iniciar';

        // Mostrar panel dolor
        showPanel('pain');
    }
}

function registerContraction(pain) {
    const now = new Date();
    const interval = lastContractionTime
        ? Math.round((now - lastContractionTime) / 1000)
        : null;
    lastContractionTime = now;

    records.unshift({
        type: 'contraction',
        pain: pain,
        duration: contractionDuration,
        time: now.toISOString(),
        interval: interval
    });

    saveRecords();
    hidePanel();
    updateMini();
    updateSemaforo();
}

// ===== MOVIMIENTO =====
function registerMovement(position) {
    records.unshift({
        type: 'movement',
        position: position,
        time: new Date().toISOString()
    });

    saveRecords();
    hidePanel();
    updateMini();
}

// ===== ROMPI BOLSA =====
function confirmWater() {
    if (confirm('¿Confirmás que rompiste bolsa?')) {
        records.unshift({
            type: 'water',
            time: new Date().toISOString()
        });
        saveRecords();
        updateMini();
        alert('⚠️ Registrado. Contactá a tu médico inmediatamente.');
    }
}

// ===== PANELES =====
function showPanel(type) {
    hidePanel();
    const panel = document.getElementById('panel-' + type);
    const overlay = document.getElementById('overlay');
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
}

function hidePanel() {
    ['panel-pain', 'panel-movement'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
    });
    document.getElementById('overlay').classList.add('hidden');
}

// ===== SEMAFORO 5-1-1 =====
function updateSemaforo() {
    const contractions = records.filter(r => r.type === 'contraction').slice(0, 6);
    const semaforo = document.getElementById('semaforo');
    const texto = document.getElementById('semaforo-text');

    if (contractions.length < 3) {
        setSemaforo('verde', 'Todo tranquilo');
        return;
    }

    // Calcular promedios
    const duraciones = contractions.filter(r => r.duration).map(r => r.duration);
    const intervalos = contractions.filter(r => r.interval).map(r => r.interval);

    const avgDuracion = duraciones.reduce((a, b) => a + b, 0) / duraciones.length;
    const avgIntervalo = intervalos.reduce((a, b) => a + b, 0) / intervalos.length;

    // Regla 5-1-1: duracion >= 60seg, intervalo <= 300seg (5min)
    if (avgDuracion >= 60 && avgIntervalo <= 300) {
        setSemaforo('rojo', '¡Andá al hospital!');
    } else if (avgDuracion >= 45 || avgIntervalo <= 480) {
        setSemaforo('amarillo', 'Prestá atención');
    } else {
        setSemaforo('verde', 'Todo tranquilo');
    }
}

function setSemaforo(estado, texto) {
    const semaforo = document.getElementById('semaforo');
    semaforo.className = 'semaforo ' + estado;
    document.getElementById('semaforo-text').textContent = texto;
}

// ===== DISPLAY MINI =====
function updateMini() {
    const mini = document.getElementById('mini-last');
    if (records.length === 0) { mini.textContent = 'Sin registros'; return; }

    const last = records[0];
    if (last.type === 'contraction') mini.textContent = `Dolor ${last.pain}/10 · ${formatInterval(last.duration)}`;
    else if (last.type === 'movement') mini.textContent = `Movimiento · ${last.position}`;
    else mini.textContent = '💧 Bolsa rota';
}

// ===== HISTORIAL =====
function renderHistory() {
    const list = document.getElementById('history-list');
    const statsBar = document.getElementById('stats-bar');
    list.innerHTML = '';

    // Stats
    const contractions = records.filter(r => r.type === 'contraction');
    const movements = records.filter(r => r.type === 'movement');
    const avgDolor = contractions.length
        ? (contractions.reduce((a, b) => a + b.pain, 0) / contractions.length).toFixed(1)
        : '-';
    const avgIntervalo = contractions.filter(r => r.interval).length
        ? contractions.filter(r => r.interval).reduce((a, b) => a + b.interval, 0) / contractions.filter(r => r.interval).length
        : null;

    statsBar.innerHTML = `
        <div class="stat-chip"><span>${contractions.length}</span>Contracciones</div>
        <div class="stat-chip"><span>${movements.length}</span>Movimientos</div>
        <div class="stat-chip"><span>${avgDolor}</span>Dolor prom.</div>
        ${avgIntervalo ? `<div class="stat-chip"><span>${formatInterval(Math.round(avgIntervalo))}</span>Intervalo prom.</div>` : ''}
    `;

    if (records.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#90a4ae;padding:40px;font-size:16px">Sin registros aún 🌸</p>';
        return;
    }

    records.forEach(r => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const hora = new Date(r.time).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        if (r.type === 'contraction') {
            item.innerHTML = `
                <div class="history-item-icon icon-contraction">💗</div>
                <div class="history-item-info">
                    <div class="history-item-tipo">Contracción</div>
                    <div class="history-item-valor">Dolor ${r.pain}/10 · ${formatInterval(r.duration)}</div>
                    <div class="history-item-tiempo">${hora}${r.interval ? ' · Intervalo: ' + formatInterval(r.interval) : ' · Primer registro'}</div>
                </div>
            `;
        } else if (r.type === 'movement') {
            item.innerHTML = `
                <div class="history-item-icon icon-movement">○</div>
                <div class="history-item-info">
                    <div class="history-item-tipo">Movimiento</div>
                    <div class="history-item-valor">${r.position}</div>
                    <div class="history-item-tiempo">${hora}</div>
                </div>
            `;
        } else {
            item.innerHTML = `
                <div class="history-item-icon icon-water">💧</div>
                <div class="history-item-info">
                    <div class="history-item-tipo">Rotura de bolsa</div>
                    <div class="history-item-valor">Registrado</div>
                    <div class="history-item-tiempo">${hora}</div>
                </div>
            `;
        }

        list.appendChild(item);
    });
}

function clearHistory() {
    if (confirm('¿Borrar todos los registros?')) {
        records = [];
        saveRecords();
        lastContractionTime = null;
        updateMini();
        updateSemaforo();
        renderHistory();
    }
}

// ===== UTILS =====
function saveRecords() {
    localStorage.setItem('records', JSON.stringify(records));
}

function formatInterval(seconds) {
    if (!seconds) return '0 seg';
    if (seconds < 60) return `${seconds} seg`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m} min ${s} seg` : `${m} min`;
}

function shake(el) {
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => el.style.animation = '', 400);
}