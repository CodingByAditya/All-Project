// ============================
// Common helpers
// ============================
const $ = (id) => document.getElementById(id);

// ✅ API base auto
// - If opened from Spring Boot (8080) -> same origin
// - If opened from mobile -> use same host as page
const API_BASE = window.location.origin;

let stream = null;
let countdownTimer = null;

// student token from QR link: index.html?token=xxxx
const SESSION_TOKEN = new URLSearchParams(window.location.search).get("token");

// message helper
function showMsg(text, type = "info") {
  const msg = $("msg") || $("sessionStatus");
  if (!msg) return;
  msg.className = `msg ${type}`;
  msg.innerText = text;
}

// ============================
// Student camera
// ============================
async function startCamera() {
  const video = $("video");
  if (!video) return;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    showMsg("✅ Camera ON", "success");
  } catch (e) {
    console.error(e);
    showMsg("❌ Allow camera permission", "error");
  }
}

function stopCamera() {
  const video = $("video");
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (video) video.srcObject = null;
  showMsg("⚠️ Camera OFF", "warn");
}

// ============================
// Date & Time (index page)
// ============================
function updateDateTime() {
  const dateEl = $("date");
  const timeEl = $("time");
  if (!dateEl && !timeEl) return;

  const now = new Date();
  if (dateEl) dateEl.innerText = now.toLocaleDateString("en-IN");
  if (timeEl) timeEl.innerText = now.toLocaleTimeString("en-IN");
}
if ($("date") || $("time")) {
  updateDateTime();
  setInterval(updateDateTime, 1000);
}

// ============================
// Student Mark Attendance (QR + Photo)
// ============================
async function markAttendance() {
  const nameInput = $("studentName");
  const regInput = $("registrationNo");
  const video = $("video");
  const canvas = $("canvas");

  if (!nameInput || !regInput || !video || !canvas) return;

  const name = nameInput.value.trim();
  const regNo = regInput.value.trim();

  if (!SESSION_TOKEN) {
    showMsg("❌ Scan Teacher QR first", "error");
    return;
  }
  if (!name || !regNo) {
    showMsg("❌ Enter Name and Registration No", "error");
    return;
  }
  if (!stream) {
    showMsg("❌ Start Camera first", "error");
    return;
  }

  // capture image
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  canvas.getContext("2d").drawImage(video, 0, 0);
  const imageData = canvas.toDataURL("image/png");

  const photoImg = $("photo");
  const photoWrap = $("photo-container");
  if (photoImg) photoImg.src = imageData;
  if (photoWrap) photoWrap.style.display = "block";

  try {
    showMsg("⏳ Saving attendance...", "info");

    const res = await fetch(`${API_BASE}/student/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        registrationNo: regNo,
        image: imageData,
        token: SESSION_TOKEN,
      }),
    });

    const text = await res.text().catch(() => "");

    if (res.ok) {
      showMsg(text || "✅ Attendance Saved", "success");
      nameInput.value = "";
      regInput.value = "";
    } else {
      showMsg(text || "❌ Attendance failed", "error");
    }
  } catch (e) {
    console.error(e);
    showMsg("❌ Server not reachable", "error");
  }
}

// ============================
// Teacher Session + QR + Countdown 30s
// ============================
async function startTeacherSession() {
  const statusEl = $("sessionStatus");
  const qrBox = $("qrBox");
  const qrImg = $("qrImg");
  const studentLink = $("studentLink");
  const leftSec = $("leftSec");

  if (!statusEl || !qrBox || !qrImg || !studentLink || !leftSec) return;

  statusEl.className = "msg info";
  statusEl.innerText = "Creating session...";

  try {
    const res = await fetch(`${API_BASE}/session/start`);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      statusEl.className = "msg error";
      statusEl.innerText = `❌ Error: ${res.status} ${t}`;
      return;
    }

    const data = await res.json();
    const token = data.token;
    const seconds = data.expiresInSeconds || 30;

   
    const url = `${window.location.origin}/index.html?token=${encodeURIComponent(token)}`;

    
    qrImg.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" +
      encodeURIComponent(url);

    
    studentLink.href = url;
    studentLink.innerText = "Open Student Attendance Page";

    qrBox.style.display = "block";
    startCountdown(seconds);
  } catch (e) {
    console.error(e);
    statusEl.className = "msg error";
    statusEl.innerText = "❌ Server error. Try again.";
  }
}

function startCountdown(seconds) {
  const statusEl = $("sessionStatus");
  const leftSec = $("leftSec");
  if (!statusEl || !leftSec) return;

  let left = seconds;
  leftSec.innerText = left;

  if (countdownTimer) clearInterval(countdownTimer);

  statusEl.className = "msg success";
  statusEl.innerText = `🟢 Session Active | Time Left: ${left}s`;

  countdownTimer = setInterval(() => {
    left--;
    leftSec.innerText = Math.max(left, 0);

    if (left <= 0) {
      clearInterval(countdownTimer);
      statusEl.className = "msg warn";
      statusEl.innerText = "⏳ Session Expired. Start again.";
      return;
    }
    statusEl.innerText = `🟢 Session Active | Time Left: ${left}s`;
  }, 1000);
}

async function copyStudentLink() {
  const a = $("studentLink");
  if (!a) return;

  try {
    await navigator.clipboard.writeText(a.href);
    showMsg("✅ Link copied", "success");
  } catch (e) {
    alert("Copy failed. Long press the link and copy.");
  }
}


async function loadAttendance() {
  const tbody = $("data");
  if (!tbody) return;

  showMsg("Loading attendance...", "info");

  try {
    const res = await fetch(`${API_BASE}/students`);
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      showMsg(`❌ /students error: ${res.status} ${t}`, "error");
      return;
    }

    const list = await res.json();
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      showMsg("No attendance records found.", "warn");
      tbody.innerHTML = `<tr><td colspan="5" class="no-data">No attendance records</td></tr>`;
      return;
    }

    showMsg(`✅ Loaded ${list.length} record(s)`, "success");

    list.forEach((s) => {
      const img = s.photo
        ? `${API_BASE}/photos/${s.photo}?t=${Date.now()}`
        : "https://via.placeholder.com/70";

      tbody.innerHTML += `
        <tr>
          <td><img src="${img}" class="student-photo" onerror="this.src='https://via.placeholder.com/70'"></td>
          <td>${s.name ?? ""}</td>
          <td>${s.registrationNo ?? ""}</td>
          <td>${s.attendanceDate ?? ""}</td>
          <td>${s.attendanceTime ?? ""}</td>
        </tr>`;
    });
  } catch (e) {
    console.error(e);
    showMsg("❌ Cannot connect to server. Is Spring Boot running?", "error");
  }
}
if ($("data")) loadAttendance();


async function generateReport() {
  const regInput = $("regNoInput");
  const resultDiv = $("reportResult");
  if (!regInput || !resultDiv) return;

  const regNo = regInput.value.trim();
  if (!regNo) {
    showMsg("❌ Enter Registration No", "error");
    return;
  }

  try {
    showMsg("Loading report...", "info");

    const res = await fetch(`${API_BASE}/student/report/${encodeURIComponent(regNo)}`);
    if (!res.ok) {
      showMsg("❌ No records found for this registration number", "warn");
      resultDiv.style.display = "none";
      return;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      showMsg("❌ No records found", "warn");
      resultDiv.style.display = "none";
      return;
    }

    const totalWorkingDays = 40; 
    const presentDays = data.length;
    const percent = ((presentDays / totalWorkingDays) * 100).toFixed(1);

    $("displayName").innerText = data[0].name || "-";
    $("displayCount").innerText = `${presentDays} (${percent}%)`;

    const status = $("attendanceStatus");
    const p = Number(percent);

    if (p >= 85) status.innerText = "STATUS: EXCELLENT";
    else if (p >= 75) status.innerText = "STATUS: ELIGIBLE FOR EXAM";
    else if (p >= 65) status.innerText = "STATUS: SHORTAGE";
    else status.innerText = "STATUS: NOT ELIGIBLE";

    resultDiv.style.display = "block";
    showMsg("✅ Report generated", "success");
  } catch (e) {
    console.error(e);
    showMsg("❌ Server not running!", "error");
  }
}


function exportTableToCSV(filename) {
    const csv = [];
    const rows = document.querySelectorAll(".attendance-table tr");
    
    for (let i = 0; i < rows.length; i++) {
        let row = [];
        const cols = rows[i].querySelectorAll("td, th");
        
        for (let j = 1; j < cols.length; j++) {
            let cellText = cols[j].innerText.trim();
            
            if (cols[j].tagName.toLowerCase() === 'td' && j === 2) {
         
                row.push('="' + cellText + '"'); 
            } else {
              
                row.push('"' + cellText + '"'); 
            }
        }
        
        if (row.length > 0) {
            csv.push(row.join(","));
        }
    }

    const csvContent = "\uFEFF" + csv.join("\n");
    const csvFile = new Blob([csvContent], {type: "text/csv;charset=utf-8;"});
    
    const downloadLink = document.createElement("a");
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}