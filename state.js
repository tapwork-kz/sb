// state.js
import { getMemory } from './utils.js';

// Все изменяемые состояния теперь поля одного объекта appState
export const appState = {
  // данные входа
  token: getMemory("userToken"),
  iin: getMemory("userIIN"),
  firstName: getMemory("userName") || "",
  currentAction: getMemory("currentAction"),
  role: getMemory("userRole") || "Продавец",
  dept: getMemory("userDept") || "Цифра",
  lastInboxCount: 0,

  // флаги и состояния UI
  isUserPromoter: false,
  lastActiveTab: 'time',
  processedReqIds: new Set(),
  currentAdminScDept: 'Цифра',
  currentEmpDept: 'Цифра',
  currentScTabDept: 'Цифра',
  currentHistFilter: 'all',
  currentAdminMainView: 'plan',
  savedScrollPos: {},
  window_nomListOpen: false,
  activeOutsTimer: null,
  pollingTimer: null,

  // массивы данных
  globalActiveOuts: [],
  adminEmployeesGlobal: [],
  adminHistoryGlobal: [],
  allEmployeesData: [],
  globalSellers: [],
  globalScItems: [],
  adminScItemsGlobal: [],
  tradeInModelsGlobal: [],
  selectedTradeInModel: null,
  selectedScItem: null,

  myReports: [],
  myPointsHistory: [],
  myDisplayPointsHistory: [],
  myScHistory: [],
  myKpiDetails: [],
  myMoneyFinesHistory: [],
};

// Для совместимости с window.dynamicPrefixColors (если нужно)
window.dynamicPrefixColors = window.dynamicPrefixColors || {};
