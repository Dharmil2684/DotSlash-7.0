const loginText = document.querySelector(".title-text .login");
const loginFrm = document.querySelector("form.login");
const loginBtn = document.querySelector("label.login");
const signupBtn = document.querySelector("label.signup");
const signupLink = document.querySelector("form .signup-link a");
signupBtn.onclick = (() => {
  loginFrm.style.marginLeft = "-50%";
  loginText.style.marginLeft = "-50%";
});
loginBtn.onclick = (() => {
  loginFrm.style.marginLeft = "0%";
  loginText.style.marginLeft = "0%";
});
signupLink.onclick = (() => {
  signupBtn.click();
  return false;
});

const signupSuccessMessage = document.getElementById("signupSuccessMessage");

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault(); // Prevent the default form submission

  // Get form data
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const pass = document.getElementById('signupPassword').value;

  const formData = { username, email, pass };

  try {
    // Send form data to the backend route /signup using fetch
    const response = await fetch('/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    // Handle the response from the backend
    if (response.ok) {
      // Signup successful, display success message
      document.getElementById('signupSuccessMessage').style.display = 'block';
      // Hide the message after 3 seconds
      setTimeout(() => {
        signupSuccessMessage.style.display = "none";
      }, 3000);
    } else {
      // Signup failed, handle accordingly
    }
  } catch (error) {
    console.error('Error signing up:', error);
  }
});


// Get the login form by its ID
const loginForm = document.getElementById("loginForm");

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    // Get form data
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementsByName('password')[0].value; // Using getElementsByName and accessing the first element

    const formData = { email, pass };

    try {
      // Send form data to the backend route /login using fetch
      const response = await fetch('/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      // Handle the response from the backend
      if (response.ok) {
        // Login successful, redirect to index.html
        window.location.href = 'index.html';
      } else {
        // Login failed, handle accordingly
        console.error("Login failed");
      }
    } catch (error) {
      console.error('Error logging in:', error);
    }
  });
});