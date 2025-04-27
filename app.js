// Declare variables and constants outside any function or block to avoid re-declaration
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
function showStaffName() {
  const staffNameDisplay = document.getElementById('staffNameDisplay');
  const storedName = localStorage.getItem("staffName");
  if (storedName) {
    staffNameDisplay.innerHTML = `👤 ${storedName}`;  // Display name if available
  } else {
    staffNameDisplay.innerHTML = '👤 No name saved yet';  // Display placeholder if no name
  }
}

// Check the last action and display the status before the button is clicked
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

// Update the page on load
window.onload = function() {
  updateCheckStatus();
  showStaffName();
  setInterval(updateDateTime, 1000);
}

// Calculate distance between two locations (Haversine formula)
function distanceBetween(lat1, lon1, lat2, lon2) {
  const toRad = x => x * Math.PI / 180;
  const R = 6371e3; // Radius of the Earth in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Handle checking location for attendance
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

function sendAttendance(name, action, remark, location) {
  // Check if the table exists before proceeding
  const table = document.getElementById("attendanceTable");
  if (!table) {
    console.error("Attendance table not found!");
    return;  // Exit the function if the table is not found
  }

  const today = new Date().toISOString().slice(0, 10);
  const workHours = calculateWorkHours(localStorage.getItem("checkInTime"), localStorage.getItem("checkOutTime"));
  const date = new Date().toLocaleDateString();
  
  // Insert a new row into the table
  const row = table.insertRow();
  row.insertCell(0).textContent = date;  // Date
  row.insertCell(1).textContent = name;  // Name
  row.insertCell(2).textContent = localStorage.getItem("checkInTime");  // Check-In Time
  row.insertCell(3).textContent = localStorage.getItem("checkOutTime");  // Check-Out Time
  row.insertCell(4).textContent = workHours.hours;  // Work Hours
  row.insertCell(5).textContent = workHours.minutes;  // Work Minutes
  row.insertCell(6).textContent = remark;  // Remark
  row.insertCell(7).textContent = location;  // Location

  alert("Attendance recorded successfully!");
}


