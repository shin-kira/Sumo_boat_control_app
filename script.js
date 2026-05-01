// --- CONFIGURATION ---
const firebaseConfig = {
    databaseURL: "https://sumo-bot-f0b57-default-rtdb.europe-west1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- STATE ---
let isDragging = false;
const zone = document.getElementById('joystickZone');
const stick = document.getElementById('stick');

// --- HELPER: ROBUST BUTTONS ---
function bindAction(elId, onStart, onEnd) {
    const el = document.getElementById(elId);
    const start = (e) => { e.preventDefault(); onStart(); };
    const end = (e) => { e.preventDefault(); onEnd(); };

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('mouseup', end);
    el.addEventListener('touchend', end, { passive: false });
}

// --- SYSTEMS ACTIONS ---
bindAction('liftUpBtn', () => sendArm(1), () => sendArm(0));
bindAction('liftDownBtn', () => sendArm(2), () => sendArm(0));
document.getElementById('brakeBtn').onclick = emergencyStop;

document.getElementById('camConnectBtn').onclick = () => {
    const ip = document.getElementById('cameraIp').value;
    if(ip) {
        const stream = document.getElementById('stream');
        stream.src = `http://${ip}:81/stream`;
        stream.style.display = "block";
        document.getElementById('camPlaceholder').style.display = "none";
        logMsg("Camera Stream Linked.");
    }
};

// --- DRIVE LOGIC ---
const handleMove = (e) => {
    if (!isDragging) return;

    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX**2 + deltaY**2);
    const radius = rect.width / 2 - 30;

    if (distance > radius) {
        deltaX *= radius / distance;
        deltaY *= radius / distance;
    }

    stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

    const x = deltaX / radius;
    const y = -(deltaY / radius);
    updateMatrix(x, y);
};

function updateMatrix(x, y) {
    let TR = 0, TL = 0, BR = 0, BL = 0, driveMode = 0;

    if (Math.abs(y) > 0.1 || Math.abs(x) > 0.1) {
        if (y >= 0) {
            driveMode = 1;
            TL = Math.round(255 * Math.min(1, Math.max(0, y + x)));
            TR = Math.round(255 * Math.min(1, Math.max(0, y - x)));
        } else {
            driveMode = 2;
            BL = Math.round(255 * Math.min(1, Math.max(0, -y + x)));
            BR = Math.round(255 * Math.min(1, Math.max(0, -y - x)));
        }
    }

    document.getElementById('matrixOut').innerText = `[[${TR},${TL}],[${BR},${BL}]]`;
    database.ref('controls').update({
        leftThrottle: y >= 0 ? TL : BL,
        rightThrottle: y >= 0 ? TR : BR,
        Drive: driveMode
    });
}

function sendArm(state) { database.ref('controls').update({ liver: state }); }

function emergencyStop() {
    isDragging = false;
    stick.style.transform = `translate(-50%, -50%)`;
    updateMatrix(0, 0);
    logMsg("EMERGENCY STOP ENGAGED");
}

function logMsg(m) {
    const l = document.getElementById('log');
    l.innerHTML += `<br>> ${m}`;
    l.scrollTop = l.scrollHeight;
}

// --- JOYSTICK LISTENERS ---
zone.addEventListener('mousedown', () => isDragging = true);
zone.addEventListener('touchstart', (e) => { e.preventDefault(); isDragging = true; }, { passive: false });

window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });

const stopDrag = () => { isDragging = false; stick.style.transform = `translate(-50%, -50%)`; updateMatrix(0,0); };
window.addEventListener('mouseup', stopDrag);
window.addEventListener('touchend', stopDrag);