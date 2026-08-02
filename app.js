// Ali Electronics - Warehouse Management System
// Client-side Application Logic with LocalStorage persistence

// Predefined entry passcode for authorization
const AUTH_PASSCODE = "ali2026";

// State database keys
const KEYS = {
    INCOMING: "ali_incoming",
    OUTGOING: "ali_outgoing",
    RETURNED: "ali_returned"
};

// Initialize State
let state = {
    incoming: JSON.parse(localStorage.getItem(KEYS.INCOMING)) || [],
    outgoing: JSON.parse(localStorage.getItem(KEYS.OUTGOING)) || [],
    returned: JSON.parse(localStorage.getItem(KEYS.RETURNED)) || []
};

// Search Queries State
let searchQueries = {
    dash: "",
    incoming: "",
    outgoing: "",
    anbar: ""
};

// Dashboard Timeframe Selections State
let dashboardTimeframes = {
    incoming: "daily",
    outgoing: "daily"
};

// Save helper
function saveState() {
    localStorage.setItem(KEYS.INCOMING, JSON.stringify(state.incoming));
    localStorage.setItem(KEYS.OUTGOING, JSON.stringify(state.outgoing));
    localStorage.setItem(KEYS.RETURNED, JSON.stringify(state.returned));
    updateDashboard();
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
    
    // Initial Render of tables & dashboard
    renderAllTables();
    updateDashboard();
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

// Helper: Get item name string (supports both single name and legacy brand+model)
function getItemName(item) {
    if (!item) return '-';
    if (item.brand && item.model) return `${item.brand} ${item.model}`;
    return item.model || item.brand || '-';
}

// 3. Set Default Date Picker inputs to Today
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    
    const dateInputs = [
        "yeni-tarix",
        "cixan-tarix",
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
}

// Temporary storage for batch incoming items
let tempIncomingItems = [];

function initTempItemHandlers() {
    const btnAdd = document.getElementById("btn-add-item-temp");
    const inputModel = document.getElementById("yeni-model");
    const inputSay = document.getElementById("yeni-say");

    if (btnAdd && inputModel && inputSay) {
        const addFn = () => {
            const modelVal = inputModel.value.trim();
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
        const modelStr = tempIncomingItems.map(i => `${i.model} (${i.qty} ədəd)`).join(', ');

        const record = {
            id: generateId(),
            date: dateVal,
            model: modelStr,
            items: [...tempIncomingItems],
            qty: totalQty,
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
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Məlumat tapılmadı</td></tr>`;
        return;
    }

    sorted.forEach(item => {
        const paidVal = item.paid !== undefined ? item.paid : item.cost;
        const balance = item.cost - paidVal;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${item.date}</td>
            <td>${getItemName(item)}</td>
            <td>${item.qty}</td>
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
        const isReturned = item.isReturned || state.returned.some(r => r.outgoingId === item.id || (r.model === getItemName(item) && r.technician === item.technician && r.date === item.date));
        if (isReturned && !item.isReturned) {
            item.isReturned = true;
        }

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
            ? `<button type="button" class="btn-return btn-returned-done" disabled title="Bu mal artıq qaytarılıb"><i class="bx bx-revision"></i></button>`
            : `<button type="button" class="btn-return" onclick="returnRecord('${item.id}')" title="Malların qaytarılması üçün klikləyin"><i class="bx bx-revision"></i></button>`;

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

// 5a. Warehouse Inventory Stock Calculator & Renderer
function getWarehouseInventory() {
    const inventory = {};

    // 1. Process Incoming Goods
    state.incoming.forEach(inc => {
        if (inc.items && Array.isArray(inc.items) && inc.items.length > 0) {
            inc.items.forEach(i => {
                const modelKey = (i.model || '').trim();
                if (modelKey) {
                    if (!inventory[modelKey]) {
                        inventory[modelKey] = { model: modelKey, incoming: 0, outgoing: 0, returned: 0, stock: 0 };
                    }
                    inventory[modelKey].incoming += i.qty;
                }
            });
        } else {
            const modelKey = getItemName(inc).trim();
            if (modelKey && modelKey !== '-') {
                if (!inventory[modelKey]) {
                    inventory[modelKey] = { model: modelKey, incoming: 0, outgoing: 0, returned: 0, stock: 0 };
                }
                inventory[modelKey].incoming += inc.qty;
            }
        }
    });

    // 2. Process Outgoing Goods
    state.outgoing.forEach(out => {
        const modelKey = getItemName(out).trim();
        if (modelKey && modelKey !== '-') {
            if (!inventory[modelKey]) {
                inventory[modelKey] = { model: modelKey, incoming: 0, outgoing: 0, returned: 0, stock: 0 };
            }
            inventory[modelKey].outgoing += out.qty;
        }
    });

    // 3. Process Returned Goods
    state.returned.forEach(ret => {
        const modelKey = getItemName(ret).trim();
        if (modelKey && modelKey !== '-') {
            if (!inventory[modelKey]) {
                inventory[modelKey] = { model: modelKey, incoming: 0, outgoing: 0, returned: 0, stock: 0 };
            }
            inventory[modelKey].returned += ret.qty;
        }
    });

    // 4. Calculate Net Stock: Stock = Incoming + Returned - Outgoing
    const result = [];
    Object.keys(inventory).forEach(modelKey => {
        const item = inventory[modelKey];
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

        // Quantities
        const incQty = inc.reduce((sum, x) => sum + x.qty, 0);
        const incCost = inc.reduce((sum, x) => sum + x.cost, 0);
        const incPaid = inc.reduce((sum, x) => sum + (x.paid !== undefined ? x.paid : x.cost), 0);
        const incBalance = incCost - incPaid;
        
        const rawSoldQty = out.reduce((sum, x) => sum + x.qty, 0);
        const rawSalesRevenue = out.reduce((sum, x) => sum + (x.qty * x.price), 0);

        const retQty = ret.reduce((sum, x) => sum + x.qty, 0);

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
                    incGroup[i.model] = (incGroup[i.model] || 0) + i.qty;
                });
            } else {
                const key = getItemName(x);
                incGroup[key] = (incGroup[key] || 0) + x.qty;
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
            const key = getItemName(x);
            soldGroup[key] = (soldGroup[key] || 0) + x.qty;
        });
        ret.forEach(x => {
            const key = getItemName(x);
            if (soldGroup[key]) {
                soldGroup[key] = Math.max(0, soldGroup[key] - x.qty);
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

        // Financial cards
        document.getElementById("summary-total-cost").textContent = `${incCost.toFixed(2)} AZN`;
        document.getElementById("summary-total-revenue").textContent = `${netSalesRevenue.toFixed(2)} AZN`;

        const profit = netSalesRevenue - incCost;
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
