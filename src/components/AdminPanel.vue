
<template>
  <div v-if="userProfile?.isAdmin">
    <div class="card">

      <table class="gamelist-table adminlist-table">
        <thead>
          <tr>
              <th>Name</th>
              <th>User ID</th>
              <th>Status</th>
              <th>Role</th>
              <th>Ready&nbsp;since</th>
              <th>Actions</th>
          </tr>
        </thead>
        <tbody>
            <tr v-for="u in users" :key="u.id">
              <td class="g-title">{{ u.displayName }}</td>
              <td class="g-userid">{{ u.id }}</td>
              <td class="g-status">
                <span class="pill" :class="u.approved ? 'success' : 'danger'">{{ u.approved ? 'Approved' : 'Pending' }}</span>
              </td>
              <td class="g-role">
                <span class="pill">{{ u.isAdmin ? 'Admin' : 'User' }}</span>
              </td>
              <td class="g-readyToPlayAt">
                {{ formatReadyToPlayAt(u.readyToPlayAt) }}
              </td>
              <td class="g-actions">
                <button class="approve-btn" @click="toggleApproved(u.id)">{{ u.approved ? 'Revoke' : 'Approve' }}</button>
                <button class="admin-btn" @click="toggleAdmin(u.id)">{{ u.isAdmin ? 'Demote' : 'Promote' }}</button>
                <button class="danger" @click="openRemoveVotesDialog(u)" title="Remove all votes from this user">Remove Votes</button>
                <button class="danger" @click="openRemoveInstalledDialog(u)" title="Remove all installed games from this user">Remove Installed</button>
              </td>
            </tr>
        </tbody>
      </table>
      <div v-if="showRemoveVotesDialog" class="remove-votes-dialog">
        <div class="dialog-content">
          <h4>Remove all votes from {{ dialogUser?.displayName || dialogUser?.id }}?</h4>
          <p>This will remove all votes this user has cast for all games. This action cannot be undone.</p>
          <div class="dialog-actions">
            <button class="danger" @click="confirmRemoveVotes" :disabled="removeVotesLoading">Yes, Remove All Votes</button>
            <button @click="closeRemoveVotesDialog" :disabled="removeVotesLoading">Cancel</button>
          </div>
          <div v-if="removeVotesStatus" class="remove-votes-status" :class="{ error: removeVotesStatusType==='error', success: removeVotesStatusType==='success' }">
            {{ removeVotesStatus }}
          </div>
        </div>
      </div>
      <div v-if="showRemoveInstalledDialog" class="remove-votes-dialog">
        <div class="dialog-content">
          <h4>Remove all installed games from {{ dialogUser?.displayName || dialogUser?.id }}?</h4>
          <p>This will remove all games this user has marked as installed. This action cannot be undone.</p>
          <div class="dialog-actions">
            <button class="danger" @click="confirmRemoveInstalled" :disabled="removeInstalledLoading">Yes, Remove All Installed</button>
            <button @click="closeRemoveInstalledDialog" :disabled="removeInstalledLoading">Cancel</button>
          </div>
          <div v-if="removeInstalledStatus" class="remove-votes-status" :class="{ error: removeInstalledStatusType==='error', success: removeInstalledStatusType==='success' }">
            {{ removeInstalledStatus }}
          </div>
        </div>
      </div>
    </div>
    <!-- TODO: Migrate Party Status and Timetable admin logic here -->
  </div>
  <div v-else class="card">
    <h3>Access Denied</h3>
    <p>You do not have permission to view this page.</p>
  </div>
</template>


<script setup>
import { ref, onMounted } from 'vue';
import { useAuth } from '../composables/useAuth';
import { useUsers } from '../composables/useUsers';
import { useGames } from '../composables/useGames';
const { userProfile } = useAuth();
const { users, subscribe, toggleApproved, toggleAdmin } = useUsers();
const { removeAllVotesFromUser, removeAllInstalledFromUser } = useGames();
onMounted(() => subscribe());

// Helper to handle Firestore Timestamp, ISO string, or null
function formatReadyToPlayAt(val) {
  if (!val) return '-';
  // Firestore Timestamp object
  if (typeof val === 'object' && val.seconds) {
    return new Date(val.seconds * 1000).toLocaleString();
  }
  // ISO string or Date string
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toLocaleString();
  return '-';
}

const showRemoveVotesDialog = ref(false);
const showRemoveInstalledDialog = ref(false);
const dialogUser = ref(null);
const removeVotesStatus = ref('');
const removeVotesStatusType = ref('');
const removeVotesLoading = ref(false);
const removeInstalledStatus = ref('');
const removeInstalledStatusType = ref('');
const removeInstalledLoading = ref(false);

function openRemoveVotesDialog(user) {
  dialogUser.value = user;
  removeVotesStatus.value = '';
  removeVotesStatusType.value = '';
  showRemoveVotesDialog.value = true;
}
function closeRemoveVotesDialog() {
  showRemoveVotesDialog.value = false;
  dialogUser.value = null;
  removeVotesStatus.value = '';
  removeVotesStatusType.value = '';
  removeVotesLoading.value = false;
}
async function confirmRemoveVotes() {
  if (!dialogUser.value) return;
  removeVotesLoading.value = true;
  removeVotesStatus.value = '';
  removeVotesStatusType.value = '';
  try {
    await removeAllVotesFromUser(dialogUser.value.id);
    removeVotesStatus.value = 'All votes removed for this user.';
    removeVotesStatusType.value = 'success';
    setTimeout(() => {
      closeRemoveVotesDialog();
    }, 1200);
  } catch (e) {
    removeVotesStatus.value = 'Failed to remove votes: ' + (e.message || e);
    removeVotesStatusType.value = 'error';
    removeVotesLoading.value = false;
  }
}

function openRemoveInstalledDialog(user) {
  dialogUser.value = user;
  removeInstalledStatus.value = '';
  removeInstalledStatusType.value = '';
  showRemoveInstalledDialog.value = true;
}
function closeRemoveInstalledDialog() {
  showRemoveInstalledDialog.value = false;
  dialogUser.value = null;
  removeInstalledStatus.value = '';
  removeInstalledStatusType.value = '';
  removeInstalledLoading.value = false;
}
async function confirmRemoveInstalled() {
  if (!dialogUser.value) return;
  removeInstalledLoading.value = true;
  removeInstalledStatus.value = '';
  removeInstalledStatusType.value = '';
  try {
    await removeAllInstalledFromUser(dialogUser.value.id);
    await removeAllVotesFromUser(dialogUser.value.id);
    removeInstalledStatus.value = 'All installed games and votes removed for this user.';
    removeInstalledStatusType.value = 'success';
    setTimeout(() => {
      closeRemoveInstalledDialog();
    }, 1200);
  } catch (e) {
    removeInstalledStatus.value = 'Failed to remove installed games and votes: ' + (e.message || e);
    removeInstalledStatusType.value = 'error';
    removeInstalledLoading.value = false;
  }
}
</script>


<style scoped>
/* Import minimalistic table and pill/button styles from Gamelist */
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
.gamelist-table .pill {
  background: #374151;
  color: #fff;
  border-radius: 10px;
  padding: 2px 10px;
  font-size: 0.95em;
  font-weight: 500;
  margin-right: 4px;
}
.pill.success {
  background: #22c55e;
  color: #fff;
}
.pill.danger {
  background: #ef4444;
  color: #fff;
}
.g-actions {
  display: flex;
  gap: 2px;
}
.g-actions button {
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
.g-actions button:hover {
  background: #232b3b;
  color: #fff;
}
.approve-btn span,
.admin-btn span {
  font-size: 1.2em;
  vertical-align: middle;
}

.remove-votes-dialog {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.45);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-content {
  background: #232b3b;
  color: #e5e7eb;
  border-radius: 14px;
  padding: 32px 28px 22px 28px;
  box-shadow: 0 4px 32px #0008;
  min-width: 320px;
  max-width: 90vw;
  text-align: center;
}
.dialog-content h4 {
  margin-bottom: 0.7em;
  color: #ef4444;
}
.dialog-actions {
  display: flex;
  gap: 18px;
  justify-content: center;
  margin-top: 1.2em;
}
.remove-votes-status {
  margin-top: 1.2em;
  font-size: 1.08em;
  font-weight: 500;
}
.remove-votes-status.success {
  color: #22c55e;
}
.remove-votes-status.error {
  color: #ef4444;
}
</style>
