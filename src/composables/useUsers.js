// useUsers.js - Vue composable for admin user management
import { ref, onUnmounted } from 'vue';
import { db } from '../firebase';
import { collection, doc, getDoc, onSnapshot, orderBy, updateDoc, query, setDoc } from 'firebase/firestore';

export function useUsers() {
  const users = ref([]);
  let unsubscribeUsers = null;
  let unsubscribeAdminData = null;
  let usersMap = {};
  let adminDataMap = {};

  function mergeUsersAndAdminData() {
    // Merge users and adminData by id
    const merged = Object.values(usersMap).map(user => {
      const admin = adminDataMap[user.id] || {};
      return { ...user, ...admin };
    });
    users.value = merged;
  }

  function subscribe() {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    if (unsubscribeUsers) unsubscribeUsers();
    if (unsubscribeAdminData) unsubscribeAdminData();

    unsubscribeUsers = onSnapshot(q, (snap) => {
      usersMap = {};
      snap.docs.forEach(d => {
        usersMap[d.id] = { id: d.id, ...d.data() };
      });
      mergeUsersAndAdminData();
    });

    unsubscribeAdminData = onSnapshot(collection(db, 'adminData'), (snap) => {
      adminDataMap = {};
      snap.docs.forEach(d => {
        adminDataMap[d.id] = d.data();
      });
      mergeUsersAndAdminData();
    });
  }

  async function toggleApproved(id) {
    const adminSnap = await getDoc(doc(db, 'adminData', id));
    const adminData = adminSnap.exists() ? adminSnap.data() : {};
    await setDoc(doc(db, 'adminData', id), { approved: !adminData.approved }, { merge: true });
  }

  async function toggleAdmin(id) {
    const adminSnap = await getDoc(doc(db, 'adminData', id));
    const adminData = adminSnap.exists() ? adminSnap.data() : {};
    await setDoc(doc(db, 'adminData', id), { isAdmin: !adminData.isAdmin }, { merge: true });
  }

  onUnmounted(() => {
    if (unsubscribeUsers) unsubscribeUsers();
    if (unsubscribeAdminData) unsubscribeAdminData();
  });

  return {
    users,
    subscribe,
    toggleApproved,
    toggleAdmin,
  };
}
