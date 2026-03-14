import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../../../firebase";

export default function useHelpChat() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "help_chat"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      setMessages(msgs);
    });

    return () => unsubscribe();
  }, []);

  const sendMessage = async (text, user = "Anon") => {
    if (!text.trim()) return;

    await addDoc(collection(db, "help_chat"), {
      text,
      user,
      createdAt: serverTimestamp()
    });
  };

  return {
    messages,
    sendMessage
  };
}