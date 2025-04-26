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

window.onload = function() {
  const main = document.querySelector(".container");

  // Show datetime
  const datetimeDiv = document.getElementById("datetime");
  updateDateTime();
  setInterval(updateDateTime, 1000); // Update every second

  // Show saved staff name if available
  const staffNameDisplay = document.getElementById("staffNameDisplay");
  const storedName = localStorage.getItem("staffName");
  if (storedName) {
    staffNameDisplay.innerHTML = `👤 ${storedName}`;
  } else {
    staffNameDisplay.innerHTML = '👤 No name saved yet';
  }

  // Add Check-In/Check-Out button logic
  const actionBtn = document.getElementById("actionBtn");
  const lastActionDate = localStorage.getItem("lastActionDate");
  const today = new Date().toISOString().slice(0, 10);
  if (lastActionDate === today) {
    actionBtn.innerText = "Check-Out";
  } else {
    actionBtn.innerText = "Check-In";
  }
};

function checkLocation() {
  navigator.geolocation.getCurrentPosition(function(position) {
    console.log(`Detected Location: ${position.coords.latitude}, ${position.coords.longitude}`);
    const distance = distanceBetween(position.coords.latitude, position.coords.longitude, officeLat, officeLng);
    console.log(`Distance from office: ${distance.toFixed(2)} meters`);

    if (distance <= maxDistanceMeters) {
      proceedCheck();
    } else {
      alert("❌ You are not in the office area!");
    }
  }, function(error) {
    console.error("Error getting location", error);
    alert("❌ Cannot get your location!");
  });
}

function proceedCheck() {
  const staffName = localStorage.getItem("staffName");
  if (!staffName) {
    const name = prompt("Enter your name:");
    localStorage.setItem("staffName", name);
    sendAttendance(name, "Check-In");
  } else {
    const actionType = document.getElementById("actionBtn").innerText === "Check-In" ? "Check-In" : "Check-Out";
    sendAttendance(staffName, actionType);
  }
}

function sendAttendance(name, actionType) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse";
  
  const formData = new FormData();
  formData.append("entry.2140323296", name);    // Name field
  formData.append("entry.668867521", actionType);  // Check-In/Check-Out field

  fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    body: formData
  }).then(() => {
    alert(`✅ ${actionType} successful for ${name} at ${new Date().toLocaleTimeString()}`);
    localStorage.setItem("lastActionDate", new Date().toISOString().slice(0, 10));  // Save action date
  }).catch(() => {
    alert("❌ Failed to send attendance!");
  });
}

function distanceBetween(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371e3;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
