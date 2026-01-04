


<template>
  <nav class="navbar sticky-nav">
    <div class="nav-content nav-content-col">
      <!-- Branding removed -->
      <div class="nav-row">
        <button class="hamburger" @click="toggleMenu" :aria-expanded="menuOpen.toString()" aria-label="Toggle navigation">
          <span :class="{open: menuOpen}"></span>
          <span :class="{open: menuOpen}"></span>
          <span :class="{open: menuOpen}"></span>
        </button>
        <ul :class="['nav-links', {open: menuOpen}]">
          <li><router-link to="/" active-class="active" @click="closeMenu">Home</router-link></li>
          <li><router-link to="/games" active-class="active" @click="closeMenu">Games</router-link></li>
          <li v-if="userProfile?.isAdmin"><router-link to="/admin" active-class="active" @click="closeMenu">Admin</router-link></li>
          <li><button class="logout-btn" @click="handleLogout">Logout</button></li>
        </ul>
      </div>
      <div class="user-row" v-if="userProfile?.displayName">
        <span class="user-name">{{ userProfile.displayName }}</span>
        <div class="ready-container">
          <span class="ready-label">{{ isReady ? 'Ready to play' : 'Not ready to play' }}</span>
          <label class="ready-switch">
            <input type="checkbox" :checked="isReady" :disabled="showReadyTooOld" @change="onSwitchChange" />
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <teleport to="body">
        <div v-if="showReadyTooOld">
          <div class="modal-overlay"></div>
          <div class="global-ready-popup">
            <span>Your 'Ready to play' status is older than one hour. Are you still ready to play?</span>
            <div class="popup-actions">
              <button @click="handleReadyPopupYes" class="close-popup yes">Yes</button>
              <button @click="handleReadyPopupNo" class="close-popup no">No</button>
            </div>
          </div>
        </div>
      </teleport>
    </div>
  </nav>
</template>



<script setup>
import { ref, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useRouter } from 'vue-router';
import { useReadyToPlay } from '../composables/useReadyToPlay';

const { userProfile, logout } = useAuth();
const router = useRouter();
const menuOpen = ref(false);

const { readyToPlayAt, setReadyToPlay, isOlderThanOneMinute, showReadyTooOld } = useReadyToPlay();
const isReady = ref(false);
let popupActionInProgress = false;





// Sync isReady with readyToPlayAt from Firestore
watch(readyToPlayAt, (val) => {
  isReady.value = !!val;
});

function onSwitchChange(e) {
  if (!showReadyTooOld.value) {
    setReadyToPlay(e.target.checked);
  }
}


async function handleReadyPopupYes() {
  popupActionInProgress = true;
  await setReadyToPlay(true);
}
async function handleReadyPopupNo() {
  popupActionInProgress = true;
  await setReadyToPlay(false);
}

// Reset popupActionInProgress after Firestore update is reflected
watch(readyToPlayAt, () => {
  if (popupActionInProgress) {
    popupActionInProgress = false;
  }
});

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}
function closeMenu() {
  menuOpen.value = false;
}
async function handleLogout() {
  // Set readyToPlayAt to null before logging out
  await setReadyToPlay(false);
  await logout();
  window.location.href = '/';
}
</script>



<style scoped>
/* Fullscreen modal overlay for popup */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(30, 41, 59, 0.7); /* dark semi-transparent */
  z-index: 1999;
}
/* Ready switch styles moved from <script setup> */
.ready-switch {
  margin-left: 24px;
  margin-right: 8px;
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  vertical-align: middle;
}
.ready-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 24px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}
.ready-switch input:checked + .slider {
  background-color: #22c55e;
}
.ready-switch input:checked + .slider:before {
  transform: translateX(20px);
}
.ready-label {
  margin-left: 10px;
  color: #fbbf24;
  font-weight: 500;
  font-size: 1em;
}
.nav-content {
  display: flex;
  flex-direction: column;
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 16px;
}
.nav-content-col {
  flex-direction: column;
}
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 56px;
}
.user-row {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 28px;
  background: #1e293b;
  border-top: 1px solid #334155;
  padding: 2px 0 2px 0;
}
.ready-container {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
.user-name {
  color: #fff;
  font-size: 1em;
  font-weight: 500;
  padding-left: 18px;
}
.brand {
  font-size: 1.3em;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
}
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: none;
  border: none;
  cursor: pointer;
  z-index: 110;
  background: #2563eb;
  padding: 0;
  gap: 5px;
  align-items: center;
}
.hamburger span {
  display: block;
  height: 2px;
  width: 60%;
  transition: .3s;
  background: #fff;
}
.hamburger span.open:nth-child(1) {
  transform: translateY(9px) rotate(45deg);
}
.hamburger span.open:nth-child(2) {
  opacity: 0;
}
.hamburger span.open:nth-child(3) {
  transform: translateY(-9px) rotate(-45deg);
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
  list-style: none;
  margin: 0;
  padding: 0;
  transition: right 0.3s;
}
.nav-links li {
  display: flex;
  align-items: center;
}
.nav-links a {
  color: #e5e7eb;
  text-decoration: none;
  font-size: 1.1em;
  font-weight: 500;
  padding: 8px 18px;
  border-radius: 6px;
  transition: background 0.2s, color 0.2s;
}
.nav-links a.active, .nav-links a:hover {
  background: #2563eb;
  color: #fff;
}
.logout-btn {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.logout-btn:hover {
  background: #b91c1c;
}
@media (max-width: 700px) {
  .nav-content {
    padding: 0 8px;
  }
  .nav-row {
    flex-direction: row;
    height: 56px;
  }
  .user-row {
    padding-left: 8px;
    font-size: 0.95em;
  }
  .hamburger {
    display: flex;
  }
  .nav-links {
    position: fixed;
    top: 0;
    right: -100vw;
    height: 100vh;
    width: 70vw;
    max-width: 320px;
    background: #1e293b;
    flex-direction: column;
    align-items: flex-start;
    padding: 80px 24px 24px 24px;
    gap: 18px;
    box-shadow: -2px 0 12px #0005;
    transition: right 0.3s;
    z-index: 120;
  }
  .nav-links.open {
    right: 0;
  }
  .nav-links:not(.open) {
    right: -100vw;
  }
}

/* Centered infobox style for ready popup, matching global-vote-error-popup */
  .global-ready-popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #ef4444;
    color: #fff;
    padding: 24px 40px;
    border-radius: 16px;
    z-index: 2001;
    font-size: 1.2em;
    box-shadow: 0 4px 24px #0008;
    animation: fadeInOut 0.3s;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
  }
  .popup-countdown {
    font-size: 1em;
    color: #fffbe6;
    margin-bottom: 6px;
  }
  .popup-actions {
    display: flex;
    gap: 18px;
    margin-top: 12px;
    justify-content: center;
  }
  .close-popup {
    background: #fff;
    color: #ef4444;
    border: none;
    border-radius: 8px;
    padding: 10px 28px;
    font-size: 1.08em;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .close-popup.yes:hover {
    background: #22c55e;
    color: #fff;
  }
  .close-popup.no:hover {
    background: #ef4444;
    color: #fff;
  }
@keyframes fadeInOut {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
