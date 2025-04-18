// Form switching logic
const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signInForm = document.getElementById('signIn');
const signUpForm = document.getElementById('signup');

// Only execute this code if we're on the login page
if (signUpButton && signInButton) {
  signUpButton.addEventListener('click', function() {
    signInForm.style.display = "none";
    signUpForm.style.display = "block";
  });

  signInButton.addEventListener('click', function() {
    signInForm.style.display = "block";
    signUpForm.style.display = "none";
  });
}

// Function to fetch data from Google Sheets
function fetchGoogleSheetsData(sheetName, callback) {
  // URL for your published Google Sheet (CSV format)
  // Make sure you've published your sheet to the web: File > Share > Publish to web
  const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vShkyha9RUILD6tgutsA9KqriklzAITyydxblmfyYvRvC7lLS60JMsVM3am-8wwu5Kt5a9mHSDvoQgO/pub?output=csv`;
  
  // Alternative approach if above URL doesn't work:
  // const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-YOUR_PUBLISHED_ID/pub?output=csv";
  
  Papa.parse(csvUrl, {
    download: true,
    header: true,
    complete: function(results) {
      callback(results.data);
    },
    error: function(error) {
      console.error("Error fetching or parsing the CSV data:", error);
      callback(null, error);
    }
  });
}

// If we're on a protected page (dashboard or overview) check authentication
if (window.location.pathname.includes('dashboard') || window.location.pathname.includes('overview')) {
  // This will be handled by auth.js checkAuthStatus function
  
  // Display user info if available
  document.addEventListener('DOMContentLoaded', function() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user) {
      // Find elements that should display user info
      const userDisplayElements = document.querySelectorAll('.user-display');
      userDisplayElements.forEach(element => {
        element.textContent = `${user.firstName} ${user.lastName}`;
      });
    }
    
    // Set up logout button functionality
    const logoutButtons = document.querySelectorAll('[href="logout.php"], .logout-button');
    logoutButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        logout();  // Function defined in auth.js
      });
      
      // Update href to make it work without backend
      if (button.hasAttribute('href')) {
        button.setAttribute('href', 'javascript:void(0);');
      }
    });
  });
}