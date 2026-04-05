/**
 * PZ Academy - Admin Firebase Integration
 * Handles course CRUD operations for the admin panel.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAFkL2lyf8JNQsxlH795Uqg6TSXhSwJ8r4",
    authDomain: "pharmacozyme-academy.firebaseapp.com",
    projectId: "pharmacozyme-academy",
    storageBucket: "pharmacozyme-academy.firebasestorage.app",
    messagingSenderId: "894865466932",
    appId: "1:894865466932:web:5d05d17cd88eebfcbb0c61"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================= COURSE CRUD =================

export async function fetchAllCourses() {
    const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const courses = [];
    querySnapshot.forEach((docSnap) => {
        courses.push({ id: docSnap.id, ...docSnap.data() });
    });
    return courses;
}

export async function createCourse(courseData) {
    const newCourseRef = doc(collection(db, "courses"));
    const data = {
        title: courseData.title,
        description: courseData.description,
        published: courseData.published || false,
        category: courseData.category || 'core',
        studentsCount: 0,
        completionRate: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    await setDoc(newCourseRef, data);
    return { id: newCourseRef.id, ...data };
}

export async function updateCourse(id, updates) {
    const courseRef = doc(db, "courses", id);
    await updateDoc(courseRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function deleteCourse(id) {
    // Note: In a real prod app, you might want to soft delete or delete subcollections first.
    const courseRef = doc(db, "courses", id);
    await deleteDoc(courseRef);
}

// ================= MODULE CRUD =================
export async function fetchModules(courseId) {
    const q = query(collection(db, "courses", courseId, "modules"), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    const modules = [];
    snapshot.forEach(docSnap => {
        modules.push({ id: docSnap.id, ...docSnap.data(), lessons: [] });
    });
    
    // Also fetch lessons for each module
    for (let i = 0; i < modules.length; i++) {
        const lQ = query(collection(db, "courses", courseId, "modules", modules[i].id, "lessons"), orderBy("order", "asc"));
        const lSnap = await getDocs(lQ);
        const lessons = [];
        lSnap.forEach(lDoc => {
            lessons.push({ id: lDoc.id, ...lDoc.data() });
        });
        modules[i].lessons = lessons;
    }
    
    return modules;
}

export async function createModule(courseId, modData) {
    const newModRef = doc(collection(db, "courses", courseId, "modules"));
    const data = {
        title: modData.title,
        order: modData.order,
        createdAt: serverTimestamp()
    };
    await setDoc(newModRef, data);
    return { id: newModRef.id, ...data, lessons: [] };
}

export async function updateModule(courseId, moduleId, updates) {
    const modRef = doc(db, "courses", courseId, "modules", moduleId);
    await updateDoc(modRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function deleteModule(courseId, moduleId) {
    const modRef = doc(db, "courses", courseId, "modules", moduleId);
    await deleteDoc(modRef);
}

// ================= LESSON CRUD =================
export async function createLesson(courseId, moduleId, lessonData) {
    const newLessonRef = doc(collection(db, "courses", courseId, "modules", moduleId, "lessons"));
    const data = {
        title: lessonData.title,
        videoUrl: lessonData.videoUrl,
        duration: lessonData.duration,
        order: lessonData.order,
        createdAt: serverTimestamp()
    };
    await setDoc(newLessonRef, data);
    return { id: newLessonRef.id, ...data };
}

export async function updateLesson(courseId, moduleId, lessonId, updates) {
    const lRef = doc(db, "courses", courseId, "modules", moduleId, "lessons", lessonId);
    await updateDoc(lRef, {
        ...updates,
        updatedAt: serverTimestamp()
    });
}

export async function deleteLesson(courseId, moduleId, lessonId) {
    const lRef = doc(db, "courses", courseId, "modules", moduleId, "lessons", lessonId);
    await deleteDoc(lRef);
}
