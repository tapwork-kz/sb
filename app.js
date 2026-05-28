// app.js
import { tg, supabaseClient } from './config.js';
import {
  appState, globalActiveOuts, adminEmployeesGlobal, adminHistoryGlobal,
  allEmployeesData, globalSellers, globalScItems, adminScItemsGlobal,
  tradeInModelsGlobal, selectedTradeInModel, selectedScItem,
  myReports, myPointsHistory, myDisplayPointsHistory, myScHistory,
  myKpiDetails, myMoneyFinesHistory,
  isUserPromoter, lastActiveTab, processedReqIds,
  currentAdminScDept, currentEmpDept, currentScTabDept,
  currentHistFilter, currentAdminMainView,
  activeOutsTimer, pollingTimer
} from './state.js';
import {
  safeIin, fmtSum, formatDateLocal, parseCustomDate, showToast, vibrate,
  getMemory, saveMemory, formatShortName, getSourceColor, buildStandardRow,
  generateDatePanelHTML, setPanelDates, groupAndRenderByMonth, getMonthName,
  renderHistoryItem, renderMoneyFineItem, formatRemarkAuthor, formatRemarkText,
  isCurrentMonth, setKpiColor, formatPointsNoun, formatNumberWithSpaces,
  generateHorizontalGrid, requestNotificationPermission, showPushNotification,
  initSmartDates, initAutoScroll, clearMemory
} from './utils.js';
import {
  callBackend, loadPlanHistory, setPlanDates, triggerAction, triggerReturn,
  triggerAutoReturn, triggerUniversalAutoReturn, manualLogin,
  executeRemark, executeFine, executeSubmit, processReq,
  loadDashboard, startPolling, forceLogout
} from './api.js';
import {
  renderPlanUI, renderTimeUI, applyLimits, renderActiveOuts, renderAdminOuts,
  renderTradeInList, selectTradeIn, openForm, closeForm, checkSwapFields,
  switchTab, renderDashboardData, openDetails, openEmpKpiDetails,
  openEmpDetails, renderEmpDetailTab, closeDetails, toggleAdminMain,
  renderAdminHistory, renderAdminEmps, switchScAdminTab, renderAdminScItems,
  switchScDept, renderScItems, openScDoc, markAsSeen,
  submitScForm, submitTradeIn, submitPoints, submitFixShift, submitSwap,
  submitHotCheck, submitPromoCheck, openAdminPlanScDetails,
  openEmpScDetails, setEmpScDates, renderEmpScDetailsData
} from './ui.js';

// Глобальные обработчики ошибок
window.onerror = function(message, source, lineno, colno, error) {
  if (lineno === 0 || !source) return true;
  alert("ОШИБКА: " + message + " в строке " + lineno);
};
window.onunhandledrejection = function(event) {
  alert("ОШИБКА ПРОМИСА: " + event.reason);
};

// Инициализация Telegram WebApp
if (tg) tg.expand();

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// Блокировка ввода для предотвращения автообновления при наборе текста
window.typingLockTime = 0;
document.addEventListener('focusin', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
    window.typingLockTime = Date.now();
});
document.addEventListener('input', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')
    window.typingLockTime = Date.now();
});

// Экспорт функций в глобальную область для onclick в HTML
window.manualLogin = manualLogin;
window.switchTab = switchTab;
window.openForm = openForm;
window.closeForm = closeForm;
window.submitScForm = submitScForm;
window.submitTradeIn = submitTradeIn;
window.submitPoints = submitPoints;
window.submitSwap = submitSwap;
window.submitFixShift = submitFixShift;
window.submitHotCheck = submitHotCheck;
window.submitPromoCheck = submitPromoCheck;
window.processReq = processReq;
window.openDetails = openDetails;
window.openEmpDetails = openEmpDetails;
window.openEmpKpiDetails = openEmpKpiDetails;
window.openAdminPlanScDetails = openAdminPlanScDetails;
window.openEmpScDetails = openEmpScDetails;
window.toggleAdminMain = toggleAdminMain;
window.renderAdminHistory = renderAdminHistory;
window.renderAdminEmps = renderAdminEmps;
window.renderAdminScItems = renderAdminScItems;
window.switchScDept = switchScDept;
window.switchScAdminTab = switchScAdminTab;
window.setPlanDates = setPlanDates;
window.loadPlanHistory = loadPlanHistory;
window.triggerAction = triggerAction;
window.triggerReturn = triggerReturn;
window.checkSwapFields = checkSwapFields;
window.openScDoc = openScDoc;
window.markAsSeen = markAsSeen;
window.selectTradeIn = selectTradeIn;
window.executeFine = executeFine;
window.executeRemark = executeRemark;
window.forceLogout = forceLogout;
window.closeDetails = closeDetails;
window.setEmpScDates = setEmpScDates;
window.renderEmpScDetailsData = renderEmpScDetailsData;

// Вспомогательные функции, используемые в HTML
window.showToast = showToast;
window.formatDateLocal = formatDateLocal;
window.generateDatePanelHTML = generateDatePanelHTML;
window.setPanelDates = setPanelDates;
window.groupAndRenderByMonth = groupAndRenderByMonth;

// Инициализация приложения после загрузки DOM
document.addEventListener("DOMContentLoaded", async () => {
  try {
    requestNotificationPermission();
    initAutoScroll();
    initSmartDates();
    initSwipe();

    if (document.getElementById('password-input')) {
      const pass = document.getElementById('password-input');
      pass.style.width = '100%';
      pass.style.boxSizing = 'border-box';
      pass.style.height = '48px';
      pass.style.padding = '0 16px';
      pass.style.fontSize = '16px';
      pass.style.borderRadius = '12px';
      pass.style.border = '1px solid var(--border-color)';
      pass.style.background = 'var(--card-bg)';
      pass.style.color = 'var(--text-color)';
      pass.style.marginTop = '8px';
    }

    const urlParams = new URLSearchParams(window.location.search);
    const urlIin = urlParams.get('iin');

    if (appState.iin && appState.token) {
      document.getElementById("auth-screen").classList.add("hidden");
      document.getElementById("main-screen").classList.remove("hidden");
      if (appState.firstName) document.getElementById("user-greeting").innerText = appState.firstName;
      await loadDashboard(false);
      startPolling();
    } else {
      hideLoader();
      document.getElementById("auth-screen").classList.remove("hidden");
      if (urlIin && urlIin.length === 12) {
        document.getElementById("iin-input").value = urlIin;
        setTimeout(() => document.getElementById("password-input").focus(), 300);
      }
    }
  } catch (err) {
    alert("Сбой загрузки: очищаю кэш");
    clearMemory();
    hideLoader();
    document.getElementById("auth-screen").classList.remove("hidden");
  }
});

// Функции, используемые только при инициализации
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

function initSwipe() {
  let startX = 0, startY = 0;
  const scrollArea = document.getElementById('scrollable-body');
  if (!scrollArea) return;
  scrollArea.addEventListener('touchstart', e => {
    if (e.target.closest('.no-swipe')) return;
    startX = e.changedTouches[0].screenX;
    startY = e.changedTouches[0].screenY;
  }, { passive: true });
  scrollArea.addEventListener('touchend', e => {
    if (e.target.closest('.no-swipe')) return;
    let endX = e.changedTouches[0].screenX;
    let endY = e.changedTouches[0].screenY;
    let diffX = endX - startX;
    let diffY = Math.abs(endY - startY);
    if (diffY < 60 && Math.abs(diffX) > 80) {
      let roleStr = String(appState.role).toLowerCase();
      let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
      let isZavSklad = roleStr.includes("заведующий складом");
      let tabs = isDir ? ['adm-outs', 'adm-main', 'adm-inbox'] :
                 isZavSklad ? ['adm-outs', 'adm-main', 'inbox'] :
                 ['time', 'create', 'inbox'];
      let currentIdx = tabs.indexOf(lastActiveTab);
      if (currentIdx !== -1) {
        if (diffX < 0 && currentIdx < tabs.length - 1) switchTab(tabs[currentIdx + 1], 'right');
        else if (diffX > 0 && currentIdx > 0) switchTab(tabs[currentIdx - 1], 'left');
      }
    }
  }, { passive: true });
}
