// (moved inside useGames)
// useGames.js - Vue composable for games management (add, remove, vote, subscribe)
import { ref, onUnmounted, watch } from 'vue';
import { db } from '../firebase';
import {
  collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs
} from 'firebase/firestore';
import { useAuth } from './useAuth';

export function useGames() {
    async function markAsInstalled(gameId) {
      if (!user.value) throw new Error('Not logged in');
      await setDoc(doc(db, 'games', gameId, 'installedBy', user.value.uid), {
        userId: user.value.uid,
        installedAt: serverTimestamp(),
      });
    }

    async function unmarkAsInstalled(gameId) {
      if (!user.value) throw new Error('Not logged in');
      // First, delete the user's vote
      await deleteDoc(doc(db, 'games', gameId, 'votes', user.value.uid));
      // Then, delete the installedBy entry
      await deleteDoc(doc(db, 'games', gameId, 'installedBy', user.value.uid));
    }
  const games = ref([]);
  const installedGameIds = ref([]);
  const { user, userProfile } = useAuth();
  let unsub = null;
  let votesUnsubs = {};
  let installedUnsubs = [];

  function cleanupInstalledUnsubs() {
    installedUnsubs.forEach(u => u && u());
    installedUnsubs = [];
  }

  function subscribe() {
    if (unsub) unsub();
    cleanupInstalledUnsubs();
    const q = query(collection(db, 'games'), orderBy('title', 'asc'));
    unsub = onSnapshot(q, (snap) => {
      games.value = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), votesCount: 0, votes: [], votesUsers: [], installedByUsers: [] }));
      games.value.forEach((g, idx) => {
        const votesCol = collection(db, 'games', g.id, 'votes');
        if (votesUnsubs[g.id]) votesUnsubs[g.id]();
        votesUnsubs[g.id] = onSnapshot(votesCol, async (vSnap) => {
          games.value[idx].votesCount = vSnap.size;
          games.value[idx].votes = vSnap.docs.map(v => v.id);
          // Fetch user profiles for votes
          if (vSnap.size) {
            const userIds = vSnap.docs.map(v => v.id);
            const usersSnap = await getDocs(collection(db, 'users'));
            const allUsers = [];
            usersSnap.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));
            games.value[idx].votesUsers = userIds.map(uid => allUsers.find(u => u.id === uid)).filter(Boolean);
          } else {
            games.value[idx].votesUsers = [];
          }
        });

        // Listen for installedBy users for each game
        const installedByCol = collection(db, 'games', g.id, 'installedBy');
        if (games.value[idx].installedByUnsub) games.value[idx].installedByUnsub();
        games.value[idx].installedByUnsub = onSnapshot(installedByCol, async (snap) => {
          const userIds = snap.docs.map(d => d.id);
          if (userIds.length) {
            // Fetch all users once
            const usersSnap = await getDocs(collection(db, 'users'));
            const allUsers = [];
            usersSnap.forEach(doc => allUsers.push({ id: doc.id, ...doc.data() }));
            // Only include users whose id is in userIds, and preserve order of userIds
            games.value[idx].installedByUsers = userIds.map(uid => allUsers.find(u => u.id === uid)).filter(Boolean);
          } else {
            games.value[idx].installedByUsers = [];
          }
        });
      });
      // Setup installedGameIds for current user
      cleanupInstalledUnsubs();
      if (!user.value) {
        installedGameIds.value = [];
        return;
      }
      games.value.forEach(g => {
        const colRef = collection(db, 'games', g.id, 'installedBy');
        const unsubInstalled = onSnapshot(colRef, (snap) => {
          const found = snap.docs.find(d => d.id === user.value.uid);
          if (found && !installedGameIds.value.includes(g.id)) {
            installedGameIds.value.push(g.id);
          } else if (!found && installedGameIds.value.includes(g.id)) {
            installedGameIds.value = installedGameIds.value.filter(id => id !== g.id);
          }
        });
        installedUnsubs.push(unsubInstalled);
      });
    });
  }

  async function addGame({ title, maxPlayers, platforms, subscriptionAvailability }) {
    if (!user.value) throw new Error('Not logged in');
    await addDoc(collection(db, 'games'), {
      title, maxPlayers, platforms, subscriptionAvailability,
      createdBy: user.value.uid, createdAt: serverTimestamp()
    });
  }

  async function deleteGame(gameId) {
    if (!userProfile.value?.isAdmin) throw new Error('Not admin');
    await deleteDoc(doc(db, 'games', gameId));
  }

  async function voteForGame(gameId) {
    if (!user.value) throw new Error('Not logged in');
    await setDoc(doc(db, 'games', gameId, 'votes', user.value.uid), {
      userId: user.value.uid, createdAt: serverTimestamp()
    });
  }

  async function removeVoteForGame(gameId) {
    if (!user.value) throw new Error('Not logged in');
    await deleteDoc(doc(db, 'games', gameId, 'votes', user.value.uid));
  }

  onUnmounted(() => {
    if (unsub) unsub();
    Object.values(votesUnsubs).forEach(u => u && u());
    cleanupInstalledUnsubs();
  });

  /**
   * Remove all votes from a specific user (admin only)
   * @param {string} userId
   */
  async function removeAllVotesFromUser(userId) {
    if (!userProfile.value?.isAdmin) throw new Error('Not admin');
    // For each game, delete the vote doc for this user
    const gamesSnap = await getDocs(collection(db, 'games'));
    for (const gameDoc of gamesSnap.docs) {
      const voteRef = doc(db, 'games', gameDoc.id, 'votes', userId);
      await deleteDoc(voteRef);
    }
  }

  /**
   * Remove all installed games for a specific user (admin only)
   * @param {string} userId
   */
  async function removeAllInstalledFromUser(userId) {
    if (!userProfile.value?.isAdmin) throw new Error('Not admin');
    // For each game, delete the installedBy doc for this user
    const gamesSnap = await getDocs(collection(db, 'games'));
    for (const gameDoc of gamesSnap.docs) {
      const installedRef = doc(db, 'games', gameDoc.id, 'installedBy', userId);
      await deleteDoc(installedRef);
    }
  }

  return {
    games,
    installedGameIds,
    subscribe,
    addGame,
    deleteGame,
    voteForGame,
    removeVoteForGame,
    markAsInstalled,
    unmarkAsInstalled,
    removeAllVotesFromUser,
    removeAllInstalledFromUser,
  };
}
