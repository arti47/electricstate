// Cloud sync is optional. With FIREBASE_ENABLED false the app runs entirely on localStorage.
// Drop your own project's values in and flip the flag. Never commit real keys.
export const FIREBASE_ENABLED = false;

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};
