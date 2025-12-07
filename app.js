const officeLat = 3.1925444;  // Kuala Lumpur office
const officeLng = 101.6110718;
const maxDistanceMeters = 500;

// Update date/time
function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("datetime").innerHTML = `${now.toLocaleDateString(undefined, options)} | ${now.toLocaleTimeString()}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// Display stored staff name
const staffNameDisplay = document.getElementById("staffNameDisplay");
const storedName = localStorage.getItem("staffName");
staffNameDisplay.textContent = storedName ? `👤 ${storedName}` : '👤 No name saved yet';

// Distance calculator
function distanceBetween(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Check location before check-in/out
function checkLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const distance = distanceBetween(latitude, longitude, officeLat, officeLng);
    let locationInfo = `Latitude: ${latitude}, Longitude: ${longitude}`;
    if (distance <= maxDistanceMeters) {
      proceedCheck("Used GPS", locationInfo);
    } else {
      if (confirm("❌ You are not in office area! Proceed anyway?")) {
        proceedCheck("No GPS", "No Location");
      } else alert("✅ Action cancelled.");
    }
  }, () => {
    if (confirm("❌ Cannot get location! Proceed anyway?")) {
      proceedCheck("No GPS", "No Location");
    } else alert("✅ Action cancelled.");
  });
}

// Proceed check-in/out
function proceedCheck(remark, location) {
  let name = localStorage.getItem("staffName");
  if (!name) {
    name = prompt("Enter your name:");
    if (!name) return;
    localStorage.setItem("staffName", name);
    staffNameDisplay.textContent = `👤 ${name}`;
  }
  checkToday(name, remark, location);
}

function checkToday(name, remark, location) {
  const today = new Date().toISOString().slice(0,10);
  const lastAction = localStorage.getItem("lastActionDate");
  let action;
  if (lastAction === today) {
    action = "Check-Out";
    localStorage.removeItem("lastActionDate");
  } else {
    action = "Check-In";
    localStorage.setItem("lastActionDate", today);
  }
  sendAttendance(name, action, remark, location);
}

// Send attendance to Google Form
function sendAttendance(name, action, remark, location) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse"; // Replace with your Form URL
  const formData = new FormData();
  formData.append("entry.2140323296", name);
  formData.append("entry.668867521", action);
  formData.append("entry.1234567890", remark);
  formData.append("entry.9876543210", location);

  fetch(formUrl, { method: "POST", mode: "no-cors", body: formData })
    .then(() => alert(`✅ ${action} successful for ${name} at ${new Date().toLocaleTimeString()}`))
    .catch(() => alert("❌ Failed to send attendance!"));
}

// Load attendance history
function loadHistoryFromSheet() {
  const name = localStorage.getItem("staffName")?.trim();
  if (!name) { alert("❗ Please check in at least once to save your name."); return; }
  const normName = name.toLowerCase();

  const month = parseInt(document.getElementById("monthSelect").value, 10);
  const year = parseInt(document.getElementById("yearSelect").value, 10);

  fetch('https://script.google.com/macros/s/AKfycbzw79gDoE49-IxPCcVF8X_RgTRtAiWgqNl0GrFtYU_CtuwnimviTcVBuB0K69QFsRIQ/exec') // Replace with your deployed Google Apps Script Web App URL
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById("historyBody");
      tbody.innerHTML = "";

      const filtered = data.filter(record => {
        const recName = (record["Name"] || "").trim().toLowerCase();
        if (recName !== normName) return false;

        let dateString = record["Date"] || record["Check-In Time"] || "";
        dateString = dateString.split(" ")[0];

        let day, recMonth, recYear;
        if (dateString.includes("/")) [day, recMonth, recYear] = dateString.split("/").map(Number);
        else if (dateString.includes("-")) [recYear, recMonth, day] = dateString.split("-").map(Number);
        else return false;

        return recMonth === month && recYear === year;
      });

      if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="8">No records for ${name} in ${month}/${year}</td></tr>`;
        return;
      }

      filtered.reverse().forEach(r => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r["Date"] || ""}</td>
          <td>${r["Name"] || ""}</td>
          <td>${r["Check-In Time"] || ""}</td>
          <td>${r["Check-Out Time"] || ""}</td>
          <td>${r["Total Work Hours"] || ""}</td>
          <td>${r["Work in Minutes"] || ""}</td>
          <td>${r["Remark"] || ""}</td>
          <td>${r["Location"] || ""}</td>
        `;
        tbody.appendChild(tr);
      });
    })
    .catch(err => { console.error(err); alert("❌ Failed to load attendance history."); });
}

// Populate month/year dropdowns
function loadMonthYearDropdowns() {
  const monthSelect = document.getElementById("monthSelect");
  const yearSelect = document.getElementById("yearSelect");
  const now = new Date();

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.text = new Date(0, m-1).toLocaleString('default', { month: 'long' });
    if (m === now.getMonth()+1) opt.selected = true;
    monthSelect.appendChild(opt);
  }

  const currentYear = now.getFullYear();
  for (let y = currentYear; y >= currentYear - 5; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.text = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadMonthYearDropdowns();
  loadHistoryFromSheet();
});

