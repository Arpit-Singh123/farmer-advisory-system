/**
 * =====================================================
 * Farmer Advisory System - Main JavaScript
 * =====================================================
 * FIXES:
 * 1. Uses Anthropic Claude API (fast, reliable, no CORS issues)
 * 2. Splash screen uses sessionStorage so it shows every new browser session
 * 3. Added 30-second timeout with clear error message
 * 4. Saves queries to localStorage for Admin dashboard
 * =====================================================
 */

// =====================================================
// CONFIGURATION — Replace with your Anthropic API key
// =====================================================
// Current language
let currentLanguage = localStorage.getItem('selectedLanguage') || 'english';

// =====================================================
// SPLASH SCREEN
// FIX: Use sessionStorage instead of localStorage so
// the splash shows again on every new browser session.
// =====================================================

function selectSplashLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('selectedLanguage', lang);
    sessionStorage.setItem('languageChosen', 'true'); // ← KEY FIX

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

    if (typeof applyTranslations === 'function') {
        applyTranslations(lang);
    }

    updateDropdownTranslations(lang);   
    updateDistrictTranslations(lang);
}

// =====================================================
// UTILITY: LOADING & ERROR
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

if (data.language === 'hindi') langName = 'Hindi';
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
        district:  document.getElementById('district').value.trim(),
        village:   document.getElementById('village').value.trim(),
        soilType:  document.getElementById('soilType').value,
        crop:      document.getElementById('crop').value,
        issue:     document.getElementById('issue').value,
        language:  currentLanguage
    };

    if (!formData.district || !formData.village || !formData.soilType ||
        !formData.crop     || !formData.issue) {
        showError(getTranslation('fillAllFields', currentLanguage));
        return;
    }

    // Store form data for the result page
    localStorage.setItem('farmerQuery', JSON.stringify(formData));
    localStorage.removeItem('advisoryResult');

    window.location.href = 'result.html';
}

// =====================================================
// RESULT PAGE: AI CALL WITH STREAMING
// =====================================================

async function displayResult() {
    const queryJson = localStorage.getItem('farmerQuery');
    if (!queryJson) { window.location.href = 'index.html'; return; }

    const data = JSON.parse(queryJson);
    const lang = data.language || 'english';

    if (typeof applyTranslations === 'function') applyTranslations(lang);

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };
    set('districtResult', data.district);
    set('villageResult',  data.village);
    set('soilResult',     data.soilType);
    set('cropResult',     data.crop);
    set('issueResult',    data.issue);

    const prompt    = buildFarmerPrompt(data);
    const advisoryEl = document.getElementById('advisoryText');

    if (advisoryEl) {
        advisoryEl.innerHTML = `<span class="ai-thinking"><span class="dot-pulse"></span> ${getTranslation('generatingAdvisory', lang)}</span>`;
    }

    try {
        const advisory = await callNvidiaAPI(prompt, advisoryEl, lang);

        // Save to localStorage for admin dashboard
        saveQueryToStorage(data, advisory);

    } catch (err) {
        console.error('AI Error:', err);
        const errMsg = err.message && err.message.includes('timeout')
            ? getTranslation('timeoutError', lang) || 'Request timed out. Please try again.'
            : getTranslation('networkError', lang);

        if (advisoryEl) advisoryEl.textContent = errMsg;
        showError(errMsg);
    }
}

/**
 * Calls the Anthropic Claude API.
 * FIX: Uses fetch with a 30-second timeout AbortController.
 * Since browser CORS blocks Anthropic API directly, this works
 * when served via Live Server or any local HTTP server.
 *
 * NOTE: For production, move the API call to a backend proxy.
 */
async function callNvidiaAPI(prompt, targetEl, lang) {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 90000);

    let response;
    try {
        response = await fetch('farmer-advisory-backend-production.up.railway.app',  {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: prompt
            }),
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText}`);
    }

    const text = await response.text();
console.log("RAW RESPONSE:", text);

const data = JSON.parse(text);

const fullText =
    data.choices?.[0]?.message?.content ||
    data.choices?.[0]?.text ||
    data.choices?.[0]?.delta?.content ||
    '';

    if (targetEl) {
        targetEl.textContent = fullText || getTranslation('networkError', lang);
    }

    return fullText;
}

// =====================================================
// SAVE QUERY FOR ADMIN DASHBOARD
// =====================================================

function saveQueryToStorage(data, advisory) {
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
        // Keep only last 100 queries
        localStorage.setItem('allQueries', JSON.stringify(queries.slice(0, 100)));
    } catch (e) {
        console.warn('Could not save query to storage:', e);
    }
}

// =====================================================
// HELPERS
// =====================================================

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
}

function goBack() {
    localStorage.removeItem('advisoryResult');
    window.location.href = 'index.html';
}

function printAdvisory() {
    window.print();
}

// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', function () {
    hideLoading();

    const splash = document.getElementById('langSplash');

    if (splash) {
        // FIX: Use sessionStorage so splash shows on every new browser tab/session
        const alreadyChosen = sessionStorage.getItem('languageChosen');
        if (alreadyChosen) {
            splash.style.display = 'none';
            const saved = localStorage.getItem('selectedLanguage') || 'english';
            changeLanguage(saved);
        } else {
            splash.classList.remove('hidden');
        }
    } else {
        const saved = localStorage.getItem('selectedLanguage') || 'english';
        currentLanguage = saved;
        if (typeof applyTranslations === 'function') applyTranslations(saved);
        updateDropdownTranslations(currentLanguage);
        updateDistrictTranslations(currentLanguage);
    }
});


function updateDropdownTranslations(lang) {
    const selects = ['soilType', 'crop', 'issue'];

    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;

        Array.from(select.options).forEach(option => {
            const value = option.value;
            if (!value || !fieldTranslations[value]) return;

            const t = fieldTranslations[value];

            if (lang === 'english') {
                option.textContent = `${value} (${t.hindi} / ${t.marathi})`;
            } else if (lang === 'hindi') {
                option.textContent = `${value} (${t.hindi})`;
            } else if (lang === 'marathi') {
                option.textContent = `${value} (${t.marathi})`;
            }
        });
    });
}


function updateDistrictTranslations(lang) {
    const select = document.getElementById('district');
    if (!select) return;

    Array.from(select.options).forEach(option => {
        const value = option.value;
        if (!value || !districtTranslations[value]) return;

        const t = districtTranslations[value];

        if (lang === 'english') {
            option.textContent = `${value} (${t.hindi} / ${t.marathi})`;
        } else if (lang === 'hindi') {
            option.textContent = `${value} (${t.hindi})`;
        } else if (lang === 'marathi') {
            option.textContent = `${value} (${t.marathi})`;
        }
    });
}