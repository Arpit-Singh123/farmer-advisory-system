/**
 * =====================================================
 * Farmer Advisory System - Admin JavaScript
 * =====================================================
 * Reads from MySQL via Java backend (all devices).
 * Admin credentials: admin / admin123
 * =====================================================
 */

// ── BACKEND_URL at the top — used by all functions below ──
const BACKEND_URL = 'https://farmer-advisory-backend-production.up.railway.app';

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

// =====================================================
// LOAD DASHBOARD — fetches from MySQL
// =====================================================

async function loadDashboard() {
    document.getElementById('totalQueries').textContent   = '...';
    document.getElementById('totalDistricts').textContent = '...';
    document.getElementById('totalCrops').textContent     = '...';
    document.getElementById('totalIssues').textContent    = '...';

    let queries = [];

    try {
        const response = await fetch(BACKEND_URL + '/api/queries/all');
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const result = await response.json();
        if (result.success) {
            queries = result.data;
        } else {
            throw new Error('Backend returned success: false');
        }
    } catch (e) {
        console.warn('Backend unreachable, using localStorage fallback:', e.message);
        queries = JSON.parse(localStorage.getItem('allQueries') || '[]');
        showBanner('Could not reach server. Showing data from this device only.');
    }

    renderDashboard(queries);
}

function renderDashboard(queries) {
    document.getElementById('totalQueries').textContent = queries.length;

    const districts = [...new Set(queries.map(q => q.district).filter(Boolean))];
    const crops     = [...new Set(queries.map(q => q.crop).filter(Boolean))];
    const issues    = [...new Set(queries.map(q => q.issue).filter(Boolean))];

    document.getElementById('totalDistricts').textContent = districts.length;
    document.getElementById('totalCrops').textContent     = crops.length;
    document.getElementById('totalIssues').textContent    = issues.length;

    displayStatsList('cropStats',     buildStatMap(queries, 'crop'));
    displayStatsList('issueStats',    buildStatMap(queries, 'issue'));
    displayStatsList('districtStats', buildStatMap(queries, 'district'));
    displayQueriesTable(queries);
}

// =====================================================
// CLEAR DATA — FIX: only one definition, calls backend
// =====================================================

async function clearAllData() {
    if (!confirm('Are you sure you want to delete ALL query records from the database? This cannot be undone.')) return;

    try {
        const res    = await fetch(BACKEND_URL + '/api/queries/clear', { method: 'DELETE' });
        const result = await res.json();
        if (result.success) {
            localStorage.removeItem('allQueries');
            loadDashboard();
            alert('All records deleted successfully.');
        } else {
            alert('Error clearing data. Please try again.');
        }
    } catch (e) {
        console.warn('Clear failed:', e.message);
        localStorage.removeItem('allQueries');
        loadDashboard();
        alert('Cleared local data. Backend may be offline.');
    }
}

// =====================================================
// STATS BAR CHARTS
// =====================================================

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
        const pct = Math.max((count / maxCount) * 100, 6);
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

// =====================================================
// QUERIES TABLE
// =====================================================

function displayQueriesTable(queries) {
    const tbody = document.getElementById('queriesTableBody');
    if (!tbody) return;

    if (!queries || queries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:#757575;padding:2rem;">No queries yet. They will appear here after farmers submit the form.</td></tr>';
        return;
    }

    let html = '';
    queries.slice(0, 100).forEach((query, idx) => {
        const date = query.createdAt ? formatDate(query.createdAt) : '-';
        html += `<tr>
            <td>${idx + 1}</td>
            <td>${query.district || '-'}</td>
            <td>${query.village  || '-'}</td>
            <td>${query.crop     || '-'}</td>
            <td>${query.issue    || '-'}</td>
            <td style="white-space:nowrap;">${date}</td>
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
    } catch (_) { return dateString || '-'; }
}

// =====================================================
// UI HELPER — warning banner
// =====================================================

function showBanner(message) {
    let banner = document.getElementById('infoBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'infoBanner';
        banner.style.cssText = 'background:#FFF3E0;border:1px solid #FFB74D;color:#E65100;' +
            'border-radius:8px;padding:0.875rem 1rem;margin-bottom:1rem;font-size:0.875rem;';
        const container = document.querySelector('#dashboardSection .container') ||
                          document.querySelector('#dashboardSection main');
        if (container) container.insertBefore(banner, container.firstChild);
    }
    banner.textContent = message;
    banner.style.display = 'block';
}

// =====================================================
// PAGE INIT
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
        loadDashboard();
    }
});