const officeLat = 3.1925444;  // Example location (Kuala Lumpur)
const officeLng = 101.6110718;
const maxDistanceMeters = 500; // Allow 100m around office

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
    console.log(`Detected Location: ${position.coords.latitude}, ${position.coords.longitude}`); // ADD THIS
    const distance = distanceBetween(position.coords.latitude, position.coords.longitude, officeLat, officeLng);
    console.log(`Distance from office: ${distance.toFixed(2)} meters`); // ADD THIS

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
    checkToday(staffName);
  }
}

function checkToday(name) {
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

  sendAttendance(name, action);
}

function sendAttendance(name, action) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse";
  
  const formData = new FormData();
  formData.append("entry.2140323296", name);    // Replace with your actual entry ID for Name
  formData.append("entry.668867521", action);  // Replace with your actual entry ID for Action
  
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
