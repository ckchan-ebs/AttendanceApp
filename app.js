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
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    console.log(`Detected Location: Latitude: ${latitude}, Longitude: ${longitude}`);

    const distance = distanceBetween(latitude, longitude, officeLat, officeLng);
    console.log(`Distance from office: ${distance.toFixed(2)} meters`);

    if (distance <= maxDistanceMeters) {
      proceedCheck("Used GPS");
    } else {
      // Out of office area, ask user if want to proceed
      if (confirm("❌ You are not in office area!\n\nDo you still want to proceed with check-in/check-out?")) {
        proceedCheck("No GPS");
      } else {
        alert("✅ Action cancelled.");
      }
    }
  }, function(error) {
    console.error("Error getting location", error);
    if (confirm("❌ Cannot get your location!\n\nDo you still want to proceed with check-in/check-out without GPS?")) {
      proceedCheck("No GPS");
    } else {
      alert("✅ Action cancelled.");
    }
  });
}

function proceedCheck(remark) {
  const staffName = localStorage.getItem("staffName");
  if (!staffName) {
    const name = prompt("Enter your name:");
    localStorage.setItem("staffName", name);
    checkToday(name, remark);
  } else {
    checkToday(staffName, remark);
  }
}

function checkToday(name, remark) {
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

  sendAttendance(name, action, remark);
}

function calculateWorkHours(checkInTime, checkOutTime) {
  // Parse times into Date objects (assuming times are provided as 'HH:mm')
  const [checkInHours, checkInMinutes] = checkInTime.split(':').map(Number);
  const [checkOutHours, checkOutMinutes] = checkOutTime.split(':').map(Number);

  const checkInDate = new Date(2025, 3, 26, checkInHours, checkInMinutes); // Using 2025-04-26 as an example date
  const checkOutDate = new Date(2025, 3, 26, checkOutHours, checkOutMinutes); // Same date

  // Calculate time difference in milliseconds
  const timeDiffMs = checkOutDate - checkInDate;

  if (timeDiffMs <= 0) return { hours: 0, minutes: 0 }; // No work hours if check-out is before check-in

  // Convert milliseconds to minutes and subtract lunch break
  const minutes = timeDiffMs / (1000 * 60); // Convert to minutes
  const lunchBreak = 60; // 1 hour lunch break (could be modified based on your rules)
  const totalMinutes = minutes - lunchBreak;

  const totalHours = totalMinutes / 60; // Convert back to hours

  return { hours: totalHours.toFixed(2), minutes: (totalMinutes).toFixed(0) }; // Return both hours and minutes
}

function sendAttendance(name, action, remark) {
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

// To display the data table
function displayAttendanceData(date, name, checkInTime, checkOutTime) {
  const { hours, minutes } = calculateWorkHours(checkInTime, checkOutTime);
  
  const table = document.getElementById("attendanceTable");
  const row = table.insertRow();
  
  row.insertCell(0).textContent = date;
  row.insertCell(1).textContent = name;
  row.insertCell(2).textContent = checkInTime;
  row.insertCell(3).textContent = checkOutTime;
  row.insertCell(4).textContent = `${hours} hours`;
  row.insertCell(5).textContent = `${minutes} minutes`;
  row.insertCell(6).textContent = remark;
}

// Sample Table
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
    </tr>
  </table>
`);
