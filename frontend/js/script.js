/**
 * =====================================================
 * Farmer Advisory System - Main JavaScript
 * =====================================================
 */

// ── Single BACKEND_URL at the top — never declare this again ──
const BACKEND_URL = 'https://farmer-advisory-backend-production.up.railway.app';

let currentLanguage = localStorage.getItem('selectedLanguage') || 'english';

// =====================================================
// SPLASH SCREEN
// =====================================================

function selectSplashLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('selectedLanguage', lang);
    sessionStorage.setItem('languageChosen', 'true');

    const splash = document.getElementById('langSplash');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => { splash.style.display = 'none'; }, 450);
    }
    changeLanguage(lang);
}

// =====================================================
// LANGUAGE SWITCHING
// =====================================================

function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('selectedLanguage', lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    if (typeof applyTranslations === 'function') applyTranslations(lang);
    updateDropdownTranslations(lang);
    updateDistrictTranslations(lang);
}

// =====================================================
// LOADING & ERROR
// =====================================================

function showLoading(message) {
    const overlay = document.getElementById('loadingOverlay');
    const text    = document.getElementById('loadingText');
    if (overlay) { overlay.classList.remove('hidden'); overlay.style.display = ''; }
    if (text && message) text.textContent = message;
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) { overlay.classList.add('hidden'); overlay.style.display = 'none'; }
}

function showError(message) {
    const el   = document.getElementById('errorMessage');
    const span = document.getElementById('errorText');
    if (el && span) { span.textContent = message; el.classList.remove('hidden'); }
    else alert(message);
}

function hideError() {
    const el = document.getElementById('errorMessage');
    if (el) el.classList.add('hidden');
}

// =====================================================
// PROMPT BUILDER
// =====================================================

function buildFarmerPrompt(data) {
    let langName = 'English';
    if (data.language === 'hindi')   langName = 'Hindi';
    if (data.language === 'marathi') langName = 'Marathi';

    return `You are an expert agricultural advisor for Maharashtra, India, helping small and marginal farmers.

A farmer has submitted the following details:
- District: ${data.district}
- Village: ${data.village}
- Soil Type: ${data.soilType}
- Crop: ${data.crop}
- Problem / Issue: ${data.issue}

Please provide a clear, practical, and easy-to-understand farming advisory for this farmer.

Your response MUST:
1. Be written entirely in ${langName} language (use simple, everyday words that a rural farmer can understand).
2. Directly address the specific issue: "${data.issue}" for the crop "${data.crop}".
3. Consider the soil type (${data.soilType}) and the local region (${data.district}, Maharashtra).
4. Include:
   - Likely cause of the problem
   - Immediate action steps (numbered list)
   - Preventive measures for the future
   - Any government scheme or helpline relevant to Maharashtra farmers (mention Krishi Vibhag or KVK if applicable)
5. Be concise but complete — avoid lengthy jargon.
6. End with a short encouraging note for the farmer.

Do NOT include any reasoning or thinking text — only the final advisory.`;
}

// =====================================================
// FORM SUBMISSION
// =====================================================

async function submitForm(event) {
    event.preventDefault();
    hideError();

    const formData = {
        district: document.getElementById('district').value.trim(),
        village:  document.getElementById('village').value.trim(),
        soilType: document.getElementById('soilType').value,
        crop:     document.getElementById('crop').value,
        issue:    document.getElementById('issue').value,
        language: currentLanguage
    };

    if (!formData.district || !formData.village || !formData.soilType ||
        !formData.crop || !formData.issue) {
        showError(getTranslation('fillAllFields', currentLanguage));
        return;
    }

    localStorage.setItem('farmerQuery', JSON.stringify(formData));
    localStorage.removeItem('advisoryResult');
    window.location.href = 'result.html';
}

// =====================================================
// RESULT PAGE
// =====================================================

async function displayResult() {
    const queryJson = localStorage.getItem('farmerQuery');
    if (!queryJson) { window.location.href = 'index.html'; return; }

    const data = JSON.parse(queryJson);
    const lang = data.language || 'english';

    if (typeof applyTranslations === 'function') applyTranslations(lang);

    const set = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val || '-';
    };
    set('districtResult', data.district);
    set('villageResult',  data.village);
    set('soilResult',     data.soilType);
    set('cropResult',     data.crop);
    set('issueResult',    data.issue);

    const advisoryEl = document.getElementById('advisoryText');
    if (advisoryEl) {
        advisoryEl.innerHTML = `<span class="ai-thinking"><span class="dot-pulse"></span> ${getTranslation('generatingAdvisory', lang)}</span>`;
    }

    try {
        // STEP 1: Call backend → AI generates advisory
        const advisory = await callNvidiaAPI(data, advisoryEl, lang);

        // STEP 2: Save to MySQL via /api/queries/save
        await saveQueryToStorage(data, advisory);

    } catch (err) {
        console.error('AI Error:', err);
        // FIX: correctly detect AbortError from AbortController timeout
        const isTimeout = err.name === 'AbortError';
        const errMsg = isTimeout
            ? 'Request timed out. The server may be waking up — please wait 30 seconds and try again.'
            : getTranslation('networkError', lang);

        if (advisoryEl) advisoryEl.textContent = errMsg;
        showError(errMsg);
    }
}

// =====================================================
// CALL BACKEND → NVIDIA AI
// =====================================================

async function callNvidiaAPI(data, targetEl, lang) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000);

    let response;
    try {
        // FIX: uses BACKEND_URL constant, not a hardcoded string
        response = await fetch(BACKEND_URL + '/api/advisory', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prompt: buildFarmerPrompt(data) }),
            signal:  controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText}`);
    }

    const responseText = await response.text();
    // FIX: renamed from 'data' to 'parsed' to avoid shadowing the outer 'data' parameter
    const parsed = JSON.parse(responseText);

    const fullText =
        parsed.choices?.[0]?.message?.content ||
        parsed.choices?.[0]?.text             ||
        parsed.choices?.[0]?.delta?.content   || '';

    if (targetEl) {
        targetEl.textContent = fullText || getTranslation('networkError', lang);
    }

    return fullText;
}

// =====================================================
// SAVE TO MYSQL via /api/queries/save
// =====================================================

async function saveQueryToStorage(data, advisory) {
    // Local backup first
    try {
        const queries = JSON.parse(localStorage.getItem('allQueries') || '[]');
        queries.unshift({
            id:        Date.now(),
            district:  data.district,
            village:   data.village,
            soilType:  data.soilType,
            crop:      data.crop,
            issue:     data.issue,
            language:  data.language,
            advisory:  advisory,
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('allQueries', JSON.stringify(queries.slice(0, 100)));
    } catch (e) {
        console.warn('localStorage save failed:', e);
    }

    // Save to MySQL via QueryController
    try {
        const res = await fetch(BACKEND_URL + '/api/queries/save', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                district: data.district,
                village:  data.village,
                soilType: data.soilType,
                crop:     data.crop,
                issue:    data.issue,
                language: data.language,
                advisory: advisory
            })
        });
        const result = await res.json();
        if (result.success) {
            console.log('Saved to MySQL. ID:', result.id || 'ok');
        }
    } catch (e) {
        console.warn('MySQL save failed (localStorage backup intact):', e.message);
    }
}

// =====================================================
// HELPERS
// =====================================================

function goBack() {
    localStorage.removeItem('advisoryResult');
    window.location.href = 'index.html';
}

function printAdvisory() { window.print(); }

// =====================================================
// PAGE INIT
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    hideLoading();

    const splash = document.getElementById('langSplash');
    if (splash) {
        const alreadyChosen = sessionStorage.getItem('languageChosen');
        if (alreadyChosen) {
            splash.style.display = 'none';
            changeLanguage(localStorage.getItem('selectedLanguage') || 'english');
        } else {
            splash.classList.remove('hidden');
        }
    } else {
        const saved = localStorage.getItem('selectedLanguage') || 'english';
        currentLanguage = saved;
        if (typeof applyTranslations === 'function') applyTranslations(saved);
        updateDropdownTranslations(saved);
        updateDistrictTranslations(saved);
    }
});

// =====================================================
// DROPDOWN TRANSLATIONS
// =====================================================

function updateDropdownTranslations(lang) {
    const selects = ['soilType', 'crop', 'issue'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select || typeof fieldTranslations === 'undefined') return;
        Array.from(select.options).forEach(option => {
            const value = option.value;
            if (!value || !fieldTranslations[value]) return;
            const t = fieldTranslations[value];
            if (lang === 'english')      option.textContent = `${value} (${t.hindi} / ${t.marathi})`;
            else if (lang === 'hindi')   option.textContent = `${value} (${t.hindi})`;
            else if (lang === 'marathi') option.textContent = `${value} (${t.marathi})`;
        });
    });
}

function updateDistrictTranslations(lang) {
    const select = document.getElementById('district');
    if (!select || typeof districtTranslations === 'undefined') return;
    Array.from(select.options).forEach(option => {
        const value = option.value;
        if (!value || !districtTranslations[value]) return;
        const t = districtTranslations[value];
        if (lang === 'english')      option.textContent = `${value} (${t.hindi} / ${t.marathi})`;
        else if (lang === 'hindi')   option.textContent = `${value} (${t.hindi})`;
        else if (lang === 'marathi') option.textContent = `${value} (${t.marathi})`;
    });
}