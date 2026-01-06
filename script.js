let btDevice, btCharacteristic;
let dataHistory = Array(20).fill(0);
let lastAlertTime = 0;

// Initialize Chart
const trendCtx = document.getElementById('trendChart').getContext('2d');
const trendChart = new Chart(trendCtx, {
    type: 'line',
    data: {
        labels: Array(20).fill(''),
        datasets: [{
            data: dataHistory,
            borderColor: '#00e5ff',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(0, 229, 255, 0.1)',
            pointRadius: 0
        }]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { display: false } } }
});

async function connectBT() {
    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'HC' }], // Looking for HC-05 / HC-06
            optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] // Standard Bluetooth Serial UUID
        });
        
        const server = await device.gatt.connect();
        // Note: Real HC-05 usually requires a specific service/char. 
        // For web-serial compatibility, some use '00001101...' 
        
        document.getElementById("status").innerText = "CORE ONLINE";
        document.getElementById("status").style.color = "#00e5ff";
        
        // This is a simplified listener. 
        // If your HC-05 is classic BT, Chrome Android requires "Web Bluetooth" API features.
        console.log("Connected to", device.name);
        
    } catch (err) {
        console.log("BT Error: " + err);
        alert("Bluetooth Connection failed. Ensure Bluetooth is on and device is paired.");
    }
}

// Logic to handle strings from Arduino
function handleIncomingData(msg) {
    msg = msg.toLowerCase();
    let threatFound = false;
    let type = "";
    let reasoning = "";

    if (msg.includes("fire")) { triggerAlert("fire", "CRITICAL", "Thermal spike detected!"); threatFound = true; type = "FIRE"; }
    if (msg.includes("smoke")) { triggerAlert("smoke", "DANGER", "Smoke density high!"); threatFound = true; type = "SMOKE"; }
    if (msg.includes("intruder")) { triggerAlert("laser", "BREACH", "Laser beam cut!"); threatFound = true; type = "INTRUDER"; }
    if (msg.includes("object")) { triggerAlert("motion", "PROXIMITY", "Object detected nearby."); threatFound = true; type = "MOTION"; }

    if (threatFound) {
        speakAI(reasoning);
        if (Date.now() - lastAlertTime > 5000) {
            saveRecord(type);
            lastAlertTime = Date.now();
        }
    }

    dataHistory.push(threatFound ? 100 : 0);
    dataHistory.shift();
    trendChart.update();
}

function triggerAlert(id, status, text) {
    const card = document.getElementById(id);
    card.classList.add("alarm");
    document.getElementById(`val-${id}`).innerText = status;
    document.getElementById("ai-thought").innerText = text;

    setTimeout(() => {
        card.classList.remove("alarm");
        document.getElementById(`val-${id}`).innerText = (id === 'laser') ? "SECURE" : "STABLE";
    }, 5000);
}

// UI Functions
function sendChat() {
    const input = document.getElementById("chatInput");
    if (!input.value.trim()) return;
    addChatMsg(input.value, "user-msg");
    
    // AI Mock Response
    setTimeout(() => {
        let response = "Scanning neural nodes. System status nominal.";
        if (input.value.toLowerCase().includes("summary")) response = "3 alerts recorded in the last 24 hours.";
        addChatMsg(response, "ai-msg");
        speakAI(response);
    }, 600);
    input.value = "";
}

function addChatMsg(text, className) {
    const body = document.getElementById("chat-body");
    const msg = document.createElement("div");
    msg.className = className;
    msg.innerText = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
}

function speakAI(text) {
    const speech = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(speech);
}

function saveRecord(type) {
    const grid = document.getElementById("archive-grid");
    const el = document.createElement("div");
    el.className = "record-card";
    el.innerHTML = `<strong>${type} ALERT</strong><br>${new Date().toLocaleTimeString()} - Neural event logged.`;
    grid.prepend(el);
}

function stopAlarm() {
    window.speechSynthesis.cancel();
    document.querySelectorAll('.tile').forEach(t => t.classList.remove('alarm'));
}