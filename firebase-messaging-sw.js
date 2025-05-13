importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/11.3.1/firebase-messaging.js');

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
  
firebase.initializeApp(firebaseConfig);

// Retrieve Firebase Messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
    console.log("Received background message ", payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: "/firebase-logo.png"
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
