<template>
  <div>
    <div v-if="voteError" class="global-vote-error-popup">{{ voteError }}</div>
    <div class="card gamelist-card">

      <div class="add-game-collapsible">
        <button class="add-game-toggle" @click="showAddGame = !showAddGame" v-if="!showAddGame">+ Add Game</button>
        <form v-if="showAddGame" class="add-game-form improved" @submit.prevent="onAddGame">
          <h4 class="form-title">Add a New Game</h4>
          <label class="form-label">
            Title
            <input v-model="newTitle" class="form-input" placeholder="Game title" required />
          </label>
          <label class="form-label">
            Max Players
            <input v-model.number="newMaxPlayers" class="form-input" type="number" min="1" placeholder="Max players" />
          </label>
          <label class="form-label">
            Subscriptions
            <div class="platform-checkboxes">
              <label v-for="platform in availablePlatforms" :key="platform" class="checkbox-label">
                <input type="checkbox" :value="platform" v-model="newPlatforms" />
                {{ platform }}
              </label>
            </div>
          </label>
          <div class="form-actions">
            <button class="form-submit" type="submit">Add Game</button>
            <button class="form-submit danger" type="button" @click="cancelAddGame">Cancel</button>
          </div>
          <span class="msg" v-if="addMsg">{{ addMsg }}</span>
        </form>
      </div>

      <table class="gamelist-table">
        <thead>
          <tr>
            <th @click="toggleSort('title')" style="cursor:pointer;">
              Title
              <span v-if="sortBy==='title'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
            </th>
            <th @click="toggleSort('maxPlayers')" style="cursor:pointer;">
              Max Players
              <span v-if="sortBy==='maxPlayers'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
            </th>
            <th>Subscriptions</th>
            <th @click="toggleSort('votesCount')" style="cursor:pointer;">
              Votes
              <span v-if="sortBy==='votesCount'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
            </th>
            <th>Vote</th>
            <th @click="toggleSort('installations')" style="cursor:pointer;">
              Installations
              <span v-if="sortBy==='installations'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
            </th>
            <th>Installed</th>
            <th>Installed by</th>
            <th>Ready Players</th>
            <th>Voted By</th>
            <th v-if="userProfile?.isAdmin">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="g in sortedGames" :key="g.id">
            <template v-if="editingGameId === g.id">
              <td colspan="12" class="edit-row">
                <form class="edit-game-form" @submit.prevent="saveEditGame(g)">
                  <label>Title
                    <input v-model="editTitle" class="form-input" required minlength="3" maxlength="50" />
                  </label>
                  <label>Max Players
                    <input v-model.number="editMaxPlayers" class="form-input" type="number" min="2" max="100" />
                  </label>
                  <label>Subscriptions
                    <div class="platform-checkboxes">
                      <label v-for="platform in availablePlatforms" :key="platform" class="checkbox-label">
                        <input type="checkbox" :value="platform" v-model="editPlatforms" />
                        {{ platform }}
                      </label>
                    </div>
                  </label>
                  <div class="form-actions">
                    <button class="form-submit" type="submit">Save</button>
                    <button class="form-submit danger" type="button" @click="cancelEditGame">Cancel</button>
                  </div>
                </form>
              </td>
            </template>
            <template v-else>
              <td class="g-title">{{ g.title }}</td>
              <td class="g-max">{{ g.maxPlayers || '?' }}</td>
              <td class="g-platforms" style="display: flex; flex-direction: column; gap: 0.3em;">
                <span v-for="p in g.platforms || []" :key="p" class="pill" style="white-space: normal; max-width: none; width: fit-content;">{{ p }}</span>
              </td>
              <td class="g-votes">{{ g.votesCount }}</td>
              <td class="g-vote-btn" style="position:relative;">
                <button
                  v-if="!hasVoted(g)"
                  @click="handleVoteForGame(g.id)"
                  title="Vote"
                  class="vote-icon grey"
                ></button>
                <button
                  v-else
                  @click="removeVoteForGame(g.id)"
                  title="Unvote"
                  class="vote-icon blue filled"
                ></button>
              </td>
              <td class="g-installations">
                {{ g.installedByUsers ? g.installedByUsers.length : 0 }}
              </td>
              <td class="g-installed-btn">
                <button
                  v-if="user && !installedGameIds.includes(g.id)"
                  @click="markAsInstalled(g.id)"
                  title="Mark as installed"
                  class="checkmark grey"
                ></button>
                <button
                  v-if="user && installedGameIds.includes(g.id)"
                  @click="unmarkAsInstalled(g.id)"
                  title="Mark as not installed"
                  class="checkmark green"
                ></button>
              </td>
              <td class="g-installed-by">
                <span v-if="g.installedByUsers && g.installedByUsers.length" class="installed-by-list">
                  <span v-for="user in g.installedByUsers" :key="user.id" class="pill pill-grey">{{ user.displayName || user.email || user.id }}</span>
                </span>
                <span v-else style="color:#6b7280;">—</span>
              </td>
              <td class="g-ready-players">
                <span v-if="readyPlayersForGame(g).length" class="ready-list">
                  <span v-for="user in readyPlayersForGame(g)" :key="user.id" class="pill pill-green">{{ user.displayName || user.email || user.id }}</span>
                </span>
                <span v-else style="color:#6b7280;">—</span>
              </td>
              <td class="g-voted-by">
                <span v-if="g.votesUsers && g.votesUsers.length" class="voted-list">
                  <span v-for="user in g.votesUsers" :key="user.id" class="pill pill-green">
                    {{ user.displayName || user.email || user.id }}
                  </span>
                </span>
                <span v-else style="color:#6b7280;">—</span>
              </td>
              <td v-if="userProfile?.approved" class="g-actions">
                <button class="edit-btn" @click="startEditGame(g)">Edit</button>
                <button v-if="userProfile?.isAdmin" class="set-current-btn" @click="setCurrentGame(g.id)">Set as current</button>
                <button v-if="userProfile?.isAdmin" class="danger" @click="deleteGame(g.id)" title="Delete">🗑️</button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>


<script setup>
// Edit game state
const editingGameId = ref(null);
const editTitle = ref('');
const editMaxPlayers = ref(2);
const editPlatforms = ref([]);

function startEditGame(game) {
  editingGameId.value = game.id;
  editTitle.value = game.title;
  editMaxPlayers.value = game.maxPlayers;
  editPlatforms.value = Array.isArray(game.platforms) ? [...game.platforms] : [];
}

function cancelEditGame() {
  editingGameId.value = null;
  editTitle.value = '';
  editMaxPlayers.value = 2;
  editPlatforms.value = [];
}

async function saveEditGame(game) {
  // Validation (reuse add form logic)
  const title = editTitle.value.trim();
  const maxPlayers = Number(editMaxPlayers.value);
  if (!title || title.length < 3 || title.length > 50) {
    addMsg.value = 'Title must be 3-50 characters.';
    return;
  }
  if (!/^[A-Za-z0-9 .,'!?:;\-()]+$/.test(title)) {
    addMsg.value = 'Title contains invalid characters.';
    return;
  }
  if (!maxPlayers || maxPlayers < 2 || maxPlayers > 100) {
    addMsg.value = 'Max players must be between 2 and 100.';
    return;
  }
  try {
    await updateDoc(doc(db, 'games', game.id), {
      title,
      maxPlayers,
      platforms: Array.isArray(editPlatforms.value) ? editPlatforms.value : [],
    });
    addMsg.value = 'Game updated!';
    editingGameId.value = null;
  } catch (e) {
    addMsg.value = e.message || 'Error updating game.';
  }
}
import { ref, onMounted, computed } from 'vue';
import { useUsers } from '../composables/useUsers';


import { useGames } from '../composables/useGames';
import { useAuth } from '../composables/useAuth';

const { games, installedGameIds, subscribe, addGame, deleteGame, voteForGame, removeVoteForGame, markAsInstalled, unmarkAsInstalled } = useGames();
const { users, subscribe: subscribeUsers } = useUsers();
import { db } from '../firebase';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
const { user, userProfile } = useAuth();

const voteError = ref('');

async function handleVoteForGame(gameId) {
  if (!installedGameIds.value.includes(gameId)) {
    voteError.value = 'You are only allowed to vote if you have the game installed.';
    setTimeout(() => { voteError.value = ''; }, 3000);
    return;
  }
  await voteForGame(gameId);
}
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
async function setCurrentGame(gameId) {
  await setDoc(doc(db, 'partyStatus', 'current'), { currentGameId: gameId }, { merge: true });
  // Remove all votes for this game (same as home screen)
  const votesCol = collection(db, 'games', gameId, 'votes');
  const votesSnap = await getDocs(votesCol);
  for (const voteDoc of votesSnap.docs) {
    await deleteDoc(voteDoc.ref);
  }
}

const newTitle = ref('');
const newMaxPlayers = ref('');
const availablePlatforms = [
  'Game Pass PC',
  'Game Pass Essential',
  'Game Pass Premium',
  'Game Pass Ultimate',
  'EA Play',
  'EA Play Pro'
];
const newPlatforms = ref([]);
const addMsg = ref('');
const showAddGame = ref(false);

onMounted(() => subscribe());
onMounted(() => subscribeUsers());
// Helper to get ready players for a game (readytoplayat within 1 hour)
function readyPlayersForGame(game) {
  const nowMs = Date.now();
  if (!users.value || !Array.isArray(users.value)) return [];
  return users.value.filter(u => {
    // Only users who are ready
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
    // Only if ready within last hour
    if (nowMs - readyTime > 3600000) return false;
    // Only if user has this game installed
    return game.installedByUsers && game.installedByUsers.some(inst => inst.id === u.id);
  });
}

async function onAddGame() {
  addMsg.value = '';
  // Validation
  const title = newTitle.value.trim();
  const maxPlayers = Number(newMaxPlayers.value);
  // Title: 3-50 chars, only letters, numbers, spaces, and basic punctuation
  if (!title || title.length < 3 || title.length > 50) {
    addMsg.value = 'Title must be 3-50 characters.';
    return;
  }
  if (!/^[A-Za-z0-9 .,'!?:;\-()]+$/.test(title)) {
    addMsg.value = 'Title contains invalid characters.';
    return;
  }
  // Max players: 2-100
  if (!maxPlayers || maxPlayers < 2 || maxPlayers > 100) {
    addMsg.value = 'Max players must be between 2 and 100.';
    return;
  }
  try {
    await addGame({
      title,
      maxPlayers,
      platforms: Array.isArray(newPlatforms.value) ? newPlatforms.value : [],
    });
    addMsg.value = 'Game added!';
    newTitle.value = '';
    newMaxPlayers.value = '';
    newPlatforms.value = [];
    showAddGame.value = false;
  } catch (e) {
    addMsg.value = e.message || 'Error adding game.';
  }
}

function cancelAddGame() {
  showAddGame.value = false;
  addMsg.value = '';
  newTitle.value = '';
  newMaxPlayers.value = '';
  newPlatforms.value = [];
}



function hasVoted(g) {
  if (!g.votes || !user.value) return false;
  return g.votes.includes(user.value.uid);
}

// Sorting logic for table columns
const sortBy = ref('title');
const sortDir = ref('asc');

function toggleSort(col) {
  if (sortBy.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortBy.value = col;
    sortDir.value = 'asc';
  }
}

const sortedGames = computed(() => {
  if (!games.value) return [];
  const arr = [...games.value];
  if (sortBy.value === 'title') {
    arr.sort((a, b) => {
      if (!a.title) return 1;
      if (!b.title) return -1;
      return sortDir.value === 'asc'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title);
    });
  } else if (sortBy.value === 'votesCount') {
    arr.sort((a, b) => {
      return sortDir.value === 'asc'
        ? a.votesCount - b.votesCount
        : b.votesCount - a.votesCount;
    });
  } else if (sortBy.value === 'maxPlayers') {
    arr.sort((a, b) => {
      return sortDir.value === 'asc'
        ? (a.maxPlayers || 0) - (b.maxPlayers || 0)
        : (b.maxPlayers || 0) - (a.maxPlayers || 0);
    });
  } else if (sortBy.value === 'installations') {
    arr.sort((a, b) => {
      const aCount = a.installedByUsers ? a.installedByUsers.length : 0;
      const bCount = b.installedByUsers ? b.installedByUsers.length : 0;
      return sortDir.value === 'asc' ? aCount - bCount : bCount - aCount;
    });
  }
  return arr;
});
</script>



<style scoped>
  .edit-row {
    background: #232b3b;
    padding: 0;
  }
  .edit-game-form {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 18px 10px;
  }
  .edit-game-form label {
    display: flex;
    flex-direction: column;
    font-size: 1em;
    color: #a5b4fc;
    gap: 6px;
    min-width: 180px;
  }
  .edit-game-form .form-input {
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #374151;
    background: #111827;
    color: #e5e7eb;
    font-size: 1.08em;
    margin-top: 2px;
  }
  .platform-checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
    margin-top: 0.5em;
  }
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.3em;
    font-weight: normal;
    background: #232a3b;
    padding: 0.2em 0.6em;
    border-radius: 0.5em;
    color: #a5b4fc;
  }
.pill-green {
  background: #22c55e;
  color: #fff;
  border-radius: 12px;
  padding: 0.25em 0.9em;
  font-size: 1em;
  font-weight: 500;
  margin-right: 0.3em;
  display: inline-block;
}
.g-ready-players {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.add-game-form.improved {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 1.5em;
  background: #20283a;
  border-radius: 14px;
  padding: 28px 20px 18px 20px;
  box-shadow: 0 4px 16px #0003;
  max-width: 420px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}
.add-game-collapsible {
  margin-bottom: 0.5em;
  text-align: center;
}
.add-game-toggle {
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
}
.add-game-toggle:hover {
  background: #1e40af;
}
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}
.form-cancel {
  background: #374151;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.form-cancel:hover {
  background: #ef4444;
}
.form-title {
  margin: 0 0 8px 0;
  font-size: 1.25em;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-align: center;
}
.form-label {
  display: flex;
  flex-direction: column;
  font-size: 1em;
  color: #a5b4fc;
  gap: 6px;
}
.form-input {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #374151;
  background: #111827;
  color: #e5e7eb;
  font-size: 1.08em;
  margin-top: 2px;
}
.platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 4px;
}
.platform-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 1em;
  color: #e5e7eb;
}
.form-submit {
  background: linear-gradient(90deg, #2563eb 0%, #1e40af 100%);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 0;
  font-size: 1.08em;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.2s;
  width: 100%;
}
.form-submit:hover {
  background: #1e40af;
}
.msg {
  margin-left: 10px;
  color: #22c55e;
}
.gamelist-list {
  margin: 1em 0 0 0;
  padding: 0;
  color: #fff;
  list-style: none;
}
.gamelist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.5em;
  background: #232b3b;
  border-radius: 8px;
  padding: 8px 12px;
  flex-wrap: wrap;
}
.g-title {
  font-weight: 600;
}
.g-max, .g-votes {
  font-size: 0.98em;
  color: #a5b4fc;
}
.g-platforms {
  display: flex;
  gap: 6px;
}
.pill {
  background: #374151;
  color: #fff;
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 0.95em;
  font-weight: 500;
  margin-right: 4px;
  display: inline-block;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pill-grey {
  background: #374151;
  color: #e5e7eb;
  border-radius: 12px;
  padding: 0.25em 0.9em;
  font-size: 1em;
  font-weight: 500;
  margin-right: 0.3em;
  display: inline-block;
}
.more-pill {
  background: #232b3b;
  color: #a5b4fc;
  font-weight: 700;
}
.danger {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 0.98em;
  font-weight: 500;
  cursor: pointer;
  margin-left: 8px;
  transition: background 0.2s;
}
.danger:hover {
  background: #b91c1c;
}
.g-notes {
  margin-left: 10px;
  color: #fbbf24;
  font-size: 0.98em;
}
/* Minimalistic, state-of-the-art table for games list */
.gamelist-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1.5em;
  background: #20283a;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px #0002;
}
.gamelist-table th, .gamelist-table td {
  padding: 14px 16px;
  text-align: left;
}
.gamelist-table th {
  background: #232b3b;
  color: #a5b4fc;
  font-weight: 700;
  font-size: 1.08em;
  border-bottom: 1px solid #374151;
}
.gamelist-table tr {
  transition: background 0.2s;
}
.gamelist-table tbody tr {
  background: #20283a;
}
.gamelist-table tbody tr:hover {
  background: #232b3b;
}
.gamelist-table td {
  color: #e5e7eb;
  font-size: 1.04em;
  border-bottom: 1px solid #232b3b;
}
.gamelist-table td.g-actions button {
  margin-right: 8px;
  margin-bottom: 2px;
}
.g-installed-by {
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gamelist-table .pill {
  background: #374151;
  color: #fff;
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 0.95em;
  font-weight: 500;
  margin-right: 4px;
  display: inline-block;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.more-pill {
  background: #232b3b;
  color: #a5b4fc;
  font-weight: 700;
}
.g-actions {
  display: flex;
  gap: 2px;
}
.g-actions button,
.g-vote-btn button,
.g-installed-btn button {
  background: none;
  border: none;
  color: #a5b4fc;
  padding: 6px 10px;
  font-size: 1.1em;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  margin: 0 1px;
  outline: none;
}
.g-actions button:hover,
.g-vote-btn button:hover,
.g-installed-btn button:hover {
  background: #232b3b;
  color: #fff;
}
.g-actions .danger {
  color: #ef4444;
}
.g-actions .danger:hover {
  background: #ef4444;
  color: #fff;
}
.g-vote-btn .vote-icon {
  position: relative;
  width: 1.8em;
  height: 1.8em;
  padding: 0;
}
/* Vote icon states using pseudo-element for emoji color control */
.g-vote-btn .vote-icon::before {
  content: "\1F44E";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2em;
  font-weight: bold;
}
.g-vote-btn .vote-icon.filled::before {
  content: "\1F44D";
  color: #2563eb;
}
.g-vote-btn .vote-icon.grey::before {
  color: #6b7280;
}
/* Installed checkmark color states using pseudo-element for emoji color control */
.g-installed-btn .checkmark {
  position: relative;
  width: 1.8em;
  height: 1.8em;
  padding: 0;
}
.g-installed-btn .checkmark::before {
  content: "✔";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.2em;
  font-weight: bold;
}
.g-installed-btn .checkmark.grey::before {
  color: #6b7280;
}
.g-installed-btn .checkmark.green::before {
  color: #22c55e;
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
  margin-right: 8px;
  transition: background 0.2s;
}
.set-current-btn:hover {
  background: #1e40af;
}
</style>
