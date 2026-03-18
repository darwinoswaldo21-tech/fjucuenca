import { onDisconnect, ref, serverTimestamp, set } from 'firebase/database';
import { rtdb } from './firebase';

export async function setPresenceOnline(uid) {
  if (!rtdb || !uid) return;
  const statusRef = ref(rtdb, `/status/${uid}`);

  // Mark offline if the tab/app closes unexpectedly.
  await onDisconnect(statusRef).set({
    state: 'offline',
    last_changed: serverTimestamp(),
  });

  await set(statusRef, {
    state: 'online',
    last_changed: serverTimestamp(),
  });
}

export async function setPresenceOffline(uid) {
  if (!rtdb || !uid) return;
  const statusRef = ref(rtdb, `/status/${uid}`);
  await set(statusRef, {
    state: 'offline',
    last_changed: serverTimestamp(),
  });
}

