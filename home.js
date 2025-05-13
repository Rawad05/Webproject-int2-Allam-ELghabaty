// Import Firebase App and Realtime Database
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref, push, onValue, update } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";

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
const database = getDatabase(app);
const storage = getStorage(app);  // Initialize Firebase Storage

// Request Notification Permissions
document.getElementById("enableNotifications").addEventListener("click", () => {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Notifications Enabled!");
        } else {
            alert("Notifications are disabled.");
        }
    });
});

// Submit Post (Text-Based)
window.submitPost = function () {
    let content = document.getElementById("postContent").value.trim();
    let interest = document.getElementById("interest").value;
    let userId = localStorage.getItem("userId") || "user_" + Date.now();

    if (content.length === 0) {
        alert("Post cannot be empty!");
        return;
    }

    let post = {
        content: content,
        interest: interest,
        likes: 0,
        dislikes: 0,
        timestamp: Date.now(),
        userId: userId
    };

    push(ref(database, "posts"), post)
        .then(() => {
            alert("Posted!"); // Alert the user after successful posting
            document.getElementById("postContent").value = "";
            window.location.href = "post.html"; // Redirect after posting
        })
        .catch((error) => {
            alert("Error posting: " + error.message);
        });
};


// Assuming `userId` is stored in localStorage or generated on the fly
let userId = localStorage.getItem("userId");
if (!userId) {
    userId = "user_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", userId);
}

// Populate user score dynamically
document.addEventListener("DOMContentLoaded", () => {
    // Fetch the user score from the database or use a default value
    let userScore = 0; // Default score
    const userScoreElement = document.getElementById("userScore");

    // Replace this with actual logic to retrieve the user score from your Firebase Realtime Database
    userScoreElement.textContent = `🔥 Score: ${userScore}`;

    // Add any other logic for your score (if necessary)
});

// Other code logic like loading posts and enabling notifications
document.getElementById("enableNotifications").addEventListener("click", () => {
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Notifications Enabled!");
        } else {
            alert("Notifications are disabled.");
        }
    });
});

// Further code for handling post submission, loading posts, etc...




// Submit Comment
window.submitComment = function (postId) {
    let commentInput = document.getElementById(`commentInput-${postId}`);
    let commentText = commentInput.value.trim();

    if (commentText.length === 0) {
        alert("Comment cannot be empty!");
        return;
    }

    let comment = {
        text: commentText,
        timestamp: Date.now()
    };

    push(ref(database, `posts/${postId}/comments`), comment);
    commentInput.value = "";
};

// Toggle Comment Box
window.toggleCommentBox = function (postId) {
    let commentBox = document.getElementById(`commentBox-${postId}`);
    commentBox.style.display = commentBox.style.display === "none" ? "block" : "none";
};


// Load Posts (Updated to include audio and comments)
function loadPosts() {
    const postsContainer = document.getElementById("postsContainer");
    postsContainer.innerHTML = "";

    const postsRef = ref(database, "posts");

    onValue(postsRef, (snapshot) => {
        postsContainer.innerHTML = "";

        if (!snapshot.exists()) {
            postsContainer.innerHTML = "<p>No posts available.</p>";
            return;
        }

        let postsArray = [];
        snapshot.forEach((childSnapshot) => {
            let post = childSnapshot.val();
            post.id = childSnapshot.key;
            postsArray.push(post);
        });

        // Sort by newest first
        postsArray.sort((a, b) => b.timestamp - a.timestamp);

        postsArray.forEach((post) => {
            // 🔴 Filtrage activé : si on veut afficher seulement les posts de l'utilisateur
            if (showOnlyMyPosts && post.userId !== userId) return;

            let postElement = document.createElement("div");
            postElement.className = "post";

            // Handle both text and audio posts
            let postContent = "";
            if (post.content) {
                postContent = `<p>${post.content}</p>`;
            } else if (post.audioUrl) {
                postContent = `
                <div class="audio-post">
                    <button class="vocal-play-btn" onclick="playAudio('${post.audioUrl}', this)">
                        ▶
                    </button>
                </div>
            `;
            } else {
                postContent = `<p>[Post vide]</p>`;
            }

            postElement.innerHTML = `
                ${postContent}
                <button class="like-button" onclick="toggleLike('${post.id}')">${post.likes}</button>
                <button class="dislike-button" onclick="toggleDislike('${post.id}')">${post.dislikes}</button>
                <button class="comment-button" onclick="toggleCommentBox('${post.id}')"><span id="commentCount-${post.id}">0</span></button>
                <div id="commentBox-${post.id}" class="comment-box" style="display: none;">
                    <input type="text" id="commentInput-${post.id}" placeholder="Write a comment..." />
                    <button onclick="submitComment('${post.id}')">Post</button>
                    <div id="comments-${post.id}" class="comments-list"></div>
                </div>
            `;

            postsContainer.appendChild(postElement);

            // Load Comments
            const commentsRef = ref(database, `posts/${post.id}/comments`);
            onValue(commentsRef, (commentSnapshot) => {
                let commentsContainer = document.getElementById(`comments-${post.id}`);
                commentsContainer.innerHTML = "";

                if (commentSnapshot.exists()) {
                    let commentCount = 0;
                    commentSnapshot.forEach((childComment) => {
                        let comment = childComment.val();
                        let commentDiv = document.createElement("p");
                        commentDiv.textContent = `💬 ${comment.text}`;
                        commentsContainer.appendChild(commentDiv);
                        commentCount++;
                    });

                    document.getElementById(`commentCount-${post.id}`).textContent = `${commentCount}`;
                }
            });
        });
    });
}

// Start and Stop Voice Recording
document.addEventListener("DOMContentLoaded", () => {
    const startRecordingButton = document.getElementById("startRecording");
    const stopRecordingButton = document.getElementById("stopRecording");

    if (startRecordingButton && stopRecordingButton) {
        startRecordingButton.addEventListener("click", startRecording);
        stopRecordingButton.addEventListener("click", stopRecording);
    } else {
        console.error("Start/Stop recording buttons not found in the DOM.");
    }
});

let mediaRecorder;
let audioChunks = [];

// Start Recording
function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.start();
            audioChunks = [];

            mediaRecorder.addEventListener("dataavailable", event => {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp4' });  // ou 'audio/mpeg' pour .mp3
                // ✅ format compatible iPhone
                audioChunks = [];
                uploadAudio(audioBlob);
            });
            

            document.getElementById("startRecording").disabled = true;
            document.getElementById("stopRecording").disabled = false;
          
        })
        .catch(error => {
            alert("Error accessing microphone: " + error.message);
        });
}

// Stop Recording
function stopRecording() {
    if (mediaRecorder) {
        mediaRecorder.stop();
        document.getElementById("startRecording").disabled = false;
        document.getElementById("stopRecording").disabled = true;
        alert("Recording stopped. Uploading...");
    }
}

// Upload Audio to Firebase Storage
function uploadAudio(audioBlob) {
    const audioFileName = 'audio/' + Date.now() + '.mp4';
    const audioRef = storageRef(storage, audioFileName);  // Use the correct `storageRef`

    uploadBytes(audioRef, audioBlob)
        .then(snapshot => getDownloadURL(snapshot.ref))  // Get the download URL after uploading
        .then(audioUrl => {
            submitVocalPost(audioUrl); // Submit the post with the uploaded audio URL
        })
        .catch(error => {
            alert("Error uploading audio: " + error.message);
        });
}

// Save Voice Post to Firebase Realtime Database
function submitVocalPost(audioUrl) {
    let interest = document.getElementById("interest").value || "General";
    let userId = localStorage.getItem("userId") || "user_" + Date.now();

    let post = {
        audioUrl: audioUrl,
        interest: interest,
        likes: 0,
        dislikes: 0,
        timestamp: Date.now(),
        userId: userId
    };

    push(ref(database, "posts"), post)
        .then(() => {
            alert("Vocal post submitted!");
            window.location.href = "post.html"; // Redirect after submission
        })
        .catch((error) => {
            alert("Error posting: " + error.message);
        });
}

// Like a post
window.toggleLike = function (postId) {
    let likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "{}");
    let dislikedPosts = JSON.parse(localStorage.getItem("dislikedPosts") || "{}");

    const postRef = ref(database, "posts/" + postId);
    onValue(postRef, (snapshot) => {
        let post = snapshot.val();
        if (post) {
            if (likedPosts[postId]) {
                update(postRef, { likes: Math.max(0, post.likes - 1) });
                delete likedPosts[postId];
            } else {
                update(postRef, { likes: post.likes + 1 });

                if (dislikedPosts[postId]) {
                    update(postRef, { dislikes: Math.max(0, post.dislikes - 1) });
                    delete dislikedPosts[postId];
                }

                likedPosts[postId] = true;
            }

            localStorage.setItem("likedPosts", JSON.stringify(likedPosts));
            localStorage.setItem("dislikedPosts", JSON.stringify(dislikedPosts));
        }
    }, { onlyOnce: true });
};

// Dislike a post
window.toggleDislike = function (postId) {
    let likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "{}");
    let dislikedPosts = JSON.parse(localStorage.getItem("dislikedPosts") || "{}");

    const postRef = ref(database, "posts/" + postId);
    onValue(postRef, (snapshot) => {
        let post = snapshot.val();
        if (post) {
            if (dislikedPosts[postId]) {
                update(postRef, { dislikes: Math.max(0, post.dislikes - 1) });
                delete dislikedPosts[postId];
            } else {
                update(postRef, { dislikes: post.dislikes + 1 });

                if (likedPosts[postId]) {
                    update(postRef, { likes: Math.max(0, post.likes - 1) });
                    delete likedPosts[postId];
                }

                dislikedPosts[postId] = true;
            }

            localStorage.setItem("likedPosts", JSON.stringify(likedPosts));
            localStorage.setItem("dislikedPosts", JSON.stringify(dislikedPosts));
        }
    }, { onlyOnce: true });
};


// Call `loadPosts()` when the page is loaded
document.addEventListener("DOMContentLoaded", loadPosts);


let currentAudio = null;

window.playAudio = function(audioUrl, button) {
    // Stop currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
        button.innerText = "▶"; // Reset button icon
    }

    const audio = new Audio(audioUrl);
    currentAudio = audio;

    audio.play().then(() => {
        button.innerText = "||"; // Change icon while playing
        audio.onended = () => {
            button.innerText = "▶"; // Back to play when finished
            currentAudio = null;
        };
    }).catch((err) => {
        console.error("Audio play error:", err);
        alert("Impossible de lire ce vocal.");
    });
};


let showOnlyMyPosts = false;

document.getElementById("allPostsButton").addEventListener("click", () => {
    showOnlyMyPosts = false;
    loadPosts(); // recharge les posts sans filtre
});

document.getElementById("myPostsButton").addEventListener("click", () => {
    showOnlyMyPosts = true;
    loadPosts(); // recharge les posts avec filtre utilisateur
});
