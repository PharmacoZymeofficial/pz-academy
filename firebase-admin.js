/**
 * PZ Academy - Admin Firebase Integration
 * Handles course CRUD operations for the admin panel.
 */

// =============== MOCK LOCAL STORAGE DATABASE ===============
const DB_KEY = 'mockPzAcademyCourses';

function getMockDB() {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
}

function saveMockDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Generate random mock ID
const genId = () => Math.random().toString(36).substr(2, 9);

export async function fetchAllCourses() {
    return getMockDB().sort((a,b) => b.createdAt - a.createdAt);
}

export async function createCourse(courseData) {
    const db = getMockDB();
    const newCourse = {
        id: genId(),
        title: courseData.title,
        description: courseData.description,
        published: courseData.published || false,
        category: courseData.category || 'core',
        studentsCount: 0,
        completionRate: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        modules: []
    };
    db.push(newCourse);
    saveMockDB(db);
    return newCourse;
}

export async function updateCourse(id, updates) {
    const db = getMockDB();
    const idx = db.findIndex(c => c.id === id);
    if (idx > -1) {
        db[idx] = { ...db[idx], ...updates, updatedAt: Date.now() };
        saveMockDB(db);
    }
}

export async function deleteCourse(id) {
    const db = getMockDB();
    const newDb = db.filter(c => c.id !== id);
    saveMockDB(newDb);
}

export async function fetchModules(courseId) {
    const db = getMockDB();
    const course = db.find(c => c.id === courseId);
    return course && course.modules ? course.modules : [];
}

export async function createModule(courseId, modData) {
    const db = getMockDB();
    const course = db.find(c => c.id === courseId);
    if (course) {
        if (!course.modules) course.modules = [];
        const newMod = {
            id: genId(),
            title: modData.title,
            order: modData.order,
            createdAt: Date.now(),
            lessons: []
        };
        course.modules.push(newMod);
        saveMockDB(db);
        return newMod;
    }
    throw new Error("Course not found");
}

export async function updateModule(courseId, moduleId, updates) {
    const db = getMockDB();
    const course = db.find(c => c.id === courseId);
    if (course && course.modules) {
        const modIdx = course.modules.findIndex(m => m.id === moduleId);
        if(modIdx > -1) {
            course.modules[modIdx] = { ...course.modules[modIdx], ...updates };
            saveMockDB(db);
        }
    }
}

export async function deleteModule(courseId, moduleId) {
    const db = getMockDB();
    const course = db.find(c => c.id === courseId);
    if (course && course.modules) {
        course.modules = course.modules.filter(m => m.id !== moduleId);
        saveMockDB(db);
    }
}

export async function createLesson(courseId, moduleId, lessonData) {
    const db = getMockDB();
    const course = db.find(c => c.id === courseId);
    if (course && course.modules) {
        const mod = course.modules.find(m => m.id === moduleId);
        if (mod) {
            if (!mod.lessons) mod.lessons = [];
            const newLesson = {
                id: genId(),
                title: lessonData.title,
                videoUrl: lessonData.videoUrl,
                duration: lessonData.duration,
                order: lessonData.order,
                createdAt: Date.now()
            };
            mod.lessons.push(newLesson);
            saveMockDB(db);
            return newLesson;
        }
    }
    throw new Error("Module not found");
}

export async function updateLesson(courseId, moduleId, lessonId, updates) {
    const db = getMockDB();
    const course = db.find(c => c.id === courseId);
    if (course && course.modules) {
        const mod = course.modules.find(m => m.id === moduleId);
        if(mod && mod.lessons) {
            const lIdx = mod.lessons.findIndex(l => l.id === lessonId);
            if (lIdx > -1) {
                mod.lessons[lIdx] = { ...mod.lessons[lIdx], ...updates };
                saveMockDB(db);
            }
        }
    }
}

export async function deleteLesson(courseId, moduleId, lessonId) {
    const db = getMockDB();
    const course = db.find(c => c.id === courseId);
    if (course && course.modules) {
        const mod = course.modules.find(m => m.id === moduleId);
        if (mod && mod.lessons) {
            mod.lessons = mod.lessons.filter(l => l.id !== lessonId);
            saveMockDB(db);
        }
    }
}
