/**
 * =====================================================
 * Farmer Advisory System - Admin JavaScript
 * =====================================================
 * FIX: Reads query data from localStorage (saved by script.js)
 * instead of a backend server that isn't running.
 * Admin credentials: admin / farm@2024
 * =====================================================
 */

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// =====================================================
// LOGIN / LOGOUT
// =====================================================

function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorEl  = document.getElementById('loginError');

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        loadDashboard();
    } else {
        if (errorEl) errorEl.classList.remove('hidden');
    }
}

function handleLogout() {
    sessionStorage.removeItem('adminLoggedIn');
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    const errorEl = document.getElementById('loginError');
    if (errorEl) errorEl.classList.add('hidden');
}

const BACKEND_URL = 'https://farmer-advisory-backend-production.up.railway.app';

// =====================================================
// DASHBOARD DATA — loads from MySQL (all devices) ✅
// =====================================================

async function loadDashboard() {
    // Show loading state
    document.getElementById('totalQueries').textContent   = '...';
    document.getElementById('totalDistricts').textContent = '...';
    document.getElementById('totalCrops').textContent     = '...';
    document.getElementById('totalIssues').textContent    = '...';

    let queries = [];

    try {
        const response = await fetch(`${BACKEND_URL}/api/queries/all`);
        const result   = await response.json();

        if (result.success) {
            queries = result.data;
        }
    } catch (e) {
        console.warn('Could not load from database, falling back to localStorage:', e);
        // Fallback to localStorage if backend is unreachable
        queries = JSON.parse(localStorage.getItem('allQueries') || '[]');
    }

    renderDashboard(queries);
}

function renderDashboard(queries) {
    // Stats
    document.getElementById('totalQueries').textContent = queries.length;

    const districts = [...new Set(queries.map(q => q.district).filter(Boolean))];
    const crops     = [...new Set(queries.map(q => q.crop).filter(Boolean))];
    const issues    = [...new Set(queries.map(q => q.issue).filter(Boolean))];

    document.getElementById('totalDistricts').textContent = districts.length;
    document.getElementById('totalCrops').textContent     = crops.length;
    document.getElementById('totalIssues').textContent    = issues.length;

    // Charts
    displayStatsList('cropStats',     buildStatMap(queries, 'crop'));
    displayStatsList('issueStats',    buildStatMap(queries, 'issue'));
    displayStatsList('districtStats', buildStatMap(queries, 'district'));

    // Table
    displayQueriesTable(queries);
}

// =====================================================
// CLEAR DATA — deletes from MySQL ✅
// =====================================================

async function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL query records from the database? This cannot be undone.')) return;

    try {
        await fetch(`${BACKEND_URL}/api/queries/clear`, { method: 'DELETE' });
        localStorage.removeItem('allQueries');
        loadDashboard();
        alert('All records deleted successfully.');
    } catch (e) {
        alert('Error clearing data. Please try again.');
    }
}

function buildStatMap(queries, field) {
    const map = {};
    queries.forEach(q => {
        const val = q[field];
        if (val) map[val] = (map[val] || 0) + 1;
    });
    return map;
}

function displayStatsList(elementId, stats) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!stats || Object.keys(stats).length === 0) {
        container.innerHTML = '<p class="text-center" style="color:#757575;font-size:0.9rem;">No data yet. Queries will appear here after farmers use the system.</p>';
        return;
    }

    const sorted   = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxCount = Math.max(...sorted.map(s => s[1]));

    let html = '<div style="display:flex;flex-direction:column;gap:0.5rem;">';
    sorted.forEach(([name, count]) => {
        const pct = (count / maxCount) * 100;
        html += `
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <span style="min-width:130px;font-size:0.875rem;">${name}</span>
                <div style="flex:1;background:#E0E0E0;border-radius:4px;height:24px;overflow:hidden;">
                    <div style="width:${pct}%;background:#4CAF50;height:100%;display:flex;align-items:center;padding-left:8px;transition:width 0.5s ease;">
                        <span style="color:white;font-size:0.75rem;font-weight:600;">${count}</span>
                    </div>
                </div>
            </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function displayQueriesTable(queries) {
    const tbody = document.getElementById('queriesTableBody');
    if (!tbody) return;

    if (!queries || queries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:#757575;padding:2rem;">No queries yet. They will appear here after farmers submit the form.</td></tr>';
        return;
    }

    let html = '';
    queries.slice(0, 50).forEach(query => {
        const date = query.createdAt ? formatDate(query.createdAt) : '-';
        html += `<tr>
            <td>${query.id || '-'}</td>
            <td>${query.district || '-'}</td>
            <td>${query.village  || '-'}</td>
            <td>${query.crop     || '-'}</td>
            <td>${query.issue    || '-'}</td>
            <td>${date}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function formatDate(dateString) {
    try {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (_) { return dateString; }
}

// =====================================================
// CLEAR DATA (optional admin tool)
// =====================================================

function clearAllData() {
    if (confirm('Are you sure you want to delete all query records? This cannot be undone.')) {
        localStorage.removeItem('allQueries');
        loadDashboard();
    }
}

// =====================================================
// PAGE INIT
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    // Auto-login check
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        loadDashboard();
    }
});