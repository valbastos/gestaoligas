const firebaseConfig = {
  apiKey: "AIzaSyBYThkPYS7Zcf640rruhyemahbPaS80nZs",
  authDomain: "asmara-gestao-de-ligas.firebaseapp.com",
  databaseURL: "https://asmara-gestao-de-ligas-default-rtdb.firebaseio.com",
  projectId: "asmara-gestao-de-ligas",
  storageBucket: "asmara-gestao-de-ligas.firebasestorage.app",
  messagingSenderId: "983408961566",
  appId: "1:983408961566:web:570c6d97699ccc8d5e660f",
  measurementId: "G-1PYZ3HKK49"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referências globais para serviços Firebase
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
