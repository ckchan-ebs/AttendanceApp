<script>
const officeLat = 3.1925444;  // Example location (Kuala Lumpur)
const officeLng = 101.6110718;
const maxDistanceMeters = 500; // Allow 500m around office

// Update the current date and time with day
function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeString = now.toLocaleTimeString();
  const dateString = now.toLocaleDateString(undefined, options);
  document.getElementById("datetime").innerHTML = `${dateString} | ${timeString}`;
}
setInterval(updateDateTime, 1000);
updateDateTime();

// Show saved staff name if available
const staffNameDisplay = document.getElementById("staffNameDisplay");
const storedName = localStorage.getItem("staffName");
if (storedName) {
  staffNameDisplay.textContent = `👤 ${storedName}`;
} else {
  staffNameDisplay.textContent = '👤 No name saved yet';
}

// Haversine distance function
function distanceBetween(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check in/out location
function checkLocation() {
  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;
    const distance = distanceBetween(latitude, longitude, officeLat, officeLng);
    let locationInfo = `Latitude: ${latitude}, Longitude: ${longitude}`;
    if (distance <= maxDistanceMeters) {
      proceedCheck("Used GPS", locationInfo);
    } else {
      if (confirm("❌ You are not in office area!\nProceed anyway?")) {
        proceedCheck("No GPS", "No Location");
      }
    }
  }, () => {
    if (confirm("❌ Cannot get location. Proceed anyway?")) {
      proceedCheck("No GPS", "No Location");
    }
  });
}

// Handle staff name and proceed check
function proceedCheck(remark, location) {
  let name = localStorage.getItem("staffName");
  if (!name) {
    name = prompt("Enter your name:")?.trim();
    if (!name) return;
    localStorage.setItem("staffName", name);
  }
  staffNameDisplay.textContent = `👤 ${name}`;
  checkToday(name, remark, location);
}

// Check in/out for today
function checkToday(name, remark, location) {
  const today = new Date().toISOString().slice(0, 10);
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
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse";
  const formData = new FormData();
  formData.append("entry.2140323296", name);
  formData.append("entry.668867521", action);
  formData.append("entry.1234567890", remark);
  formData.append("entry.9876543210", location);
  formData.append("entry.1234567891", new Date().toLocaleString());

  fetch(formUrl, { method: "POST", mode: "no-cors", body: formData })
    .then(() => alert(`✅ ${action} successful for ${name} at ${new Date().toLocaleTimeString()}`))
    .catch(() => alert("❌ Failed to send attendance!"));
}

// Load attendance history from sheet
function loadHistoryFromSheet() {
  const name = localStorage.getItem("staffName")?.trim();
  if (!name) {
    alert("❗ Please check in at least once to save your name.");
    return;
  }
  const normName = name.toLowerCase();

  const month = parseInt(document.getElementById("monthSelect").value, 10);
  const year = parseInt(document.getElementById("yearSelect").value, 10);

  fetch('YOUR_WEB_APP_URL') // Replace with your deployed Google Apps Script URL
    .then(res => res.json())
    .then(data => {
      const tbody = document.getElementById("historyBody");
      tbody.innerHTML = "";

      function parseDate(dateString) {
        if (!dateString) return null;
        if (dateString.includes("-")) {
          // YYYY-MM-DD
          const [y, m, d] = dateString.split("-").map(Number);
          return { day: d, month: m, year: y };
        } else if (dateString.includes("/")) {
          // DD/MM/YYYY
          const [d, m, y] = dateString.split("/").map(Number);
          return { day: d, month: m, year: y };
        }
        return null;
      }

      const filtered = data.filter(record => {
        const recName = (record["Name"] || "").trim().toLowerCase();
        if (recName !== normName) return false;

        const parsed = parseDate(record["Date"]);
        if (!parsed) return false;

        return parsed.month === month && parsed.year === year;
      });

      if (filtered.length === 0) {
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
    .catch(err => {
      console.error("Failed to load attendance history:", err);
      alert("❌ Failed to load attendance history.");
    });
}


// Populate month/year dropdowns
function loadMonthYearDropdowns() {
  const monthSelect = document.getElementById("monthSelect");
  const yearSelect = document.getElementById("yearSelect");
  const now = new Date();

  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.text = new Date(0, m - 1).toLocaleString('default', { month: 'long' });
    if (m === now.getMonth() + 1) opt.selected = true;
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

// Initialize page
window.addEventListener("DOMContentLoaded", () => {
  loadMonthYearDropdowns();
  loadHistoryFromSheet();
});
</script>

