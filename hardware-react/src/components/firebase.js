import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA-QzVsgwpsfb07tsbLBk_zhUXxgyDiHjk",
  authDomain: "mac-firebase-33bec.firebaseapp.com",
  projectId: "mac-firebase-33bec",
  storageBucket: "mac-firebase-33bec.firebasestorage.app",
  messagingSenderId: "655884351966",
  appId: "1:655884351966:web:5f8f17aa91fb503645854f",
  measurementId: "G-GNY274FF58"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();


export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
