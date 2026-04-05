/**
 * PZ Academy - Admin Layout Engine
 * Handles rendering the sidebar, header, and route authentication checking.
 */
import { onAuthStateChange, logout } from './firebase-auth.js';

export function checkAdminSession() {
    // Show splash/loader here if needed
    onAuthStateChange((user) => {
        if (!user) {
            // Not logged in -> kick to login
            window.location.href = 'admin-login.html';
        } else {
            // Logged in
            // Ideally we check if user has admin claim via Firestore here
            // For now, if logged in, we let them view.
            populateAdminInfo(user);
        }
    });

    // Handle session expired modal close (fallback)
    const sessionModal = document.getElementById('sessionExpiredModal');
    if (sessionModal) sessionModal.classList.add('hidden');
}

export function populateAdminInfo(user) {
    const name = user.displayName || user.email.split('@')[0];
    const initials = name.substring(0, 2).toUpperCase();
    
    const sidebarName = document.getElementById('sidebarName');
    const sidebarRole = document.getElementById('sidebarRole');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const topAvatar = document.getElementById('topAvatar');

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarRole) sidebarRole.textContent = 'Administrator';
    if (sidebarAvatar) sidebarAvatar.textContent = initials;
    if (topAvatar) topAvatar.textContent = initials;
}

export function renderSidebar(activeTab = 'dashboard') {
    const sidebarHTML = `
        <div class="px-6 mb-10">
            <h1 class="text-xl font-bold tracking-tighter text-white font-headline">PZ Academy</h1>
            <p class="text-[10px] text-white/60 font-label tracking-widest uppercase mt-1">Clinical Admin Portal</p>
        </div>
        <nav class="flex-1 px-3 space-y-1">
            <a href="admin-dashboard.html" class="sidebar-link ${activeTab === 'dashboard' ? 'active text-white' : 'text-white/70 hover:text-white'} flex items-center px-3 py-2.5 rounded-lg">
                <span class="material-symbols-outlined mr-3 text-sm" ${activeTab === 'dashboard' ? 'style="font-variation-settings: \'FILL\' 1;"' : ''}>dashboard</span>
                <span class="font-display ${activeTab === 'dashboard' ? 'font-semibold' : 'font-medium'} text-sm tracking-tight">Dashboard</span>
            </a>
            <a href="admin-students.html" class="sidebar-link ${activeTab === 'students' ? 'active text-white' : 'text-white/70 hover:text-white'} flex items-center px-3 py-2.5 rounded-lg">
                <span class="material-symbols-outlined mr-3 text-sm" ${activeTab === 'students' ? 'style="font-variation-settings: \'FILL\' 1;"' : ''}>group</span>
                <span class="font-display ${activeTab === 'students' ? 'font-semibold' : 'font-medium'} text-sm tracking-tight">Students</span>
            </a>
            <a href="admin-course-manager.html" class="sidebar-link ${activeTab === 'courses' ? 'active text-white' : 'text-white/70 hover:text-white'} flex items-center px-3 py-2.5 rounded-lg">
                <span class="material-symbols-outlined mr-3 text-sm" ${activeTab === 'courses' ? 'style="font-variation-settings: \'FILL\' 1;"' : ''}>school</span>
                <span class="font-display ${activeTab === 'courses' ? 'font-semibold' : 'font-medium'} text-sm tracking-tight">Courses</span>
            </a>
            <a href="admin-quiz-builder.html" class="sidebar-link ${activeTab === 'quizzes' ? 'active text-white' : 'text-white/70 hover:text-white'} flex items-center px-3 py-2.5 rounded-lg">
                <span class="material-symbols-outlined mr-3 text-sm" ${activeTab === 'quizzes' ? 'style="font-variation-settings: \'FILL\' 1;"' : ''}>quiz</span>
                <span class="font-display ${activeTab === 'quizzes' ? 'font-semibold' : 'font-medium'} text-sm tracking-tight">Quiz Builder</span>
            </a>
            <a href="admin-certificates.html" class="sidebar-link ${activeTab === 'certificates' ? 'active text-white' : 'text-white/70 hover:text-white'} flex items-center px-3 py-2.5 rounded-lg">
                <span class="material-symbols-outlined mr-3 text-sm" ${activeTab === 'certificates' ? 'style="font-variation-settings: \'FILL\' 1;"' : ''}>workspace_premium</span>
                <span class="font-display ${activeTab === 'certificates' ? 'font-semibold' : 'font-medium'} text-sm tracking-tight">Certificates</span>
            </a>
            <a href="admin-settings.html" class="sidebar-link ${activeTab === 'settings' ? 'active text-white' : 'text-white/70 hover:text-white'} flex items-center px-3 py-2.5 rounded-lg">
                <span class="material-symbols-outlined mr-3 text-sm" ${activeTab === 'settings' ? 'style="font-variation-settings: \'FILL\' 1;"' : ''}>settings</span>
                <span class="font-display ${activeTab === 'settings' ? 'font-semibold' : 'font-medium'} text-sm tracking-tight">Settings</span>
            </a>
        </nav>
        <div class="px-6 mt-auto">
            <div class="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3">
                <div id="sidebarAvatar" class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xs font-display font-bold text-white ring-2 ring-white/20 flex-shrink-0">...</div>
                <div class="overflow-hidden flex-1 min-w-0">
                    <p id="sidebarName" class="text-white text-xs font-bold truncate">Loading...</p>
                    <p id="sidebarRole" class="text-white/60 text-[10px] truncate">Admin</p>
                </div>
                <button id="logoutBtn" class="text-white/60 hover:text-white transition-opacity flex-shrink-0">
                    <span class="material-symbols-outlined text-sm">logout</span>
                </button>
            </div>
        </div>
    `;

    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.innerHTML = sidebarHTML;
    }

    // Attach logout event
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const modal = document.getElementById('logoutModal');
            if(modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        });
    }

    // Support for logout modal
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', async () => {
            await logout();
            window.location.href = 'admin-login.html';
        });
    }

    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    if (cancelLogoutBtn) {
        cancelLogoutBtn.addEventListener('click', () => {
            const modal = document.getElementById('logoutModal');
            if(modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        });
    }
}

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(sidebar) sidebar.classList.toggle('-translate-x-full');
    if(overlay) overlay.classList.toggle('hidden');
}

// Make accessible to inline onclick handlers if needed
window.toggleSidebar = toggleSidebar;
window.checkAdminSession = checkAdminSession;
