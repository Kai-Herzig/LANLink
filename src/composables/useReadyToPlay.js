// useReadyToPlay.js - composable for ready to play status
import { ref, computed, watchEffect } from 'vue';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAuth } from './useAuth';

export function useReadyToPlay() {
  // Dummy ref to trigger reactivity every second
  const nowTick = ref(Date.now());
  setInterval(() => {
    nowTick.value = Date.now();
  }, 1000);
  const { user } = useAuth();
  const readyToPlayAt = ref(null);
  let unsubscribe = null;
  const showReadyTooOld = ref(false);

  const isOlderThanOneHour = computed(() => {
    // Depend on nowTick so this recomputes every second
    nowTick.value;
    if (!readyToPlayAt.value) return false;
    let readyTime;
    if (typeof readyToPlayAt.value.toMillis === 'function') {
      readyTime = readyToPlayAt.value.toMillis();
    } else if (typeof readyToPlayAt.value === 'object' && typeof readyToPlayAt.value.seconds === 'number') {
      // Firestore Timestamp-like object
      readyTime = readyToPlayAt.value.seconds * 1000 + Math.floor((readyToPlayAt.value.nanoseconds || 0) / 1e6);
    } else if (typeof readyToPlayAt.value === 'number') {
      readyTime = readyToPlayAt.value;
    } else if (typeof readyToPlayAt.value === 'string') {
      readyTime = Date.parse(readyToPlayAt.value);
    } else {
      return false;
    }
    return nowTick.value - readyTime > 3600000; // 1 hour
  });

  watchEffect(() => {
    if (user.value?.uid) {
      const userDoc = doc(db, 'users', user.value.uid);
      unsubscribe = onSnapshot(userDoc, (snap) => {
        readyToPlayAt.value = snap.data()?.readyToPlayAt || null;
      });
    } else {
      readyToPlayAt.value = null;
      if (unsubscribe) unsubscribe();
    }
  });

  watchEffect(() => {
    showReadyTooOld.value = isOlderThanOneHour.value;
  });

  async function setReadyToPlay(isReady) {
    if (!user.value?.uid) return;
    const userDoc = doc(db, 'users', user.value.uid);
    await setDoc(userDoc, {
      readyToPlayAt: isReady ? serverTimestamp() : null
    }, { merge: true });
    // Hide popup after user action
    showReadyTooOld.value = false;
  }

  return {
    readyToPlayAt,
    setReadyToPlay,
    isOlderThanOneHour,
    showReadyTooOld
  };
}
