// useAuth.js - Vue composable for authentication and user state
import { ref, onUnmounted } from 'vue';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const user = ref(null);
const userProfile = ref(null);

let unsubscribe = null;

export function useAuth() {
  // Listen to auth state
  if (!unsubscribe) {
    unsubscribe = onAuthStateChanged(auth, async (u) => {
      user.value = u;
      if (u) {
        const userSnap = await getDoc(doc(db, 'users', u.uid));
        const userData = userSnap.exists() ? userSnap.data() : null;
        let adminData = {};
        try {
          const adminSnap = await getDoc(doc(db, 'adminData', u.uid));
          if (adminSnap.exists()) {
            adminData = adminSnap.data();
          }
        } catch (e) {
          // ignore if adminData does not exist
        }
        userProfile.value = userData ? { ...userData, ...adminData } : null;
      } else {
        userProfile.value = null;
      }
    });
  }
  onUnmounted(() => unsubscribe && unsubscribe());

  // Auth actions
  async function login(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  }
  async function register(email, password, displayName) {
    try {
      // Check for duplicate display name
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('displayName', '==', displayName));
      const querySnapshot = await getDocs(q);
      if (!displayName || querySnapshot.size > 0) {
        throw new Error('Display Name is already taken.');
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: displayName || email.split('@')[0],
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      if (e && e.code === 'permission-denied') {
        throw new Error('You do not have permission to register.');
      }
      if (e && (e.message?.includes('insufficient permissions') || e.message?.includes('Missing or insufficient permissions'))) {
        throw new Error('Display Name is already taken.');
      }
      throw e;
    }
  }
  async function logout() {
    await signOut(auth);
  }

  return {
    user,
    userProfile,
    login,
    register,
    logout,
  };
}
