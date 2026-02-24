const $ = (id) => document.getElementById(id);
const API_BASE = window.location.origin;

let stream = null;
let countdownTimer = null;
let currentStudentUrl = ""; 

function showMsg(text, type = "info") {
    const msg = $("msg") || $("sessionStatus");
    if (!msg) return;
    msg.className = `msg ${type}`;
    msg.innerText = text;
}

// 1. DATE & TIME (Fixed for Instant Display)
function updateDateTime() {
    const now = new Date();
    if ($("date")) $("date").innerText = now.toLocaleDateString("en-IN");
    if ($("time")) $("time").innerText = now.toLocaleTimeString("en-IN");
}
updateDateTime(); // Call immediately
setInterval(updateDateTime, 1000);

// 2. CAMERA CONTROL
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        $("video").srcObject = stream;
        showMsg("✅ Camera ON", "success");
    } catch (e) { showMsg("❌ Camera access denied", "error"); }
}

function stopCamera() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    if ($("video")) $("video").srcObject = null;
    showMsg("⚠️ Camera OFF", "warn");
}

// 3. MARK ATTENDANCE
async function markAttendance() {
    const token = new URLSearchParams(window.location.search).get("token");
    const name = $("studentName")?.value.trim();
    const regNo = $("registrationNo")?.value.trim();
    if (!token) return showMsg("❌ Scan Teacher QR first", "error");
    
    const canvas = document.createElement("canvas");
    canvas.width = $("video").videoWidth;
    canvas.height = $("video").videoHeight;
    canvas.getContext("2d").drawImage($("video"), 0, 0);

    try {
        showMsg("⏳ Saving...", "info");
        const res = await fetch(`${API_BASE}/student/add`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, registrationNo: regNo, image: canvas.toDataURL("image/png"), token })
        });
        if (res.ok) {
            showMsg("✅ Attendance Saved", "success");
            $("studentName").value = ""; $("registrationNo").value = "";
        } else {
            const err = await res.text();
            showMsg(`❌ ${err}`, "error");
        }
    } catch (e) { showMsg("❌ Server Error", "error"); }
}

// 4. TEACHER SESSION
async function startTeacherSession() {
    try {
        showMsg("⏳ Creating session...", "info");
        const res = await fetch(`${API_BASE}/session/start`);
        const data = await res.json();
        currentStudentUrl = `${window.location.origin}/index.html?token=${data.token}`;
        $("qrImg").src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentStudentUrl)}`;
        $("qrBox").style.display = "block";
        startCountdown(data.expiresInSeconds || 30);
    } catch (e) { showMsg("❌ Connection failed", "error"); }
}

function startCountdown(seconds) {
    let left = seconds;
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        left--;
        if ($("leftSec")) $("leftSec").innerText = left;
        if (left <= 0) { 
            clearInterval(countdownTimer); 
            $("qrBox").style.display = "none"; 
            showMsg("⏳ Session Expired", "warn"); 
        }
    }, 1000);
}

function openStudentPage() {
    if (currentStudentUrl) window.open(currentStudentUrl, '_blank');
    else alert("Please start a session first!");
}

function copyStudentLink() {
    if (currentStudentUrl) {
        navigator.clipboard.writeText(currentStudentUrl);
        alert("📋 Link Copied!");
    }
}

// 5. LIST & REPORTS
if ($("data")) {
    (async function() {
        try {
            const res = await fetch(`${API_BASE}/students`);
            const list = await res.json();
            $("data").innerHTML = list.map(s => `
                <tr>
                    <td><img src="${API_BASE}/photos/${s.photo}" class="student-photo" onerror="this.src='https://via.placeholder.com/50'"></td>
                    <td><strong>${s.name}</strong><br><small>${s.registrationNo}</small></td>
                    <td>${s.attendanceDate}</td>
                    <td>${s.attendanceTime}</td>
                </tr>`).join("");
        } catch (e) { }
    })();
}