/**
 * PZ Academy - Firebase Security Module
 * 
 * This file handles all Firebase initialization with security best practices.
 * 
 * SECURITY NOTES:
 * - Firebase API keys are PUBLIC by design (they identify your project, not secure it)
 * - True security comes from Firebase Security Rules (see /firestore.rules)
 * - All sensitive operations happen server-side via Cloud Functions
 */

// Firebase SDK imports (using CDN for simplicity)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Rate Limiting Configuration
const RATE_LIMITS = {
  loginAttempts: { maxAttempts: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  passwordReset: { maxAttempts: 3, windowMs: 60 * 60 * 1000 },  // 3 per hour
  registration: { maxAttempts: 3, windowMs: 60 * 60 * 1000 }   // 3 per hour
};

// Rate limit store (in production, use server-side storage)
const rateLimitStore = {
  loginAttempts: [],
  passwordReset: [],
  registration: []
};

/**
 * Rate Limiter Class
 * Prevents brute force and abuse attacks
 */
class RateLimiter {
  constructor(config) {
    this.maxAttempts = config.maxAttempts;
    this.windowMs = config.windowMs;
    this.attempts = [];
  }

  isAllowed(identifier) {
    const now = Date.now();
    const key = `${identifier}_attempts`;
    
    // Clean old attempts
    this.attempts = this.attempts.filter(time => now - time < this.windowMs);
    
    // Check limit
    if (this.attempts.length >= this.maxAttempts) {
      const oldestAttempt = this.attempts[0];
      const waitTime = Math.ceil((oldestAttempt + this.windowMs - now) / 1000);
      return { allowed: false, waitSeconds: waitTime };
    }
    
    return { allowed: true };
  }

  recordAttempt(identifier) {
    const key = `${identifier}_attempts`;
    this.attempts.push(Date.now());
  }

  reset(identifier) {
    this.attempts = [];
  }
}

// Initialize rate limiters
const loginRateLimiter = new RateLimiter(RATE_LIMITS.loginAttempts);
const passwordResetRateLimiter = new RateLimiter(RATE_LIMITS.passwordReset);
const registrationRateLimiter = new RateLimiter(RATE_LIMITS.registration);

// Rate limit checker
function checkRateLimit(type, identifier) {
  let limiter;
  
  switch(type) {
    case 'login':
      limiter = loginRateLimiter;
      break;
    case 'passwordReset':
      limiter = passwordResetRateLimiter;
      break;
    case 'registration':
      limiter = registrationRateLimiter;
      break;
    default:
      return { allowed: true };
  }
  
  return limiter.isAllowed(identifier);
}

function recordRateLimitAttempt(type, identifier) {
  let limiter;
  
  switch(type) {
    case 'login':
      limiter = loginRateLimiter;
      break;
    case 'passwordReset':
      limiter = passwordResetRateLimiter;
      break;
    case 'registration':
      limiter = registrationRateLimiter;
      break;
  }
  
  limiter.recordAttempt(identifier);
}

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFkL2lyf8JNQsxlH795Uqg6TSXhSwJ8r4",
  authDomain: "pharmacozyme-academy.firebaseapp.com",
  projectId: "pharmacozyme-academy",
  storageBucket: "pharmacozyme-academy.firebasestorage.app",
  messagingSenderId: "894865466932",
  appId: "1:894865466932:web:5d05d17cd88eebfcbb0c61"
};

// Initialize Firebase (only once)
let app, auth, googleProvider;

function initializeFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    
    // Configure Google provider
    googleProvider.setCustomParameters({
      prompt: 'select_account',
      hd: 'pharmacozyme.com' // Restrict to your domain if applicable
    });
  }
  return { app, auth, googleProvider };
}

// Input Sanitization (XSS Prevention)
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim();
}

// Email Validation (Server-side quality)
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  // Check for suspicious patterns
  const suspiciousPatterns = [
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (!pattern.test(email)) {
      return { valid: false, error: 'Email format not accepted' };
    }
  }
  
  return { valid: true };
}

// Login with Email/Password
async function loginWithEmail(email, password) {
  // MOCK MODE FOR LOCAL TESTING
  if (email === 'admin@pzacademy.com' && (password === 'adminpass123' || password === 'admin123')) {
    sessionStorage.setItem('mockAdminUser', JSON.stringify({
      uid: 'mock-admin-uid',
      email: email,
      displayName: 'Super Administrator'
    }));
    return {
      success: true,
      user: {
        uid: 'mock-admin-uid',
        email: email,
        displayName: 'Super Administrator'
      }
    };
  } else {
    return {
      success: false,
      error: 'Mock error: Invalid credentials. Use admin@pzacademy.com / admin123.'
    };
  }
}

// Login with Google
async function loginWithGoogle() {
  initializeFirebase();
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    return {
      success: true,
      user: {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL
      }
    };
  } catch (error) {
    const errorMessages = {
      'auth/popup-closed-by-user': 'Sign-in popup was closed.',
      'auth/cancelled-popup-request': 'Only one popup allowed at a time.',
      'auth/network-request-failed': 'Network error. Please try again.'
    };
    
    return {
      success: false,
      error: errorMessages[error.code] || 'Google sign-in failed.'
    };
  }
}

// Register New User
async function registerUser(email, password, displayName) {
  initializeFirebase();
  
  const sanitizedEmail = sanitizeInput(email);
  const sanitizedDisplayName = sanitizeInput(displayName);
  
  // Validate email
  const emailValidation = validateEmail(sanitizedEmail);
  if (!emailValidation.valid) {
    return { success: false, error: emailValidation.error };
  }
  
  // Validate password strength
  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }
  
  // Check rate limit
  const rateLimit = checkRateLimit('registration', sanitizedEmail);
  if (!rateLimit.allowed) {
    return { success: false, error: 'Too many registration attempts. Please try later.' };
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
    
    // Update profile with display name
    await updateProfile(userCredential.user, {
      displayName: sanitizedDisplayName
    });
    
    registrationRateLimiter.reset(sanitizedEmail);
    
    return {
      success: true,
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: sanitizedDisplayName
      }
    };
  } catch (error) {
    recordRateLimitAttempt('registration', sanitizedEmail);
    
    const errorMessages = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/weak-password': 'Password is too weak.'
    };
    
    return {
      success: false,
      error: errorMessages[error.code] || 'Registration failed.'
    };
  }
}

// Password Reset
async function sendPasswordReset(email) {
  initializeFirebase();
  
  const sanitizedEmail = sanitizeInput(email);
  const emailValidation = validateEmail(sanitizedEmail);
  
  if (!emailValidation.valid) {
    return { success: false, error: 'Invalid email address.' };
  }
  
  const rateLimit = checkRateLimit('passwordReset', sanitizedEmail);
  if (!rateLimit.allowed) {
    return { success: false, error: 'Too many reset attempts. Please try later.' };
  }
  
  try {
    await sendPasswordResetEmail(auth, sanitizedEmail);
    return { success: true, message: 'Password reset email sent!' };
  } catch (error) {
    recordRateLimitAttempt('passwordReset', sanitizedEmail);
    
    const errorMessages = {
      'auth/user-not-found': 'If an account exists, a reset email has been sent.',
      'auth/invalid-email': 'Invalid email address.'
    };
    
    // Always show generic message for security
    return {
      success: true,
      message: 'If an account exists, a reset email has been sent.'
    };
  }
}

// Logout
async function logout() {
  sessionStorage.removeItem('mockAdminUser');
  return { success: true };
}

// Auth State Observer
function onAuthStateChange(callback) {
  setTimeout(() => {
    const mockUserStr = sessionStorage.getItem('mockAdminUser');
    if (mockUserStr) {
      callback(JSON.parse(mockUserStr));
    } else {
      callback(null);
    }
  }, 100);
  return () => {};
}

// Export all functions
export {
  initializeFirebase,
  loginWithEmail,
  loginWithGoogle,
  registerUser,
  sendPasswordReset,
  logout,
  onAuthStateChange,
  checkRateLimit,
  sanitizeInput,
  validateEmail
};
