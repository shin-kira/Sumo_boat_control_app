// --- FIREBASE CONFIG ---
const firebaseConfig = {
    databaseURL: "https://sumo-bot-f0b57-default-rtdb.europe-west1.firebasedatabase.app/"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let isDragging = false;
const zone = document.getElementById('joystickZone');
const stick = document.getElementById('stick');

// --- CAMERA ---
function connectCamera() {
    const ip = document.getElementById('cameraIp').value;
    const streamImg = document.getElementById('stream');
    if(ip) {
        streamImg.src = `http://${ip}:81/stream`; 
        streamImg.style.display = "block";
        document.getElementById('camPlaceholder').style.display = "none";
        logMsg("Camera Linked.");
    }
}

// --- DRIVING LOGIC ---
function handleMove(e) {
    if (!isDragging) return;

    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Support both mouse and touch
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX**2 + deltaY**2);
    const radius = rect.width / 2 - 25;

    if (distance > radius) {
        deltaX *= radius / distance;
        deltaY *= radius / distance;
    }

    stick.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;

    const x = deltaX / radius;
    const y = -(deltaY / radius);
    
    // Send Matrix to Firebase
    let TR = 0, TL = 0, BR = 0, BL = 0;
    let driveMode = 0;

    if (Math.abs(y) > 0.1 || Math.abs(x) > 0.1) {
        if (y >= 0) { 
            driveMode = 1; // FWD
            TL = Math.round(255 * Math.min(1, Math.max(0, y + x)));
            TR = Math.round(255 * Math.min(1, Math.max(0, y - x)));
        } else { 
            driveMode = 2; // BWD
            BL = Math.round(255 * Math.min(1, Math.max(0, -y + x)));
            BR = Math.round(255 * Math.min(1, Math.max(0, -y - x)));
        }
    }

    document.getElementById('matrixOut').innerText = `[[${TR},${TL}],[${BR},${BL}]]`;
    database.ref('controls').update({ leftThrottle: (y>=0?TL:BL), rightThrottle: (y>=0?TR:BR), Drive: driveMode });
}

// --- SYSTEMS ---
function sendArm(state) { database.ref('controls').update({ liver: state }); }
function logMsg(m) { const l = document.getElementById('log'); l.innerHTML += `<br>> ${m}`; l.scrollTop = l.scrollHeight; }

function emergencyStop() {
    isDragging = false;
    stick.style.transform = `translate(-50%, -50%)`;
    database.ref('controls').update({ leftThrottle: 0, rightThrottle: 0, Drive: 0 });
    logMsg("BRAKE ENGAGED");
}

// --- EVENT LISTENERS ---
const startEvent = (e) => { isDragging = true; };
const endEvent = () => { isDragging = false; stick.style.transform = `translate(-50%, -50%)`; calculateMatrix(0,0); };

zone.addEventListener('mousedown', startEvent);
zone.addEventListener('touchstart', startEvent);
window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, { passive: false });
window.addEventListener('mouseup', endEvent);
window.addEventListener('touchend', endEvent);