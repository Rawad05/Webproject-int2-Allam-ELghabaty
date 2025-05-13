// Firebase and WebRTC setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  push,
  remove,
  update
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAleiwRdJ3OgjmUxWn0q6PL7D5FsA5K-8Q",
  authDomain: "ghost-6b043.firebaseapp.com",
  projectId: "ghost-6b043",
  storageBucket: "ghost-6b043.appspot.com",
  messagingSenderId: "619397245319",
  appId: "1:619397245319:web:02329dd2c9cba7bfb80b22"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// WebRTC Servers
const servers = {
  iceServers: [
    { urls: "stun:fr-turn3.xirsys.com" },
    {
      urls: [
        "turn:fr-turn3.xirsys.com:80?transport=udp",
        "turn:fr-turn3.xirsys.com:3478?transport=udp",
        "turn:fr-turn3.xirsys.com:80?transport=tcp",
        "turn:fr-turn3.xirsys.com:3478?transport=tcp",
        "turns:fr-turn3.xirsys.com:443?transport=tcp",
        "turns:fr-turn3.xirsys.com:5349?transport=tcp"
      ],
      username: "-GjrJNMaKMfk5mvQP-3t-qdr5XynkavbB70ZzBc6kUFhBGyaX5b2TEOnTf0i-ZhEAAAAAGgGzaNnaG9zdHBvc3Q=",
      credential: "2c53bb5a-1f04-11f0-9a3e-0242ac120004"
    }
  ]
};

// Global Variables
let localStream;
let roomIdGlobal = "";
let userIdGlobal = "";
let isCreator = false;
let peers = {}; // {userId: RTCPeerConnection}
const remoteAudioContainer = document.getElementById("remoteAudioContainer");

// Initialize Local Stream
async function startLocalStream() {
  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
}

// Create New Peer Connection
function createPeerConnection(targetId) {
  const pc = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  pc.ontrack = (event) => {
    const remoteStream = event.streams[0];
    const audio = document.createElement('audio');
    audio.autoplay = true;
    audio.controls = true;
    audio.srcObject = remoteStream;
    audio.id = `audio-${targetId}`;
    remoteAudioContainer.appendChild(audio);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      const candidatesRef = ref(db, `rooms/${roomIdGlobal}/candidates/${userIdGlobal}/to/${targetId}`);
      push(candidatesRef, event.candidate.toJSON());
    }
  };

  peers[targetId] = pc;
  return pc;
}

// Handle new participant
async function handleNewParticipant(newUserId) {
  if (newUserId === userIdGlobal) return; // Ignore myself

  const pc = createPeerConnection(newUserId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const offersRef = ref(db, `rooms/${roomIdGlobal}/offers/${userIdGlobal}/to/${newUserId}`);
  await set(offersRef, { sdp: offer.sdp, type: offer.type });
}

// Listen Offers / Answers / Candidates
function listenSignaling() {
  // Offers to me
  const offersRef = ref(db, `rooms/${roomIdGlobal}/offers`);
  onValue(offersRef, async (snapshot) => {
    const offersData = snapshot.val();
    if (!offersData) return;

    Object.keys(offersData).forEach(async (senderId) => {
      if (offersData[senderId].to && offersData[senderId].to[userIdGlobal]) {
        if (!peers[senderId]) {
          const pc = createPeerConnection(senderId);
          await pc.setRemoteDescription(new RTCSessionDescription(offersData[senderId].to[userIdGlobal]));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          const answerRef = ref(db, `rooms/${roomIdGlobal}/answers/${userIdGlobal}/to/${senderId}`);
          await set(answerRef, { sdp: answer.sdp, type: answer.type });
        }
      }
    });
  });

  // Answers to me
  const answersRef = ref(db, `rooms/${roomIdGlobal}/answers`);
  onValue(answersRef, async (snapshot) => {
    const answersData = snapshot.val();
    if (!answersData) return;

    Object.keys(answersData).forEach(async (targetId) => {
      if (answersData[targetId].to && answersData[targetId].to[userIdGlobal]) {
        const answer = answersData[targetId].to[userIdGlobal];
        if (peers[targetId]) {
          await peers[targetId].setRemoteDescription(new RTCSessionDescription(answer));
        }
      }
    });
  });

  // ICE candidates
  const candidatesRef = ref(db, `rooms/${roomIdGlobal}/candidates`);
  onValue(candidatesRef, (snapshot) => {
    const candidatesData = snapshot.val();
    if (!candidatesData) return;

    Object.keys(candidatesData).forEach(senderId => {
      if (candidatesData[senderId].to && candidatesData[senderId].to[userIdGlobal]) {
        const candidateList = candidatesData[senderId].to[userIdGlobal];
        Object.keys(candidateList).forEach(key => {
          const candidate = candidateList[key];
          if (peers[senderId]) {
            peers[senderId].addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.warn(e));
          }
        });
      }
    });
  });
}

// Listen Participant Changes
function listenParticipants() {
  const participantsRef = ref(db, `rooms/${roomIdGlobal}/participants`);
  let lastParticipants = {};

  onValue(participantsRef, (snapshot) => {
    const participants = snapshot.val();
    if (!participants) return;

    document.getElementById("participantCount").innerText = `👥 People in room: ${Object.keys(participants).length}`;

    if (isCreator) {
      // Check if participant list size changed
      const currentParticipantIds = Object.keys(participants).filter(pid => pid !== userIdGlobal);
      const lastParticipantIds = Object.keys(lastParticipants).filter(pid => pid !== userIdGlobal);

      const listChanged = currentParticipantIds.length !== lastParticipantIds.length;
      if (listChanged) {
        const participantList = document.getElementById("participantList");
        participantList.innerHTML = ""; // clear list

        let index = 1;
        Object.keys(participants).forEach(pid => {
          if (pid === userIdGlobal) return; // ❌ Skip creator himself

          const div = document.createElement("div");
          div.className = "participantItem";
          div.innerHTML = `
        👻 Ghost ${index}
        <button onclick="kickUser('${pid}')" style="background-color: red; color: white;">Kick</button>
        <button onclick="toggleMuteUser('${pid}')" id="muteBtn-${pid}">
          <img src="micro.png" id="muteIcon-${pid}" width="24" height="24" data-muted="false">
        </button>
          `;
          participantList.appendChild(div);
          index++;
        });
      }

      lastParticipants = participants; // update memory
    }
  });
}


// Handle Mute/Kick Status
function listenMyStatus(userRef) {
  onValue(userRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) return;

    if (data.kicked) {
      alert("❌ You were kicked by the host.");
      leaveRoom();
    }

    if (typeof data.muted === 'boolean') {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !data.muted;
      });
      if (data.muted) {
        alert("🔇 You have been muted by the host.");
      }
    }
  });
}

// --- CREATE ROOM ---
document.getElementById("createRoom").onclick = async () => {
  isCreator = true;
  roomIdGlobal = document.getElementById("roomIdInput").value || "room_" + Date.now();

  const roomRef = ref(db, "rooms/" + roomIdGlobal);
  const existingRoom = await new Promise(resolve => onValue(roomRef, resolve, { onlyOnce: true }));
  if (roomIdGlobal.length < 8 || !/[a-zA-Z]/.test(roomIdGlobal) || !/[0-9]/.test(roomIdGlobal)) {
    alert("Room ID must be at least 8 characters long and include at least one letter and one number.");
    return;
  }

  if (existingRoom.exists()) {
    alert("Room ID already exists.");
    return;
  }

  await startLocalStream();

  const participantsRef = ref(db, `rooms/${roomIdGlobal}/participants`);
  const userRef = push(participantsRef, { muted: false, kicked: false });
  userIdGlobal = userRef.key;
  window.userParticipantRef = userRef;
  // After you push userRef = push(participantsRef, {...});
userIdGlobal = userRef.key;
window.userParticipantRef = userRef;

// Show Ghost name on the page
onValue(participantsRef, (snapshot) => {
  const participantIds = Object.keys(snapshot.val() || {});
  const sortedIds = participantIds.sort();
  const myIndex = sortedIds.indexOf(userIdGlobal) + 1;
  const myGhostName = document.getElementById("myGhostName");
  if (myGhostName) {
    myGhostName.innerText = `👻 You are Master Ghost `;
  }
}, { onlyOnce: true });


  listenSignaling();
  listenParticipants();
  listenMyStatus(userRef);
};

// --- JOIN ROOM ---
document.getElementById("joinRoom").onclick = async () => {
  isCreator = false;
  roomIdGlobal = document.getElementById("roomIdInput").value;

  const roomRef = ref(db, "rooms/" + roomIdGlobal);
  const roomSnapshot = await new Promise(resolve => onValue(roomRef, resolve, { onlyOnce: true }));

  if (!roomSnapshot.exists()) {
    alert("Room not found.");
    return;
  }

  await startLocalStream();

  const participantsRef = ref(db, `rooms/${roomIdGlobal}/participants`);
  const userRef = push(participantsRef, { muted: false, kicked: false });
  userIdGlobal = userRef.key;
  window.userParticipantRef = userRef;
  // After you push userRef = push(participantsRef, {...});
userIdGlobal = userRef.key;
window.userParticipantRef = userRef;

// Show Ghost name on the page
onValue(participantsRef, (snapshot) => {
  const participantIds = Object.keys(snapshot.val() || {});
  const sortedIds = participantIds.sort();
  const myIndex = sortedIds.indexOf(userIdGlobal) + 1;
  const myGhostName = document.getElementById("myGhostName");
  if (myGhostName) {
    myGhostName.innerText = `👻 You are Ghost ${myIndex-1}`;
  }
}, { onlyOnce: true });


  listenSignaling();
  listenParticipants();
  listenMyStatus(userRef);

  // Connect to existing users
  onValue(participantsRef, (snapshot) => {
    const participants = snapshot.val();
    if (!participants) return;
    Object.keys(participants).forEach(pid => {
      if (pid !== userIdGlobal && !peers[pid]) {
        handleNewParticipant(pid);
      }
    });
  });
};

// --- QUIT ROOM ---
document.getElementById("quitRoom").onclick = leaveRoom;

async function leaveRoom() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  Object.values(peers).forEach(pc => pc.close());
  peers = {};

  if (window.userParticipantRef) {
    await remove(window.userParticipantRef);
  }

  location.reload();
}

// --- HOST ACTIONS ---
window.kickUser = function (participantId) {
  const participantRef = ref(db, `rooms/${roomIdGlobal}/participants/${participantId}`);
  update(participantRef, { kicked: true });
};

window.toggleMuteUser = function (participantId) {
  const participantRef = ref(db, `rooms/${roomIdGlobal}/participants/${participantId}`);
  const muteIcon = document.getElementById(`muteIcon-${participantId}`); // look here!

  if (!muteIcon) return;

  const isCurrentlyMuted = muteIcon.getAttribute('data-muted') === 'true';
  const newMutedState = !isCurrentlyMuted;

  // Update icon immediately
  muteIcon.src = newMutedState ? "microp.png" : "micro.png";
  muteIcon.alt = newMutedState ? "Muted" : "Unmuted";
  muteIcon.setAttribute('data-muted', newMutedState);

  // Update Firebase in background
  update(participantRef, { muted: newMutedState }).catch(err => console.error("Mute update failed", err));
};



// --- PERSONAL MUTE BUTTON ---
const muteButton = document.getElementById("toggleMute");
const muteIcon = document.getElementById("muteIcon");
let isMuted = false;

if (muteButton && muteIcon) {
  muteButton.onclick = () => {
    if (!localStream) return;

    localStream.getAudioTracks().forEach(track => {
      track.enabled = isMuted;
    });

    isMuted = !isMuted;
    muteIcon.src = isMuted ? "microp.png" : "micro.png";
    muteIcon.alt = isMuted ? "Unmuted" : "Muted";
  };
}



