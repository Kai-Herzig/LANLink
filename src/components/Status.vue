<template>
  <div class="card status-card">
    <div v-if="voteError" class="global-vote-error-popup">{{ voteError }}</div>
    <div class="current-game-glass" :class="{ paused: isPaused }">
      <!-- icon removed -->
      <span v-if="!isPaused" class="playing-active-text">
        <span class="now-playing-badge">
          <span class="game-icon">🎮</span>
          Now Playing
        </span>
        <span class="game-title-animated now-playing-orange">{{ currentGameTitle }}</span>
      </span>
      <span v-else class="game-title paused">
        <template v-if="pauseEnd && new Date(pauseEnd) < now">
          Break until {{ new Date(pauseEnd).toLocaleString() }} is overdue
        </template>
        <template v-else>
          Break until {{ pauseEnd ? new Date(pauseEnd).toLocaleString() : '' }}
        </template>
      </span>
    </div>

    <div class="current-game-glass ready-players-glass">
      <span class="playing-active-text">
        <span class="ready-badge">
          <span class="ready-icon">⚡</span>
          Ready Players
        </span>
        <span class="ready-users-list">
          <span v-if="readyUsers.length">
            <span v-for="user in readyUsers" :key="user.id" class="pill pill-green">{{ user.displayName || user.email || user.id }}</span>
          </span>
          <span v-else style="color:#6b7280;">—</span>
        </span>
      </span>
    </div>
    <div v-if="userProfile?.isAdmin" class="pause-collapsible">
      <button class="pause-toggle" @click="openPauseBox" v-if="!showPauseBox">Set a break</button>
      <div v-if="showPauseBox" class="pause-box">
        <h4 class="pause-title">Set a break</h4>
        <label>Pause end time:
          <input type="datetime-local" v-model="pauseInput" />
        </label>
        <button @click="handleSetPause" v-if="!isPaused">Set Pause</button>
        <button @click="handleClearPause" v-if="isPaused">Remove Pause</button>
        <button class="pause-cancel" type="button" @click="showPauseBox = false">Close</button>
        <div class="pause-msg" v-if="pauseMsg">{{ pauseMsg }}</div>
      </div>
      <button class="pause-toggle" @click="handleClearCurrentGameAndPause">Clear Current Game & Pause</button>
    </div>
    <div class="top-games">
      <h4 class="top-games-title">
        <span class="trophy-icon">🏆</span>
        Top 5 Games by Ready-to-Play Votes
      </h4>
      <ul class="top-games-list">
        <li v-for="(g, idx) in topGames" :key="g.id" :class="['top-game-card', { first: g.readyVotesCount === topGames[0]?.readyVotesCount }]">
          <span class="rank-badge">
            <template v-if="g.readyVotesCount === topGames[0]?.readyVotesCount">
              <span class="crown crown-behind">👑</span>
            </template>
            <template v-else>
              <span class="place-number">{{ idx + 1 }}</span>
            </template>
          </span>
          <span class="game-title">{{ g.title }}</span>
          <span class="votes-badge votes-tooltip-wrapper">
            {{ g.readyVotesCount }} ready votes
            <span v-if="g.readyVotesUsers && g.readyVotesUsers.length" class="votes-tooltip">
              <span v-for="user in g.readyVotesUsers" :key="user.id" class="votes-tooltip-user">
                {{ user.displayName || user.email || user.id }}
              </span>
            </span>
          </span>
          <div class="progress-bar">
            <div class="progress" :style="{ width: (g.readyVotesCount / (topGames[0]?.readyVotesCount || 1) * 100) + '%' }"></div>
          </div>
          <button
            v-if="!hasVoted(g)"
            class="vote-btn"
            @click="handleVoteForGame(g.id)"
          >Vote</button>
          <button
            v-else
            class="vote-btn voted"
            @click="removeVoteForGame(g.id)"
          >Unvote</button>
          <button v-if="userProfile?.isAdmin" class="set-current-btn" @click="setCurrentGame(g.id)">Set as current</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
// Computed list of all users who are ready (readytoplayat within 1 hour)
const readyUsers = computed(() => {
  const nowMs = Date.now();
  if (!users.value || !Array.isArray(users.value)) return [];
  return users.value.filter(u => {
    const ts = u.readyToPlayAt;
    if (!ts) return false;
    let readyTime;
    if (typeof ts?.toMillis === 'function') {
      readyTime = ts.toMillis();
    } else if (typeof ts === 'object' && typeof ts.seconds === 'number') {
      readyTime = ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
    } else if (typeof ts === 'number') {
      readyTime = ts;
    } else if (typeof ts === 'string') {
      readyTime = Date.parse(ts);
    } else {
      return false;
    }
    return nowMs - readyTime <= 3600000;
  });
});
// Clear both currentGameId and pauseEnd in Firestore
async function handleClearCurrentGameAndPause() {
  try {
    await updateDoc(doc(db, 'partyStatus', 'current'), { currentGameId: null, pauseEnd: null });
    pauseMsg.value = 'Current game and pause cleared.';
  } catch (e) {
    pauseMsg.value = 'Error clearing values.';
  }
}
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useGames } from '../composables/useGames';
import { useStatus } from '../composables/useStatus';
import { usePause } from '../composables/usePause';
import { useAuth } from '../composables/useAuth';
import { useUsers } from '../composables/useUsers';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';

const { games, installedGameIds, subscribe: subscribeGames, voteForGame, removeVoteForGame } = useGames();
const { currentGameTitle, subscribe: subscribeStatus } = useStatus();
const { users, subscribe: subscribeUsers } = useUsers();
import { db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
async function setCurrentGame(gameId) {
  await setDoc(doc(db, 'partyStatus', 'current'), { currentGameId: gameId }, { merge: true });
  // Remove all votes for this game
  const votesCol = collection(db, 'games', gameId, 'votes');
  const votesSnap = await getDocs(votesCol);
  for (const voteDoc of votesSnap.docs) {
    await deleteDoc(voteDoc.ref);
  }
}
const { pauseEnd, isPaused, subscribe: subscribePause, setPauseEnd, clearPause } = usePause();

// Add a reactive 'now' variable for live updates
const now = ref(new Date());
let nowInterval = null;
onMounted(() => {
  nowInterval = setInterval(() => {
    now.value = new Date();
  }, 1000);
});
onUnmounted(() => {
  if (nowInterval) clearInterval(nowInterval);
});
const { userProfile, user } = useAuth();

const pauseInput = ref("");
const pauseMsg = ref("");
const showPauseBox = ref(false);
const voteError = ref('');

onMounted(() => {
  subscribeGames();
  subscribeStatus();
  subscribePause();
  subscribeUsers();
});

const topGames = computed(() => {
  // Only consider users who are ready to play (readyToPlayAt within last hour)
  const nowMs = Date.now();
  const readyUsers = users.value.filter(u => {
    const ts = u.readyToPlayAt;
    if (!ts) return false;
    let readyTime;
    if (typeof ts?.toMillis === 'function') {
      readyTime = ts.toMillis();
    } else if (typeof ts === 'object' && typeof ts.seconds === 'number') {
      readyTime = ts.seconds * 1000 + Math.floor((ts.nanoseconds || 0) / 1e6);
    } else if (typeof ts === 'number') {
      readyTime = ts;
    } else if (typeof ts === 'string') {
      readyTime = Date.parse(ts);
    } else {
      return false;
    }
    return nowMs - readyTime <= 3600000;
  });

  // For each game, count how many ready users have voted for it
  const gamesWithReadyVotes = games.value.map(g => {
    const readyVotesUsers = readyUsers.filter(u => g.votes && g.votes.includes(u.id));
    return {
      ...g,
      readyVotesCount: readyVotesUsers.length,
      readyVotesUsers,
    };
  });
  return gamesWithReadyVotes
    .sort((a, b) => b.readyVotesCount - a.readyVotesCount)
    .slice(0, 5);
});

function hasVoted(g) {
  if (!g.votes || !user.value) return false;
  return g.votes.includes(user.value.uid);
}

async function handleVoteForGame(gameId) {
  if (!installedGameIds.value.includes(gameId)) {
    voteError.value = 'You are only allowed to vote if you have the game installed.';
    setTimeout(() => { voteError.value = ''; }, 3000);
    return;
  }
  await voteForGame(gameId);
}

async function handleSetPause() {
  if (!pauseInput.value) {
    pauseMsg.value = "Please select a pause end time.";
    return;
  }
  await setPauseEnd(new Date(pauseInput.value).toISOString());
  pauseMsg.value = "Pause set until " + new Date(pauseInput.value).toLocaleString();
}
async function handleClearPause() {
  await clearPause();
  pauseMsg.value = "Pause cleared.";
}

function openPauseBox() {
  // Prefill with current date and time in datetime-local format
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const local = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  pauseInput.value = local;
  showPauseBox.value = true;
}
</script>

<style scoped>
    .ready-players-glass {
      /* Inherit all styles from .current-game-glass for perfect alignment */
      margin-bottom: 2.5em;
      margin-top: 0;
    }
  .ready-users-box {
    margin-top: 1em;
    display: flex;
    align-items: center;
    gap: 1.2em;
    flex-wrap: wrap;
  }
  .ready-badge {
    background: #2563eb;
    color: #fff;
    border-radius: 12px;
    padding: 4px 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    font-size: 1em;
    box-shadow: 0 2px 8px #0002;
    gap: 0.5em;
  }
  .ready-icon {
    font-size: 1.3em;
    margin-right: 0.5em;
    filter: drop-shadow(0 0 2px #fff8);
  }
  .ready-users-list {
    display: flex;
    gap: 0.3em;
    flex-wrap: wrap;
  }
  .pill-green {
    background: #374151;
    color: #e5e7eb;
    border-radius: 12px;
    padding: 0.25em 0.9em;
    font-size: 1em;
    font-weight: 500;
    margin-right: 0.3em;
    display: inline-block;
  }
/* Enhanced currently playing text styles */
  .playing-active-text {
    display: flex;
    align-items: center;
    gap: 1.2em;
    justify-content: flex-start;
    width: 100%;
  }
  .now-playing-badge {
    background: #2563eb;
    color: #fff;
    border-radius: 12px;
    padding: 4px 14px;
    font-weight: 700;
    display: flex;
    align-items: center;
    font-size: 1em;
    box-shadow: 0 2px 8px #0002;
  }
.game-icon {
  font-size: 1.3em;
  margin-right: 0.5em;
}
.game-title-animated {
  font-size: 2em;
  font-weight: 800;
  color: #fff;
}
.global-vote-error-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #ef4444;
  color: #fff;
  padding: 24px 40px;
  border-radius: 16px;
  z-index: 1000;
  font-size: 1.2em;
  box-shadow: 0 4px 24px #0008;
  animation: fadeInOut 0.3s;
  text-align: center;
}
@keyframes fadeInOut {
  from { opacity: 0; }
  to { opacity: 1; }
}
.set-current-btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 0.98em;
  font-weight: 500;
  cursor: pointer;
  margin-left: 12px;
  transition: background 0.2s;
}
.set-current-btn:hover {
  background: #1e40af;
}
/* Glassmorphism, glowing, animated current game box */
/* Enhanced standout effect for current game box */
.current-game-glass {
  background: #232b3b;
  border-radius: 22px;
  padding: 2.2rem 2.8rem;
  margin-bottom: 2.5em;
  display: flex;
  align-items: center;
  gap: 1.4em;
  animation: fadeInUp 0.7s;
  position: relative;
  z-index: 2;
  overflow: hidden;
  /* No gradients, no color transitions, just a solid color */
}

.current-game-glass:hover {
  transform: scale(1.025);
}
@keyframes pulseGlow {
  0% {
    border-color: rgba(251,191,36,0.7);
  }
  100% {
    border-color: #fbbf24;
  }
}
.current-game-glass .icon {
  font-size: 2.2em;
  color: #fbbf24;
  filter: drop-shadow(0 0 8px #fbbf24aa);
  display: flex;
  align-items: center;
}
.current-game-glass .label {
  font-weight: 600;
  color: #a5b4fc;
  font-size: 1.1em;
}
.current-game-glass .game-title {
  font-size: 1.5em;
  font-weight: 800;
  color: #ff5722;
}
.current-game-glass.paused {
  background: rgba(185, 28, 28, 0.8);
  border-color: #b91c1c;
  box-shadow: 0 4px 32px #b91c1c88, 0 1.5px 8px #0003;
}
.current-game-glass .game-title.paused {
  color: #fff;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(30px);}
  to { opacity: 1; transform: translateY(0);}
}
.top-games {
  margin-top: 2em;
}
.top-games-title {
  font-family: inherit;
  font-size: 1.35em;
  font-weight: 600;
  color: #1976d2;
  display: flex;
  align-items: center;
  justify-content: center;
  letter-spacing: 0.01em;
  margin-bottom: 1.1em;
  background: none;
  box-shadow: none;
  border: none;
}
.trophy-icon {
  font-size: 1.1em;
  margin-right: 0.5em;
}
/* Redesigned Top Games Section */
.top-games-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.top-game-card {
  display: flex;
  align-items: center;
  background: #232b3b;
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 14px;
  color: #e5e7eb;
  font-size: 1.12em;
  box-shadow: 0 2px 8px #0001;
  position: relative;
  transition: box-shadow 0.2s, background 0.2s;
}
.top-game-card.first {
  background: #ffe082;
  color: #232b3b;
  font-weight: bold;
  box-shadow: 0 4px 16px #0002;
}
/* Rank badge with crown behind number */
.rank-badge {
  position: relative;
  font-size: 1.4em;
  font-weight: 700;
  width: 2.5em;
  text-align: center;
  margin-right: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
}
.crown-behind {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -60%) scale(1.3);
  font-size: 1.3em;
  opacity: 1;
  pointer-events: none;
  z-index: 0;
}
.place-number {
  position: relative;
  z-index: 1;
  font-size: 1em;
  color: inherit;
}
.game-title {
  flex: 1 1 40%;
  font-weight: 600;
  font-size: 1.1em;
}
.votes-badge {
  background: #1976d2;
  color: #fff;
  border-radius: 12px;
  padding: 0.25em 0.9em;
  margin-left: 1em;
  font-size: 1em;
  font-weight: 500;
}
.top-game-card.first .votes-badge {
  background: #232b3b;
  color: #ffe082;
}
.progress-bar {
  width: 100px;
  height: 10px;
  background: #e0e0e0;
  border-radius: 5px;
  margin-left: 1.2em;
  overflow: hidden;
  flex-shrink: 0;
}
.progress {
  height: 100%;
  background: #1976d2;
  border-radius: 5px 0 0 5px;
  transition: width 0.4s;
}
.top-game-card.first .progress {
  background: #232b3b;
}
.pause-collapsible {
  margin-top: 2.5em;
  text-align: center;
}
.pause-toggle {
  background: linear-gradient(90deg, #2563eb 0%, #1e40af 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 32px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  margin: 0 auto 1em auto;
  transition: background 0.2s;
  box-shadow: 0 2px 8px #0002;
  display: block;
}
.pause-toggle:hover {
  background: #1e40af;
}
.pause-box {
  background: #232b3b;
  color: #e5e7eb;
  border-radius: 10px;
  padding: 18px 20px;
  box-shadow: 0 2px 8px #0002;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1em;
  max-width: 400px;
  margin: 0 auto;
}
.pause-box h4 {
  color: #a5b4fc;
  margin-bottom: 0.5em;
}
.pause-box label {
  font-weight: 500;
  margin-bottom: 0.5em;
}
.pause-box input[type="datetime-local"] {
  background: #20283a;
  color: #e5e7eb;
  border: 1px solid #374151;
  border-radius: 8px;
  padding: 0.5em 1em;
  font-size: 1em;
  margin-left: 0.5em;
}
.pause-box button {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 18px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  margin-right: 8px;
}
.pause-box button:hover {
  background: #1e40af;
}
.pause-cancel {
  background: #374151;
  color: #a5b4fc;
  margin-top: 0.5em;
}
.pause-cancel:hover {
  background: #232b3b;
  color: #fff;
}
.pause-msg {
  color: #fbbf24;
  margin-top: 0.5em;
  font-size: 1em;
}
.votes-tooltip-wrapper {
  position: relative;
  cursor: pointer;
}
.votes-tooltip {
  display: none;
  position: absolute;
  left: 50%;
  top: 120%;
  transform: translateX(-50%);
  background: #232b3b;
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  box-shadow: 0 4px 16px #0007;
  white-space: nowrap;
  z-index: 20;
  font-size: 1em;
}
.votes-tooltip-user {
  display: block;
  padding: 2px 0;
}
.votes-tooltip-wrapper:hover .votes-tooltip,
.votes-tooltip-wrapper:focus .votes-tooltip {
  display: block;
}
@media (hover: none) and (pointer: coarse) {
  .votes-tooltip-wrapper:active .votes-tooltip {
    display: block;
  }
}
.top-game-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #20283a;
  border-radius: 8px;
  padding: 8px 14px;
  margin-bottom: 8px;
  color: #e5e7eb;
  font-size: 1.08em;
  position: relative;
}
.game-title {
  font-weight: 600;
  flex: 1 1 20%;
}
.voters-center {
  flex: 2 1 60%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.voters {
  color: #a5b4fc;
  font-size: 0.97em;
  font-style: italic;
  max-width: 300px;
  overflow-x: auto;
  white-space: nowrap;
  display: inline-block;
}
.votes-right {
  flex: 1 1 20%;
  text-align: right;
  color: #fbbf24;
  font-size: 0.98em;
  margin-left: 10px;
}
.vote-btn,
.set-current-btn {
  height: 38px;
  min-width: 90px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.98em;
  font-weight: 500;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  margin-left: 8px;
  margin-right: 0;
  padding: 0 14px;
}
.vote-btn {
  background: #374151;
  color: #fff;
}
.vote-btn.voted {
  background: #2563eb;
  color: #fff;
}
.vote-btn:hover {
  background: #1e40af;
}
.set-current-btn {
  background: #2563eb;
  color: #fff;
  margin-left: 8px;
}
.set-current-btn:hover {
  background: #1e40af;
}
/* Orange/red for now playing game title */
.now-playing-orange {
  color: #ff5722;
  /* fallback for older browsers */
  /* You can use a gradient or text-shadow for more effect if desired */
}
</style>
