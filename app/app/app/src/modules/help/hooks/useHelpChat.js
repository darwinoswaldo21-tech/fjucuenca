import { useEffect, useState, useCallback } from 'react';
import {
  collection, addDoc, query, orderBy,
  onSnapshot, serverTimestamp, doc, setDoc, getDoc, getDocs, where
} from 'firebase/firestore';
import { db } from '../../firebase';

async function getAvailableLeader(category) {
  const roleMap = {
    prayer: 'prayer_leader',
    counseling: 'counselor',
    leaders: 'leader',
  };

  const role = roleMap[category];
  if (!role) return null;

  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', role), where('available', '==', true))
  );

  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

export default function useHelpChat(userId, category) {
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [assignedLeader, setAssignedLeader] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !category) return;

    const initChat = async () => {
      const docRef = doc(db, 'helpChats', `${userId}_${category}`);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        const leader = await getAvailableLeader(category);
        await setDoc(docRef, {
          userId,
          leaderId: leader?.uid || null,
          category,
          status: 'active',
          createdAt: serverTimestamp(),
        });
        setAssignedLeader(leader);
      } else {
        setAssignedLeader({ uid: snap.data().leaderId });
      }

      setChatId(`${userId}_${category}`);
      setLoading(false);
    };

    initChat();
  }, [userId, category]);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, 'helpChats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [chatId]);

  const sendMessage = useCallback(
    async (text) => {
      if (!chatId || !text.trim()) return;
      await addDoc(collection(db, 'helpChats', chatId, 'messages'), {
        text: text.trim(),
        senderId: userId,
        createdAt: serverTimestamp(),
      });
    },
    [chatId, userId]
  );

  return { messages, sendMessage, assignedLeader, loading };
}