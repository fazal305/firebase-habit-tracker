const firebaseConfig = {
  apiKey: "AIzaSyBfSVefPw2DmhqywbwT_ZGpGzf-7KvqE8Q",
  authDomain: "fir-habit-tracker-610d9.firebaseapp.com",
  projectId: "fir-habit-tracker-610d9",
  storageBucket: "fir-habit-tracker-610d9.firebasestorage.app",
  messagingSenderId: "405029531980",
  appId: "1:405029531980:web:e017bdf7564e3b18ed1fe9",
  measurementId: "G-61D1Z040J5"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

/* Converts Firebase auth errors into simple user-friendly messages. */
function getErrorMessage(errorCode) {
    const errorMessages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/operation-not-allowed": "Email/password login is not enabled in Firebase.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/configuration-not-found": "Firebase Authentication is not enabled for this project.",
        "auth/api-key-not-valid": "Firebase API key is not valid. Check your Firebase config."
    };

    return errorMessages[errorCode] || `Firebase error: ${errorCode}`;
}

/* Creates a new Firebase user account with email and password. */
async function signUp(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        return {
            success: true,
            user: userCredential.user
        };
    } catch (error) {
        return {
            success: false,
            message: getErrorMessage(error.code)
        };
    }
}

/* Signs in an existing Firebase user with email and password. */
async function signIn(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return {
            success: true,
            user: userCredential.user
        };
    } catch (error) {
        return {
            success: false,
            message: getErrorMessage(error.code)
        };
    }
}

/* Signs out the current Firebase user. */
async function signOutUser() {
    try {
        await auth.signOut();

        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            message: getErrorMessage(error.code)
        };
    }
}

/* Watches Firebase login state and runs a callback when the user changes. */
function watchAuthState(callback) {
    auth.onAuthStateChanged(function(user) {
        callback(user);
    });
}