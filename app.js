const officeLat = 3.1925444;  // Example location (Kuala Lumpur)
const officeLng = 101.6110718;
const maxDistanceMeters = 500; // Allow 500m around office

// Update the current date and time with day
function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeString = now.toLocaleTimeString();  // Get time
  const dateString = now.toLocaleDateString(undefined, options);  // Get date with weekday
  document.getElementById("datetime").innerHTML = `${dateString} | ${timeString}`;
}

// Show saved staff name if available
const staffNameDisplay = document.getElementById("staffNameDisplay");
const storedName = localStorage.getItem("staffName");
if (storedName) {
  staffNameDisplay.innerHTML = `👤 ${storedName}`;  // Display name if available
} else {
  staffNameDisplay.innerHTML = '👤 No name saved yet';  // Display placeholder if no name
}

// Update time every second
setInterval(updateDateTime, 1000);

function distanceBetween(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function checkLocation() {
  navigator.geolocation.getCurrentPosition(function(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    console.log(`Detected Location: Latitude: ${latitude}, Longitude: ${longitude}`);

    const distance = distanceBetween(latitude, longitude, officeLat, officeLng);
    console.log(`Distance from office: ${distance.toFixed(2)} meters`);

    let locationInfo = `Latitude: ${latitude}, Longitude: ${longitude}`; // Store location info
    if (distance <= maxDistanceMeters) {
      proceedCheck("Used GPS", locationInfo);
    } else {
      // Out of office area, ask user if want to proceed
      if (confirm("❌ You are not in office area!\n\nDo you still want to proceed with check-in/check-out?")) {
        proceedCheck("No GPS", "No Location");
      } else {
        alert("✅ Action cancelled.");
      }
    }
  }, function(error) {
    console.error("Error getting location", error);
    let locationInfo = "No Location";
    if (confirm("❌ Cannot get your location!\n\nDo you still want to proceed with check-in/check-out without GPS?")) {
      proceedCheck("No GPS", locationInfo);
    } else {
      alert("✅ Action cancelled.");
    }
  });
}

function proceedCheck(remark, location) {
  const staffName = localStorage.getItem("staffName");
  if (!staffName) {
    const name = prompt("Enter your name:");
    localStorage.setItem("staffName", name);
    checkToday(name, remark, location);
  } else {
    checkToday(staffName, remark, location);
  }
}

function checkToday(name, remark, location) {
  const today = new Date().toISOString().slice(0, 10); // Get current date in 'yyyy-mm-dd' format
  const lastAction = localStorage.getItem("lastActionDate"); // Get last action date from localStorage

  let action;
  if (lastAction === today) {
    // If the last action was on the same date, it's time to check out
    action = "Check-Out";
    localStorage.removeItem("lastActionDate"); // Clear last action date after check-out
  } else {
    // If no check-out for today, it's check-in
    action = "Check-In";
    localStorage.setItem("lastActionDate", today); // Save the current date as the last action date for future check-out
  }

  sendAttendance(name, action, remark, location); // Send attendance data to the form
}

function sendAttendance(name, action, remark, location) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse";
  
  const formData = new FormData();
  formData.append("entry.2140323296", name);  // Name field
  formData.append("entry.668867521", action);  // Action field
  formData.append("entry.1234567890", remark); // Remark field
  formData.append("entry.9876543210", location);  // Location field
  
  // Send the data
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

function loadHistoryFromSheet() {
  const name = localStorage.getItem("staffName");
  if (!name) {
    alert("❗ Please check in at least once to save your name.");
    return;
  }

  const normName = name.trim().toLowerCase();
  const month = parseInt(document.getElementById("monthSelect").value); // 1–12
  const year = parseInt(document.getElementById("yearSelect").value);

  fetch('https://script.google.com/macros/s/AKfycbxjbvJu1VdyaDuy5qPLtyX810IyX5iFO--b5sI6sfsBXVLp3G3Sq0sH7KgQ8Pm3GpgX/exec')
    .then(res => res.json())
    .then(data => {
      console.log("Raw attendance data:", data); // Debug

      const tbody = document.getElementById("historyBody");
      tbody.innerHTML = "";

      // Filter by name AND month/year
      const filtered = data.filter(record => {
        const recName = (record["Name"] || "").trim().toLowerCase();
        const recDate = record["Date"];
        if (!recName || recName !== normName || !recDate) return false;

        let recDay, recMonth, recYear;

        if (recDate.includes("/")) {
          // Possibly DD/MM/YYYY or MM/DD/YYYY
          const parts = recDate.split("/").map(Number);
          if (parts[2] < 100) parts[2] += 2000; // handle YY format
          // Try to guess format: if month > 12, swap
          if (parts[1] > 12) {
            [recDay, recMonth, recYear] = [parts[1], parts[0], parts[2]];
          } else {
            [recDay, recMonth, recYear] = [parts[0], parts[1], parts[2]];
          }
        } else if (recDate.includes("-")) {
          // YYYY-MM-DD
          const parts = recDate.split("-").map(Number);
          [recYear, recMonth, recDay] = parts;
        } else {
          return false; // unknown format
        }

        return recMonth === month && recYear === year;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8">No records for ${name} in ${month}/${year}</td></tr>`;
        return;
      }

      // Reverse to show latest first
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

window.addEventListener("DOMContentLoaded", () => {
  loadHistoryFromSheet();
});

