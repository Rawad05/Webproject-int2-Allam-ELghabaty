// Import the functions you need from the Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

// Your Firebase web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAleiwRdJ3OgjmUxWn0q6PL7D5FsA5K-8Q",
  authDomain: "ghost-6b043.firebaseapp.com",
  projectId: "ghost-6b043",
  storageBucket: "ghost-6b043.firebasestorage.app",
  messagingSenderId: "619397245319",
  appId: "1:619397245319:web:02329dd2c9cba7bfb80b22",
  measurementId: "G-1RJ9XPZHCS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Signup Function
document.getElementById("signup-btn")?.addEventListener("click", function () {
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
          alert("Account Created Successfully!");
          window.location.href = "index.html"; // Redirect after signup
      })
      .catch((error) => alert(error.message));
});



// Login functionality
document.getElementById("login-btn")?.addEventListener("click", function () {
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
  
    // Sign in with email and password
    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        // On successful login, redirect to home.html
        alert("Login Successful!");
        window.location.href = "post.html"; // Redirects to home.html after login
      })
      .catch((error) => {
        // Handle login errors
        const errorMessage = error.message;
        alert(errorMessage); // Show error message
      });
  });
  
