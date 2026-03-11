import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCtlWOVW5wJmt_Ui_xa1z4oo4zL8_Cfbgg",
  authDomain: "fjucuenca-a7495.firebaseapp.com",
  projectId: "fjucuenca-a7495",
  storageBucket: "fjucuenca-a7495.firebasestorage.app",
  messagingSenderId: "465426506902",
  appId: "1:465426506902:web:323eb4a0602eb016dd4eb7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
