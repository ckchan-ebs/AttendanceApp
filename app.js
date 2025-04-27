const officeLat = 3.1925444;  // Example office location (Kuala Lumpur)
const officeLng = 101.6110718;
const maxDistanceMeters = 500; // Define distance threshold for office area

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

// Calculate the distance between two coordinates
function distanceBetween(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371e3; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Returns distance in meters
}

// Check if the user is within office area
function checkLocation() {
  navigator.geolocation.getCurrentPosition(function(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    console.log(`Detected Location: Latitude: ${latitude}, Longitude: ${longitude}`);

    const distance = distanceBetween(latitude, longitude, officeLat, officeLng);
    console.log(`Distance from office: ${distance.toFixed(2)} meters`);

    if (distance <= maxDistanceMeters) {
      proceedCheck("Used GPS", `${latitude}, ${longitude}`);
    } else {
      // Out of office area, ask user if they want to proceed
      if (confirm("❌ You are not in the office area!\n\nDo you still want to proceed with check-in/check-out?")) {
        proceedCheck("No GPS", `${latitude}, ${longitude}`);
      } else {
        alert("✅ Action cancelled.");
      }
    }
  }, function(error) {
    console.error("Error getting location", error);
    if (confirm("❌ Cannot get your location!\n\nDo you still want to proceed with check-in/check-out without GPS?")) {
      proceedCheck("No GPS", "No Location");
    } else {
      alert("✅ Action cancelled.");
    }
  });
}

// Proceed with check-in/check-out action
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

// Check the action (check-in or check-out) based on the date
function checkToday(name, remark, location) {
  const today = new Date().toISOString().slice(0,10);  // Get today's date
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

// Send attendance data to Google Forms
function sendAttendance(name, action, remark, location) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse";
  
  const formData = new FormData();
  formData.append("entry.2140323296", name);    // Replace with your actual entry ID for Name
  formData.append("entry.668867521", action);  // Replace with your actual entry ID for Action
  formData.append("entry.1234567890", remark); // Replace with the appropriate field for Remark
  formData.append("entry.0987654321", location); // Replace with the appropriate field for Location
  
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
