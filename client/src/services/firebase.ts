import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyC-AkCdePjmwGKankel_VJmqhf5TylCcHw",
    authDomain: "sherkacademy-d88bd.firebaseapp.com",
    projectId: "sherkacademy-d88bd",
    storageBucket: "sherkacademy-d88bd.firebasestorage.app",
    messagingSenderId: "739295219450",
    appId: "1:739295219450:web:d5adc50e9403e83d154343",
    measurementId: "G-38TJ44YXKZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
