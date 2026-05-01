const firebaseConfig = {
    databaseURL: "https://sumo-bot-f0b57-default-rtdb.europe-west1.firebasedatabase.app/"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let isDragging = false;
const zone = document.getElementById('joystickZone');
const stick = document.getElementById('stick');

// --- Helper for Uninterrupted Button Press ---
function bindAction(id, onStart, onEnd) {
    const btn = document.getElementById(id);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); onStart(); }, {passive: false});
    btn.addEventListener('touchend', (e) => { e.preventDefault(); onEnd(); }, {passive: false});
    btn.addEventListener('mousedown', onStart);
    btn.addEventListener('mouseup', onEnd);
}

bindAction('liftUpBtn', () => sendArm(1), () => sendArm(0));
bindAction('liftDownBtn', () => sendArm(2), () => sendArm(0));
document.getElementById('brakeBtn').onclick = emergencyStop;

// --- Joystick Logic ---
const handleMove = (e) => {
    if (!isDragging) return;
    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const rad = rect.width / 2 - 20;

    if (dist > rad) { dx *= rad / dist; dy *= rad / dist; }

    stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    sendDriveData(dx/rad, -(dy/rad));
};

function sendDriveData(x, y) {
    let TR = 0, TL = 0, BR = 0, BL = 0, mode = 0;
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
function emergencyStop() { isDragging = false; stick.style.transform = 'translate(-50%, -50%)'; sendDriveData(0,0); }

// --- Listeners ---
zone.addEventListener('touchstart', () => isDragging = true);
zone.addEventListener('mousedown', () => isDragging = true);
window.addEventListener('touchmove', handleMove, {passive: false});
window.addEventListener('mousemove', handleMove);
window.addEventListener('touchend', () => { isDragging = false; stick.style.transform = 'translate(-50%, -50%)'; sendDriveData(0,0); });
window.addEventListener('mouseup', () => { isDragging = false; stick.style.transform = 'translate(-50%, -50%)'; sendDriveData(0,0); });

document.getElementById('camConnectBtn').onclick = () => {
    const ip = document.getElementById('cameraIp').value;
    const img = document.getElementById('stream');
    img.src = `http://${ip}:81/stream`;
    img.style.display = "block";
    document.getElementById('camPlaceholder').style.display = "none";
};