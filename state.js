// state.js
import { getMemory } from './utils.js';

export const appState = {
  token: getMemory("userToken"),
  iin: getMemory("userIIN"),
  firstName: getMemory("userName") || "",
  currentAction: getMemory("currentAction"),
  role: getMemory("userRole") || "Продавец",
  dept: getMemory("userDept") || "Цифра",
  lastInboxCount: 0
};

export let globalActiveOuts = [];
export let adminEmployeesGlobal = [];
export let adminHistoryGlobal = [];
export let allEmployeesData = [];
export let globalSellers = [];
export let globalScItems = [];
export let adminScItemsGlobal = [];
export let tradeInModelsGlobal = [];
export let selectedTradeInModel = null;
export let selectedScItem = null;

export let myReports = [];
export let myPointsHistory = [];
export let myDisplayPointsHistory = [];
export let myScHistory = [];
export let myKpiDetails = [];
export let myMoneyFinesHistory = [];

export let isUserPromoter = false;
export let lastActiveTab = 'time';
export let processedReqIds = new Set();
export let currentAdminScDept = 'Цифра';
export let currentEmpDept = 'Цифра';
export let currentScTabDept = 'Цифра';
export let currentHistFilter = 'all';
export let currentAdminMainView = 'plan'; // будет переопределяться

export let savedScrollPos = {};
export let window_nomListOpen = false; // используется в renderPlanUI

// для динамических цветов префиксов
window.dynamicPrefixColors = window.dynamicPrefixColors || {};

// Другие переменные, которые могут понадобиться глобально
export let activeOutsTimer = null;
export let pollingTimer = null;
