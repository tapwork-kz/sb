// app.js
import { api, supabase } from './api.js';
import { renderUserInbox, renderActiveOuts, setKpiColor } from './ui.js';
import { 
    getMemory, saveMemory, clearMemory, 
    showToast, showPushNotification, requestNotificationPermission, vibrate, safeIin
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

let pollingTimer = null;
let lastActiveTab = 'time';
let globalActiveOuts = [];
let processedReqIds = new Set();
let isUserPromoter = false;

// Инициализация Telegram WebApp
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) { tg.expand(); }

// === ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ ===
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

function setupEventDelegation() {
    document.addEventListener('click', async (e) => {
        // 1. Навигация по табам
        const tabBtn = e.target.closest('.icon-btn[data-tab]');
        if (tabBtn) {
            switchTab(tabBtn.dataset.tab);
            return;
        }

        // 2. Обработка действий с уведомлениями (ответить, просмотрено и т.д.)
        const reqBtn = e.target.closest('button[data-action]');
        if (reqBtn && !reqBtn.id.startsWith('btn-')) {
            const action = reqBtn.dataset.action;
            const id = reqBtn.dataset.id;
            let replyText = "";
            if (action === 'reply_remark') {
                const ta = document.getElementById(`remark-reply-${id}`);
                replyText = ta ? ta.value : "";
                if (!replyText) return showToast("Введите текст ответа", true);
            }
            handleProcessReq(id, action, replyText);
            return;
        }

        // 3. Открытие деталей
        const detailsBtn = e.target.closest('.info-box');
        if (detailsBtn && detailsBtn.id.startsWith('btn-details-')) {
            const type = detailsBtn.id.replace('btn-details-', '');
            // openDetails(type); // Раскомментировать, когда перенесете функцию openDetails в ui.js/app.js
            return;
        }

        // 4. Кнопки учета времени (Перерыв, Обед, Полдник)
        const timeBtn = e.target.closest('button[data-action]');
        if (timeBtn && timeBtn.id.startsWith('btn-')) {
            const action = timeBtn.dataset.action;
            if (['Перерыв', 'Обед', 'Полдник'].includes(action)) {
                handleTimeAction(action);
            }
            return;
        }

        // 5. Кнопка возврата с перерыва
        if (e.target.closest('#btn-return')) {
            handleTimeReturn();
            return;
        }

        // 6. Кнопка логина
        if (e.target.closest('#btn-login')) {
            handleLogin();
            return;
        }

        // 7. Строгий контроль открытия ссылок
        const link = e.target.closest('a[href]');
        if (link) {
            e.preventDefault();
            const url = link.getAttribute('href');
            if (tg && tg.openLink) {
                tg.openLink(url); // Строго во внутреннем браузере Telegram
            } else {
                window.open(url, '_blank', 'noopener,noreferrer'); // Строго в браузере
            }
        }
    });
}

// === ЛОГИКА АВТОРИЗАЦИИ ===
async function handleLogin() {
    const elIin = document.getElementById("iin-input");
    const elPass = document.getElementById("password-input");
    const iinVal = elIin.value;
    const passVal = elPass.value;

    if (!iinVal || iinVal.length !== 12) return showToast("ИИН должен состоять из 12 цифр", true);
    if (!passVal) return showToast("Введите пароль", true);

    elIin.disabled = true;
    elPass.disabled = true;
    showToast("Авторизация...", false, 9999);

    let res = await api.login(iinVal, passVal);

    if (res.success) {
        appState.iin = res.iin;
        appState.token = res.token;
        appState.firstName = res.firstName;
        appState.role = res.role;
        appState.dept = res.dept;
        appState.currentAction = null;
        isUserPromoter = res.isPromoter;

        saveMemory("userIIN", appState.iin);
        saveMemory("userToken", appState.token);
        saveMemory("userName", appState.firstName);
        saveMemory("userRole", appState.role);
        saveMemory("userDept", appState.dept);
        saveMemory("currentAction", "");

        document.getElementById("toast").classList.remove("show");
        document.getElementById("auth-screen").style.opacity = '0';
        
        setTimeout(() => {
            document.getElementById("auth-screen").classList.add("hidden");
            document.getElementById("main-screen").classList.remove("hidden");
            document.getElementById("main-screen").style.opacity = '1';
            document.getElementById("user-greeting").innerText = appState.firstName;
            loadDashboard(false);
            startPolling();
        }, 600);
    } else {
        elIin.disabled = false;
        elPass.disabled = false;
        document.getElementById("login-error").innerText = res.error;
        document.getElementById("toast").classList.remove("show");
    }
}

function forceLogout() {
    if(pollingTimer) clearInterval(pollingTimer);
    clearMemory();
    appState.token = null;
    appState.iin = null;
    document.getElementById("main-screen").style.opacity = '0';
    setTimeout(() => {
        document.getElementById("main-screen").classList.add("hidden");
        document.getElementById("auth-screen").classList.remove("hidden");
        document.getElementById("auth-screen").style.opacity = '1';
        document.getElementById("main-screen").style.opacity = '1';
        document.getElementById("iin-input").value = '';
        document.getElementById("iin-input").disabled = false;
    }, 600);
}

// === УПРАВЛЕНИЕ UI И ДАШБОРДОМ ===
function hideLoader() {
    const loader = document.getElementById("loader-screen");
    loader.style.opacity = '0';
    setTimeout(() => loader.classList.add("hidden"), 600);
}

function showLoader() {
    const loader = document.getElementById("loader-screen");
    loader.classList.remove("hidden");
    setTimeout(() => loader.style.opacity = '1', 10);
}

function switchTab(tab) {
    if (tab !== 'details') lastActiveTab = tab;
    
    // Снимаем активность со всех кнопок
    document.querySelectorAll('#main-tabs .icon-btn').forEach(btn => btn.classList.remove('active-tab'));
    
    // Активируем нужную
    const activeBtn = document.querySelector(`.icon-btn[data-tab="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active-tab');

    // Скрываем все экраны и показываем нужный
    document.querySelectorAll('#scrollable-body > div').forEach(el => el.classList.add("hidden"));
    
    let targetEl = document.getElementById("content-" + tab);
    if(targetEl) {
        targetEl.classList.remove("hidden");
        targetEl.classList.add('slide-up-fade');
    }
}

// Главная функция загрузки данных моста API -> UI
async function loadDashboard(isSilent = false) {
    if (!isSilent) showLoader();
    
    let data = await api.getDashboardData(appState.iin);
    if (!data) {
        if (!isSilent) hideLoader();
        return;
    }
    
    if (data.authorized === false) {
        forceLogout();
        return;
    }

    renderDashboardUI(data);

    let state = await api.startupCheck(appState.iin, appState.role);
    if (state && state.authorized !== false) {
        globalActiveOuts = state.activeOuts || [];
        applyTimeLimits(state);
    }
    
    // === ИСПРАВЛЕНИЕ ЗДЕСЬ: АВТОМАТИЧЕСКИЙ ВЫБОР ВКЛАДКИ ===
    if(document.querySelectorAll("#scrollable-body > div:not(.hidden)").length === 0) {
        let roleStr = String(appState.role).toLowerCase();
        let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
        let isZavSklad = roleStr.includes("заведующий складом");
        
        if (isDir || isZavSklad) {
            switchTab('adm-main');
        } else {
            switchTab('time');
        }
    }
    
    if (!isSilent) hideLoader();
}

// Рендер конкретных кусков UI (вызывает функции из ui.js)
function renderDashboardUI(data) {
    let roleStr = String(appState.role).toLowerCase();
    let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
    let isZavSklad = roleStr.includes("заведующий складом");
    let isSeller = !appState.isPromoter && !isDir && !isZavSklad;

    // === ИСПРАВЛЕНИЕ ЗДЕСЬ: НАСТРОЙКА ВИДИМОСТИ МЕНЮ И ДАШБОРДА ===
    const navTime = document.getElementById("nav-time-icon");
    const navCreate = document.getElementById("nav-create-icon");
    const navInbox = document.getElementById("inbox-icon");
    const navAdmOuts = document.getElementById("nav-adm-outs");
    const navAdmMain = document.getElementById("nav-adm-main");
    const navAdmInbox = document.getElementById("nav-adm-inbox");
    const dashBanner = document.getElementById("info-dashboard");

    if (isZavSklad) {
        if(navTime) navTime.classList.add("hidden");
        if(navCreate) navCreate.classList.add("hidden");
        if(navInbox) navInbox.classList.remove("hidden");
        if(navAdmOuts) navAdmOuts.classList.remove("hidden");
        if(navAdmMain) navAdmMain.classList.remove("hidden");
        if(navAdmInbox) navAdmInbox.classList.add("hidden");
        if(dashBanner) dashBanner.classList.add("hidden");
    } else if (isDir) {
        if(navTime) navTime.classList.add("hidden");
        if(navCreate) navCreate.classList.add("hidden");
        if(navInbox) navInbox.classList.add("hidden");
        if(navAdmOuts) navAdmOuts.classList.remove("hidden");
        if(navAdmMain) navAdmMain.classList.remove("hidden");
        if(navAdmInbox) navAdmInbox.classList.remove("hidden");
        if(dashBanner) dashBanner.classList.add("hidden");
    } else {
        // Логика для обычного продавца
        if(navTime) navTime.classList.remove("hidden");
        if(navCreate) navCreate.classList.remove("hidden");
        if(navInbox) navInbox.classList.remove("hidden");
        if(navAdmOuts) navAdmOuts.classList.add("hidden");
        if(navAdmMain) navAdmMain.classList.add("hidden");
        if(navAdmInbox) navAdmInbox.classList.add("hidden");
        
        // Показываем дашборд (баллы, табель) только продавцам
        if (isSeller && dashBanner) {
            dashBanner.classList.remove("hidden");
            dashBanner.classList.add("slide-down-fade");
        } else if (dashBanner) {
            dashBanner.classList.add("hidden");
        }
    }

    // Обновляем бейджи входящих
    let uInbox = data.userInbox ? data.userInbox.filter(r => r && r.id && !processedReqIds.has(String(r.id))) : [];
    const uBadge = document.getElementById("user-badge");
    
    if (uInbox.length > 0) {
        if(uBadge) {
            uBadge.innerText = uInbox.length;
            uBadge.classList.remove("hidden");
        }
        if (uInbox.length > appState.lastInboxCount) showPushNotification("Уведомление!", "У вас новое сообщение");
        appState.lastInboxCount = uInbox.length;
    } else {
        if(uBadge) uBadge.classList.add("hidden");
        appState.lastInboxCount = 0;
    }

    // Рендерим списки через ui.js
    renderUserInbox(uInbox, appState.iin, "inbox-list");
    
    // Обновляем шапку (KPI, Баллы)
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
        const btnBreak = document.getElementById("btn-break");
        const btnLunch = document.getElementById("btn-lunch");
        const btnSnack = document.getElementById("btn-snack");
        
        if(btnBreak) btnBreak.disabled = !state.canBreak;
        if(btnLunch) btnLunch.disabled = !state.canLunch;
        if(btnSnack) btnSnack.disabled = !state.canSnack;
        
        document.getElementById("action-hint").innerText = (state.canBreak || state.canLunch || state.canSnack) 
            ? "Выберите действие:" 
            : "Очередь заполнена или лимит исчерпан";
    }
    renderActiveOuts(globalActiveOuts, "active-outs-container", "active-outs-list");
    renderTimeUI();
}

async function handleTimeAction(actionType) {
    vibrate(50);
    appState.currentAction = actionType;
    saveMemory("currentAction", actionType);
    renderTimeUI();
    
    let res = await api.recordAction({ 
        iin: appState.iin, 
        actionType: actionType, 
        isReturn: false, 
        isAutoReturn: false, 
        exactRole: appState.role 
    });
    
    if (res.success && res.savedAction) {
        let state = await api.startupCheck(appState.iin, appState.role);
        applyTimeLimits(state);
    } else {
        appState.currentAction = null;
        saveMemory("currentAction", "");
        renderTimeUI();
        showToast("Ошибка: " + res.error, true);
    }
}

async function handleTimeReturn() {
    vibrate(50);
    const actionToReturnFrom = appState.currentAction;
    appState.currentAction = null;
    saveMemory("currentAction", "");
    renderTimeUI();
    
    document.getElementById("action-hint").innerText = "Фиксируем возвращение...";
    
    let res = await api.recordAction({ 
        iin: appState.iin, 
        actionType: actionToReturnFrom, 
        isReturn: true, 
        isAutoReturn: false, 
        exactRole: appState.role 
    });
    
    if (res.success) {
        let state = await api.startupCheck(appState.iin, appState.role);
        applyTimeLimits(state);
    } else {
        showToast("Ошибка возврата: " + res.error, true);
    }
}

function renderTimeUI() {
    const standardBtns = document.getElementById("standard-buttons");
    const returnContainer = document.getElementById("return-button-container");
    
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
    vibrate(50);
    showToast("Обработка...", false, 9999);
    processedReqIds.add(String(id));
    
    let el = document.getElementById("req-" + id);
    if (el) el.style.display = 'none';
    
    let res = await api.processRequest({ 
        reqId: id, 
        reqAction: action, 
        replyText: replyText, 
        currentIin: appState.iin 
    });
    
    if(res.success) {
        showToast(res.msg);
        loadDashboard(true);
    } else {
        showToast(res.error, true);
        if (el) el.style.display = 'block'; // Возвращаем блок при ошибке
    }
}

// === ФОНОВОЕ ОБНОВЛЕНИЕ ===
function startPolling() {
    if(pollingTimer) clearInterval(pollingTimer);
    
    // Подписка на изменения в реальном времени через Supabase
    supabase.channel('public-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
            if(appState.token && !document.hidden) loadDashboard(true);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'time_tracking' }, async () => {
            if(appState.token && !document.hidden) {
                let state = await api.startupCheck(appState.iin, appState.role);
                if(state) applyTimeLimits(state);
            }
        }).subscribe();

    // Запасной поллинг каждые 30 секунд
    pollingTimer = setInterval(async () => {
        if(appState.token && !document.hidden) {
            let state = await api.startupCheck(appState.iin, appState.role);
            if(state) applyTimeLimits(state);
            loadDashboard(true);
        }
    }, 30000);
}
