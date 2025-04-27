const officeLat = 3.1925444;  // Example location (Kuala Lumpur)
const officeLng = 101.6110718;
const maxDistanceMeters = 500; // Allow 500m around office

// Sample Table to display data
document.write(`
  <table id="attendanceTable">
    <tr>
      <th>Date</th>
      <th>Name</th>
      <th>Check-In Time</th>
      <th>Check-Out Time</th>
      <th>Total Work Hours</th>
      <th>Total Work Minutes</th>
      <th>Remark</th>
      <th>Location</th>
    </tr>
  </table>
`);

// HTML element to show action message
document.body.insertAdjacentHTML("beforeend", `
  <div id="actionMessage"></div>
`);

// Update the current date and time with day
function updateDateTime() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeString = now.toLocaleTimeString();  // Get time
  const dateString = now.toLocaleDateString(undefined, options);  // Get date with weekday
  document.getElementById("datetime").innerHTML = `${dateString} | ${timeString}`;
}

// Show saved staff name if available
let staffNameDisplay = document.getElementById('staffNameDisplay');
const storedName = localStorage.getItem("staffName");
if (storedName) {
  staffNameDisplay.innerHTML = `👤 ${storedName}`;  // Display name if available
} else {
  staffNameDisplay.innerHTML = '👤 No name saved yet';  // Display placeholder if no name
}

// Check the last action and display the status before the button is clicked
// Update the button text based on the check-in or check-out status
function updateCheckStatus() {
  const today = new Date().toISOString().slice(0, 10); // Get current date in 'yyyy-mm-dd' format
  const lastAction = localStorage.getItem("lastActionDate"); // Get last action date from localStorage

  const checkStatusDiv = document.getElementById("checkStatus");
  const attendanceButton = document.getElementById("attendanceButton");

  if (lastAction === today) {
    // If the last action was on the same date, it’s time to check out
    checkStatusDiv.innerHTML = "You need to check out today.";
    attendanceButton.innerHTML = "Check Out";  // Update button text to "Check Out"
  } else {
    // If no check-out for today, it’s check-in time
    checkStatusDiv.innerHTML = "You need to check in today.";
    attendanceButton.innerHTML = "Check In";  // Update button text to "Check In"
  }
}

// Call the updateCheckStatus function on page load
updateCheckStatus();

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
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toLocaleTimeString();
  
  const lastAction = localStorage.getItem("lastActionDate");
  const actionMessageElement = document.getElementById("actionMessage");
  
  let action;
  if (lastAction === today) {
    // Already checked-in, now doing check-out
    action = "Check-Out";
    actionMessageElement.innerHTML = `✅ ${name}, you have checked out at ${nowTime}.`;
    localStorage.setItem("checkOutTime", nowTime);  // Save check-out time
  } else {
    // First time today, doing check-in
    action = "Check-In";
    actionMessageElement.innerHTML = `✅ ${name}, you have checked in at ${nowTime}.`;
    localStorage.setItem("lastActionDate", today);   // Save today's date
    localStorage.setItem("checkInTime", nowTime);     // Save check-in time
    localStorage.removeItem("checkOutTime");          // Clear previous check-out time
  }

  sendAttendance(name, action, remark, location);
  updateCheckStatus(); // <-- ADD this to update button text immediately
}

function calculateWorkHours(checkInTime, checkOutTime) {
  const [checkInHours, checkInMinutes] = checkInTime.split(':').map(Number);
  const [checkOutHours, checkOutMinutes] = checkOutTime.split(':').map(Number);

  const checkInDate = new Date(2025, 3, 26, checkInHours, checkInMinutes);
  const checkOutDate = new Date(2025, 3, 26, checkOutHours, checkOutMinutes);

  const timeDiffMs = checkOutDate - checkInDate;

  if (timeDiffMs <= 0) return { hours: 0, minutes: 0 };

  const minutes = timeDiffMs / (1000 * 60);
  const lunchBreak = 60; // 1 hour lunch break
  const totalMinutes = minutes - lunchBreak;

  const totalHours = totalMinutes / 60;

  return { hours: totalHours.toFixed(2), minutes: (totalMinutes).toFixed(0) };
}

function calculateTodayWorkHours() {
  const checkInTime = localStorage.getItem("checkInTime");
  const checkOutTime = localStorage.getItem("checkOutTime");
  if (!checkInTime || !checkOutTime) {
    return "Incomplete"; // Not both times exist
  }
  
  const [inH, inM, inS] = checkInTime.split(':').map(Number);
  const [outH, outM, outS] = checkOutTime.split(':').map(Number);
  
  const inDate = new Date(2025, 3, 26, inH, inM, inS);
  const outDate = new Date(2025, 3, 26, outH, outM, outS);
  
  let diffMs = outDate - inDate;
  if (diffMs <= 0) return "Error";

  const diffMinutes = diffMs / (1000 * 60) - 60; // minus 1 hour lunch
  const hours = Math.floor(diffMinutes / 60);
  const minutes = Math.floor(diffMinutes % 60);

  return `${hours}h ${minutes}m`;
}


function sendAttendance(name, action, remark, location) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdGDioMohaZRkJrgxoseooVhyXTopysgEBE3QJB6cJMRzi2Wg/formResponse";
  
  const formData = new FormData();
  formData.append("entry.2140323296", name);  // Name field
  formData.append("entry.668867521", action);  // Action field
  formData.append("entry.1234567890", remark); // Append remark to existing remark (if any)

  // To store location, ensure to append the new location
  const previousLocation = localStorage.getItem("previousLocation") || "";
  const newLocation = previousLocation + (previousLocation ? " | " : "") + location;  // Append location
  formData.append("entry.9876543210", newLocation);  // Location field
  
  // Send the data
  fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    body: formData
  }).then(() => {
    localStorage.setItem("previousLocation", newLocation);  // Save updated location for future appends
    alert(`✅ ${action} successful for ${name} at ${new Date().toLocaleTimeString()}`);
  }).catch(() => {
    alert("❌ Failed to send attendance!");
  });
}
