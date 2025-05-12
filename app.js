const officeLat = 3.1925444;
const officeLng = 101.6110718;
const maxDistanceMeters = 500;

function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeString = now.toLocaleTimeString();
  const dateString = now.toLocaleDateString(undefined, options);
  document.getElementById("datetime").innerHTML = `${dateString} | ${timeString}`;
}
setInterval(updateDateTime, 1000);

// Show saved staff name
const staffNameDisplay = document.getElementById("staffNameDisplay");
const storedName = localStorage.getItem("staffName");
staffNameDisplay.innerHTML = storedName ? `👤 ${storedName}` : '👤 No name saved yet';

function distanceBetween(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkLocation() {
  navigator.geolocation.getCurrentPosition(function(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const distance = distanceBetween(latitude, longitude, officeLat, officeLng);
    const locationInfo = `Lat: ${latitude}, Lng: ${longitude}`;
    if (distance <= maxDistanceMeters) {
      proceedCheck("Used GPS", locationInfo);
    } else {
      if (confirm("❌ You are not in office area!\n\nDo you still want to proceed with check-in/check-out?")) {
        proceedCheck("No GPS", "No Location");
      } else {
        alert("✅ Action cancelled.");
      }
    }
  }, function(error) {
    if (confirm("❌ Cannot get your location!\n\nDo you still want to proceed with check-in/check-out without GPS?")) {
      proceedCheck("No GPS", "No Location");
    } else {
      alert("✅ Action cancelled.");
    }
  });
}

function proceedCheck(remark, location) {
  let staffName = localStorage.getItem("staffName");
  if (!staffName) {
    const name = prompt("Enter your name:");
    if (!name) return;
    localStorage.setItem("staffName", name);
    staffName = name;
    staffNameDisplay.innerHTML = `👤 ${staffName}`;
  }
  checkToday(staffName, remark, location);
}

function checkToday(name, remark, location) {
  const today = new Date().toISOString().slice(0, 10);
  const lastAction = localStorage.getItem("lastActionDate");
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let action;
  if (lastAction === today) {
    action = "Check-Out";
    const checkInTime = localStorage.getItem("checkInTime") || "00:00";
    const { hours, minutes } = calculateWorkHours(checkInTime, now);
    localStorage.removeItem("lastActionDate");
    localStorage.setItem("checkOutTime", now);
    localStorage.setItem("workHours", hours);
    localStorage.setItem("workMinutes", minutes);
  } else {
    action = "Check-In";
    localStorage.setItem("lastActionDate", today);
    localStorage.setItem("checkInTime", now);
    localStorage.removeItem("checkOutTime");
    localStorage.removeItem("workHours");
    localStorage.removeItem("workMinutes");
  }

  const previousLocation = localStorage.getItem("previousLocation") || "";
  const newLocation = previousLocation + (previousLocation ? " | " : "") + location;
  localStorage.setItem("previousLocation", newLocation);

  sendAttendance(name, action, remark, location);
  showSummary();
}

function calculateWorkHours(start, end) {
  const [h1, m1] = start.split(":").map(Number);
  const [h2, m2] = end.split(":").map(Number);
  const d1 = new Date(0, 0, 0, h1, m1);
  const d2 = new Date(0, 0, 0, h2, m2);
  let diff = (d2 - d1) / (1000 * 60);
  diff -= 60; // Deduct 1-hour lunch
  if (diff < 0) diff = 0;
  const hours = (diff / 60).toFixed(2);
  const minutes = diff.toFixed(0);
  return { hours, minutes };
}

function sendAttendance(name, action, remark, location) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse";
  const formData = new FormData();
  formData.append("entry.2140323296", name);
  formData.append("entry.668867521", action);
  formData.append("entry.1234567890", remark);
  formData.append("entry.9876543210", location);

  fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    body: formData
  }).then(() => {
    alert(`✅ ${action} successful for ${name} at ${new Date().toLocaleTimeString()}`);
  }).catch(() => {
    alert("❌ Failed to send attendance!");
  });
}

function showSummary() {
  const name = localStorage.getItem("staffName");
  const date = new Date().toLocaleDateString();
  const checkIn = localStorage.getItem("checkInTime") || "-";
  const checkOut = localStorage.getItem("checkOutTime") || "-";
  const hours = localStorage.getItem("workHours") || "-";
  const minutes = localStorage.getItem("workMinutes") || "-";
  const remark = localStorage.getItem("previousRemark") || "-";
  const location = localStorage.getItem("previousLocation") || "-";

  let table = document.getElementById("summaryTable");
  if (!table) {
    table = document.createElement("table");
    table.id = "summaryTable";
    table.style.marginTop = "30px";
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";
    table.innerHTML = `
      <thead>
        <tr>
          <th>Date</th><th>Name</th><th>Check-In</th><th>Check-Out</th>
          <th>Hours</th><th>Minutes</th><th>Remark</th><th>Location</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    document.body.appendChild(table);
  }

  const tbody = table.querySelector("tbody");
  tbody.innerHTML = `
    <tr>
      <td>${date}</td>
      <td>${name}</td>
      <td>${checkIn}</td>
      <td>${checkOut}</td>
      <td>${hours}</td>
      <td>${minutes}</td>
      <td>${remark}</td>
      <td>${location}</td>
    </tr>
  `;
}

// Load summary on page load if existing
document.addEventListener("DOMContentLoaded", showSummary);
