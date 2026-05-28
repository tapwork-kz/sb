// app.js
import { api, supabase } from './api.js';
import { 
    renderUserInbox, renderActiveOuts, setKpiColor, generateDatePanelHTML, 
    groupAndRenderByMonth, renderHistoryItem, renderMoneyFineItem, generateHorizontalGrid, buildStandardRow 
} from './ui.js';
import { 
    getMemory, saveMemory, clearMemory, showToast, showPushNotification, 
    requestNotificationPermission, vibrate, safeIin, parseCustomDate, getSourceColor, formatRemarkText, formatRemarkAuthor, formatShortName, isCurrentMonth
} from './utils.js';

// === ГЛОБАЛЬНОЕ СОСТОЯНИЕ ===
let appState = {
    token: getMemory("userToken"),
    iin: getMemory("userIIN"),
    firstName: getMemory("userName") || "",
    currentAction: getMemory("currentAction"),
    role: getMemory("userRole") || "Продавец",
    dept: getMemory("userDept") || "Цифра",
    lastInboxCount: 0
};

// Переменные для кеширования данных интерфейса
window.stateCache = {
    globalSellers: [], globalScItems: [], adminScItemsGlobal: [], selectedScItem: null,
    myReports: [], myPointsHistory: [], myDisplayPointsHistory: [], myScHistory: [], 
    myKpiDetails: [], allEmployeesData: [], myMoneyFinesHistory: [], tradeInModelsGlobal: [], 
    selectedTradeInModel: null, adminHistoryGlobal: []
};

let pollingTimer = null;
let lastActiveTab = 'time';
let globalActiveOuts = [];
let processedReqIds = new Set();
let isUserPromoter = false;

const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) { tg.expand(); }

// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener("DOMContentLoaded", async () => {
    requestNotificationPermission();
    setupEventDelegation();

    if (appState.iin && appState.token) {
        document.getElementById("auth-screen").classList.add("hidden");
        document.getElementById("main-screen").classList.remove("hidden");
        if (appState.firstName) document.getElementById("user-greeting").innerText = appState.firstName;
        await loadDashboard(false);
        startPolling();
    } else {
        hideLoader();
        document.getElementById("auth-screen").classList.remove("hidden");
    }
});

// === DELEGATION ЕДИНЫЙ ОБРАБОТЧИК ===
function setupEventDelegation() {
    document.addEventListener('click', async (e) => {
        // Табы главного меню
        const tabBtn = e.target.closest('.icon-btn[data-tab]');
        if (tabBtn) { switchTab(tabBtn.dataset.tab); return; }

        // Действия кнопок (ответить, просмотрено и т.д.)
        const reqBtn = e.target.closest('button[data-action]');
        if (reqBtn && !reqBtn.id.startsWith('btn-')) {
            const action = reqBtn.dataset.action;
            const id = reqBtn.dataset.id;
            
            // Обработка дат
            if (action.startsWith('date-')) {
                const prefix = reqBtn.dataset.prefix;
                if (action === 'date-search') window[`trigger_${prefix}_Reload`]('search');
                return;
            }

            if (['reject_user', 'approve_user', 'dismiss_notification', 'reply_remark', 'reject_admin', 'approve_admin'].includes(action)) {
                let replyText = "";
                if (action === 'reply_remark') {
                    const ta = document.getElementById(`remark-reply-${id}`);
                    replyText = ta ? ta.value : "";
                    if (!replyText) return showToast("Введите текст ответа", true);
                }
                handleProcessReq(id, action, replyText);
            }
            return;
        }

        // Открытие деталей статистики
        const detailsBtn = e.target.closest('.info-box');
        if (detailsBtn && detailsBtn.id.startsWith('btn-details-')) {
            openDetails(detailsBtn.id.replace('btn-details-', ''));
            return;
        }

        // Кнопки действий времени
        const timeBtn = e.target.closest('button[data-action]');
        if (timeBtn && ['Перерыв', 'Обед', 'Полдник'].includes(timeBtn.dataset.action)) {
            handleTimeAction(timeBtn.dataset.action); return;
        }
        if (e.target.closest('#btn-return')) { handleTimeReturn(); return; }
        if (e.target.closest('#btn-login')) { handleLogin(); return; }
        
        // Открытие форм
        const openFormBtn = e.target.closest('button[data-form]');
        if (openFormBtn) { openForm(openFormBtn.dataset.form); return; }

        // СТРОГИЙ КОНТРОЛЬ ССЫЛОК
        const link = e.target.closest('a[href]');
        if (link) {
            e.preventDefault();
            const url = link.getAttribute('href');
            if (tg && tg.openLink) { tg.openLink(url); } else { window.open(url, '_blank', 'noopener,noreferrer'); }
        }
    });

    // Делегирование выбора СЦ товаров
    document.addEventListener('click', (e) => {
        const scItem = e.target.closest('.sc-item[data-item]');
        if (scItem && !scItem.classList.contains('admin')) {
            try {
                window.stateCache.selectedScItem = JSON.parse(scItem.dataset.item);
                renderScItems(); // перерисовка для выделения
            } catch(err){}
        }
    });
}

// === ЛОГИКА АВТОРИЗАЦИИ ===
async function handleLogin() {
    const iinVal = document.getElementById("iin-input").value;
    const passVal = document.getElementById("password-input").value;
    if (!iinVal || iinVal.length !== 12) return showToast("ИИН должен состоять из 12 цифр", true);
    if (!passVal) return showToast("Введите пароль", true);

    document.getElementById("iin-input").disabled = true; document.getElementById("password-input").disabled = true;
    showToast("Авторизация...", false, 9999);

    let res = await api.login(iinVal, passVal);
    if (res.success) {
        appState.iin = res.iin; appState.token = res.token; appState.firstName = res.firstName; appState.role = res.role; appState.dept = res.dept; appState.currentAction = null; isUserPromoter = res.isPromoter;
        saveMemory("userIIN", appState.iin); saveMemory("userToken", appState.token); saveMemory("userName", appState.firstName); saveMemory("userRole", appState.role); saveMemory("userDept", appState.dept); saveMemory("currentAction", "");
        document.getElementById("toast").classList.remove("show"); document.getElementById("auth-screen").style.opacity = '0';
        setTimeout(() => {
            document.getElementById("auth-screen").classList.add("hidden"); document.getElementById("main-screen").classList.remove("hidden"); document.getElementById("main-screen").style.opacity = '1';
            document.getElementById("user-greeting").innerText = appState.firstName;
            loadDashboard(false); startPolling();
        }, 600);
    } else {
        document.getElementById("iin-input").disabled = false; document.getElementById("password-input").disabled = false;
        document.getElementById("login-error").innerText = res.error; document.getElementById("toast").classList.remove("show");
    }
}

function forceLogout() {
    if(pollingTimer) clearInterval(pollingTimer); clearMemory(); appState.token = null; appState.iin = null;
    document.getElementById("main-screen").style.opacity = '0';
    setTimeout(() => { document.getElementById("main-screen").classList.add("hidden"); document.getElementById("auth-screen").classList.remove("hidden"); document.getElementById("auth-screen").style.opacity = '1'; document.getElementById("main-screen").style.opacity = '1'; document.getElementById("iin-input").value = ''; document.getElementById("iin-input").disabled = false; }, 600);
}

function hideLoader() { document.getElementById("loader-screen").style.opacity = '0'; setTimeout(() => document.getElementById("loader-screen").classList.add("hidden"), 600); }
function showLoader() { document.getElementById("loader-screen").classList.remove("hidden"); setTimeout(() => document.getElementById("loader-screen").style.opacity = '1', 10); }

function switchTab(tab) {
    if (tab !== 'details') lastActiveTab = tab;
    document.querySelectorAll('#main-tabs .icon-btn').forEach(btn => btn.classList.remove('active-tab'));
    const activeBtn = document.querySelector(`.icon-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active-tab');

    document.querySelectorAll('#scrollable-body > div').forEach(el => el.classList.add("hidden"));
    let targetEl = document.getElementById("content-" + tab);
    if(targetEl) { targetEl.classList.remove("hidden"); targetEl.classList.add('slide-up-fade'); }
}

async function loadDashboard(isSilent = false) {
    if (!isSilent) showLoader();
    let data = await api.getDashboardData(appState.iin);
    if (!data) { if (!isSilent) hideLoader(); return; }
    if (data.authorized === false) { forceLogout(); return; }

    // Кеширование массивов
    window.stateCache.globalSellers = data.sellers || [];
    window.stateCache.globalScItems = data.scItems || [];
    window.stateCache.adminScItemsGlobal = data.adminScItems || [];
    window.stateCache.myReports = data.info?.reports || [];
    window.stateCache.myPointsHistory = data.info?.myPtsHistory || [];
    window.stateCache.myKpiDetails = data.info?.kpiDetails || [];
    window.stateCache.allEmployeesData = data.adminEmployees || [];
    window.stateCache.tradeInModelsGlobal = data.tradeInModels || [];
    window.stateCache.adminHistoryGlobal = data.adminHistory || [];
    window.stateCache.myMoneyFinesHistory = window.stateCache.myPointsHistory.filter(p => p && p.type === "Штраф"); 
    window.stateCache.myScHistory = window.stateCache.myPointsHistory.filter(p => p && p.type === "Начисление" && p.source !== "Горячий чек");
    window.myCurrentKpi = data.info?.kpiValue ?? data.info?.baseKpi ?? 0;
    
    window.stateCache.myDisplayPointsHistory = window.stateCache.myPointsHistory.filter(p => { 
        let ptsVal = parseFloat(String(p.val).replace(',', '.')) || 0; 
        if (p.type === "KPI" && p.source !== "Горячий чек") return false; 
        if (p.type === "KPI" && p.source === "Горячий чек" && ptsVal === 0) return false; 
        return ptsVal !== 0; 
    });

    renderDashboardUI(data);

    let state = await api.startupCheck(appState.iin, appState.role);
    if (state && state.authorized !== false) { globalActiveOuts = state.activeOuts || []; applyTimeLimits(state); }
    
    if(document.querySelectorAll("#scrollable-body > div:not(.hidden)").length === 0) {
        let roleStr = String(appState.role).toLowerCase();
        if (roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер") || roleStr.includes("заведующий складом")) {
            switchTab('adm-main');
        } else {
            switchTab('time');
        }
    }
    if (!isSilent) hideLoader();
}

function renderDashboardUI(data) {
    let roleStr = String(appState.role).toLowerCase();
    let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
    let isZavSklad = roleStr.includes("заведующий складом");

    const dashBanner = document.getElementById("info-dashboard");
    if (isZavSklad || isDir) {
        if(dashBanner) dashBanner.classList.add("hidden");
        document.querySelectorAll('#main-tabs .icon-btn').forEach(btn => {
            const tab = btn.dataset.tab;
            if (['time', 'create', 'inbox'].includes(tab)) btn.classList.add("hidden");
            if (['adm-outs', 'adm-main'].includes(tab)) btn.classList.remove("hidden");
            if (tab === 'adm-inbox') {
                 if (isZavSklad) btn.classList.add("hidden"); 
                 else btn.classList.remove("hidden");
            }
        });
        if(isZavSklad) document.querySelector('.icon-btn[data-tab="inbox"]').classList.remove("hidden"); // Зав складом видит обычный инбокс
    } else {
        document.querySelectorAll('#main-tabs .icon-btn').forEach(btn => {
            const tab = btn.dataset.tab;
            if (['time', 'create', 'inbox'].includes(tab)) btn.classList.remove("hidden");
            if (['adm-outs', 'adm-main', 'adm-inbox'].includes(tab)) btn.classList.add("hidden");
        });
        if (dashBanner && !appState.isPromoter) { dashBanner.classList.remove("hidden"); dashBanner.classList.add("slide-down-fade"); }
    }

    let uInbox = data.userInbox ? data.userInbox.filter(r => r && r.id && !processedReqIds.has(String(r.id))) : [];
    const uBadge = document.getElementById("user-badge");
    if (uInbox.length > 0) {
        if(uBadge) { uBadge.innerText = uInbox.length; uBadge.classList.remove("hidden"); }
        if (uInbox.length > appState.lastInboxCount) showPushNotification("Уведомление!", "У вас новое сообщение");
        appState.lastInboxCount = uInbox.length;
    } else { if(uBadge) uBadge.classList.add("hidden"); appState.lastInboxCount = 0; }

    renderUserInbox(uInbox, appState.iin, "inbox-list");
    
    let kpiValue = data.info?.kpiValue ?? data.info?.baseKpi ?? 0;
    let kValEl = document.getElementById("kpi-val");
    if(kValEl) kValEl.innerText = kpiValue + '%';
    setKpiColor(kpiValue, document.getElementById("kpi-circle"), document.getElementById("kpi-val"));
    
    let ptRemEl = document.getElementById("pt-rem");
    if(ptRemEl) ptRemEl.innerText = data.info?.ptsLeft ?? '-';
}

// === УЧЕТ ВРЕМЕНИ ===
function applyTimeLimits(state) {
    if (!appState.currentAction) {
        const btnBreak = document.getElementById("btn-break"); const btnLunch = document.getElementById("btn-lunch"); const btnSnack = document.getElementById("btn-snack");
        if(btnBreak) btnBreak.disabled = !state.canBreak; if(btnLunch) btnLunch.disabled = !state.canLunch; if(btnSnack) btnSnack.disabled = !state.canSnack;
        document.getElementById("action-hint").innerText = (state.canBreak || state.canLunch || state.canSnack) ? "Выберите действие:" : "Очередь заполнена или лимит исчерпан";
    }
    renderActiveOuts(globalActiveOuts, "active-outs-container", "active-outs-list");
    renderTimeUI();
}

async function handleTimeAction(actionType) {
    vibrate(50); appState.currentAction = actionType; saveMemory("currentAction", actionType); renderTimeUI();
    let res = await api.recordAction({ iin: appState.iin, actionType: actionType, isReturn: false, isAutoReturn: false, exactRole: appState.role });
    if (res.success && res.savedAction) { let state = await api.startupCheck(appState.iin, appState.role); applyTimeLimits(state); } 
    else { appState.currentAction = null; saveMemory("currentAction", ""); renderTimeUI(); showToast("Ошибка: " + res.error, true); }
}

async function handleTimeReturn() {
    vibrate(50); const actionToReturnFrom = appState.currentAction; appState.currentAction = null; saveMemory("currentAction", ""); renderTimeUI();
    document.getElementById("action-hint").innerText = "Фиксируем возвращение...";
    let res = await api.recordAction({ iin: appState.iin, actionType: actionToReturnFrom, isReturn: true, isAutoReturn: false, exactRole: appState.role });
    if (res.success) { let state = await api.startupCheck(appState.iin, appState.role); applyTimeLimits(state); } 
    else { showToast("Ошибка возврата: " + res.error, true); }
}

function renderTimeUI() {
    const standardBtns = document.getElementById("standard-buttons"); const returnContainer = document.getElementById("return-button-container");
    if (appState.currentAction && appState.currentAction !== "null" && appState.currentAction !== "") {
        document.getElementById("btn-return").disabled = false;
        if(standardBtns) standardBtns.classList.add("hidden");
        if(returnContainer) returnContainer.classList.remove("hidden");
        document.getElementById("return-text").innerText = "Вернуться с " + appState.currentAction;
        document.getElementById("action-hint").innerText = "Ожидаем возвращения:";
    } else {
        if(standardBtns) standardBtns.classList.remove("hidden");
        if(returnContainer) returnContainer.classList.add("hidden");
    }
}

// === ОБРАБОТКА ЗАЯВОК ===
async function handleProcessReq(id, action, replyText = "") {
    vibrate(50); showToast("Обработка...", false, 9999); processedReqIds.add(String(id));
    let el = document.getElementById("req-" + id); if (el) el.style.display = 'none';
    let res = await api.processRequest({ reqId: id, reqAction: action, replyText: replyText, currentIin: appState.iin });
    if(res.success) { showToast(res.msg); loadDashboard(true); } else { showToast(res.error, true); if (el) el.style.display = 'block'; }
}

// === ФОРМЫ СЦ | BRZY ===
window.openForm = function(type) {
    document.getElementById("menu-list").classList.add("hidden"); 
    let dash = document.getElementById("info-dashboard"); if(dash) dash.classList.add("hidden"); 
    if(type === 'sc') { window.stateCache.selectedScItem = null; document.getElementById("sc-search").value = ""; document.getElementById("form-sc").classList.remove("hidden"); document.getElementById("form-sc").classList.add("slide-up-fade"); renderScItems(); }
    if(type === 'tradein') { window.stateCache.selectedTradeInModel = null; renderTradeInList(); document.getElementById("form-tradein").classList.remove("hidden"); document.getElementById("form-tradein").classList.add("slide-up-fade"); }
}
window.closeForm = function() {
    ["form-sc", "form-tradein", "form-points", "form-swap"].forEach(id => { let el = document.getElementById(id); if(el){ el.classList.add("hidden"); el.classList.remove("slide-up-fade"); }});
    let menu = document.getElementById("menu-list"); if(menu){ menu.classList.remove("hidden"); menu.classList.add("fade-in"); }
    let dash = document.getElementById("info-dashboard"); if(dash && !appState.isPromoter) { dash.classList.remove("hidden"); dash.classList.add("slide-down-fade"); }
}

window.renderScItems = function() {
    const q = document.getElementById("sc-search").value.toLowerCase(); const list = document.getElementById("sc-list"); list.innerHTML = "";
    let scList = window.stateCache.globalScItems.filter(i => i.dept === appState.dept && i.type === 'СЦ'); 
    let focusList = window.stateCache.globalScItems.filter(i => i.dept === appState.dept && i.type === 'Фокус'); 
    let sortedFiltered = [...scList, ...focusList].filter(i => i.name.toLowerCase().includes(q));
    
    if (sortedFiltered.length === 0) { list.innerHTML = "<p style='padding:12px; color:gray; font-size:12px; text-align:center;'>Ничего не найдено</p>"; return; }
    
    sortedFiltered.forEach(i => { 
        let div = document.createElement("div"); 
        let isSelected = (window.stateCache.selectedScItem && window.stateCache.selectedScItem.row === i.row && window.stateCache.selectedScItem.type === i.type && window.stateCache.selectedScItem.dept === i.dept); 
        div.className = "sc-item" + (isSelected ? " selected" : ""); div.dataset.item = JSON.stringify(i);
        let typeCol = i.type === 'СЦ' ? '#e67e22' : '#e74c3c'; let ptNoun = formatPointsNoun(i.pts); let ptsText = i.type === 'СЦ' ? '2 балла' : `${String(i.pts).replace('.', ',')} ${ptNoun}`; 
        div.innerHTML = `<div><div style="margin-bottom:4px; font-size:13px;">${i.name}</div><div style="display:flex; justify-content:space-between; align-items:center;"><div class="type-label" style="font-size:10px; color:${typeCol}; font-weight:bold;">${i.type} — ${ptsText}</div>${i.discount ? `<div style="font-weight:bold; color:#e74c3c; font-size:11px;">-${i.discount.replace(/%/g, '% ')}</div>` : ''}</div></div>`; 
        list.appendChild(div); 
    });
}

window.submitScForm = async function() { 
    if(!window.stateCache.selectedScItem) return showToast("Выберите товар из списка", true); 
    let scDateVal = document.getElementById("sc-date").dataset.realdate || formatDateLocal(new Date()); 
    let meta = JSON.stringify(window.stateCache.selectedScItem); 
    
    vibrate(50); showToast("Отправка...", false, 9999); 
    let res = await api.submitGeneralRequest({ authorIin: appState.iin, type: "Продажа СЦ/Фокус", details: window.stateCache.selectedScItem.name, targetIin: null, metadata: meta }); 
    if(res.success) { showToast("Запрос успешно отправлен!"); closeForm(); loadDashboard(true); } else showToast("Ошибка: " + res.error, true); 
}

// === ДЕТАЛИ И ИСТОРИЯ ===
window.openDetails = function(type) {
    let prevTab = lastActiveTab; switchTab('details'); 
    document.getElementById("btn-details-back").onclick = () => switchTab(prevTab); 
    document.getElementById("details-kpi-circle-container").innerHTML = ""; let listHtml = "";
    
    if (type === 'sc') { 
        document.getElementById("details-title").innerText = "Детали СЦ | BRZY"; 
        listHtml = generateDatePanelHTML('my-sc'); listHtml += "<div id='my-sc-list-container' class='card' style='padding:0; overflow:hidden;'></div>"; 
        document.getElementById("details-list").innerHTML = listHtml; 
        window.trigger_my_sc_Reload = function(t) { 
            let st = new Date(document.getElementById('my-sc-start').value).getTime(); let en = new Date(document.getElementById('my-sc-end').value).getTime() + 86400000; 
            let arr = window.stateCache.myScHistory.filter(i => { let rd = parseCustomDate(i.date); return rd >= st && rd <= en; }).sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date)); 
            document.getElementById('my-sc-list-container').innerHTML = arr.length > 0 ? arr.map((i, idx) => buildStandardRow({title: `${idx + 1}. ${i.reason}`, typeText: i.source, typeColor: getSourceColor(i.source), dateText: i.date, hasBorder: false})).join("") : "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>В выбранном периоде пусто</div>"; 
        }; window.trigger_my_sc_Reload('search'); 
    } 
    else if (type === 'points') { 
        document.getElementById("details-title").innerText = "История Баллов"; 
        listHtml = generateDatePanelHTML('my-pts'); listHtml += "<div id='my-pts-list-container' class='card' style='padding:0; overflow:hidden;'></div>"; 
        document.getElementById("details-list").innerHTML = listHtml; 
        window.trigger_my_pts_Reload = function(t) { 
            let st = new Date(document.getElementById('my-pts-start').value).getTime(); let en = new Date(document.getElementById('my-pts-end').value).getTime() + 86400000; 
            let arr = window.stateCache.myDisplayPointsHistory.filter(i => { let rd = parseCustomDate(i.date); return rd >= st && rd <= en; }); 
            document.getElementById('my-pts-list-container').innerHTML = groupAndRenderByMonth(arr, i => renderHistoryItem(i, true)); 
        }; window.trigger_my_pts_Reload('search'); 
    }
    else if (type === 'kpi') { 
        document.getElementById("details-title").innerText = "Детали КФ. ЭФФ."; listHtml = "<div class='card' style='padding:0; overflow:hidden;'>"; 
        window.stateCache.myKpiDetails.filter(k => isCurrentMonth(k.date)).forEach(k => { 
            let valStr = k.val > 0 ? `+${k.val}%` : `${k.val}%`; 
            listHtml += buildStandardRow({ title: k.name, typeText: k.source, typeColor: getSourceColor(k.source), dateText: k.date || "За месяц", valText: valStr, valClass: k.val > 0 ? 'detail-plus' : 'detail-minus', hasBorder: false }); 
        }); listHtml += "</div>"; document.getElementById("details-list").innerHTML = listHtml;
    }
    else if (type === 'report') { 
        document.getElementById("details-title").innerText = "Мои отчеты"; 
        document.getElementById("details-list").innerHTML = "<div style='padding-top:5px;'>" + window.stateCache.myReports.map(generateHorizontalGrid).join('') + "</div>"; 
    }
    else if (type === 'tabel') { 
        document.getElementById("details-title").innerText = "Нарушения (Штрафы)"; 
        let currentFines = window.stateCache.myMoneyFinesHistory.filter(i => isCurrentMonth(i.date)).sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date)); 
        document.getElementById("details-list").innerHTML = "<div style='padding-top:5px;'>" + (currentFines.length > 0 ? currentFines.map(renderMoneyFineItem).join("") : "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>Штрафов в этом месяце нет</div>") + "</div>"; 
    }
}

// === ПОЛЛИНГ ===
function startPolling() {
    if(pollingTimer) clearInterval(pollingTimer);
    supabase.channel('public-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => { if(appState.token && !document.hidden) loadDashboard(true); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_tracking' }, async () => { if(appState.token && !document.hidden) { let state = await api.startupCheck(appState.iin, appState.role); if(state) applyTimeLimits(state); } }).subscribe();
    pollingTimer = setInterval(async () => { if(appState.token && !document.hidden) { let state = await api.startupCheck(appState.iin, appState.role); if(state) applyTimeLimits(state); loadDashboard(true); } }, 30000);
}
