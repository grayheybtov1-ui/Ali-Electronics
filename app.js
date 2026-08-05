// Ali Electronics - Warehouse Management System
// Client-side Application Logic with LocalStorage & Supabase Real-time Cloud Sync

// Predefined entry passcode for authorization
const AUTH_PASSCODE = "ali2026";

// Supabase Cloud Storage Configuration
const SUPABASE_URL = "https://zlhuditqwksxhtxjftgc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsaHVkaXRxd2tzeGh0eGpmdGdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2NTY3NzksImV4cCI6MjEwMTIzMjc3OX0.yINnjWAi5abRL3jMsaRSLGe6_d1cuc07bi-8KsKUTDU";

let supabaseClient = null;
if (window.supabase) {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
        console.error("Supabase client init error:", err);
    }
}

// State database keys
const KEYS = {
    INCOMING: "ali_incoming",
    OUTGOING: "ali_outgoing",
    RETURNED: "ali_returned",
    EXTRA_PAYMENTS: "ali_extra_payments"
};

// Initialize State
let state = {
    incoming: JSON.parse(localStorage.getItem(KEYS.INCOMING)) || [],
    outgoing: JSON.parse(localStorage.getItem(KEYS.OUTGOING)) || [],
    returned: JSON.parse(localStorage.getItem(KEYS.RETURNED)) || [],
    extra_payments: JSON.parse(localStorage.getItem(KEYS.EXTRA_PAYMENTS)) || []
};

// Search Queries State
let searchQueries = {
    dash: "",
    incoming: "",
    outgoing: "",
    anbar: "",
    extra: "",
    borc: ""
};

// Dashboard Timeframe Selections State
let dashboardTimeframes = {
    incoming: "daily",
    outgoing: "daily"
};

// Save helper (Local + Supabase Cloud)
function saveState() {
    localStorage.setItem(KEYS.INCOMING, JSON.stringify(state.incoming));
    localStorage.setItem(KEYS.OUTGOING, JSON.stringify(state.outgoing));
    localStorage.setItem(KEYS.RETURNED, JSON.stringify(state.returned));
    localStorage.setItem(KEYS.EXTRA_PAYMENTS, JSON.stringify(state.extra_payments));
    updateDashboard();
    pushStateToSupabase();
}

let syncTimeout = null;
async function pushStateToSupabase() {
    if (!supabaseClient) return;

    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(async () => {
        try {
            const payload = {
                id: "warehouse_state",
                data: state,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabaseClient
                .from('app_data')
                .upsert(payload, { onConflict: 'id' });

            if (error) {
                console.warn("Supabase push notice:", error.message);
                updateSyncStatusIndicator(false);
            } else {
                updateSyncStatusIndicator(true);
            }
        } catch (err) {
            console.error("Supabase push failed:", err);
            updateSyncStatusIndicator(false);
        }
    }, 250);
}

// Initial Sync from Supabase Cloud Database
async function syncFromSupabase() {
    if (!supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('app_data')
            .select('data')
            .eq('id', 'warehouse_state')
            .maybeSingle();

        if (error) {
            console.warn("Supabase fetch notice:", error.message);
            updateSyncStatusIndicator(false);
            return;
        }

        if (data && data.data) {
            const cloudState = data.data;
            state.incoming = cloudState.incoming || [];
            state.outgoing = cloudState.outgoing || [];
            state.returned = cloudState.returned || [];
            state.extra_payments = cloudState.extra_payments || [];
            sanitizeStateData();

            localStorage.setItem(KEYS.INCOMING, JSON.stringify(state.incoming));
            localStorage.setItem(KEYS.OUTGOING, JSON.stringify(state.outgoing));
            localStorage.setItem(KEYS.RETURNED, JSON.stringify(state.returned));
            localStorage.setItem(KEYS.EXTRA_PAYMENTS, JSON.stringify(state.extra_payments));

            renderAllTables();
            updateDashboard();
            updateSyncStatusIndicator(true);
        } else {
            // Cloud is empty, push existing local data to cloud
            if (state.incoming.length > 0 || state.outgoing.length > 0 || state.returned.length > 0) {
                await pushStateToSupabase();
            } else {
                updateSyncStatusIndicator(true);
            }
        }
    } catch (err) {
        console.error("Cloud fetch error:", err);
        updateSyncStatusIndicator(false);
    }
}

// Realtime Listener for sync across multiple laptops/devices
function initRealtimeSync() {
    if (!supabaseClient) return;

    try {
        supabaseClient
            .channel('public:app_data')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'app_data', filter: 'id=eq.warehouse_state' },
                (payload) => {
                    if (payload.new && payload.new.data) {
                        const cloudState = payload.new.data;
                        state.incoming = cloudState.incoming || [];
                        state.outgoing = cloudState.outgoing || [];
                        state.returned = cloudState.returned || [];
                        state.extra_payments = cloudState.extra_payments || [];
                        sanitizeStateData();

                        localStorage.setItem(KEYS.INCOMING, JSON.stringify(state.incoming));
                        localStorage.setItem(KEYS.OUTGOING, JSON.stringify(state.outgoing));
                        localStorage.setItem(KEYS.RETURNED, JSON.stringify(state.returned));
                        localStorage.setItem(KEYS.EXTRA_PAYMENTS, JSON.stringify(state.extra_payments));

                        renderAllTables();
                        updateDashboard();
                        updateSyncStatusIndicator(true);
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    updateSyncStatusIndicator(true);
                }
            });
    } catch (err) {
        console.error("Realtime subscription error:", err);
    }
}

// UI Badge Indicator for Cloud Connection
function updateSyncStatusIndicator(isOnline) {
    const el = document.getElementById("sync-status-indicator");
    if (!el) return;
    if (isOnline) {
        el.style.display = "inline-flex";
        el.style.backgroundColor = "rgba(16, 185, 129, 0.15)";
        el.style.color = "#10b981";
        el.innerHTML = `<i class='bx bx-cloud-download' style='font-size: 1rem; margin-right: 4px;'></i> Canlı Bazaya Qoşulub`;
    } else {
        el.style.display = "inline-flex";
        el.style.backgroundColor = "rgba(245, 158, 11, 0.15)";
        el.style.color = "#f59e0b";
        el.innerHTML = `<i class='bx bx-cloud-off' style='font-size: 1rem; margin-right: 4px;'></i> SQL Cədvəli Gözlənilir`;
    }
}

// App Initialization
document.addEventListener("DOMContentLoaded", () => {
    // Trigger splash screen split animation after 1.2s
    setTimeout(() => {
        const splash = document.getElementById("splash-screen");
        if (splash) {
            splash.classList.add("split");
            setTimeout(() => {
                splash.style.display = "none";
            }, 850);
        }
    }, 1200);

    checkAuthentication();
    initAuthHandlers();
    initNavigation();
    initFormHandlers();
    initSettingsHandlers();
    initSearchListeners();
    initTimeframeToggleListeners();
    setDefaultDates();
    initStatisticsTab();
    
    // Initial Render of tables & dashboard
    renderAllTables();
    updateDashboard();

    // Trigger Supabase cloud sync & realtime listener
    syncFromSupabase();
    initRealtimeSync();
});

// 0. Passcode Authentication Logic
function checkAuthentication() {
    // Check if security blocked due to 3 failed attempts
    const attempts = parseInt(localStorage.getItem("login_attempts") || "0", 10);
    if (attempts >= 3) {
        window.location.href = "error.html";
        return;
    }

    const overlay = document.getElementById("login-overlay");
    if (!overlay) return;

    if (localStorage.getItem("ali_authenticated") === "true") {
        overlay.style.display = "none";
    } else {
        overlay.style.display = "flex";
        const inputField = document.getElementById("login-passcode");
        if (inputField) inputField.focus();
    }
}

function initAuthHandlers() {
    const form = document.getElementById("login-form");
    const errorMsg = document.getElementById("login-error-msg");
    const overlay = document.getElementById("login-overlay");

    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const passcodeVal = document.getElementById("login-passcode").value;

            if (passcodeVal === AUTH_PASSCODE) {
                localStorage.setItem("ali_authenticated", "true");
                localStorage.setItem("login_attempts", "0");
                if (errorMsg) errorMsg.style.display = "none";
                if (overlay) overlay.style.display = "none";
                form.reset();
            } else {
                let attempts = parseInt(localStorage.getItem("login_attempts") || "0", 10) + 1;
                localStorage.setItem("login_attempts", attempts);

                if (attempts >= 3) {
                    window.location.href = "error.html";
                    return;
                }

                if (errorMsg) {
                    errorMsg.textContent = `❌ Giriş kodu yanlışdır! (${attempts}/3 cəhd)`;
                    errorMsg.style.display = "block";
                }

                const inputField = document.getElementById("login-passcode");
                if (inputField) {
                    inputField.value = "";
                    inputField.focus();
                }
            }
        });
    }

    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            if (confirm("Sistemdən çıxmaq istədiyinizə əminsiniz?")) {
                localStorage.removeItem("ali_authenticated");
                checkAuthentication();
            }
        });
    }
}

// 1. Navigation Logic
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");

    navItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            const targetTabId = item.getAttribute("data-target");

            // Toggle Nav Active state
            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            // Toggle Tab Contents
            tabContents.forEach(tab => {
                if (tab.id === targetTabId) {
                    tab.classList.add("active");
                } else {
                    tab.classList.remove("active");
                }
            });

            // Update header title
            let label = item.textContent.trim();
            pageTitle.textContent = label;
        });
    });
}

// Helper: Clean model name string (strips legacy '(X ədəd)' or ' ədəd' quantity suffixes)
function cleanModelName(str) {
    if (!str) return '';
    return str
        .replace(/\s*\(\d+\s*ədəd\)/gi, '')
        .replace(/\s*\d+\s*ədəd/gi, '')
        .replace(/\s*ədəd/gi, '')
        .replace(/[\(\)]/g, '')
        .trim();
}

// Helper: Normalization key generator (e.g. "aux 09 ff" or "AUX 09FF" -> "AUX09FF")
function getNormalizedModelKey(str) {
    if (!str) return '';
    return cleanModelName(str).toUpperCase().replace(/\s+/g, '');
}

// Canonical display map to store clean formatted model names
const canonicalModelMap = new Map();

function formatCanonicalModel(str) {
    const cleaned = cleanModelName(str);
    if (!cleaned) return '-';
    
    const key = getNormalizedModelKey(cleaned);
    if (!key) return '-';

    if (canonicalModelMap.has(key)) {
        return canonicalModelMap.get(key);
    }

    let formatted = cleaned.toUpperCase();
    // If it's a merged string like "AUX09FF", split into "AUX 09 FF"
    if (!/\s/.test(formatted)) {
        formatted = formatted.replace(/^([A-Z]+)(\d+)([A-Z]*)$/, '$1 $2 $3').trim();
    } else {
        // Standardize single spaces
        formatted = formatted.replace(/\s+/g, ' ');
    }

    canonicalModelMap.set(key, formatted);
    return formatted;
}

// Helper: Get item name string (supports both single name and legacy brand+model)
function getItemName(item) {
    if (!item) return '-';
    let raw = '';
    if (item.brand && item.model) raw = `${item.brand} ${item.model}`;
    else raw = item.model || item.brand || '-';

    return formatCanonicalModel(raw);
}

function sanitizeStateData() {
    if (state.incoming && Array.isArray(state.incoming)) {
        state.incoming.forEach(inc => {
            if (inc.model) inc.model = formatCanonicalModel(inc.model);
            if (inc.items && Array.isArray(inc.items)) {
                inc.items.forEach(i => {
                    if (i.model) i.model = formatCanonicalModel(i.model);
                });
            }
        });
    }
    if (state.outgoing && Array.isArray(state.outgoing)) {
        state.outgoing.forEach(out => {
            if (out.model) out.model = formatCanonicalModel(out.model);
        });
    }
    if (state.returned && Array.isArray(state.returned)) {
        state.returned.forEach(ret => {
            if (ret.model) ret.model = formatCanonicalModel(ret.model);
        });
    }
}

// Perform immediate sanitization of loaded state
sanitizeStateData();

// 3. Set Default Date Picker inputs to Today
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    
    const dateInputs = [
        "yeni-tarix",
        "cixan-tarix",
        "elave-tarix",
        "filter-date"
    ];

    dateInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    const filterMonthEl = document.getElementById("filter-month");
    if (filterMonthEl) {
        const currentMonth = today.substring(0, 7); // YYYY-MM
        filterMonthEl.value = currentMonth;
    }
}

// 3b. Search Filter Handlers
function initSearchListeners() {
    const searchDash = document.getElementById("search-dash-date");
    const clearDash = document.getElementById("clear-dash-search");
    if (searchDash && clearDash) {
        searchDash.addEventListener("change", () => {
            searchQueries.dash = searchDash.value;
            clearDash.style.display = searchQueries.dash ? "inline-block" : "none";
            updateDashboard();
        });
        clearDash.addEventListener("click", () => {
            searchDash.value = "";
            searchQueries.dash = "";
            clearDash.style.display = "none";
            updateDashboard();
        });
    }

    const searchIncoming = document.getElementById("search-incoming-date");
    const clearIncoming = document.getElementById("clear-incoming-search");
    if (searchIncoming && clearIncoming) {
        searchIncoming.addEventListener("change", () => {
            searchQueries.incoming = searchIncoming.value;
            clearIncoming.style.display = searchQueries.incoming ? "inline-block" : "none";
            renderIncomingTable();
        });
        clearIncoming.addEventListener("click", () => {
            searchIncoming.value = "";
            searchQueries.incoming = "";
            clearIncoming.style.display = "none";
            renderIncomingTable();
        });
    }

    const searchOutgoing = document.getElementById("search-outgoing-date");
    const clearOutgoing = document.getElementById("clear-outgoing-search");
    if (searchOutgoing && clearOutgoing) {
        searchOutgoing.addEventListener("change", () => {
            searchQueries.outgoing = searchOutgoing.value;
            clearOutgoing.style.display = searchQueries.outgoing ? "inline-block" : "none";
            renderOutgoingTable();
        });
        clearOutgoing.addEventListener("click", () => {
            searchOutgoing.value = "";
            searchQueries.outgoing = "";
            clearOutgoing.style.display = "none";
            renderOutgoingTable();
        });
    }

    const searchAnbar = document.getElementById("search-anbar");
    const clearAnbar = document.getElementById("clear-anbar-search");
    if (searchAnbar && clearAnbar) {
        searchAnbar.addEventListener("input", () => {
            searchQueries.anbar = searchAnbar.value;
            clearAnbar.style.display = searchQueries.anbar ? "inline-block" : "none";
            renderAnbarTable();
        });
        clearAnbar.addEventListener("click", () => {
            searchAnbar.value = "";
            searchQueries.anbar = "";
            clearAnbar.style.display = "none";
            renderAnbarTable();
        });
    }

    const searchExtra = document.getElementById("search-elave-date");
    const clearExtra = document.getElementById("clear-elave-search");
    if (searchExtra && clearExtra) {
        searchExtra.addEventListener("change", () => {
            searchQueries.extra = searchExtra.value;
            clearExtra.style.display = searchQueries.extra ? "inline-block" : "none";
            renderExtraPaymentsTable();
        });
        clearExtra.addEventListener("click", () => {
            searchExtra.value = "";
            searchQueries.extra = "";
            clearExtra.style.display = "none";
            renderExtraPaymentsTable();
        });
    }

    const searchBorc = document.getElementById("search-borc-input");
    const clearBorc = document.getElementById("clear-borc-search");
    if (searchBorc && clearBorc) {
        searchBorc.addEventListener("input", () => {
            searchQueries.borc = searchBorc.value;
            clearBorc.style.display = searchQueries.borc ? "inline-block" : "none";
            renderBorcMallarTable();
        });
        clearBorc.addEventListener("click", () => {
            searchBorc.value = "";
            searchQueries.borc = "";
            clearBorc.style.display = "none";
            renderBorcMallarTable();
        });
    }
}

// Temporary storage for batch incoming items
let tempIncomingItems = [];

function initTempItemHandlers() {
    const btnAdd = document.getElementById("btn-add-item-temp");
    const inputModel = document.getElementById("yeni-model");
    const inputSay = document.getElementById("yeni-say");

    if (btnAdd && inputModel && inputSay) {
        const addFn = () => {
            const modelVal = cleanModelName(inputModel.value);
            const sayVal = parseInt(inputSay.value, 10);

            if (!modelVal) {
                alert("Zəhmət olmasa marka və model daxil edin.");
                inputModel.focus();
                return;
            }
            if (isNaN(sayVal) || sayVal <= 0) {
                alert("Zəhmət olmasa düzgün say daxil edin.");
                inputSay.focus();
                return;
            }

            tempIncomingItems.push({
                model: modelVal,
                qty: sayVal
            });

            inputModel.value = "";
            inputSay.value = "";
            renderTempItemsList();
            autoCalculateIncomingCosts();
            inputModel.focus();
        };

        btnAdd.addEventListener("click", addFn);

        const handleEnterKey = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addFn();
            }
        };

        inputModel.addEventListener("keydown", handleEnterKey);
        inputSay.addEventListener("keydown", handleEnterKey);
    }
}

function renderTempItemsList() {
    const container = document.getElementById("temp-items-container");
    const totalQtyEl = document.getElementById("temp-items-total-qty");
    if (!container) return;

    const totalQty = tempIncomingItems.reduce((sum, item) => sum + item.qty, 0);
    if (totalQtyEl) totalQtyEl.textContent = `Ümumi: ${totalQty} ədəd`;

    if (tempIncomingItems.length === 0) {
        container.innerHTML = `
            <div id="temp-items-empty-msg" style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 10px 0;">
                💡 Hələ heç bir məhsul əlavə edilməyib. Yuxarıdakı xanadan məhsul və say daxil edib düyməsinə basın.
            </div>
        `;
        return;
    }

    container.innerHTML = tempIncomingItems.map((item, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.9rem;">
            <div>
                <strong style="color: var(--primary-color);">${index + 1}. ${item.model}</strong>
                <span style="color: var(--text-muted); margin-left: 8px; font-weight: 600;">— ${item.qty} ədəd</span>
            </div>
            <button type="button" onclick="removeTempItem(${index})" style="background: none; border: none; color: var(--danger-color); cursor: pointer; font-size: 1.1rem; padding: 2px 6px;" title="Sil">🗑️</button>
        </div>
    `).join('');
}

window.removeTempItem = function(index) {
    tempIncomingItems.splice(index, 1);
    renderTempItemsList();
};

// 4. Form Handlers & Submissions
function initFormHandlers() {
    initTempItemHandlers();

    // Form 1: Yeni Gələn Mallar
    const formYeni = document.getElementById("form-yeni-gelen");
    formYeni.addEventListener("submit", (e) => {
        e.preventDefault();
        
        if (tempIncomingItems.length === 0) {
            alert("Zəhmət olmasa ən azı bir məhsul daxil edib '+' düyməsinə basın!");
            const inputModel = document.getElementById("yeni-model");
            if (inputModel) inputModel.focus();
            return;
        }

        const dateVal = document.getElementById("yeni-tarix").value;
        const totalCostVal = parseFloat(document.getElementById("yeni-mebleg").value);
        const totalPaidVal = parseFloat(document.getElementById("yeni-odenis").value);

        if (isNaN(totalCostVal) || totalCostVal < 0) {
            alert("Zəhmət olmasa ümumi alış məbləğini düzgün daxil edin.");
            return;
        }

        if (isNaN(totalPaidVal) || totalPaidVal < 0) {
            alert("Zəhmət olmasa ödənilən məbləği düzgün daxil edin.");
            return;
        }

        const totalQty = tempIncomingItems.reduce((sum, item) => sum + item.qty, 0);
        const modelStr = tempIncomingItems.map(i => cleanModelName(i.model)).join(', ');
        
        const inputUnitPrice = parseFloat(document.getElementById("yeni-birim-qiymet").value);
        const unitPriceVal = !isNaN(inputUnitPrice) && inputUnitPrice > 0 
            ? inputUnitPrice 
            : (totalQty > 0 ? totalCostVal / totalQty : 0);

        const record = {
            id: generateId(),
            date: dateVal,
            model: modelStr,
            items: [...tempIncomingItems],
            qty: totalQty,
            unitPrice: unitPriceVal,
            cost: totalCostVal,
            paid: totalPaidVal
        };

        state.incoming.push(record);

        saveState();
        renderIncomingTable();

        // Reset temporary list and form
        tempIncomingItems = [];
        renderTempItemsList();
        formYeni.reset();
        setDefaultDates();
    });

    // Auto-calculate unit price vs total cost
    const inputUnitPriceEl = document.getElementById("yeni-birim-qiymet");
    const inputTotalCostEl = document.getElementById("yeni-mebleg");

    if (inputUnitPriceEl && inputTotalCostEl) {
        inputUnitPriceEl.addEventListener("input", () => {
            const unitP = parseFloat(inputUnitPriceEl.value);
            const totalQty = tempIncomingItems.reduce((sum, i) => sum + i.qty, 0) || parseInt(document.getElementById("yeni-say").value || "0", 10);
            if (!isNaN(unitP) && unitP > 0 && totalQty > 0) {
                inputTotalCostEl.value = (unitP * totalQty).toFixed(2);
            }
        });

        inputTotalCostEl.addEventListener("input", () => {
            const totalCost = parseFloat(inputTotalCostEl.value);
            const totalQty = tempIncomingItems.reduce((sum, i) => sum + i.qty, 0) || parseInt(document.getElementById("yeni-say").value || "0", 10);
            if (!isNaN(totalCost) && totalCost > 0 && totalQty > 0) {
                inputUnitPriceEl.value = (totalCost / totalQty).toFixed(2);
            }
        });
    }

function autoCalculateIncomingCosts() {
    const inputUnitPriceEl = document.getElementById("yeni-birim-qiymet");
    const inputTotalCostEl = document.getElementById("yeni-mebleg");
    const totalQty = tempIncomingItems.reduce((sum, i) => sum + i.qty, 0);

    if (inputUnitPriceEl && inputTotalCostEl && totalQty > 0) {
        const unitP = parseFloat(inputUnitPriceEl.value);
        if (!isNaN(unitP) && unitP > 0) {
            inputTotalCostEl.value = (unitP * totalQty).toFixed(2);
        } else {
            const totalCost = parseFloat(inputTotalCostEl.value);
            if (!isNaN(totalCost) && totalCost > 0) {
                inputUnitPriceEl.value = (totalCost / totalQty).toFixed(2);
            }
        }
    }
}

    // Form 2: Çıxan Mallar
    const formCixan = document.getElementById("form-cixan");
    formCixan.addEventListener("submit", (e) => {
        e.preventDefault();
        const record = {
            id: generateId(),
            date: document.getElementById("cixan-tarix").value,
            model: document.getElementById("cixan-model").value.trim(),
            qty: parseInt(document.getElementById("cixan-say").value, 10),
            technician: document.getElementById("cixan-usta").value,
            warehouse: document.getElementById("cixan-anbar").value,
            price: parseFloat(document.getElementById("cixan-qiymet").value),
            address: document.getElementById("cixan-unvan").value,
            paymentStatus: "pending"
        };

        state.outgoing.push(record);
        saveState();
        renderOutgoingTable();
        formCixan.reset();
        setDefaultDates();
    });

    // Form 3: Əlavə Ödənişlər
    const formElave = document.getElementById("form-elave-odenis");
    if (formElave) {
        formElave.addEventListener("submit", (e) => {
            e.preventDefault();
            const amtVal = parseFloat(document.getElementById("elave-mebleg").value);
            if (isNaN(amtVal) || amtVal <= 0) {
                alert("Zəhmət olmasa ödənilən məbləği düzgün daxil edin.");
                return;
            }
            const record = {
                id: generateId(),
                date: document.getElementById("elave-tarix").value,
                category: document.getElementById("elave-kateqoriya").value,
                amount: amtVal,
                note: document.getElementById("elave-qeyd").value.trim()
            };

            state.extra_payments.push(record);
            saveState();
            renderExtraPaymentsTable();
            formElave.reset();
            setDefaultDates();
        });
    }
}

// Helper: Generate Unique ID
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// 5. Table Renderers
function renderAllTables() {
    renderIncomingTable();
    renderOutgoingTable();
    renderAnbarTable();
    renderExtraPaymentsTable();
    renderBorcMallarTable();
    updateModelDatalist();
    updateStatisticsData();
}

function renderIncomingTable() {
    const tbody = document.querySelector("#table-yeni-gelen tbody");
    tbody.innerHTML = "";
    
    let filtered = [...state.incoming];
    if (searchQueries.incoming) {
        filtered = filtered.filter(x => x.date === searchQueries.incoming);
    }
    
    // Sort descending by date
    const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Məlumat tapılmadı</td></tr>`;
        return;
    }

    sorted.forEach(item => {
        const paidVal = item.paid !== undefined ? item.paid : item.cost;
        const balance = item.cost - paidVal;
        const unitPriceDisp = item.unitPrice !== undefined ? item.unitPrice : (item.qty ? item.cost / item.qty : 0);
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${getItemName(item)}</td>
            <td>${item.qty}</td>
            <td style="font-weight: 600; color: var(--primary-color);">${unitPriceDisp.toFixed(2)} AZN</td>
            <td>${item.cost.toFixed(2)} AZN</td>
            <td>${paidVal.toFixed(2)} AZN</td>
            <td style="font-weight: 600; color: ${balance > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">
                ${balance.toFixed(2)} AZN
            </td>
            <td><button class="btn-delete" onclick="deleteRecord('incoming', '${item.id}')" title="Sil"><i class="bx bx-trash" style="font-size: 1.1rem; vertical-align: middle;"></i> Sil</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderOutgoingTable() {
    const tbody = document.querySelector("#table-cixan tbody");
    tbody.innerHTML = "";

    let filtered = [...state.outgoing];
    if (searchQueries.outgoing) {
        filtered = filtered.filter(x => x.date === searchQueries.outgoing);
    }

    const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Məlumat tapılmadı</td></tr>`;
        return;
    }

    sorted.forEach(item => {
        const itemNormName = getNormalizedModelKey(getItemName(item));
        const hasMatchingReturn = state.returned.some(r => 
            r.outgoingId === item.id || 
            (getNormalizedModelKey(r.model) === itemNormName && r.technician === item.technician && r.date === item.date)
        );

        if (item.isReturned && !hasMatchingReturn) {
            item.isReturned = false;
        }
        const isReturned = item.isReturned === true;

        const paymentStatus = item.paymentStatus || 'pending';
        const isPaid = paymentStatus === 'paid';

        const tr = document.createElement("tr");
        if (isReturned) {
            tr.className = "row-returned";
        } else if (isPaid) {
            tr.className = "row-paid-done";
        } else {
            tr.className = "row-pending-pay";
        }

        const returnBtnHTML = isReturned
            ? `<button type="button" class="btn-return btn-returned-done" onclick="cancelReturnRecord('${item.id}')" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); font-weight: 600;" title="Səhvən qaytarılıbsa, ləğv etmək üçün klikləyin"><i class="bx bx-undo"></i> Ləğv Et</button>`
            : `<button type="button" class="btn-return" onclick="returnRecord('${item.id}')" title="Malların qaytarılması üçün klikləyin"><i class="bx bx-revision"></i> Qaytar</button>`;

        const confirmPayBtnHTML = isPaid
            ? `<button type="button" class="btn-confirm-green active-paid btn-confirm-disabled" disabled title="Bu malın ödənişi artıq təsdiqlənib"><i class="bx bx-check-double"></i></button>`
            : `<button type="button" class="btn-confirm-green" onclick="confirmPaymentStatus('${item.id}')" title="Ödənişi təsdiq et (Yaşıl rəngə döndər)"><i class="bx bx-check"></i></button>`;

        const deleteBtnHTML = `
            <button type="button" class="btn-delete" onclick="deleteRecord('outgoing', '${item.id}')" title="Sil">
                <i class="bx bx-trash"></i>
            </button>
        `;

        tr.innerHTML = `
            <td>${item.date}</td>
            <td><strong>${getItemName(item)}</strong></td>
            <td>${item.warehouse || '-'}</td>
            <td>${item.qty}</td>
            <td>${item.technician}</td>
            <td>${item.address || '-'}</td>
            <td>${item.price.toFixed(2)} AZN</td>
            <td>
                <div style="display: inline-flex; align-items: center; gap: 6px;">
                    ${confirmPayBtnHTML}
                    ${returnBtnHTML}
                    ${deleteBtnHTML}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Global scope one-time payment confirmation function
window.confirmPaymentStatus = function(id) {
    const record = state.outgoing.find(x => x.id === id);
    if (record && record.paymentStatus !== 'paid') {
        record.paymentStatus = 'paid';
        saveState();
        renderOutgoingTable();
    }
};

window.togglePaymentStatus = function(id) {
    const record = state.outgoing.find(x => x.id === id);
    if (record) {
        record.paymentStatus = (record.paymentStatus === 'paid') ? 'pending' : 'paid';
        saveState();
        renderOutgoingTable();
    }
};

window.setPaymentStatus = function(id, status) {
    const record = state.outgoing.find(x => x.id === id);
    if (record) {
        record.paymentStatus = status;
        saveState();
        renderOutgoingTable();
    }
};

// Global scope delete function for onclick bindings
window.deleteRecord = function(storeType, id) {
    if (confirm("Bu qeydi silmək istədiyinizdən əminsiniz?")) {
        if (storeType === 'incoming') {
            state.incoming = state.incoming.filter(x => x.id !== id);
        } else if (storeType === 'outgoing') {
            state.outgoing = state.outgoing.filter(x => x.id !== id);
        } else if (storeType === 'returned') {
            const retItem = state.returned.find(x => x.id === id);
            if (retItem) {
                const outItem = state.outgoing.find(o => o.id === retItem.outgoingId || (getItemName(o) === retItem.model && o.technician === retItem.technician));
                if (outItem) outItem.isReturned = false;
            }
            state.returned = state.returned.filter(x => x.id !== id);
        } else if (storeType === 'extra_payment') {
            state.extra_payments = state.extra_payments.filter(x => x.id !== id);
        }
        saveState();
        renderAllTables();
    }
};

window.returnRecord = function(id) {
    const record = state.outgoing.find(x => x.id === id);
    if (!record) return;

    if (record.isReturned) {
        alert("Bu mal artıq qaytarılıb!");
        return;
    }

    const itemName = getItemName(record);
    const returnQtyStr = prompt(`"${itemName}" malı üçün qaytarılan sayı daxil edin (Maksimum: ${record.qty}):`, record.qty);
    if (returnQtyStr === null) return; // İmtina edildi

    const returnQty = parseInt(returnQtyStr, 10);
    if (isNaN(returnQty) || returnQty <= 0) {
        alert("Zəhmət olmasa düzgün say daxil edin.");
        return;
    }

    if (returnQty > record.qty) {
        alert(`Qaytarılan say çıxan saydan (${record.qty}) çox ola bilməz.`);
        return;
    }

    // Mark outgoing record as returned
    record.isReturned = true;

    // Qaytarılma obyekti yaradırıq
    const returnRec = {
        id: generateId(),
        outgoingId: record.id,
        date: new Date().toISOString().split('T')[0],
        model: itemName,
        qty: returnQty,
        technician: record.technician,
        warehouse: record.warehouse || '',
        price: record.price || 0,
        address: record.address || ''
    };

    state.returned.push(returnRec);
    saveState();
    renderAllTables();
    alert("Qeyd qaytarılan mallar siyahısına əlavə edildi.");
};

window.cancelReturnRecord = function(id) {
    const record = state.outgoing.find(x => x.id === id);
    if (!record) return;

    if (confirm(`"${getItemName(record)}" malı üçün qaytarılma statusunu ləğv etmək istədiyinizdən əminsiniz? (Mal yenidən çıxan mallara bərpa olunacaq)`)) {
        record.isReturned = false;
        
        // Remove from returned array
        const recNameNorm = getNormalizedModelKey(getItemName(record));
        state.returned = state.returned.filter(r => {
            const isMatch = r.outgoingId === id || (getNormalizedModelKey(r.model) === recNameNorm && r.technician === record.technician);
            return !isMatch;
        });

        saveState();
        renderAllTables();
        alert("Qaytarılma ləğv olundu və mal çıxan mallar siyahısına bərpa edildi.");
    }
};

// 5a. Warehouse Inventory Stock Calculator & Renderer
function getWarehouseInventory() {
    const inventory = {};

    // 1. Process Incoming Goods
    state.incoming.forEach(inc => {
        if (inc.items && Array.isArray(inc.items) && inc.items.length > 0) {
            inc.items.forEach(i => {
                const normKey = getNormalizedModelKey(i.model);
                if (normKey) {
                    if (!inventory[normKey]) {
                        inventory[normKey] = { 
                            model: formatCanonicalModel(i.model), 
                            incoming: 0, 
                            outgoing: 0, 
                            returned: 0, 
                            stock: 0 
                        };
                    }
                    inventory[normKey].incoming += i.qty;
                }
            });
        } else {
            const name = getItemName(inc);
            const normKey = getNormalizedModelKey(name);
            if (normKey && normKey !== '-') {
                if (!inventory[normKey]) {
                    inventory[normKey] = { 
                        model: formatCanonicalModel(name), 
                        incoming: 0, 
                        outgoing: 0, 
                        returned: 0, 
                        stock: 0 
                    };
                }
                inventory[normKey].incoming += inc.qty;
            }
        }
    });

    // 2. Process Outgoing Goods (Yalnız Razin anbarından çıxan mallar anbar stokunu azaldır)
    state.outgoing.forEach(out => {
        if ((out.warehouse || '').trim() === "Razin") {
            const name = getItemName(out);
            const normKey = getNormalizedModelKey(name);
            if (normKey && normKey !== '-') {
                if (!inventory[normKey]) {
                    inventory[normKey] = { 
                        model: formatCanonicalModel(name), 
                        incoming: 0, 
                        outgoing: 0, 
                        returned: 0, 
                        stock: 0 
                    };
                }
                inventory[normKey].outgoing += out.qty;
            }
        }
    });

    // 3. Process Returned Goods (Yalnız Razin anbarına qaytarılan mallar stoka bərpa olunur)
    state.returned.forEach(ret => {
        if (!ret.warehouse || (ret.warehouse || '').trim() === "Razin") {
            const name = getItemName(ret);
            const normKey = getNormalizedModelKey(name);
            if (normKey && normKey !== '-') {
                if (!inventory[normKey]) {
                    inventory[normKey] = { 
                        model: formatCanonicalModel(name), 
                        incoming: 0, 
                        outgoing: 0, 
                        returned: 0, 
                        stock: 0 
                    };
                }
                inventory[normKey].returned += ret.qty;
            }
        }
    });

    // 4. Calculate Net Stock: Stock = Incoming + Returned - Outgoing
    const result = [];
    Object.keys(inventory).forEach(normKey => {
        const item = inventory[normKey];
        item.stock = item.incoming + item.returned - item.outgoing;
        result.push(item);
    });

    return result.sort((a, b) => a.model.localeCompare(b.model));
}

function renderAnbarTable() {
    const tbody = document.querySelector("#table-anbar tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const inventory = getWarehouseInventory();

    // Filter by search query if active
    const searchVal = (searchQueries.anbar || "").toLowerCase().trim();
    const filtered = searchVal 
        ? inventory.filter(x => x.model.toLowerCase().includes(searchVal))
        : inventory;

    // Update Stats Cards
    const totalQty = inventory.reduce((sum, x) => sum + Math.max(0, x.stock), 0);
    const totalModels = inventory.length;
    const lowStockCount = inventory.filter(x => x.stock <= 3).length;

    const elTotalQty = document.getElementById("anbar-total-qty");
    const elTotalModels = document.getElementById("anbar-total-models");
    const elLowStock = document.getElementById("anbar-low-stock");

    if (elTotalQty) elTotalQty.textContent = `${totalQty} ədəd`;
    if (elTotalModels) elTotalModels.textContent = `${totalModels} çeşid`;
    if (elLowStock) elLowStock.textContent = `${lowStockCount} çeşid`;

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Anbarda məlumat tapılmadı</td></tr>`;
        return;
    }

    filtered.forEach((item, index) => {
        const tr = document.createElement("tr");
        
        let statusBadge = "";
        let stockColor = "var(--primary-color)";

        if (item.stock <= 0) {
            statusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: var(--danger-color); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">Bitib (0)</span>`;
            stockColor = "var(--danger-color)";
        } else if (item.stock <= 3) {
            statusBadge = `<span style="background: rgba(245, 158, 11, 0.15); color: #d97706; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">Az qalıb</span>`;
            stockColor = "#d97706";
        } else {
            statusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">Mövcuddur</span>`;
            stockColor = "var(--success-color)";
        }

        tr.innerHTML = `
            <td style="text-align: center; font-weight: 600; color: var(--text-muted);">${index + 1}</td>
            <td><strong>${item.model}</strong></td>
            <td style="text-align: center; color: var(--success-color); font-weight: 600;">+${item.incoming}</td>
            <td style="text-align: center; color: var(--danger-color); font-weight: 600;">-${item.outgoing}</td>
            <td style="text-align: center; color: var(--accent-color); font-weight: 600;">+${item.returned}</td>
            <td style="text-align: center; font-size: 1.1rem; font-weight: 800; color: ${stockColor};">${item.stock} ədəd</td>
            <td style="text-align: center;">${statusBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 5b. Dashboard Dynamic Interactive Timeframe Filtering
function filterByTimeframe(records, period) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (period === "daily") {
        return records.filter(r => r.date === todayStr);
    } else if (period === "weekly") {
        const currentDay = today.getDay();
        const distanceToMonday = (currentDay === 0 ? -6 : 1 - currentDay);
        
        const monday = new Date(today);
        monday.setDate(today.getDate() + distanceToMonday);
        const mondayStr = monday.toISOString().split('T')[0];

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        const sundayStr = sunday.toISOString().split('T')[0];

        return records.filter(r => r.date >= mondayStr && r.date <= sundayStr);
    } else if (period === "monthly") {
        const currentMonthStr = todayStr.substring(0, 7);
        return records.filter(r => r.date.startsWith(currentMonthStr));
    }
    return records;
}

function updateDashboardStatsCards() {
    // 1. Incoming Stats
    const incRecords = filterByTimeframe(state.incoming, dashboardTimeframes.incoming);
    const incQty = incRecords.reduce((sum, x) => sum + x.qty, 0);
    const incCost = incRecords.reduce((sum, x) => sum + x.cost, 0);
    const incPaid = incRecords.reduce((sum, x) => sum + (x.paid !== undefined ? x.paid : x.cost), 0);
    const incBalance = incCost - incPaid;

    const elIncQty = document.getElementById("stat-inc-qty");
    const elIncCost = document.getElementById("stat-inc-cost");
    const elIncPaid = document.getElementById("stat-inc-paid");
    const elIncBalance = document.getElementById("stat-inc-balance");

    if (elIncQty) elIncQty.textContent = `${incQty} ədəd`;
    if (elIncCost) elIncCost.textContent = `${incCost.toFixed(2)} AZN`;
    if (elIncPaid) elIncPaid.textContent = `${incPaid.toFixed(2)} AZN`;
    if (elIncBalance) elIncBalance.textContent = `${incBalance.toFixed(2)} AZN`;

    // 2. Outgoing Stats
    const outRecords = filterByTimeframe(state.outgoing, dashboardTimeframes.outgoing);
    const retRecords = filterByTimeframe(state.returned, dashboardTimeframes.outgoing);

    const outQty = outRecords.reduce((sum, x) => sum + x.qty, 0);
    const outRevenue = outRecords.reduce((sum, x) => sum + (x.qty * x.price), 0);
    const retQty = retRecords.reduce((sum, x) => sum + x.qty, 0);

    let retDeduction = 0;
    retRecords.forEach(r => {
        const rName = getItemName(r);
        const match = state.outgoing.find(o => getItemName(o) === rName);
        if (match) retDeduction += r.qty * match.price;
    });

    const netRevenue = Math.max(0, outRevenue - retDeduction);

    const elOutQty = document.getElementById("stat-out-qty");
    const elOutRevenue = document.getElementById("stat-out-revenue");
    const elOutRetQty = document.getElementById("stat-out-ret-qty");
    const elOutNetRevenue = document.getElementById("stat-out-net-revenue");

    if (elOutQty) elOutQty.textContent = `${outQty} ədəd`;
    if (elOutRevenue) elOutRevenue.textContent = `${outRevenue.toFixed(2)} AZN`;
    if (elOutRetQty) elOutRetQty.textContent = `${retQty} ədəd`;
    if (elOutNetRevenue) elOutNetRevenue.textContent = `${netRevenue.toFixed(2)} AZN`;
}

function initTimeframeToggleListeners() {
    const setupToggle = (containerId, type) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        const buttons = container.querySelectorAll("button");
        buttons.forEach(btn => {
            btn.addEventListener("click", () => {
                buttons.forEach(b => {
                    b.classList.remove("active");
                    b.style.background = "transparent";
                    b.style.color = "var(--text-muted)";
                    b.style.boxShadow = "none";
                });
                btn.classList.add("active");
                btn.style.background = "#ffffff";
                btn.style.color = "var(--primary-color)";
                btn.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

                dashboardTimeframes[type] = btn.getAttribute("data-period");
                updateDashboardStatsCards();
            });
        });
    };

    setupToggle("inc-timeframe-buttons", "incoming");
    setupToggle("out-timeframe-buttons", "outgoing");
}

// 6. Dashboard Calculations
function updateDashboard() {
    updateDashboardStatsCards();
    const todayStr = new Date().toISOString().split('T')[0];

    // Calc today's stats
    const todayIncoming = state.incoming.filter(x => x.date === todayStr).reduce((sum, x) => sum + x.qty, 0);
    const todayOutgoing = state.outgoing.filter(x => x.date === todayStr).reduce((sum, x) => sum + x.qty, 0);
    const todayReturned = state.returned.filter(x => x.date === todayStr).reduce((sum, x) => sum + x.qty, 0);

    document.getElementById("dash-today-incoming").textContent = todayIncoming;
    document.getElementById("dash-today-outgoing").textContent = todayOutgoing;
    document.getElementById("dash-today-returned").textContent = todayReturned;

    // Combine recent operations
    const recentOps = [];
    state.incoming.forEach(x => recentOps.push({ ...x, type: 'Giriş', labelClass: 'text-green', costDetail: `-${x.cost.toFixed(2)} AZN` }));
    state.outgoing.forEach(x => recentOps.push({ ...x, type: 'Çıxış', labelClass: 'text-red', costDetail: `+${(x.qty * x.price).toFixed(2)} AZN (${x.technician})` }));
    state.returned.forEach(x => recentOps.push({ ...x, type: 'Qaytarılan', labelClass: '', costDetail: `${x.qty} ədəd (${x.technician})` }));

    // Sort by date descending
    recentOps.sort((a, b) => b.date.localeCompare(a.date));

    // Filter recent operations if date search query is active
    let filteredOps = [...recentOps];
    if (searchQueries.dash) {
        filteredOps = filteredOps.filter(x => x.date === searchQueries.dash);
    }

    // Render top 7 (or all matching if searching)
    const tbody = document.querySelector("#dashboard-recent-table tbody");
    tbody.innerHTML = "";
    const displayOps = searchQueries.dash ? filteredOps : filteredOps.slice(0, 7);

    if (displayOps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Hələ heç bir əməliyyat edilməyib</td></tr>`;
        return;
    }

    displayOps.forEach(op => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${op.date}</td>
            <td><strong>${op.type}</strong></td>
            <td>${getItemName(op)}</td>
            <td>${op.qty}</td>
            <td>${op.costDetail}</td>
        `;
        tbody.appendChild(tr);
    });
}

// 7. Settings Actions (Keçmiş & Ayın Sonu)
function initSettingsHandlers() {
    // Keçmiş filter action
    const btnFilterDate = document.getElementById("btn-filter-date");
    btnFilterDate.addEventListener("click", () => {
        const dateVal = document.getElementById("filter-date").value;
        if (!dateVal) return;

        document.getElementById("selected-history-date").textContent = dateVal;
        
        // Filter elements
        const inc = state.incoming.filter(x => x.date === dateVal);
        const out = state.outgoing.filter(x => x.date === dateVal);
        const ret = state.returned.filter(x => x.date === dateVal);

        const incList = document.getElementById("history-incoming-list");
        const outList = document.getElementById("history-outgoing-list");
        const retList = document.getElementById("history-returned-list");

        // Render Incoming
        if (inc.length === 0) {
            incList.innerHTML = `<li>Giriş qeydi tapılmadı.</li>`;
        } else {
            incList.innerHTML = inc.map(x => {
                const p = x.paid !== undefined ? x.paid : x.cost;
                return `<li><strong>${getItemName(x)}</strong> - ${x.qty} ədəd (Ümumi: ${x.cost.toFixed(2)} AZN, Ödənilən: ${p.toFixed(2)} AZN, Qalıq: ${(x.cost - p).toFixed(2)} AZN)</li>`;
            }).join('');
        }

        // Render Outgoing
        if (out.length === 0) {
            outList.innerHTML = `<li>Çıxış qeydi tapılmadı.</li>`;
        } else {
            outList.innerHTML = out.map(x => `<li><strong>${getItemName(x)}</strong> - ${x.qty} ədəd (${x.warehouse || '-'} anbarı, Usta: ${x.technician}, Ünvan: ${x.address || '-'} - Satış: ${(x.qty * x.price).toFixed(2)} AZN)</li>`).join('');
        }

        // Render Returned
        if (ret.length === 0) {
            retList.innerHTML = `<li>Qaytarılan qeyd tapılmadı.</li>`;
        } else {
            retList.innerHTML = ret.map(x => `<li><strong>${getItemName(x)}</strong> - ${x.qty} ədəd (Usta: ${x.technician}, Anbar: ${x.warehouse || '-'}, Ünvan: ${x.address || '-'}, Satış qiyməti: ${x.price ? x.price.toFixed(2) + ' AZN' : '-'})</li>`).join('');
        }

        // Render Extra Payments
        const extra = state.extra_payments.filter(x => x.date === dateVal);
        const extraList = document.getElementById("history-extra-list");
        if (extraList) {
            if (extra.length === 0) {
                extraList.innerHTML = `<li>Əlavə ödəniş qeydi tapılmadı.</li>`;
            } else {
                extraList.innerHTML = extra.map(x => `<li><strong>${x.category}</strong> - ${x.amount.toFixed(2)} AZN (${x.note || 'Qeyd yoxdur'})</li>`).join('');
            }
        }

        document.getElementById("history-results").style.display = "block";
    });

    // Tarix aralığı hesabatı generator
    const btnFilterMonth = document.getElementById("btn-filter-month");
    btnFilterMonth.addEventListener("click", () => {
        const startVal = document.getElementById("filter-start-date").value;
        const endVal = document.getElementById("filter-end-date").value;
        
        if (!startVal || !endVal) {
            alert("Zəhmət olmasa həm başlanğıc, həm də bitmə tarixini seçin.");
            return;
        }

        if (startVal > endVal) {
            alert("Başlanğıc tarixi bitmə tarixindən gec ola bilməz.");
            return;
        }

        const displayLabel = `${startVal} - ${endVal}`;
        document.getElementById("selected-report-month").textContent = displayLabel;

        const isBetween = (dateStr) => {
            return dateStr >= startVal && dateStr <= endVal;
        };

        // Filter arrays matching date range
        const inc = state.incoming.filter(x => isBetween(x.date));
        const out = state.outgoing.filter(x => isBetween(x.date));
        const ret = state.returned.filter(x => isBetween(x.date));
        const extra = state.extra_payments.filter(x => isBetween(x.date));

        // Quantities
        const incQty = inc.reduce((sum, x) => sum + x.qty, 0);
        const incCost = inc.reduce((sum, x) => sum + x.cost, 0);
        const incPaid = inc.reduce((sum, x) => sum + (x.paid !== undefined ? x.paid : x.cost), 0);
        const incBalance = incCost - incPaid;
        
        const rawSoldQty = out.reduce((sum, x) => sum + x.qty, 0);
        const rawSalesRevenue = out.reduce((sum, x) => sum + (x.qty * x.price), 0);

        const retQty = ret.reduce((sum, x) => sum + x.qty, 0);
        const extraCost = extra.reduce((sum, x) => sum + x.amount, 0);

        // Calculate returned revenue to deduct
        let returnedRevenueDeduction = 0;
        ret.forEach(r => {
            const rName = getItemName(r);
            const match = state.outgoing.find(o => getItemName(o) === rName && o.technician === r.technician) || state.outgoing.find(o => getItemName(o) === rName);
            if (match) {
                returnedRevenueDeduction += r.qty * match.price;
            }
        });

        const netSoldQty = Math.max(0, rawSoldQty - retQty);
        const netSalesRevenue = Math.max(0, rawSalesRevenue - returnedRevenueDeduction);

        // Group incoming items by brand and model
        const incGroup = {};
        inc.forEach(x => {
            if (x.items && Array.isArray(x.items) && x.items.length > 0) {
                x.items.forEach(i => {
                    const disp = formatCanonicalModel(i.model);
                    incGroup[disp] = (incGroup[disp] || 0) + i.qty;
                });
            } else {
                const disp = formatCanonicalModel(getItemName(x));
                incGroup[disp] = (incGroup[disp] || 0) + x.qty;
            }
        });
        
        let incDetailsHTML = "";
        const incGroupKeys = Object.keys(incGroup);
        if (incGroupKeys.length > 0) {
            incDetailsHTML = "<ul style='list-style: none; padding-left: 10px;'>" + incGroupKeys.map(k => `<li>• ${k}: <strong>${incGroup[k]} ədəd</strong></li>`).join("") + "</ul>";
        } else {
            incDetailsHTML = "<em>Məlumat yoxdur</em>";
        }
        document.getElementById("report-incoming-details").innerHTML = incDetailsHTML;

        // Group sold items by brand and model (subtracting returns)
        const soldGroup = {};
        out.forEach(x => {
            const disp = formatCanonicalModel(getItemName(x));
            soldGroup[disp] = (soldGroup[disp] || 0) + x.qty;
        });
        ret.forEach(x => {
            const disp = formatCanonicalModel(getItemName(x));
            if (soldGroup[disp]) {
                soldGroup[disp] = Math.max(0, soldGroup[disp] - x.qty);
            }
        });

        let soldDetailsHTML = "";
        const soldGroupKeys = Object.keys(soldGroup);
        if (soldGroupKeys.length > 0) {
            soldDetailsHTML = "<ul style='list-style: none; padding-left: 10px;'>" + soldGroupKeys.map(k => `<li>• ${k}: <strong>${soldGroup[k]} ədəd</strong></li>`).join("") + "</ul>";
        } else {
            soldDetailsHTML = "<em>Məlumat yoxdur</em>";
        }
        document.getElementById("report-sold-details").innerHTML = soldDetailsHTML;

        // Update display text values
        document.getElementById("report-incoming-qty").textContent = `${incQty} ədəd`;
        document.getElementById("report-incoming-cost").textContent = `${incCost.toFixed(2)} AZN`;
        document.getElementById("report-incoming-paid").textContent = `${incPaid.toFixed(2)} AZN`;
        document.getElementById("report-incoming-balance").textContent = `${incBalance.toFixed(2)} AZN`;
        
        document.getElementById("report-sold-qty").textContent = `${netSoldQty} ədəd (Xalis)`;
        document.getElementById("report-sold-amount").textContent = `${netSalesRevenue.toFixed(2)} AZN`;
        
        document.getElementById("report-returned-qty").textContent = `${retQty} ədəd`;

        const reportExtraCostEl = document.getElementById("report-extra-cost");
        if (reportExtraCostEl) reportExtraCostEl.textContent = `${extraCost.toFixed(2)} AZN`;

        // Financial cards
        document.getElementById("summary-total-cost").textContent = `${incCost.toFixed(2)} AZN`;
        const summaryExtraCostEl = document.getElementById("summary-extra-cost");
        if (summaryExtraCostEl) summaryExtraCostEl.textContent = `${extraCost.toFixed(2)} AZN`;
        document.getElementById("summary-total-revenue").textContent = `${netSalesRevenue.toFixed(2)} AZN`;

        const profit = netSalesRevenue - incCost - extraCost;
        const profitEl = document.getElementById("summary-profit");
        profitEl.textContent = `${profit.toFixed(2)} AZN`;

        if (profit >= 0) {
            profitEl.className = "summary-value text-green";
        } else {
            profitEl.className = "summary-value text-red";
        }

        document.getElementById("report-results").style.display = "block";
    });
}

// 8. Extra Payments Renderer & Calculator
function renderExtraPaymentsTable() {
    updateExtraPaymentsStats();
    const tbody = document.querySelector("#table-elave-odenis tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    let filtered = [...state.extra_payments];
    if (searchQueries.extra) {
        filtered = filtered.filter(x => x.date === searchQueries.extra);
    }

    const sorted = filtered.sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Məlumat tapılmadı</td></tr>`;
        return;
    }

    sorted.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.date}</td>
            <td><strong>${item.category}</strong></td>
            <td style="font-weight: 700; color: var(--danger-color);">${item.amount.toFixed(2)} AZN</td>
            <td>${item.note || '-'}</td>
            <td><button type="button" class="btn-delete" onclick="deleteRecord('extra_payment', '${item.id}')" title="Sil"><i class="bx bx-trash" style="font-size: 1.1rem; vertical-align: middle;"></i> Sil</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateExtraPaymentsStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    const totalAmount = state.extra_payments.reduce((sum, x) => sum + x.amount, 0);
    const todayAmount = state.extra_payments.filter(x => x.date === todayStr).reduce((sum, x) => sum + x.amount, 0);
    const monthAmount = state.extra_payments.filter(x => x.date.startsWith(monthStr)).reduce((sum, x) => sum + x.amount, 0);

    const elTotal = document.getElementById("elave-total-amount");
    const elToday = document.getElementById("elave-today-amount");
    const elMonth = document.getElementById("elave-month-amount");

    if (elTotal) elTotal.textContent = `${totalAmount.toFixed(2)} AZN`;
    if (elToday) elToday.textContent = `${todayAmount.toFixed(2)} AZN`;
    if (elMonth) elMonth.textContent = `${monthAmount.toFixed(2)} AZN`;
}

// 9. Borca Alınan Mallar Renderer & Supplier Debt Payment Handler
function renderBorcMallarTable() {
    updateBorcMallarStats();
    const tbody = document.querySelector("#table-borc-mallar tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    let records = [...state.incoming];

    const searchVal = (searchQueries.borc || "").toLowerCase().trim();
    if (searchVal) {
        records = records.filter(x => 
            x.date.includes(searchVal) || 
            getItemName(x).toLowerCase().includes(searchVal)
        );
    }

    // Sort descending by date
    const sorted = records.sort((a, b) => b.date.localeCompare(a.date));

    if (sorted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Məlumat tapılmadı</td></tr>`;
        return;
    }

    sorted.forEach(item => {
        const paidVal = item.paid !== undefined ? item.paid : item.cost;
        const balance = item.cost - paidVal;
        const itemName = getItemName(item);

        let statusBadge = "";
        if (balance > 0) {
            statusBadge = `<span style="background: rgba(239, 68, 68, 0.15); color: var(--danger-color); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">Qalıq Borc Var</span>`;
        } else {
            statusBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;">Borc Ödənilib</span>`;
        }

        const payBtnHTML = balance > 0
            ? `<button type="button" class="btn-primary" onclick="paySupplierDebt('${item.id}')" style="padding: 5px 12px; font-size: 0.82rem; background: var(--accent-color); color: #fff; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="Borc Ödə"><i class="bx bx-credit-card"></i> Borc Ödə</button>`
            : `<span style="color: var(--success-color); font-size: 0.85rem; font-weight: 600;">✔️ Tam Ödənilib</span>`;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.date}</td>
            <td><strong>${itemName}</strong></td>
            <td>${item.qty}</td>
            <td>${item.cost.toFixed(2)} AZN</td>
            <td>${paidVal.toFixed(2)} AZN</td>
            <td style="font-weight: 700; color: ${balance > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">
                ${balance.toFixed(2)} AZN
            </td>
            <td>${statusBadge}</td>
            <td>${payBtnHTML}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateBorcMallarStats() {
    let totalBalance = 0;
    let countUnpaid = 0;
    let countPaid = 0;

    state.incoming.forEach(item => {
        const paidVal = item.paid !== undefined ? item.paid : item.cost;
        const bal = item.cost - paidVal;
        if (bal > 0) {
            totalBalance += bal;
            countUnpaid++;
        } else {
            countPaid++;
        }
    });

    const elBalance = document.getElementById("borc-total-balance");
    const elUnpaid = document.getElementById("borc-count-unpaid");
    const elPaid = document.getElementById("borc-count-paid");

    if (elBalance) elBalance.textContent = `${totalBalance.toFixed(2)} AZN`;
    if (elUnpaid) elUnpaid.textContent = `${countUnpaid} partiya`;
    if (elPaid) elPaid.textContent = `${countPaid} partiya`;
}

window.paySupplierDebt = function(id) {
    const record = state.incoming.find(x => x.id === id);
    if (!record) return;

    const currentPaid = record.paid !== undefined ? record.paid : record.cost;
    const remainingDebt = record.cost - currentPaid;

    if (remainingDebt <= 0) {
        alert("Bu partiya üçün qalıq borc yoxdur (Tam ödənilib).");
        return;
    }

    const itemName = getItemName(record);
    const payInput = prompt(`"${itemName}" alış partiyası üçün ödəniləcək məbləği daxil edin (Cari Qalıq Borc: ${remainingDebt.toFixed(2)} AZN):`, remainingDebt.toFixed(2));
    
    if (payInput === null) return;

    const payAmt = parseFloat(payInput);
    if (isNaN(payAmt) || payAmt <= 0) {
        alert("Zəhmət olmasa düzgün məbləğ daxil edin.");
        return;
    }

    if (payAmt > remainingDebt + 0.01) {
        alert(`Daxil edilən məbləğ qalıq borcdan (${remainingDebt.toFixed(2)} AZN) böyük ola bilməz.`);
        return;
    }

    // Update incoming record paid amount
    record.paid = currentPaid + payAmt;

    // Log entry in extra_payments for accounting expense tracking
    const todayStr = new Date().toISOString().split('T')[0];
    const extraRecord = {
        id: generateId(),
        date: todayStr,
        category: "Təchizatçıya Ödəniş",
        amount: payAmt,
        note: `Alış borcu ödənişi: ${itemName}`
    };
    state.extra_payments.push(extraRecord);

    saveState();
    renderAllTables();
    alert(`✅ ${payAmt.toFixed(2)} AZN borc ödənişi uğurla həyata keçirildi!`);
};

// 10. Dynamic Auto-complete Model Datalist Generator
function updateModelDatalist() {
    const datalist = document.getElementById("model-list");
    if (!datalist) return;

    sanitizeStateData();

    const modelsMap = new Map(); // normalizedKey -> canonicalDisplay

    // From warehouse inventory
    if (typeof getWarehouseInventory === "function") {
        const inventory = getWarehouseInventory();
        inventory.forEach(item => {
            const normKey = getNormalizedModelKey(item.model);
            if (normKey) {
                modelsMap.set(normKey, formatCanonicalModel(item.model));
            }
        });
    }

    // From incoming records
    if (state.incoming && Array.isArray(state.incoming)) {
        state.incoming.forEach(inc => {
            if (inc.items && Array.isArray(inc.items)) {
                inc.items.forEach(i => {
                    const normKey = getNormalizedModelKey(i.model);
                    if (normKey) modelsMap.set(normKey, formatCanonicalModel(i.model));
                });
            }
            const name = getItemName(inc);
            const normKey = getNormalizedModelKey(name);
            if (normKey && normKey !== '-') modelsMap.set(normKey, formatCanonicalModel(name));
        });
    }

    // From outgoing records
    if (state.outgoing && Array.isArray(state.outgoing)) {
        state.outgoing.forEach(out => {
            const name = getItemName(out);
            const normKey = getNormalizedModelKey(name);
            if (normKey && normKey !== '-') modelsMap.set(normKey, formatCanonicalModel(name));
        });
    }

    const sortedModels = Array.from(modelsMap.values()).sort((a, b) => a.localeCompare(b));

    datalist.innerHTML = sortedModels.map(m => `<option value="${m}"></option>`).join('');
}

// 11. Statistika (Sales Analytics & YoY Chart Engine)
let chartMonthlySalesInstance = null;
let chartTopModelsInstance = null;
let selectedStatsYear = "2026";

function initStatisticsTab() {
    const yearSelect = document.getElementById("stats-year-select");
    if (!yearSelect) return;

    const yearsSet = new Set();
    const startYear = 2026;
    const currentYr = new Date().getFullYear();
    const endYear = Math.max(startYear + 5, currentYr + 2); // 2026 up to 2031+

    for (let y = startYear; y <= endYear; y++) {
        yearsSet.add(y.toString());
    }

    state.outgoing.forEach(r => {
        if (r.date && r.date.length >= 4) {
            const yr = parseInt(r.date.substring(0, 4), 10);
            if (!isNaN(yr) && yr >= 2026) yearsSet.add(yr.toString());
        }
    });
    state.incoming.forEach(r => {
        if (r.date && r.date.length >= 4) {
            const yr = parseInt(r.date.substring(0, 4), 10);
            if (!isNaN(yr) && yr >= 2026) yearsSet.add(yr.toString());
        }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => a.localeCompare(b));
    yearSelect.innerHTML = sortedYears.map(y => `<option value="${y}" ${y === selectedStatsYear ? 'selected' : ''}>${y}-cı il</option>`).join('');

    yearSelect.addEventListener("change", () => {
        selectedStatsYear = yearSelect.value;
        updateStatisticsData();
    });
}

function updateStatisticsData() {
    if (!document.getElementById("statistika-tab")) return;

    const yearSelect = document.getElementById("stats-year-select");
    if (yearSelect && (!yearSelect.value || yearSelect.options.length === 0)) {
        initStatisticsTab();
    }
    if (yearSelect && yearSelect.value) {
        selectedStatsYear = yearSelect.value;
    }

    const curYear = parseInt(selectedStatsYear, 10);
    const prevYear = curYear - 1;
    const curYearStr = curYear.toString();
    const prevYearStr = prevYear.toString();

    // 1. Calculate Yearly Metrics
    const curYearOutgoing = state.outgoing.filter(x => x.date && x.date.startsWith(curYearStr));
    const curYearReturned = state.returned.filter(x => x.date && x.date.startsWith(curYearStr));

    const prevYearOutgoing = state.outgoing.filter(x => x.date && x.date.startsWith(prevYearStr));
    const prevYearReturned = state.returned.filter(x => x.date && x.date.startsWith(prevYearStr));

    const getNetRevenue = (outgoingArr, returnedArr) => {
        const rawRev = outgoingArr.reduce((sum, x) => sum + (x.qty * x.price), 0);
        let retDed = 0;
        returnedArr.forEach(r => {
            const rName = getItemName(r);
            const match = state.outgoing.find(o => getItemName(o) === rName && o.technician === r.technician) || state.outgoing.find(o => getItemName(o) === rName);
            if (match) retDed += r.qty * match.price;
        });
        return Math.max(0, rawRev - retDed);
    };

    const getNetSoldQty = (outgoingArr, returnedArr) => {
        const rawQty = outgoingArr.reduce((sum, x) => sum + x.qty, 0);
        const retQty = returnedArr.reduce((sum, x) => sum + x.qty, 0);
        return Math.max(0, rawQty - retQty);
    };

    const curYearSales = getNetRevenue(curYearOutgoing, curYearReturned);
    const prevYearSales = getNetRevenue(prevYearOutgoing, prevYearReturned);
    const curYearSoldQty = getNetSoldQty(curYearOutgoing, curYearReturned);

    // YoY Growth % calculation
    let yoyGrowthPercent = 0;
    if (prevYearSales > 0) {
        yoyGrowthPercent = ((curYearSales - prevYearSales) / prevYearSales) * 100;
    } else if (curYearSales > 0) {
        yoyGrowthPercent = 100;
    }

    // Update Stat Cards UI
    const elCurSales = document.getElementById("stats-current-year-sales");
    const elPrevSales = document.getElementById("stats-prev-year-sales");
    const elYoyGrowth = document.getElementById("stats-yoy-growth");
    const elSoldQty = document.getElementById("stats-year-sold-qty");

    const elCurLabel = document.getElementById("stats-current-year-label");
    const elPrevLabel = document.getElementById("stats-prev-year-label");
    const elTableYear = document.getElementById("stats-table-year-label");

    if (elCurSales) elCurSales.textContent = `${curYearSales.toFixed(2)} AZN`;
    if (elPrevSales) elPrevSales.textContent = `${prevYearSales.toFixed(2)} AZN`;
    if (elSoldQty) elSoldQty.textContent = `${curYearSoldQty} ədəd`;
    if (elTableYear) elTableYear.textContent = curYearStr;

    if (elCurLabel) elCurLabel.textContent = `${curYearStr}-ci il üzrə xalis satış`;
    if (elPrevLabel) elPrevLabel.textContent = `${prevYearStr}-ci il üzrə məbləğ`;

    if (elYoyGrowth) {
        const sign = yoyGrowthPercent >= 0 ? "+" : "";
        elYoyGrowth.textContent = `${sign}${yoyGrowthPercent.toFixed(1)}%`;
        if (yoyGrowthPercent >= 0) {
            elYoyGrowth.style.color = "var(--success-color)";
        } else {
            elYoyGrowth.style.color = "var(--danger-color)";
        }
    }

    // 2. Month-by-Month Breakdown (Yanvar - Dekabr)
    const monthNames = [
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
        "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
    ];

    const monthlyData = monthNames.map((name, index) => {
        const monthNumStr = (index + 1).toString().padStart(2, '0');
        const monthPrefix = `${curYearStr}-${monthNumStr}`;

        const mOut = curYearOutgoing.filter(x => x.date && x.date.startsWith(monthPrefix));
        const mRet = curYearReturned.filter(x => x.date && x.date.startsWith(monthPrefix));

        const rawQty = mOut.reduce((sum, x) => sum + x.qty, 0);
        const retQty = mRet.reduce((sum, x) => sum + x.qty, 0);
        const netQty = Math.max(0, rawQty - retQty);

        const rawRev = mOut.reduce((sum, x) => sum + (x.qty * x.price), 0);
        let retDed = 0;
        mRet.forEach(r => {
            const rName = getItemName(r);
            const match = state.outgoing.find(o => getItemName(o) === rName);
            if (match) retDed += r.qty * match.price;
        });
        const netRev = Math.max(0, rawRev - retDed);

        return {
            monthName: name,
            monthNum: monthNumStr,
            rawQty,
            retQty,
            netQty,
            rawRev,
            netRev
        };
    });

    // Render Monthly Table
    renderMonthlyStatsTable(monthlyData);

    // 3. Top Selling Product Models for the Year
    const modelSalesMap = new Map();
    curYearOutgoing.forEach(out => {
        const name = getItemName(out);
        const normKey = getNormalizedModelKey(name);
        if (normKey) {
            const existing = modelSalesMap.get(normKey) || { name: formatCanonicalModel(name), qty: 0, revenue: 0 };
            existing.qty += out.qty;
            existing.revenue += out.qty * out.price;
            modelSalesMap.set(normKey, existing);
        }
    });

    curYearReturned.forEach(ret => {
        const name = getItemName(ret);
        const normKey = getNormalizedModelKey(name);
        if (normKey && modelSalesMap.has(normKey)) {
            const existing = modelSalesMap.get(normKey);
            existing.qty = Math.max(0, existing.qty - ret.qty);
        }
    });

    const topModels = Array.from(modelSalesMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

    // 4. Render Chart.js Visualizations
    renderSalesCharts(monthlyData, topModels);
}

function renderMonthlyStatsTable(monthlyData) {
    const tbody = document.querySelector("#table-monthly-stats tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    monthlyData.forEach(m => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${m.monthName}</strong></td>
            <td style="text-align: center;">${m.netQty} ədəd</td>
            <td style="text-align: right;">${m.rawRev.toFixed(2)} AZN</td>
            <td style="text-align: center; color: var(--accent-color);">${m.retQty > 0 ? '-' + m.retQty : 0} ədəd</td>
            <td style="text-align: right; font-weight: 700; color: var(--success-color);">${m.netRev.toFixed(2)} AZN</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderSalesCharts(monthlyData, topModels) {
    if (typeof Chart === 'undefined') return;

    // 1. Line Chart: Monthly Sales Trend
    const ctxMonthly = document.getElementById('chart-monthly-sales');
    if (ctxMonthly) {
        if (chartMonthlySalesInstance) {
            chartMonthlySalesInstance.destroy();
        }

        const labels = monthlyData.map(m => m.monthName);
        const dataRevenues = monthlyData.map(m => m.netRev);

        chartMonthlySalesInstance = new Chart(ctxMonthly, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Xalis Satış Məbləği (AZN)',
                    data: dataRevenues,
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointBackgroundColor: '#0284c7',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return ` Xalis Satış: ${context.parsed.y.toFixed(2)} AZN`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: function(val) { return val + ' AZN'; }
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }

    // 2. Bar Chart: Top Models
    const ctxModels = document.getElementById('chart-top-models');
    if (ctxModels) {
        if (chartTopModelsInstance) {
            chartTopModelsInstance.destroy();
        }

        const modelLabels = topModels.length > 0 ? topModels.map(m => m.name) : ['Məlumat Yoxdur'];
        const modelRevenues = topModels.length > 0 ? topModels.map(m => m.revenue) : [0];

        const barColors = [
            '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'
        ];

        chartTopModelsInstance = new Chart(ctxModels, {
            type: 'bar',
            data: {
                labels: modelLabels,
                datasets: [{
                    label: 'Satış Dövriyyəsi (AZN)',
                    data: modelRevenues,
                    backgroundColor: barColors.slice(0, modelLabels.length),
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` Dövriyyə: ${context.parsed.y.toFixed(2)} AZN`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                            callback: function(val) { return val + ' AZN'; }
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
    }
}
