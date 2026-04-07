/**
 * PZ Academy - Course Access Firebase Integration
 * 
 * Handles:
 * - User authentication
 * - Course progress tracking
 * - Quiz attempts and scoring
 * - Resource download tracking
 * - Certificate management
 */

// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    increment,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAFkL2lyf8JNQsxlH795Uqg6TSXhSwJ8r4",
    authDomain: "pharmacozyme-academy.firebaseapp.com",
    projectId: "pharmacozyme-academy",
    storageBucket: "pharmacozyme-academy.firebasestorage.app",
    messagingSenderId: "894865466932",
    appId: "1:894865466932:web:5d05d17cd88eebfcbb0c61"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==================== USER AUTH ====================

/**
 * Get current user ID
 */
function getCurrentUserId() {
    // This would come from Firebase Auth
    // For now, return a demo user ID
    return localStorage.getItem('pz_user_id') || 'demo_user';
}

/**
 * Set current user ID (after login)
 */
function setCurrentUserId(userId) {
    localStorage.setItem('pz_user_id', userId);
}

// ==================== COURSE PROGRESS ====================

/**
 * Get user's course progress from Firestore
 */
async function getCourseProgress(courseId) {
    const userId = getCurrentUserId();
    const progressRef = doc(db, 'progress', `${userId}_${courseId}`);
    
    try {
        const docSnap = await getDoc(progressRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return {
            completedLessons: [],
            downloadedResources: [],
            quizAttempts: 0,
            quizBestScore: null,
            certificateEarned: false
        };
    } catch (error) {
        console.error('Error getting progress:', error);
        return null;
    }
}

/**
 * Mark a lesson as complete
 */
async function markLessonComplete(courseId, lessonId) {
    const userId = getCurrentUserId();
    const progressRef = doc(db, 'progress', `${userId}_${courseId}`);
    
    try {
        await updateDoc(progressRef, {
            completedLessons: arrayUnion(lessonId),
            lastUpdated: serverTimestamp()
        });
        
        // Update local state
        if (window.courseData) {
            if (!window.courseData.completedLessons) {
                window.courseData.completedLessons = [];
            }
            window.courseData.completedLessons.push(lessonId);
        }
        
        return true;
    } catch (error) {
        console.error('Error marking lesson complete:', error);
        return false;
    }
}

/**
 * Update course progress percentage
 */
async function updateProgressPercentage(courseId, percentage) {
    const userId = getCurrentUserId();
    const progressRef = doc(db, 'progress', `${userId}_${courseId}`);
    
    try {
        await updateDoc(progressRef, {
            progressPercentage: percentage,
            lastUpdated: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error updating progress:', error);
        return false;
    }
}

// ==================== QUIZ MANAGEMENT ====================

/**
 * Get quiz attempt data
 */
async function getQuizAttempts(courseId, quizId) {
    const userId = getCurrentUserId();
    const attemptsRef = doc(db, 'quizAttempts', `${userId}_${courseId}`);
    
    try {
        const docSnap = await getDoc(attemptsRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return {
            attempts: [],
            bestScore: null,
            attemptsUsed: 0
        };
    } catch (error) {
        console.error('Error getting quiz attempts:', error);
        return null;
    }
}

/**
 * Save quiz attempt
 */
async function saveQuizAttempt(courseId, quizId, attemptData) {
    const userId = getCurrentUserId();
    const attemptsRef = doc(db, 'quizAttempts', `${userId}_${courseId}`);
    
    const attemptRecord = {
        attemptNumber: attemptData.attemptNumber,
        score: attemptData.score,
        percentage: attemptData.percentage,
        passed: attemptData.passed,
        answers: attemptData.answers,
        completedAt: new Date().toISOString()
    };
    
    try {
        const existingData = await getQuizAttempts(courseId, quizId);
        
        await setDoc(attemptsRef, {
            userId: userId,
            courseId: courseId,
            quizId: quizId,
            attempts: [...(existingData?.attempts || []), attemptRecord],
            bestScore: Math.max(existingData?.bestScore || 0, attemptData.percentage),
            attemptsUsed: (existingData?.attemptsUsed || 0) + 1,
            lastAttempt: serverTimestamp()
        }, { merge: true });
        
        return true;
    } catch (error) {
        console.error('Error saving quiz attempt:', error);
        return false;
    }
}

// ==================== RESOURCE TRACKING ====================

/**
 * Track resource download
 */
async function trackResourceDownload(courseId, resourceId, filename) {
    const userId = getCurrentUserId();
    const progressRef = doc(db, 'progress', `${userId}_${courseId}`);
    
    try {
        await updateDoc(progressRef, {
            downloadedResources: arrayUnion({
                resourceId: resourceId,
                filename: filename,
                downloadedAt: new Date().toISOString()
            })
        });
        
        return true;
    } catch (error) {
        console.error('Error tracking download:', error);
        return false;
    }
}

/**
 * Get downloaded resources list
 */
async function getDownloadedResources(courseId) {
    const progress = await getCourseProgress(courseId);
    return progress?.downloadedResources || [];
}

// ==================== CERTIFICATE ====================

/**
 * Check if user has earned certificate
 */
async function checkCertificateEligibility(courseId) {
    const progress = await getCourseProgress(courseId);
    const quizData = await getQuizAttempts(courseId, `${courseId}_quiz`);
    
    // Check if all lessons completed and quiz passed
    const allLessonsComplete = progress?.completedLessons?.length >= 12; // Example: 12 lessons
    const quizPassed = quizData?.bestScore >= 60; // 60% passing
    
    return {
        eligible: allLessonsComplete && quizPassed,
        lessonsComplete: progress?.completedLessons?.length || 0,
        quizBestScore: quizData?.bestScore || null,
        requirements: {
            allLessonsComplete,
            quizPassed
        }
    };
}

/**
 * Mark certificate as earned
 */
async function markCertificateEarned(courseId, certificateUrl) {
    const userId = getCurrentUserId();
    const progressRef = doc(db, 'progress', `${userId}_${courseId}`);
    
    try {
        await updateDoc(progressRef, {
            certificateEarned: true,
            certificateUrl: certificateUrl,
            certificateEarnedAt: serverTimestamp()
        });
        return true;
    } catch (error) {
        console.error('Error marking certificate:', error);
        return false;
    }
}

/**
 * Generate certificate (placeholder - would integrate with PDF generation service)
 */
async function generateCertificate(courseId, userData) {
    const eligibility = await checkCertificateEligibility(courseId);
    
    if (!eligibility.eligible) {
        return { success: false, message: 'Not eligible for certificate yet' };
    }
    
    // Generate certificate PDF (placeholder implementation)
    const certificateData = {
        userId: getCurrentUserId(),
        userName: userData.displayName || userData.email,
        courseId: courseId,
        courseName: userData.courseName,
        completionDate: new Date().toISOString(),
        quizScore: eligibility.quizBestScore
    };
    
    // In production, this would call a PDF generation service
    // For now, return success
    await markCertificateEarned(courseId, `certificates/${getCurrentUserId()}_${courseId}.pdf`);
    
    return {
        success: true,
        certificateData: certificateData,
        downloadUrl: `certificates/${getCurrentUserId()}_${courseId}.pdf`
    };
}

// ==================== INITIALIZE COURSE DATA ====================

/**
 * Load course data for student
 */
async function loadCourseData(courseId) {
    const userId = getCurrentUserId();
    
    try {
        // Get course info
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);
        
        // Get user progress
        const progress = await getCourseProgress(courseId);
        
        // Get quiz data
        const quizData = await getQuizAttempts(courseId, `${courseId}_quiz`);
        
        return {
            course: courseSnap.data(),
            progress: progress,
            quiz: quizData
        };
    } catch (error) {
        console.error('Error loading course data:', error);
        return null;
    }
}

/**
 * Initialize course access page with user's data
 */
async function initializeCourseAccess(courseId) {
    const data = await loadCourseData(courseId);
    
    if (data) {
        // Update global course data
        window.courseData = {
            id: courseId,
            ...data.course,
            progress: data.progress?.progressPercentage || 0,
            completedLessons: data.progress?.completedLessons || [],
            downloadedResources: data.progress?.downloadedResources || [],
            quizAttemptsUsed: data.quiz?.attemptsUsed || 0,
            quizBestScore: data.quiz?.bestScore || null,
            certificateEarned: data.progress?.certificateEarned || false
        };
        
        return window.courseData;
    }
    
    return null;
}

// ==================== EXPORTS ====================

export {
    getCurrentUserId,
    setCurrentUserId,
    getCourseProgress,
    markLessonComplete,
    updateProgressPercentage,
    getQuizAttempts,
    saveQuizAttempt,
    trackResourceDownload,
    getDownloadedResources,
    checkCertificateEligibility,
    generateCertificate,
    loadCourseData,
    initializeCourseAccess
};
