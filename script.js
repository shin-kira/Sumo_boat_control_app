const firebaseConfig = { databaseURL: "https://sumo-bot-f0b57-default-rtdb.europe-west1.firebasedatabase.app/" };
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let joystickTouchId = null;
const zone = document.getElementById('joystickZone');
const stick = document.getElementById('stick');

// --- Multi-Touch Button Handler ---
function bindAction(id, onStart, onEnd) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); onStart(); }, {passive: false});
    btn.addEventListener('touchend', (e) => { e.preventDefault(); onEnd(); }, {passive: false});
}

bindAction('liftUpBtn', () => sendArm(1), () => sendArm(0));
bindAction('liftDownBtn', () => sendArm(2), () => sendArm(0));

// --- Joystick Logic (Multi-Touch Aware) ---
zone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joystickTouchId = e.changedTouches[0].identifier;
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    let touch = null;
    for (let t of e.touches) {
        if (t.identifier === joystickTouchId) { touch = t; break; }
    }
    if (!touch) return;

    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    const rad = rect.width / 2 - 10;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > rad) { dx *= rad / dist; dy *= rad / dist; }

    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    updateMotors(dx/rad, -(dy/rad));
}, {passive: false});

window.addEventListener('touchend', (e) => {
    for (let t of e.changedTouches) {
        if (t.identifier === joystickTouchId) {
            joystickTouchId = null;
            stick.style.transform = 'translate(-50%, -50%)';
            updateMotors(0, 0);
        }
    }
});

function updateMotors(x, y) {
    let TR=0, TL=0, BR=0, BL=0, mode=0;
    if (Math.abs(y) > 0.1 || Math.abs(x) > 0.1) {
        if (y >= 0) {
            mode = 1;
            TL = Math.round(255 * Math.min(1, Math.max(0, y + x)));
            TR = Math.round(255 * Math.min(1, Math.max(0, y - x)));
        } else {
            mode = 2;
            BL = Math.round(255 * Math.min(1, Math.max(0, -y + x)));
            BR = Math.round(255 * Math.min(1, Math.max(0, -y - x)));
        }
    }
    document.getElementById('matrixOut').innerText = `[[${TR},${TL}],[${BR},${BL}]]`;
    database.ref('controls').update({ leftThrottle: y>=0?TL:BL, rightThrottle: y>=0?TR:BR, Drive: mode });
}

function sendArm(v) { database.ref('controls').update({ liver: v }); }

document.getElementById('camConnectBtn').onclick = () => {
    const ip = document.getElementById('cameraIp').value;
    const img = document.getElementById('stream');
    img.src = `http://${ip}:81/stream`;
    img.style.display = "block";
    document.getElementById('camPlaceholder').style.display = "none";
};