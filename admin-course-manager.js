import { checkAdminSession, renderSidebar } from './admin-layout.js';
import { 
    fetchAllCourses, createCourse, updateCourse, deleteCourse,
    fetchModules, createModule, updateModule, deleteModule,
    createLesson, updateLesson, deleteLesson 
} from './firebase-admin.js';

let courses = [];
let editingCourseId = null;
let editingModuleId = null;
let editingLessonId = null;

// Initialize
async function init() {
    checkAdminSession();
    renderSidebar('courses');
    
    // Attach event listeners to window so HTML inline handlers still work
    window.switchTab = switchTab;
    window.openCourseModal = openCourseModal;
    window.closeCourseModal = closeCourseModal;
    window.saveCourse = saveCourse;
    window.editCourse = editCourse;
    window.toggleCourseStatus = toggleCourseStatus;
    window.viewCourseModules = viewCourseModules;
    window.deleteCourseRecord = deleteCourseRecord;
    
    window.openModuleModal = openModuleModal;
    window.closeModuleModal = closeModuleModal;
    window.saveModule = saveModule;
    window.loadModules = loadModules;
    window.deleteModuleRecord = deleteModuleRecord;

    window.openLessonModal = openLessonModal;
    window.closeLessonModal = closeLessonModal;
    window.saveLesson = saveLesson;
    window.updateLessonModules = updateLessonModules;
    window.loadLessons = loadLessons;
    window.deleteLessonRecord = deleteLessonRecord;

    await loadCourses();
}

async function loadCourses() {
    courses = await fetchAllCourses();
    renderCourses();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    const icon = document.getElementById('toastIcon');
    icon.textContent = type === 'success' ? 'check_circle' : 'error';
    icon.className = `material-symbols-outlined text-lg ${type === 'success' ? 'text-emerald-400' : 'text-red-400'}`;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');
    setTimeout(() => { toast.classList.add('opacity-0', 'pointer-events-none'); }, 3000);
}

// ---------------- TAB LOGIC ----------------
function switchTab(tab) {
    ['courses', 'modules', 'lessons'].forEach(t => {
        const content = document.getElementById(`content-${t}`);
        if(content) content.classList.toggle('hidden', t !== tab);
        const btn = document.getElementById(`tab-${t}`);
        if(btn) {
            if (t === tab) { 
                btn.classList.add('active', 'text-primary', 'border-primary', 'font-bold'); 
                btn.classList.remove('text-on-surface-variant', 'font-medium'); 
            } else { 
                btn.classList.remove('active', 'text-primary', 'border-primary', 'font-bold'); 
                btn.classList.add('text-on-surface-variant', 'font-medium'); 
            }
        }
    });

    if(tab === 'modules' || tab === 'lessons') {
        populateCourseSelects();
    }
}

function populateCourseSelects() {
    const modSelect = document.getElementById('moduleCourseSelect');
    const lessSelect = document.getElementById('lessonCourseSelect');
    
    let options = '<option value="">Choose a course...</option>';
    courses.forEach(c => {
        options += `<option value="${c.id}">${c.title}</option>`;
    });

    if(modSelect && modSelect.innerHTML !== options) modSelect.innerHTML = options;
    if(lessSelect && lessSelect.innerHTML !== options) lessSelect.innerHTML = options;
}

// ---------------- COURSES ----------------
function renderCourses() {
    const container = document.getElementById('content-courses');
    // We expect header info to stay, we generate list
    // Wait, the HTML has static elements at the top. We will inject into a list container, but wait! The HTML doesn't have an empty div inside `content-courses`.
    // Let's create a dynamic render. To simplify, we will find all `.bg-surface-container-lowest` divs inside `#content-courses` except the header and remove them, then append dynamically.
    
    let listContainer = document.getElementById('courses-list-container');
    if(!listContainer) {
        listContainer = document.createElement('div');
        listContainer.id = 'courses-list-container';
        listContainer.className = 'space-y-6';
        
        // Hide existing static cards
        const existingCards = container.querySelectorAll('.bg-surface-container-lowest.animate-fadeIn');
        existingCards.forEach(c => c.style.display = 'none');

        container.appendChild(listContainer);
    }

    if (courses.length === 0) {
        listContainer.innerHTML = `<div class="p-8 text-center text-on-surface-variant bg-surface-container rounded-xl">No courses found. Create one.</div>`;
        return;
    }

    listContainer.innerHTML = courses.map(c => `
        <div class="bg-surface-container-lowest rounded-xl clinical-shadow border border-outline-variant/10 overflow-hidden animate-fadeIn ${!c.published ? 'opacity-75' : ''}">
            <div class="flex flex-col md:flex-row">
                <div class="w-full md:w-64 h-40 md:h-auto relative overflow-hidden flex items-center justify-center flex-shrink-0 ${c.published ? 'bg-gradient-to-br from-emerald-600 to-emerald-900' : 'bg-surface-container'}">
                    <span class="material-symbols-outlined ${c.published ? 'text-white/40' : 'text-outline'} text-5xl">folder_special</span>
                </div>
                <div class="flex-1 p-4 md:p-8 flex flex-col justify-between">
                    <div>
                        <div class="flex items-start justify-between mb-2">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${c.published ? 'bg-secondary-container/20 text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'} tracking-widest uppercase">${c.published ? 'Published' : 'Draft'}</span>
                            <span class="text-2xl font-black ${c.published ? 'text-primary' : 'text-on-surface-variant opacity-30'} hidden md:block">${c.completionRate || 0}%</span>
                        </div>
                        <h4 class="text-lg font-headline font-bold text-on-surface mb-1">${c.title}</h4>
                        <p class="text-sm text-on-surface-variant leading-relaxed mb-4">${c.description || 'No description provided.'}</p>
                    </div>
                    <div class="flex items-center justify-between mt-4 pt-4 border-t border-surface-container-high">
                        <div class="flex items-center gap-1">
                            <button onclick="editCourse('${c.id}')" class="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-md transition-all active:scale-95">Edit</button>
                            <button onclick="viewCourseModules('${c.id}')" class="px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-md transition-all active:scale-95">Modules</button>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="toggleCourseStatus('${c.id}', ${c.published})" class="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">${c.published ? 'visibility' : 'visibility_off'}</span></button>
                            <button onclick="deleteCourseRecord('${c.id}')" class="p-1.5 text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-lg">delete</span></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function openCourseModal(id = null) {
    editingCourseId = id;
    document.getElementById('courseModalTitle').textContent = id ? 'Edit Course' : 'New Course';
    
    if (id) {
        const c = courses.find(x => x.id === id);
        if(c) {
            document.getElementById('courseTitle').value = c.title || '';
            document.getElementById('courseDescription').value = c.description || '';
            document.getElementById('coursePublished').checked = c.published || false;
            document.getElementById('courseCategory').value = c.category || 'core';
        }
    } else {
        document.getElementById('courseTitle').value = '';
        document.getElementById('courseDescription').value = '';
        document.getElementById('coursePublished').checked = false;
        document.getElementById('courseCategory').value = 'core';
    }
    
    const modal = document.getElementById('courseModal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeCourseModal() {
    const modal = document.getElementById('courseModal');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

async function saveCourse() {
    const title = document.getElementById('courseTitle').value.trim();
    if (!title) { showToast('Please enter a course title', 'error'); return; }
    
    const data = {
        title,
        description: document.getElementById('courseDescription').value.trim(),
        published: document.getElementById('coursePublished').checked,
        category: document.getElementById('courseCategory').value
    };

    if (editingCourseId) {
        await updateCourse(editingCourseId, data);
        showToast('Course updated', 'success');
    } else {
        await createCourse(data);
        showToast('Course created', 'success');
    }
    
    closeCourseModal();
    await loadCourses();
}

function editCourse(id) { openCourseModal(id); }

async function toggleCourseStatus(id, currentStatus) {
    await updateCourse(id, { published: !currentStatus });
    showToast(!currentStatus ? 'Course published' : 'Course unpublished', 'success');
    await loadCourses();
}

async function deleteCourseRecord(id) {
    if(confirm('Are you certain you want to delete this course?')) {
        await deleteCourse(id);
        showToast('Course deleted', 'success');
        await loadCourses();
    }
}

function viewCourseModules(id) {
    switchTab('modules');
    document.getElementById('moduleCourseSelect').value = id;
    loadModules();
}

// ---------------- MODULES ----------------
let currentModules = [];

async function loadModules() {
    const courseId = document.getElementById('moduleCourseSelect').value;
    const container = document.getElementById('modulesList');
    
    if (!courseId) {
        container.innerHTML = '<div class="bg-surface-container-lowest rounded-xl clinical-shadow border border-outline-variant/10 p-8 text-center text-on-surface-variant text-sm">Select a course to view its modules</div>';
        currentModules = [];
        return;
    }
    
    currentModules = await fetchModules(courseId);
    
    if(currentModules.length === 0) {
        container.innerHTML = '<div class="bg-surface-container-lowest rounded-xl clinical-shadow border border-outline-variant/10 p-8 text-center text-on-surface-variant text-sm">No modules yet.</div>';
        return;
    }
    
    container.innerHTML = currentModules.map((mod) => `
        <div class="bg-surface-container-lowest rounded-xl clinical-shadow border border-outline-variant/10 p-4 animate-fadeIn">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-display font-bold text-primary flex-shrink-0">${mod.order}</span>
                    <div><h4 class="text-sm font-bold text-on-surface">${mod.title}</h4><p class="text-[10px] text-on-surface-variant">${mod.lessons ? mod.lessons.length : 0} lessons</p></div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="openModuleModal('${mod.id}')" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">edit</span></button>
                    <button onclick="deleteModuleRecord('${mod.id}')" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-lg">delete</span></button>
                </div>
            </div>
            ${mod.lessons && mod.lessons.length > 0 ? `<div class="ml-11 space-y-1">${mod.lessons.map(l => `<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-container text-xs"><span class="material-symbols-outlined text-sm text-on-surface-variant">play_circle</span><span class="text-on-surface-variant flex-1 truncate">${l.title}</span><span class="text-on-surface-variant/60">${l.duration} min</span></div>`).join('')}</div>` : '<p class="ml-11 text-[10px] text-on-surface-variant/40">No lessons yet</p>'}
        </div>
    `).join('');
}

function openModuleModal(id = null) {
    editingModuleId = id;
    const courseId = document.getElementById('moduleCourseSelect').value;
    if(!courseId) { showToast('Select a course first', 'error'); return; }
    
    document.getElementById('moduleModalTitle').textContent = id ? 'Edit Module' : 'New Module';
    if(id) {
        const m = currentModules.find(x => x.id === id);
        if(m) {
            document.getElementById('moduleTitle').value = m.title || '';
            document.getElementById('moduleOrder').value = m.order || 1;
        }
    } else {
        document.getElementById('moduleTitle').value = '';
        document.getElementById('moduleOrder').value = currentModules.length + 1;
    }
    
    const modal = document.getElementById('moduleModal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeModuleModal() {
    const modal = document.getElementById('moduleModal');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex');}
}

async function saveModule() {
    const courseId = document.getElementById('moduleCourseSelect').value;
    const title = document.getElementById('moduleTitle').value.trim();
    if (!title) { showToast('Please enter a module title', 'error'); return; }
    const order = parseInt(document.getElementById('moduleOrder').value) || 1;
    
    const data = { title, order };
    
    if(editingModuleId) {
        await updateModule(courseId, editingModuleId, data);
        showToast('Module updated', 'success');
    } else {
        await createModule(courseId, data);
        showToast('Module created', 'success');
    }
    closeModuleModal();
    await loadModules();
}

async function deleteModuleRecord(id) {
    if(confirm('Delete this module?')) {
        const courseId = document.getElementById('moduleCourseSelect').value;
        await deleteModule(courseId, id);
        showToast('Module deleted', 'success');
        await loadModules();
    }
}

// ---------------- LESSONS ----------------
async function updateLessonModules() {
    const courseId = document.getElementById('lessonCourseSelect').value;
    const moduleSelect = document.getElementById('lessonModuleSelect');
    
    if(!courseId) {
        moduleSelect.innerHTML = '<option value="">Select course first</option>'; 
        moduleSelect.disabled = true; 
        return;
    }
    
    // Fetch modules for select
    const mods = await fetchModules(courseId);
    moduleSelect.disabled = false;
    moduleSelect.innerHTML = '<option value="">Choose a module...</option>';
    mods.forEach((mod) => { 
        moduleSelect.innerHTML += `<option value="${mod.id}">${mod.title}</option>`; 
    });
    
    document.getElementById('lessonsList').innerHTML = '<div class="bg-surface-container-lowest rounded-xl clinical-shadow border border-outline-variant/10 p-8 text-center text-on-surface-variant text-sm">Select a module to view lessons</div>';
}

let currentLessons = [];

async function loadLessons() {
    const courseId = document.getElementById('lessonCourseSelect').value;
    const moduleId = document.getElementById('lessonModuleSelect').value;
    const container = document.getElementById('lessonsList');
    
    if (!courseId || !moduleId) { return; }
    
    const mods = await fetchModules(courseId);
    const selectedMod = mods.find(m => m.id === moduleId);
    currentLessons = selectedMod ? selectedMod.lessons : [];
    
    if(currentLessons.length === 0) {
        container.innerHTML = '<div class="bg-surface-container-lowest rounded-xl clinical-shadow border border-outline-variant/10 p-8 text-center text-on-surface-variant text-sm">No lessons yet.</div>';
        return;
    }
    
    container.innerHTML = currentLessons.map((l) => `
        <div class="bg-surface-container-lowest rounded-xl clinical-shadow border border-outline-variant/10 p-4 animate-fadeIn lesson-row">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3 flex-1 min-w-0">
                    <span class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-xs font-display font-bold text-blue-600 flex-shrink-0">${l.order}</span>
                    <div class="min-w-0">
                        <h4 class="text-sm font-bold text-on-surface truncate">${l.title}</h4>
                        <div class="flex items-center gap-3 text-[10px] text-on-surface-variant mt-0.5">
                            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">schedule</span> ${l.duration} min</span>
                            ${l.videoUrl ? '<span class="flex items-center gap-1"><span class="material-symbols-outlined text-xs">play_circle</span> Video attached</span>' : '<span class="text-amber-600/60">No video</span>'}
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-1 ml-3 flex-shrink-0">
                    <button onclick="openLessonModal('${l.id}')" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">edit</span></button>
                    <button onclick="deleteLessonRecord('${l.id}')" class="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors"><span class="material-symbols-outlined text-lg">delete</span></button>
                </div>
            </div>
        </div>
    `).join('');
}

function openLessonModal(id = null) {
    editingLessonId = id;
    const courseId = document.getElementById('lessonCourseSelect').value;
    const moduleId = document.getElementById('lessonModuleSelect').value;
    
    if(!courseId || !moduleId) { showToast('Select course and module first', 'error'); return; }
    
    document.getElementById('lessonModalTitle').textContent = id ? 'Edit Lesson' : 'New Lesson';
    
    if(id) {
        const l = currentLessons.find(x => x.id === id);
        if(l) {
            document.getElementById('lessonTitle').value = l.title || '';
            document.getElementById('lessonVideoUrl').value = l.videoUrl || '';
            document.getElementById('lessonDuration').value = l.duration || 30;
        }
    } else {
        document.getElementById('lessonTitle').value = '';
        document.getElementById('lessonVideoUrl').value = '';
        document.getElementById('lessonDuration').value = 30;
    }
    
    const modal = document.getElementById('lessonModal');
    if(modal) { modal.classList.remove('hidden'); modal.classList.add('flex'); }
}

function closeLessonModal() {
    const modal = document.getElementById('lessonModal');
    if(modal) { modal.classList.add('hidden'); modal.classList.remove('flex');}
}

async function saveLesson() {
    const courseId = document.getElementById('lessonCourseSelect').value;
    const moduleId = document.getElementById('lessonModuleSelect').value;
    
    const title = document.getElementById('lessonTitle').value.trim();
    if(!title) { showToast('Please enter a lesson title', 'error'); return; }
    
    const data = {
        title,
        videoUrl: document.getElementById('lessonVideoUrl').value.trim(),
        duration: parseInt(document.getElementById('lessonDuration').value) || 30,
        order: editingLessonId ? (currentLessons.find(x => x.id === editingLessonId)?.order || 1) : (currentLessons.length + 1)
    };
    
    if(editingLessonId) {
        await updateLesson(courseId, moduleId, editingLessonId, data);
        showToast('Lesson updated', 'success');
    } else {
        await createLesson(courseId, moduleId, data);
        showToast('Lesson created', 'success');
    }
    
    closeLessonModal();
    await loadLessons();
}

async function deleteLessonRecord(id) {
    if(confirm('Delete this lesson?')) {
        const courseId = document.getElementById('lessonCourseSelect').value;
        const moduleId = document.getElementById('lessonModuleSelect').value;
        await deleteLesson(courseId, moduleId, id);
        showToast('Lesson deleted', 'success');
        await loadLessons();
    }
}

// Start app
init();
