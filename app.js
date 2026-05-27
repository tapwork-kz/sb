window.onerror = function(message, source, lineno, colno, error) { if (lineno === 0 || !source) return true; alert("ОШИБКА: " + message + " в строке " + lineno); };
window.onunhandledrejection = function(event) { alert("ОШИБКА ПРОМИСА: " + event.reason); };

const SUPABASE_URL = 'https://qvkhfueivkwdqydnhlsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mXpXBbeHRecrahRlDxkDAQ_Xe3zyb5G';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const GAS_URL = "https://script.google.com/macros/s/AKfycbxb2UW5ctVar9QhWmjI-IIFA1EOxDCovRDoNBcbN31x4L4-mCh1lGcF-ZdH-62pUrbR/exec";

let tg = window.Telegram ? window.Telegram.WebApp : null; if (tg) { tg.expand(); }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }

function saveMemory(key, value) { try { localStorage.setItem(key, value); } catch(e){} document.cookie = key + "=" + encodeURIComponent(value || "") + "; max-age=31536000; path=/"; }
function getMemory(key) { let val = null; try { val = localStorage.getItem(key); } catch(e){} if (!val) { let match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)')); if (match) val = decodeURIComponent(match[2]); } return val; }
function clearMemory() { try { localStorage.clear(); } catch(e){} let cookies = document.cookie.split("; "); for (let c of cookies) document.cookie = c.split("=")[0] + "=; max-age=0; path=/"; }

let appState = { token: getMemory("userToken"), iin: getMemory("userIIN"), firstName: getMemory("userName") || "", currentAction: getMemory("currentAction"), role: getMemory("userRole") || "Продавец", dept: getMemory("userDept") || "Цифра", lastInboxCount: 0 };
window.dynamicPrefixColors = JSON.parse(localStorage.getItem('dynamicColors') || '{}');
window.nomListOpen = false;
window.typingLockTime = 0; 

let autoScrollAnimation = true; let activeOutsTimer = null; let globalActiveOuts = []; let isUserPromoter = false; 
let currentAdminScDept = 'Цифра'; let currentEmpDept = 'Цифра'; let currentScTabDept = 'Цифра'; let currentAdminScTabType = 'active';
let pollingTimer = null; let lastActiveTab = 'time'; let processedReqIds = new Set(); let savedScrollPos = {};
let globalSellers = []; let globalScItems = []; let adminScItemsGlobal = []; let selectedScItem = null; let tradeInModelsGlobal = []; let selectedTradeInModel = null;
let myReports = []; let myPointsHistory = []; let myDisplayPointsHistory = []; let myScHistory = []; let myKpiDetails = []; let allEmployeesData = []; let myMoneyFinesHistory = [];
let currentHistFilter = 'all';

function safeIin(val) { if(val === undefined || val === null) return ""; return String(val).trim().replace(/^0+/, ''); }
function requestNotificationPermission() { if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission(); }
function showPushNotification(title, bodyText) { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body: bodyText, icon: "icon.png" }); }
function fmtSum(val) { if(!val) return "0"; return String(Math.round(val)).replace(/\s/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
function formatDateLocal(d) { if (!d) d = new Date(); let y = d.getFullYear(); let m = ("0" + (d.getMonth() + 1)).slice(-2); let day = ("0" + d.getDate()).slice(-2); return `${y}-${m}-${day}`; }
function formatShortName(fullName) { if (!fullName) return ""; let p = String(fullName).trim().split(/\s+/); if (p.length > 1 && p[1]) return p[0] + " " + p[1].charAt(0).toUpperCase() + "."; return p[0]; }
function isCurrentMonth(dateStr) { if (!dateStr) return true; let d = new Date(); let m = ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear(); return String(dateStr).includes(m); }
function getMonthName(dateStr) { if(!dateStr) return "Неизвестно"; let parts = dateStr.split('.'); if(parts.length < 2) return dateStr; let m = parseInt(parts[0], 10); let months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]; return (months[m-1] || parts[0]) + " " + (parts[1].length === 4 ? parts[1] : parts[2] || ""); }
function parseCustomDate(dStr) { if (!dStr) return 0; let parts = String(dStr).split(' '); let dParts = parts[0].split('.'); if (dParts.length !== 3) return 0; let timeParts = parts[1] ? parts[1].split(':') : [0, 0]; return new Date(dParts[2], dParts[1] - 1, dParts[0], timeParts[0] || 0, timeParts[1] || 0).getTime(); }
function formatPointsNoun(num) { let n = Math.abs(parseFloat(String(num).replace(',','.'))); if (isNaN(n)) return "баллов"; if (n % 1 !== 0) return "балла"; n = Math.floor(n) % 100; let n10 = n % 10; if (n >= 11 && n <= 19) return "баллов"; if (n10 === 1) return "балл"; if (n10 >= 2 && n10 <= 4) return "балла"; return "баллов"; }
function formatNumberWithSpaces(x) { if (!x) return "0"; return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
function vibrate(ms = 50) { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); else if (navigator.vibrate) navigator.vibrate(ms); }
function showToast(msg, isError = false, duration = 3000) { const t = document.getElementById("toast"); t.innerText = msg; t.style.background = isError ? "#e74c3c" : "#34495e"; t.classList.add("show"); if (duration !== 9999) setTimeout(() => t.classList.remove("show"), duration); }

function getSourceColor(src) { 
    let originalSrc = String(src).trim();
    if (window.dynamicPrefixColors && window.dynamicPrefixColors[originalSrc]) return window.dynamicPrefixColors[originalSrc];
    let s = originalSrc.toLowerCase(); 
    if(s.includes('сц')) return '#e67e22'; 
    if(s.includes('trade-in')) return '#8e44ad'; 
    if(s.includes('горячий')) return '#e84393'; 
    if(s.includes('обмен')) return '#f39c12'; 
    if(s.includes('исправл')) return '#3498db'; 
    if(s.includes('мотивац')) return '#3390ec'; 
    let hash = 0; for(let i = 0; i < s.length; i++) { hash = s.charCodeAt(i) + ((hash << 5) - hash); }
    const colors = ['#e74c3c', '#1abc9c', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#f39c12'];
    return colors[Math.abs(hash) % colors.length] || '#7f8c8d'; 
}

const NOM_DICT = { to: { cifra: ["Основной товар GSM", "Основной товар Цифровая и оргтехника", "Основной товар Черная техника"], mbt: ["Основной товар МБТ"], kbt: ["Основной товар Белая техника", "Основной товар Кондиционеры"] }, aks: { cifra: ["Сопутствующий товар GSM", "Сопутствующий товар Цифровая и оргтехника", "Сопутствующий товар Черная техника"], mbt: ["Сопутствующий товар МБТ"], kbt: ["Сопутствующий товар Белая техника"] }, usl: { cifra: ["Услуга ESD", "Услуга IT", "Услуга TV", "Услуга ММС", "Услуга Настройка TV", "Услуга Онлайн-кинотеатр", "Услуга Сервис Плюс IT", "Услуга Сервис Плюс TV", "Услуги IT на ПК, ноутбуки и моноблоки", "Услуги IT на смартфоны и планшеты", "Услуги установки Черной техники", "Услуги электронные"], mbt: ["Услуга SDA"], kbt: ["Услуга MDA", "Услуга Сервис Плюс MDA", "Услуги установки Белой техники", "Услуги установки Кондиционеров"] } };

function calcPlanEngine(rawPlanData) {
    if (!rawPlanData) return null; let parse = (str) => parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;
    let rawGroups = rawPlanData.groups || []; let totalStorePlan = parse(rawPlanData.totalPlan || "0");
    let r = { totalPlan: totalStorePlan, to: { total: { plan: 0, fact: 0, ed: 0 }, cifra: { plan: 0, fact: 0, ed: 0 }, mbt: { plan: 0, fact: 0, ed: 0 }, kbt: { plan: 0, fact: 0, ed: 0 } }, aks: { total: { plan: 0, fact: 0, ed: 0 }, cifra: { plan: 0, fact: 0, ed: 0 }, mbt: { plan: 0, fact: 0, ed: 0 }, kbt: { plan: 0, fact: 0, ed: 0 } }, usl: { total: { plan: 0, fact: 0, ed: 0 }, cifra: { plan: 0, fact: 0, ed: 0 }, mbt: { plan: 0, fact: 0, ed: 0 }, kbt: { plan: 0, fact: 0, ed: 0 } }, groups: rawGroups };
    rawGroups.forEach(g => { let p = parse(g.plan), f = parse(g.fact), e = parse(g.factEd || g.ed); for (let cat of ['to', 'aks', 'usl']) { for (let dept of ['cifra', 'mbt', 'kbt']) { if (NOM_DICT[cat][dept].includes(g.name.trim())) { r[cat][dept].plan += p; r[cat][dept].fact += f; r[cat][dept].ed += e; r[cat].total.plan += p; r[cat].total.fact += f; r[cat].total.ed += e; } } } });
    let safePctTo = (num, den) => den > 0 ? ((num / den) * 100).toFixed(2).replace('.', ',') : "0,00";
    let setPcts = (catObj, isTo) => { for (let k of ['total', 'cifra', 'mbt', 'kbt']) { let toObj = r.to[k]; let fEd = catObj[k].fact + catObj[k].ed; let toFEd = toObj.fact + toObj.ed; if (isTo) { catObj[k].targetPct = "100,00"; catObj[k].pct = safePctTo(catObj[k].fact, catObj[k].plan); catObj[k].pctEd = safePctTo(fEd, catObj[k].plan); catObj[k].sumPct = catObj[k].pct; catObj[k].sumPctEd = catObj[k].pctEd; } else { catObj[k].targetPct = safePctTo(catObj[k].plan, toObj.plan); catObj[k].pct = safePctTo(catObj[k].fact, toObj.fact); catObj[k].pctEd = safePctTo(fEd, toFEd); catObj[k].sumPct = safePctTo(catObj[k].fact, catObj[k].plan); catObj[k].sumPctEd = safePctTo(fEd, catObj[k].plan); } } };
    setPcts(r.to, true); setPcts(r.aks, false); setPcts(r.usl, false);
    let sCount = { cifra: 0, mbt: 0, kbt: 0 };
    if (window.adminEmployeesGlobal) { window.adminEmployeesGlobal.forEach(e => { let d = String(e.dept).toLowerCase().trim(); let role = String(e.role || "").toLowerCase().trim(); if (role.includes('продавец-консультант') || role.includes('продавец консультант')) { if (d === 'цифра' || d === 'чт' || d === 'цифра/чт') sCount.cifra++; else if (d === 'мбт') sCount.mbt++; else if (d === 'кбт') sCount.kbt++; } }); }
    let sPlan = (cat, dept, count) => count > 0 ? Math.round(r[cat][dept].plan / count) : r[cat][dept].plan; let getRatio = (cat, dept) => r.to[dept].plan > 0 ? ((r[cat][dept].plan / r.to[dept].plan) * 100).toFixed(2).replace('.', ',') : "0,00";
    r.sellers = [ { name: "Цифра/ЧТ", to: sPlan('to','cifra',sCount.cifra), aks: sPlan('aks','cifra',sCount.cifra), usl: sPlan('usl','cifra',sCount.cifra), aksPct: getRatio('aks','cifra'), uslPct: getRatio('usl','cifra') }, { name: "МБТ", to: sPlan('to','mbt',sCount.mbt), aks: sPlan('aks','mbt',sCount.mbt), usl: sPlan('usl','mbt',sCount.mbt), aksPct: getRatio('aks','mbt'), uslPct: getRatio('usl','mbt') }, { name: "КБТ", to: sPlan('to','kbt',sCount.kbt), aks: sPlan('aks','kbt',sCount.kbt), usl: sPlan('usl','kbt',sCount.kbt), aksPct: getRatio('aks','kbt'), uslPct: getRatio('usl','kbt') } ];
    return r;
}

async function callBackend(actionName, payloadData = {}) { 
  try { 
    const getRoleGroup = (roleText) => { const r = (roleText || appState.role || "").toLowerCase(); if (r.includes("промоутер")) return "Промоутер"; if (r.includes("продавец")) return "Продавец"; return "Продавец"; };
    
    if (actionName === "loginByIIN") {
      const { iin, password } = payloadData; const { data, error } = await supabaseClient.from('users').select('*').eq('iin', iin).single();
      if (error || !data) return { success: false, error: "Этот ИИН не найден в базе данных" };
      if (String(data.password) !== String(password)) return { success: false, error: "Неверный пароль" };
      if (data.login_status === false || data.login_status === 'FALSE' || data.login_status === 'false') { return { success: false, error: "Доступ запрещен" }; }
      return { success: true, token: 'sb_' + data.iin, iin: data.iin, firstName: data.full_name, role: data.role, dept: data.dept, gender: data.gender, isPromoter: data.role.toLowerCase().includes("промоутер") };
    }
    
    if (actionName === "recordAction") {
      const { iin, actionType, isReturn, isAutoReturn } = payloadData; const roleGroup = getRoleGroup(); const exactRole = appState.role; 
      if (!isReturn) {
         const currentHour = new Date().getHours();
         if (actionType === 'Обед' && (currentHour < 12 || currentHour >= 17)) return { success: false, error: "Обед доступен только с 12:00 до 17:00" };
         if (actionType === 'Полдник' && (currentHour < 16 || currentHour >= 20)) return { success: false, error: "Полдник доступен только с 16:00 до 20:00" };
         const dayOfWeek = new Date().getDay() || 7; const limitField = actionType === 'Обед' ? 'lunch_limit' : (actionType === 'Полдник' ? 'snack_limit' : 'break_limit');
         const todayStart = new Date(); todayStart.setHours(0,0,0,0);
         const [ { data: limitData }, { data: todayLogs } ] = await Promise.all([ supabaseClient.from('time_limits').select('*').eq('role_group', roleGroup).eq('day_of_week', dayOfWeek).maybeSingle(), supabaseClient.from('time_tracking').select('*, users(role)').gte('created_at', todayStart.toISOString()) ]);
         if (actionType === 'Обед' || actionType === 'Полдник') { const hasTakenToday = (todayLogs || []).some(log => log.iin === iin && log.action_type === actionType && log.direction === 'Уход'); if (hasTakenToday) return { success: false, error: `Вы уже ходили на ${actionType.toLowerCase()} сегодня` }; }
         const maxAllowed = limitData ? limitData[limitField] : 1; const totalAllowed = limitData ? limitData.total_limit : 2;
         let userStates = {}; (todayLogs || []).forEach(log => { let r = log.users ? log.users.role : log.role_group; if (String(r).toLowerCase().includes(roleGroup.toLowerCase())) { if (log.direction === 'Уход') userStates[log.iin] = log.action_type; else delete userStates[log.iin]; } });
         let activeCounts = { 'Перерыв': 0, 'Обед': 0, 'Полдник': 0 }; let totalOut = 0; for (let key in userStates) { activeCounts[userStates[key]]++; totalOut++; }
         if (activeCounts[actionType] >= maxAllowed || totalOut >= totalAllowed) return { success: false, error: `Мест на ${actionType} нет` };
      }
      let direction = isReturn ? (isAutoReturn ? 'Автовозврат' : 'Возврат') : 'Уход'; let roleToSave = roleGroup === 'Промоутер' ? exactRole : roleGroup;
      const { error } = await supabaseClient.from('time_tracking').insert([{ iin: iin, action_type: actionType, direction: direction, role_group: roleToSave }]);
      if (error) return { success: false, error: "Ошибка записи в БД" };
      return { success: true, savedAction: isReturn ? null : actionType };
    }

    if (actionName === "startupCheck") {
      const roleGroup = getRoleGroup(); const dayOfWeek = new Date().getDay() || 7; const todayStart = new Date(); todayStart.setHours(0,0,0,0); const currentHour = new Date().getHours();
      const [ { data: limitData }, { data: todayLogs } ] = await Promise.all([ supabaseClient.from('time_limits').select('*').eq('role_group', roleGroup).eq('day_of_week', dayOfWeek).maybeSingle(), supabaseClient.from('time_tracking').select('*, users(full_name, role, dept)').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: true }) ]);
      let activeOutsMap = {}; let myLogs = [];
      (todayLogs || []).forEach(log => { if (log.iin === payloadData.iin) myLogs.push(log); if (log.direction === 'Уход') { activeOutsMap[log.iin] = { iin: log.iin, action: log.action_type, leftAt: new Date(log.created_at).getTime(), name: log.users ? log.users.full_name : 'Сотрудник', role: log.users ? log.users.role : log.role_group, dept: log.users ? log.users.dept : 'Цифра' }; } else { delete activeOutsMap[log.iin]; } });
      let myActiveAction = activeOutsMap[payloadData.iin] ? activeOutsMap[payloadData.iin].action : null; let outByAction = { 'Перерыв': 0, 'Обед': 0, 'Полдник': 0 }; let totalOut = 0;
      for (let key in activeOutsMap) { if (activeOutsMap[key].role.toLowerCase().includes(roleGroup.toLowerCase())) { outByAction[activeOutsMap[key].action]++; totalOut++; } }
      const tookLunch = myLogs.some(l => l.action_type === 'Обед' && l.direction === 'Уход'); const tookSnack = myLogs.some(l => l.action_type === 'Полдник' && l.direction === 'Уход');
      const isLunchTime = currentHour >= 12 && currentHour < 17; const isSnackTime = currentHour >= 16 && currentHour < 20;
      const hasLunchSlot = (outByAction['Обед'] < (limitData?.lunch_limit || 1)) && (totalOut < (limitData?.total_limit || 2)); const hasSnackSlot = (outByAction['Полдник'] < (limitData?.snack_limit || 1)) && (totalOut < (limitData?.total_limit || 2)); const hasBreakSlot = (outByAction['Перерыв'] < (limitData?.break_limit || 1)) && (totalOut < (limitData?.total_limit || 2));
      return { authorized: true, activeOuts: Object.values(activeOutsMap).map(o => { let timerLimit = 10; let rRole = String(o.role || "").toLowerCase(); if (rRole.includes('промоутер')) { if (o.action === 'Обед') timerLimit = 60; else if (o.action === 'Полдник') timerLimit = 30; else timerLimit = 15; } else { if (o.action === 'Обед') timerLimit = 40; else if (o.action === 'Полдник') timerLimit = 30; else timerLimit = 10; } return { ...o, limit: timerLimit }; }), myActiveAction: myActiveAction, canBreak: hasBreakSlot, canLunch: hasLunchSlot && isLunchTime && !tookLunch, canSnack: hasSnackSlot && isSnackTime && !tookSnack };
    }

    if (actionName === "processRequest") {
      const { reqId, reqAction, replyText } = payloadData; const { data: req, error: reqErr } = await supabaseClient.from('requests').select('*').eq('id', reqId).single(); const { data: currentUser } = await supabaseClient.from('users').select('*').eq('iin', appState.iin).single();
      if (reqErr || !req) return { success: false, error: "Запрос не найден" };
      let currentStatus = String(req.status || "").trim().toLowerCase(); let reqType = String(req.type || "").trim(); let newStatus = currentStatus; let newDetails = req.details; let metaObj = {}; try { metaObj = typeof req.metadata === 'string' ? JSON.parse(req.metadata) : (req.metadata || {}); } catch(e){} let isHandled = false; let responseMsg = "Обработано";
      
      if (["approved", "rejected", "rejected_by_user", "viewed"].includes(currentStatus) && !reqAction.includes("dismiss")) { return { success: false, error: `Уже обработана` }; }
      
      if ((currentStatus === "rejected_notify_zav" || currentStatus === "approved_notify_zav") && reqAction === "dismiss_notification") { newStatus = currentStatus.includes("rejected") ? "rejected" : "approved"; isHandled = true; responseMsg = "Ознакомлен"; }
      else if (currentStatus === "notify_user_fine" && reqAction === "dismiss_notification") { newStatus = "viewed_fine"; isHandled = true; responseMsg = "Ознакомлен"; }
      else if ((currentStatus === "pending_user_reply" || currentStatus === "pending_admin_view_remark") && reqAction === "dismiss_notification") { if (!metaObj.dismissedBy) metaObj.dismissedBy = []; if (!metaObj.dismissedBy.includes(appState.iin)) metaObj.dismissedBy.push(appState.iin); isHandled = true; responseMsg = "Перенесено в историю"; }
      else if (currentStatus === "pending_user" && reqAction === "approve_user") { newStatus = "pending_admin"; isHandled = true; responseMsg = "Отправлено директору"; }
      else if (currentStatus === "pending_user" && reqAction === "reject_user") { newStatus = "rejected_by_user"; isHandled = true; responseMsg = "Отклонено"; }
      else if (currentStatus === "rejected_notify_user" && reqAction === "dismiss_rejection") { newStatus = "rejected"; isHandled = true; responseMsg = "Скрыто"; }
      else if (currentStatus === "pending_user_reply" && reqAction === "reply_remark") { let safeReply = replyText ? replyText.substring(0, 500) : "Без комментариев"; let targetShort = currentUser.full_name; let parts = String(targetShort).trim().split(/\s+/); if(parts.length > 1) targetShort = parts[0] + " " + parts[1].charAt(0).toUpperCase() + "."; newDetails = req.details + `\n\n> ${targetShort}\n${safeReply}`; newStatus = "pending_admin_view_remark"; isHandled = true; responseMsg = "Ответ отправлен"; }
      else {
          let roleStr = String(currentUser.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
          if (isDir) {
              if (reqAction === "reject_admin") { metaObj.approver = currentUser.full_name; metaObj.approverIin = appState.iin; newDetails = req.details; newStatus = reqType === "Запрос на штраф" ? "rejected_notify_zav" : "rejected_notify_user"; isHandled = true; responseMsg = "Отклонено"; }
              else if ((currentStatus === "pending_admin_view" || currentStatus === "pending") && reqAction === "viewed") { newStatus = "viewed"; isHandled = true; responseMsg = "Просмотрено"; }
              else if ((currentStatus === "pending_admin" || currentStatus === "pending") && reqAction === "approve_admin") {
                  metaObj.approver = currentUser.full_name; metaObj.approverIin = appState.iin; newDetails = req.details; 
                  if (reqType === "Запрос на штраф") { 
                      await supabaseClient.from('user_details').insert([{ iin: req.target_iin, type: "Штраф", action_text: metaObj.reason || req.details, points_motivation: -(Math.abs(parseFloat(metaObj.amount) || 0)), fine_money: -(Math.abs(parseFloat(metaObj.moneyAmount) || 0)), manager_iin: appState.iin }]); 
                      await supabaseClient.from('requests').insert([{ author_iin: req.author_iin, type: "Уведомление о штрафе", details: metaObj.reason || req.details, target_iin: req.target_iin, status: "notify_user_fine", metadata: metaObj }]); 
                      newStatus = "approved_notify_zav"; isHandled = true; responseMsg = "Одобрено"; 
                  }
                  else if (reqType === "Горячий чек") { 
                      await supabaseClient.from('user_details').insert([{ iin: req.author_iin, type: "Горячий чек", action_text: req.details, points_motivation: parseFloat(metaObj.pts) || 0, kpi_change: parseFloat(metaObj.bonus) || 0, manager_iin: appState.iin }]); 
                      newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                  }
                  else if (reqType === "Продажа СЦ/Фокус" || reqType === "Продажа Trade-In" || metaObj.type || reqType === metaObj.type) { 
                      let earnSourceType = (reqType === "Продажа Trade-In") ? "Trade-In" : (metaObj.type || reqType); 
                      let pts = (reqType === "Продажа Trade-In") ? 1 : (parseFloat(metaObj.pts) || 0); 
                      let bonus = metaObj.bonus ? parseFloat(metaObj.bonus) : (reqType === "Продажа СЦ/Фокус" ? 3 : 0);
                      
                      await supabaseClient.from('user_details').insert([{ iin: req.author_iin, type: reqType, category: earnSourceType, action_text: req.details, points_motivation: pts, kpi_change: bonus, manager_iin: appState.iin }]); 
                      newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                      
                      if ((reqType === "Продажа СЦ/Фокус" || metaObj.type) && metaObj.row && metaObj.dept) { 
                          const todayStr = formatDateLocal(new Date()); 
                          const { data: scData } = await supabaseClient.from('store_sc_items').select('*').eq('date', todayStr).maybeSingle(); 
                          if (scData && scData.items_data) { 
                              let updatedItems = scData.items_data.filter(i => !(i.row === metaObj.row && i.dept === metaObj.dept && i.type === metaObj.type)); 
                              await supabaseClient.from('store_sc_items').update({ items_data: updatedItems }).eq('date', todayStr); 
                          } 
                          fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "markScSold", payload: { row: metaObj.row, dept: metaObj.dept, type: metaObj.type } }) }).catch(()=>{}); 
                      }
                  }
                  else if (reqType.includes("Баллы мотивации")) { 
                      let cost = -1; if (req.details.includes("30 мин")) cost = -0.5; else if (req.details.includes("1 час")) cost = -1; else if (req.details.includes("2 часа")) cost = -2; else if (req.details.includes("3 часа")) cost = -3; 
                      await supabaseClient.from('user_details').insert([{ iin: req.author_iin, type: "Использование", category: "Мотивация", action_text: req.details, points_motivation: cost, manager_iin: appState.iin }]); 
                      newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                  }
                  else { newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; }
              }
          }
      }
      if (isHandled) { await supabaseClient.from('requests').update({ status: newStatus, details: newDetails, metadata: metaObj }).eq('id', reqId); return { success: true, msg: responseMsg }; } else { return { success: false, error: `Действие не распознано` }; }
    }

    if (actionName === "submitRemark") { const { targetIin, targetName, text } = payloadData; const { error } = await supabaseClient.from('requests').insert([{ author_iin: appState.iin, type: "Замечание", details: text, target_iin: targetIin, status: "pending_user_reply", metadata: {} }]); if (error) return { success: false, error: error.message }; return { success: true }; }
    if (actionName === "submitFine") {
      const { iin: targetIin, name: targetName, reason, amount, moneyAmount } = payloadData; const { data: currentUser } = await supabaseClient.from('users').select('*').eq('iin', appState.iin).single();
      let roleStr = String(currentUser.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); let isZavSklad = roleStr.includes("заведующий складом");
      let metaObj = { reason: reason, amount: amount, moneyAmount: moneyAmount }; let ptsAmount = -(Math.abs(parseFloat(amount) || 0)); let fineMoneyAmount = -(Math.abs(parseFloat(moneyAmount) || 0));
      if (isZavSklad) { await supabaseClient.from('requests').insert([{ author_iin: appState.iin, type: "Запрос на штраф", details: reason, target_iin: targetIin, status: "pending_admin", metadata: metaObj }]); } 
      else if (isDir) { await supabaseClient.from('user_details').insert([{ iin: targetIin, type: "Штраф", action_text: reason, points_motivation: ptsAmount, fine_money: fineMoneyAmount, manager_iin: appState.iin }]); await supabaseClient.from('requests').insert([{ author_iin: appState.iin, type: "Уведомление о штрафе", details: reason, target_iin: targetIin, status: "notify_user_fine", metadata: metaObj }]); }
      return { success: true };
    }

    if (actionName === "submitRequest") {
      const { type, details, targetIin, metadata } = payloadData; let metaObj = {}; try { metaObj = metadata ? JSON.parse(metadata) : {}; } catch(e) {}
      const { error } = await supabaseClient.from('requests').insert([{ author_iin: appState.iin, type: type, details: details, target_iin: targetIin, status: "pending", metadata: metaObj }]);
      if (error) return { success: false, error: error.message }; return { success: true };
    }

    if (actionName === "getDashboardData") {
      const { data: userData, error: userErr } = await supabaseClient.from('users').select('*').eq('iin', appState.iin).maybeSingle();
      if (userErr || !userData) return { authorized: false };

      let localData = {}; 
      const [ { data: allUsers }, { data: allReqs }, { data: allUserDetails }, { data: kpiDataRaw }, { data: allSheetInfo }, { data: scItemsRaw }, { data: tradeInRaw } ] = await Promise.all([ supabaseClient.from('users').select('iin, full_name, role, dept'), supabaseClient.from('requests').select('*').order('created_at', { ascending: false }), supabaseClient.from('user_details').select('*').order('created_at', { ascending: false }), supabaseClient.from('sheet_kpi_params').select('*').order('date', { ascending: false }).limit(1), supabaseClient.from('user_sheet_info').select('*'), supabaseClient.from('store_sc_items').select('*').order('date', { ascending: false }).limit(1), supabaseClient.from('trade_in_models').select('model_name').order('sort_order', { ascending: true }) ]);

      let finalScItems = (scItemsRaw && scItemsRaw.length > 0 && scItemsRaw[0].items_data) ? scItemsRaw[0].items_data : []; let tradeInList = (tradeInRaw && tradeInRaw.length > 0) ? tradeInRaw.map(item => item.model_name) : [];
      let kpiCfg = { base: 80, rev: -5, revsn: -5, price: -4, ub: -7, bl: -1, pr: -10 }; let freshHotChecks = [];

      let tempColors = JSON.parse(localStorage.getItem('dynamicColors') || '{}');
      if (kpiDataRaw && kpiDataRaw.length > 0) {
          let rows = kpiDataRaw[0].data || [];
          rows.forEach(r => {
              ['col_e_cifra_name', 'col_h_mbt_name', 'col_k_kbt_name'].forEach((nCol, idx) => {
                  let pCol = ['col_g_cifra_pts', 'col_j_mbt_pts', 'col_m_kbt_pts'][idx];
                  let bName = String(r[nCol] || "").trim();
                  let bPts = String(r[pCol] || "").trim();
                  if (bName.startsWith("_") && bPts.startsWith("_#")) {
                      let prefix = bName.substring(1).split(" ")[0].trim();
                      let color = bPts.substring(1).split(" ")[0].trim();
                      if (prefix && color) tempColors[prefix] = color;
                  }
              });
          });
          window.dynamicPrefixColors = tempColors;
          localStorage.setItem('dynamicColors', JSON.stringify(tempColors));
      }

      if (kpiDataRaw && kpiDataRaw.length > 0) {
          let rows = kpiDataRaw[0].data || [];
          rows.forEach(r => {
              let pVal = parseFloat(String(r.col_d_penalty_val).replace(',', '.'));
              if (r.col_a_kpi_name === 'Базовы') kpiCfg.base = parseFloat(String(r.col_b_kpi_val).replace(',', '.')) || 80;
              if (r.col_c_penalty_name === 'Отзыв') kpiCfg.rev = pVal || -5;
              if (r.col_c_penalty_name === 'Ревизия') kpiCfg.revsn = pVal || -5;
              if (r.col_c_penalty_name === 'Проверка ценников') kpiCfg.price = pVal || -4;
              if (r.col_c_penalty_name === 'Ген. уборка') kpiCfg.ub = pVal || -7;
              if (r.col_c_penalty_name && r.col_c_penalty_name.includes('БЛ')) kpiCfg.bl = pVal || -1;
              if (r.col_c_penalty_name && r.col_c_penalty_name.includes('ПР')) kpiCfg.pr = pVal || -10;
          });

          let d = String(userData.dept).toLowerCase(); let nameCol, kpiCol, ptsCol;
          if (d.includes("цифра") || d.includes("чт")) { nameCol = 'col_e_cifra_name'; kpiCol = 'col_f_cifra_kpi'; ptsCol = 'col_g_cifra_pts'; }
          else if (d.includes("мбт")) { nameCol = 'col_h_mbt_name'; kpiCol = 'col_i_mbt_kpi'; ptsCol = 'col_j_mbt_pts'; }
          else if (d.includes("кбт")) { nameCol = 'col_k_kbt_name'; kpiCol = 'col_l_kbt_kpi'; ptsCol = 'col_m_kbt_pts'; }
          
          if (nameCol) {
              let currentSub = ""; let activePromoList = null; localData.promoLists = []; freshHotChecks = [];
              rows.forEach(r => {
                  let btnName = String(r[nameCol] || "").trim(); if (!btnName) return;
                  let rawVal = String(r[kpiCol] || "").trim(); 
                  let rawPts = String(r[ptsCol] || "").trim();
                  
                  if (btnName.startsWith("_")) {
                      let title = btnName.substring(1).trim(); 
                      let prefix = ""; let defKpi = "0"; let listColor = "var(--text-color)";
                      
                      if (rawVal.startsWith("_")) { 
                          let spaceIdx = rawVal.indexOf(" "); 
                          if (spaceIdx !== -1) { 
                              prefix = rawVal.substring(1, spaceIdx).trim(); 
                              defKpi = rawVal.substring(spaceIdx).replace('%', '').replace(',', '.').trim(); 
                          } else { 
                              prefix = rawVal.substring(1).trim(); 
                          } 
                      } else { 
                          defKpi = rawVal.replace('%', '').replace(',', '.').trim(); 
                      }
                      
                      if (rawPts.startsWith("_#")) {
                          let spaceIdx = rawPts.indexOf(" ");
                          if (spaceIdx !== -1) {
                              listColor = rawPts.substring(1, spaceIdx).trim();
                          } else {
                              listColor = rawPts.substring(1).trim();
                          }
                      }
                      
                      activePromoList = { title: title, prefix: prefix, defKpi: defKpi, listColor: listColor, items: [] };
                      localData.promoLists.push(activePromoList);
                  } else if (btnName.includes("*")) { 
                      activePromoList = null; let btnVal = rawVal.replace('%', '').replace(',', '.').trim();
                      let btnPts = rawPts.replace('%', '').replace(',', '.').trim() || "0";
                      freshHotChecks.push({ sub: currentSub, name: btnName.replace(/\*/g, '').trim(), val: btnVal, pts: btnPts }); 
                  } else { 
                      if (activePromoList) { 
                          let btnVal = rawVal.replace('%', '').replace(',', '.').trim(); 
                          if (!btnVal || btnVal === "0") btnVal = activePromoList.defKpi; 
                          let btnPts = rawPts.replace('%', '').replace(',', '.').trim() || "0";
                          
                          let cleanName = btnName; let count = null;
                          let bracketIdx = btnName.indexOf('[');
                          if (bracketIdx !== -1) {
                              cleanName = btnName.substring(0, bracketIdx).trim();
                              let metaStr = btnName.substring(bracketIdx);
                              let countMatch = metaStr.match(/\[(\d+),/);
                              if (countMatch) count = parseInt(countMatch[1]) || 0;
                          }
                          
                          if (count !== null && allReqs) {
                              let approvedCount = allReqs.filter(req => 
                                  (req.status === 'approved' || req.status === 'approved_notify_zav') && 
                                  String(req.details).trim() === cleanName &&
                                  (req.type === activePromoList.prefix || (req.metadata && req.metadata.type === activePromoList.prefix) || (req.meta && req.meta.includes(`"type":"${activePromoList.prefix}"`)))
                              ).length;
                              count = Math.max(0, count - approvedCount);
                          }
                          
                          activePromoList.items.push({ name: btnName, cleanName: cleanName, currentCount: count, val: btnVal, pts: btnPts }); 
                      } 
                      else { currentSub = btnName; }
                  }
              });
          }
      }
      if (freshHotChecks.length > 0) localData.hotChecks = freshHotChecks;

      let userMap = {}; let adminEmployees = []; let empMap = {};
      if (allUsers) {
          allUsers.forEach(u => {
              userMap[u.iin] = u; let sInfo = (allSheetInfo || []).find(s => String(s.iin) === String(u.iin)) || { tabel_data: {bs:0, bl:0, pr:0, ot:0, rd:0}, reports_data: [] };
              let kpiVal = kpiCfg.base; let kDetails = [{ name: "Базовый KPI", source: "База", val: kpiCfg.base, date: "" }]; let repErrors = 0; let directPenaltyPoints = 0;
              sInfo.reports_data.forEach(rep => {
                  repErrors += rep.errors; directPenaltyPoints += (rep.penaltySum || 0); let penalty = 0;
                  if (rep.title.includes("Ценников") || rep.title.includes("Ценники")) penalty = rep.errors * kpiCfg.price; else if (rep.title.includes("Ревизия")) penalty = rep.errors * kpiCfg.revsn; else if (rep.title.includes("уборка")) penalty = rep.errors * kpiCfg.ub; else if (rep.title.includes("Отзыв")) penalty = rep.errors * kpiCfg.rev;
                  if (penalty !== 0) { kpiVal += penalty; kDetails.push({ name: "Ошибки", source: rep.title, val: penalty, date: "" }); }
              });
              let bBl = parseFloat(String(sInfo.tabel_data.bl || "0").replace(',', '.')) || 0; let bPr = parseFloat(String(sInfo.tabel_data.pr || "0").replace(',', '.')) || 0; let blPen = bBl * kpiCfg.bl; let prPen = bPr * kpiCfg.pr;
              kpiVal += blPen + prPen; if (blPen !== 0) kDetails.push({ name: "Больничный", source: "Табель", val: blPen, date: "" }); if (prPen !== 0) kDetails.push({ name: "Прогул", source: "Табель", val: prPen, date: "" });
              if (u.role.toLowerCase().includes("продавец")) {
                  let emp = { iin: u.iin, name: u.full_name, dept: u.dept || 'Цифра', role: u.role || 'Продавец', kpi: kpiVal, kpiDetails: kDetails, pts: { acc: 0, use: 0, rem: 0, fin: 0 }, sales: { sc: 0, trade: 0 }, reportErrors: repErrors, reports: sInfo.reports_data, ptsHistory: [], remarks: [], tabelStr: `<div class="tabel-item" style="color:#f39c12"><span class="tabel-lbl">БС.</span>${sInfo.tabel_data.bs}</div><div class="tabel-item" style="color:#e67e22"><span class="tabel-lbl">БЛ.</span>${sInfo.tabel_data.bl}</div><div class="tabel-item" style="color:#e74c3c"><span class="tabel-lbl">ПР.</span>${sInfo.tabel_data.pr}</div><div class="tabel-item" style="color:#f1c40f"><span class="tabel-lbl">ОТ.</span>${sInfo.tabel_data.ot}</div><div class="tabel-item" style="color:#27ae60"><span class="tabel-lbl">РД.</span>${sInfo.tabel_data.rd}</div>`, rawTabel: sInfo.tabel_data, directPenaltyPoints: directPenaltyPoints };
                  adminEmployees.push(emp); empMap[u.iin] = emp;
              }
          });
      }
      window.adminEmployeesGlobal = adminEmployees;

      let myEmp = empMap[appState.iin];
      if (!myEmp) { let mySheet = (allSheetInfo || []).find(s => String(s.iin) === String(appState.iin)) || { tabel_data: {bs:0, bl:0, pr:0, ot:0, rd:0}, reports_data: [] }; localData.info = { tabel: mySheet.tabel_data, reports: mySheet.reports_data, kpiValue: kpiCfg.base, kpiDetails: [], baseKpi: kpiCfg.base, reportErrors: 0, directPenaltyPoints: 0, remarks: [], myPtsHistory: [] }; } 
      else { localData.info = { tabel: myEmp.rawTabel, reports: myEmp.reports, kpiValue: myEmp.kpi, kpiDetails: myEmp.kpiDetails, baseKpi: kpiCfg.base, reportErrors: myEmp.reportErrors, directPenaltyPoints: myEmp.directPenaltyPoints, remarks: [], myPtsHistory: [] }; }

      let myPtsHistory = []; let myKpiChanges = 0;
      if (allUserDetails) {
          allUserDetails.forEach(ud => {
              let d = new Date(ud.created_at); let dateStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
              let ptsMotivation = parseFloat(ud.points_motivation) || 0; let kpiChange = parseFloat(ud.kpi_change) || 0; let managerName = ud.manager_iin ? (userMap[ud.manager_iin]?.full_name || ud.manager_iin) : "";
              
              let dynamicType = ud.category || ud.type;
              let cleanActionText = ud.action_text || "";
              if (dynamicType && cleanActionText.startsWith(dynamicType + " ")) {
                  cleanActionText = cleanActionText.substring(dynamicType.length + 1).trim();
              }

              if (ptsMotivation !== 0 || ud.type === "Штраф") {
                  let histItem = { date: dateStr, type: ud.type, source: dynamicType, reason: cleanActionText, val: ptsMotivation > 0 ? "+" + ptsMotivation : ptsMotivation, approver: managerName, moneyFine: ud.fine_money || 0, kpiChange: kpiChange };
                  if (ud.type === "Продажа СЦ/Фокус" || ud.type === "Продажа Trade-In" || ud.type === dynamicType) { histItem.type = "Начисление"; histItem.source = dynamicType; histItem.val = "+" + ptsMotivation; } else if (ud.type === "Использование") { histItem.type = "Использование"; histItem.source = "Мотивация"; } else if (ud.type === "Штраф") { histItem.type = "Штраф"; histItem.source = managerName; } else if (ud.type === "Горячий чек") { 
                      histItem.type = "Начисление"; histItem.source = "Горячий чек"; 
                      let firstWord = String(cleanActionText).split(' ')[0];
                      if(firstWord && firstWord !== "Горячий" && cleanActionText.includes(firstWord + ' ')) { histItem.source = firstWord; }
                      histItem.val = "+" + ptsMotivation; 
                  }
                  if (ud.iin === appState.iin) { myPtsHistory.push(histItem); }
                  if (empMap[ud.iin]) { empMap[ud.iin].ptsHistory.push(histItem); if (histItem.type === "Начисление") { empMap[ud.iin].pts.acc += ptsMotivation; if (histItem.source === "Trade-In") empMap[ud.iin].sales.trade++; else empMap[ud.iin].sales.sc++; } if (histItem.type === "Использование") empMap[ud.iin].pts.use += Math.abs(ptsMotivation); if (histItem.type === "Штраф") empMap[ud.iin].pts.fin += Math.abs(ptsMotivation); }
              }
              if (kpiChange !== 0) {
                  let kName = cleanActionText || ud.type; let kSource = dynamicType;
                  let kpiItem = { name: kName, source: kSource, val: kpiChange, date: dateStr };
                  if (ud.iin === appState.iin) { if (!localData.info.kpiDetails) localData.info.kpiDetails = []; localData.info.kpiDetails.push(kpiItem); myKpiChanges += kpiChange; }
                  if (empMap[ud.iin]) { empMap[ud.iin].kpi += kpiChange; if (ud.iin !== appState.iin) empMap[ud.iin].kpiDetails.push(kpiItem); }
              }
          });
      }

      adminEmployees.forEach(e => { e.pts.rem = e.pts.acc - e.pts.use - e.pts.fin + e.directPenaltyPoints; });
      let myAcc=0, myUse=0, myFin=0; myPtsHistory.forEach(h => { let pts = parseFloat(String(h.val).replace('+','').replace(',','.')) || 0; if (h.type === "Начисление") myAcc += pts; if (h.type === "Использование") myUse += Math.abs(pts); if (h.type === "Штраф") myFin += Math.abs(pts); });
      localData.info.myPtsHistory = myPtsHistory; localData.info.ptsAccrued = myAcc; localData.info.ptsUsed = myUse; localData.info.ptsFine = myFin + Math.abs(localData.info.directPenaltyPoints || 0); localData.info.ptsLeft = myAcc - myUse - myFin + (localData.info.directPenaltyPoints || 0);
      if (!isNaN(localData.info.kpiValue)) localData.info.kpiValue = parseFloat(localData.info.kpiValue) + myKpiChanges;

      let userInbox = [], userHistory = [], adminInbox = [], adminHistory = [];
      let isDir = userData.role.toLowerCase().includes("директор") || userData.role.toLowerCase().includes("управляющий") || userData.role.toLowerCase().includes("админ") || userData.role.toLowerCase().includes("супервайзер");
      let isZavSklad = userData.role.toLowerCase().includes("заведующий складом");

      if (allReqs) {
          allReqs.forEach(r => {
              let author = userMap[r.author_iin] || {}; let target = userMap[r.target_iin] || {}; let d = new Date(r.created_at); let dateStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
              let reqObj = { id: r.id, date: dateStr, authorIin: r.author_iin, authorName: author.full_name || r.author_iin, authorRole: author.role || "Продавец", adminDisplayName: author.dept ? `${author.full_name} — ${author.dept}` : author.full_name, type: r.type, details: r.details, targetIin: r.target_iin, targetName: target.full_name || "", status: r.status === 'pending' ? 'pending_admin' : r.status, meta: r.metadata ? JSON.stringify(r.metadata) : "{}" };
              let isDismissedByMe = false; try { let m = r.metadata || {}; if (m.dismissedBy && m.dismissedBy.includes(appState.iin)) isDismissedByMe = true; } catch(e) {}
              if (r.type === "Замечание" && (r.status === "approved" || r.status === "pending_user_reply" || r.status === "pending_admin_view_remark")) { if (empMap[r.target_iin]) empMap[r.target_iin].remarks.push({ details: r.details, authorName: author.full_name, authorRole: author.role, date: dateStr }); if (r.target_iin === appState.iin) { if (!localData.info.remarks) localData.info.remarks = []; localData.info.remarks.push({ details: r.details, authorName: author.full_name, authorRole: author.role, date: dateStr }); } }
              if (isDir) { if (reqObj.status === "pending_admin" || reqObj.status === "pending_admin_view") adminInbox.push(reqObj); if (reqObj.status === "pending_admin_view_remark" && !isDismissedByMe) adminInbox.push(reqObj); if (reqObj.type === "Замечание" && reqObj.status === "pending_user_reply" && reqObj.authorIin !== appState.iin && !isDismissedByMe) adminInbox.push(reqObj); if (["approved", "rejected", "viewed", "rejected_by_user", "rejected_notify_user", "approved_notify_zav", "rejected_notify_zav"].includes(reqObj.status) || isDismissedByMe) { if (adminHistory.length < 200) adminHistory.push(reqObj); } }
              if (isZavSklad) { if ((reqObj.status === "rejected_notify_zav" || reqObj.status === "approved_notify_zav") && reqObj.authorIin === appState.iin) userInbox.push(reqObj); else if (reqObj.status === "pending_user" && reqObj.targetIin === appState.iin) userInbox.push(reqObj); else if (reqObj.status === "rejected_notify_user" && reqObj.authorIin === appState.iin) userInbox.push(reqObj); else if (reqObj.status === "pending_user_reply" && reqObj.targetIin === appState.iin) userInbox.push(reqObj); else if (reqObj.type === "Замечание" && (reqObj.status === "pending_user_reply" || reqObj.status === "pending_admin_view_remark") && reqObj.targetIin !== appState.iin && reqObj.authorIin !== appState.iin && !isDismissedByMe) userInbox.push(reqObj); else if (reqObj.status === "notify_user_fine" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj); if (["approved", "rejected", "viewed", "rejected_by_user", "rejected_notify_user", "approved_notify_zav", "rejected_notify_zav", "viewed_fine"].includes(reqObj.status) || isDismissedByMe) { if (adminHistory.length < 200) adminHistory.push(reqObj); } }
              if (!isDir && !isZavSklad) { if (reqObj.status === "pending_user" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj); else if (reqObj.status === "rejected_notify_user" && reqObj.authorIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj); else if (reqObj.status === "pending_user_reply" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj); else if (reqObj.status === "notify_user_fine" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj); }
              let isClosedForUser = ["approved", "rejected", "viewed", "rejected_by_user", "approved_notify_zav", "rejected_notify_zav", "rejected_notify_user", "viewed_fine"].includes(reqObj.status);
              if ((reqObj.authorIin === appState.iin || reqObj.targetIin === appState.iin) && (isClosedForUser || (reqObj.status === "pending_admin_view_remark" && reqObj.targetIin === appState.iin) || isDismissedByMe)) { if (userHistory.length < 50) userHistory.push(reqObj); }
          });
      }
      let mySellers = adminEmployees.filter(e => e.dept === userData.dept && e.iin !== appState.iin).map(e => ({ iin: e.iin, name: e.name }));
      return { authorized: true, role: userData.role, name: userData.full_name, dept: userData.dept, isPromoter: userData.role.toLowerCase().includes("промоутер"), scItems: finalScItems, adminScItems: finalScItems, adminPlan: localData.adminPlan || null, tradeInModels: tradeInList, hotChecks: localData.hotChecks || [], promoLists: localData.promoLists || [], info: localData.info, userHistory: userHistory, userInbox: userInbox, adminInbox: adminInbox, adminHistory: adminHistory, adminEmployees: adminEmployees, sellers: mySellers };
    }
  } catch (error) { return { success: false, error: error.message }; }
}

function generateDatePanelHTML(idPrefix, onChangeFuncName) {
    let d = new Date(); let defStart = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1)); let defEnd = formatDateLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return `<div class="inner-block card date-panel-wrapper" style="padding:12px; margin-bottom:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div class="no-swipe" style="display:flex; gap:6px; align-items:center;" ontouchstart="event.stopPropagation();" ontouchmove="event.stopPropagation();"><input type="date" id="${idPrefix}-start" value="${defStart}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><span style="color:gray; font-weight:bold;">-</span><input type="date" id="${idPrefix}-end" value="${defEnd}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="date" onchange="${onChangeFuncName}('single', this.value); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;">📅</button></div><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="month" onchange="${onChangeFuncName}('month', this.value); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;">🗓️</button></div><button class="btn-green" style="margin:0; border-radius:8px; width:36px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:0;" onclick="${onChangeFuncName}('search')">🔍</button></div></div>`;
}

function setPanelDates(type, val, idPrefix, reloadFn) {
    let endD = new Date(); let startD = new Date();
    if (type === 'single') { if (val) { let parts = val.split('-'); startD = new Date(parts[0], parts[1] - 1, parts[2]); endD = new Date(parts[0], parts[1] - 1, parts[2]); } }
    else if (type === 'month') { if (val) { let parts = val.split('-'); startD = new Date(parts[0], parts[1] - 1, 1); endD = new Date(parts[0], parts[1], 0); } }
    if (type !== 'search') { document.getElementById(idPrefix + '-start').value = formatDateLocal(startD); document.getElementById(idPrefix + '-end').value = formatDateLocal(endD); }
    if(reloadFn) reloadFn();
}

function setPlanDates(type, val = null) {
    let endD = new Date(); let startD = new Date();
    if (type === 'single') { if (val) { let parts = val.split('-'); startD = new Date(parts[0], parts[1] - 1, parts[2]); endD = new Date(parts[0], parts[1] - 1, parts[2]); } }
    else if (type === 'today') { } else if (type === 'yesterday') { startD.setDate(startD.getDate() - 1); endD.setDate(endD.getDate() - 1); } 
    else if (type === 'month') { if (val) { let parts = val.split('-'); startD = new Date(parts[0], parts[1] - 1, 1); endD = new Date(parts[0], parts[1], 0); } else { startD.setDate(1); } } 
    else if (type === 'all') { startD = new Date(2024, 0, 1); }
    document.getElementById('plan-filter-start').value = formatDateLocal(startD); document.getElementById('plan-filter-end').value = formatDateLocal(endD);
    loadPlanHistory();
}

async function loadPlanHistory(isSilent = false) {
    let startD = document.getElementById("plan-filter-start").value; let endD = document.getElementById("plan-filter-end").value;
    if (!isSilent) showToast("Загрузка периода...", false, 9999);
    const { data: plansData, error } = await supabaseClient.from('store_plans').select('*').gte('date', startD).lte('date', endD).order('date', { ascending: false });
    if (error) { if (!isSilent) showToast("Ошибка базы: " + error.message, true); return; }
    if (!plansData || plansData.length === 0) { if (!isSilent) showToast("За этот период данных нет", true); document.getElementById("plan-render-area").innerHTML = "<p style='text-align:center;color:gray;font-size:13px; padding:20px 0;'>Нет записей в базе за эти даты</p>"; return; }
    document.getElementById("toast").classList.remove("show");
    let aggregatedGroups = JSON.parse(JSON.stringify(plansData[0].plan_data.groups || [])); let aggTotalPlan = parseFloat(String(plansData[0].plan_data.totalPlan || "0").replace(/\s/g, '').replace(',', '.')) || 0;
    let parse = (str) => parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;
    if (plansData.length > 1) {
        aggregatedGroups.forEach(g => { g.fact = 0; g.factEd = 0; g.ed = 0; });
        plansData.forEach(day => { let groups = day.plan_data.groups; if (groups) { groups.forEach((g, idx) => { if (aggregatedGroups[idx]) { aggregatedGroups[idx].fact += parse(g.fact); let e = parse(g.factEd || g.ed); aggregatedGroups[idx].factEd = (aggregatedGroups[idx].factEd || 0) + e; aggregatedGroups[idx].ed = aggregatedGroups[idx].factEd; } }); } });
    }
    let pData = calcPlanEngine({ groups: aggregatedGroups, totalPlan: aggTotalPlan }); renderPlanUI(pData);
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
      requestNotificationPermission(); initAutoScroll(); initSmartDates(); initSwipe(); 
      if(document.getElementById('password-input')) { let pass = document.getElementById('password-input'); pass.style.width = '100%'; pass.style.boxSizing = 'border-box'; pass.style.height = '48px'; pass.style.padding = '0 16px'; pass.style.fontSize = '16px'; pass.style.borderRadius = '12px'; pass.style.border = '1px solid var(--border-color)'; pass.style.background = 'var(--card-bg)'; pass.style.color = 'var(--text-color)'; pass.style.marginTop = '8px'; }
      const urlParams = new URLSearchParams(window.location.search); const urlIin = urlParams.get('iin');
      if (appState.iin && appState.token) { document.getElementById("auth-screen").classList.add("hidden"); document.getElementById("main-screen").classList.remove("hidden"); if (appState.firstName) document.getElementById("user-greeting").innerText = appState.firstName; await loadDashboard(false); startPolling(); } 
      else { hideLoader(); document.getElementById("auth-screen").classList.remove("hidden"); if (urlIin && urlIin.length === 12) { document.getElementById("iin-input").value = urlIin; setTimeout(() => document.getElementById("password-input").focus(), 300); } }
  } catch (err) { alert("Сбой загрузки: очищаю кэш"); clearMemory(); hideLoader(); document.getElementById("auth-screen").classList.remove("hidden"); }
});

function initSwipe() { let startX = 0, startY = 0; const scrollArea = document.getElementById('scrollable-body'); if (!scrollArea) return; scrollArea.addEventListener('touchstart', e => { if (e.target.closest('.no-swipe')) return; startX = e.changedTouches[0].screenX; startY = e.changedTouches[0].screenY; }, {passive: true}); scrollArea.addEventListener('touchend', e => { if (e.target.closest('.no-swipe')) return; let endX = e.changedTouches[0].screenX; let endY = e.changedTouches[0].screenY; let diffX = endX - startX; let diffY = Math.abs(endY - startY); if (diffY < 60 && Math.abs(diffX) > 80) { let roleStr = String(appState.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); let isZavSklad = roleStr.includes("заведующий складом"); let tabs = isDir ? ['adm-outs', 'adm-main', 'adm-inbox'] : isZavSklad ? ['adm-outs', 'adm-main', 'inbox'] : ['time', 'create', 'inbox']; let currentIdx = tabs.indexOf(lastActiveTab); if (currentIdx !== -1) { if (diffX < 0 && currentIdx < tabs.length - 1) switchTab(tabs[currentIdx + 1], 'right'); else if (diffX > 0 && currentIdx > 0) switchTab(tabs[currentIdx - 1], 'left'); } } }, {passive: true}); }

function hideLoader() { const loader = document.getElementById("loader-screen"); loader.style.opacity = '0'; setTimeout(() => loader.classList.add("hidden"), 600); }
function showLoader() { const loader = document.getElementById("loader-screen"); loader.classList.remove("hidden"); setTimeout(() => loader.style.opacity = '1', 10); }
function forceLogout() { if(pollingTimer) clearInterval(pollingTimer); clearMemory(); appState.token = null; appState.iin = null; document.getElementById("main-screen").style.opacity = '0'; setTimeout(() => { document.getElementById("main-screen").classList.add("hidden"); document.getElementById("auth-screen").classList.remove("hidden"); document.getElementById("auth-screen").style.opacity = '1'; document.getElementById("main-screen").style.opacity = '1'; document.getElementById("iin-input").value = ''; document.getElementById("iin-input").disabled = false; }, 600); }

document.addEventListener('focusin', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') window.typingLockTime = Date.now(); }); document.addEventListener('input', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') window.typingLockTime = Date.now(); });
function isSensitiveState() { if (lastActiveTab === 'inbox') return true; let activeEl = document.activeElement; let isTyping = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT'); let hasUnsavedText = false; document.querySelectorAll("textarea[id^='remark-reply-']").forEach(ta => { if(ta.value.length > 0) hasUnsavedText = true; }); let isRecentlyTyping = (Date.now() - window.typingLockTime) < 10000; let isScOpen = document.getElementById("form-sc") && !document.getElementById("form-sc").classList.contains("hidden"); let isTradeInOpen = document.getElementById("form-tradein") && !document.getElementById("form-tradein").classList.contains("hidden"); let isPointsOpen = document.getElementById("form-points") && !document.getElementById("form-points").classList.contains("hidden"); let isSwapOpen = document.getElementById("form-swap") && !document.getElementById("form-swap").classList.contains("hidden"); let isDetailsFormOpen = false; document.querySelectorAll('[id^="fine-form-"], [id^="remark-form-"]').forEach(el => { if (!el.classList.contains("hidden")) isDetailsFormOpen = true; }); return isTyping || isRecentlyTyping || hasUnsavedText || isScOpen || isTradeInOpen || isPointsOpen || isSwapOpen || isDetailsFormOpen; }

function startPolling() {
    if(pollingTimer) clearInterval(pollingTimer);
    supabaseClient.channel('public-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, payload => { if(appState.token && !document.hidden && !isSensitiveState() && lastActiveTab !== 'inbox') { loadDashboard(true); } }).on('postgres_changes', { event: '*', schema: 'public', table: 'user_details' }, payload => { if(appState.token && !document.hidden && !isSensitiveState() && lastActiveTab !== 'inbox') { loadDashboard(true); } }).on('postgres_changes', { event: '*', schema: 'public', table: 'time_tracking' }, async payload => { let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin }); if(state) { globalActiveOuts = state.activeOuts || []; if (appState.role.toLowerCase().includes("директор") || appState.role.toLowerCase().includes("заведующий")) { renderAdminOuts(); } else { applyLimits(state); } } }).subscribe();
    pollingTimer = setInterval(async () => { if (isSensitiveState()) return; if(appState.token && !document.hidden) { let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin }); if(state) { globalActiveOuts = state.activeOuts || []; if (appState.role.toLowerCase().includes("директор") || appState.role.toLowerCase().includes("заведующий")) renderAdminOuts(); else applyLimits(state); } if (lastActiveTab !== 'inbox') { let data = await callBackend('getDashboardData', { token: appState.token }); if (data && data.authorized !== false) renderDashboardData(data, true); } } }, 30000);
}

document.addEventListener('touchstart', function(e) { if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) { let isButton = e.target.closest('button') || e.target.tagName === 'BUTTON'; if (!document.activeElement.contains(e.target) && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && !isButton) { document.activeElement.blur(); } } }, {passive: true});

async function manualLogin() {
  const elIin = document.getElementById("iin-input"); const elPass = document.getElementById("password-input"); const iinVal = elIin.value; const passVal = elPass.value;
  if (!iinVal || iinVal.length !== 12) { document.getElementById("login-error").innerText = "ИИН должен состоять из 12 цифр"; return; } if (!passVal) { document.getElementById("login-error").innerText = "Введите пароль"; return; }
  elIin.disabled = true; elPass.disabled = true; showToast("Авторизация...", false, 9999); 
  let res = await callBackend('loginByIIN', { iin: iinVal, password: passVal });
  if (res.success) { appState.iin = res.iin; appState.token = res.token; appState.firstName = res.firstName; appState.currentAction = null; isUserPromoter = res.isPromoter; saveMemory("userIIN", appState.iin); saveMemory("userToken", appState.token); saveMemory("userName", appState.firstName); saveMemory("currentAction", ""); document.getElementById("toast").classList.remove("show"); document.getElementById("auth-screen").style.opacity = '0'; setTimeout(() => { document.getElementById("auth-screen").classList.add("hidden"); document.getElementById("main-screen").classList.remove("hidden"); document.getElementById("main-screen").style.opacity = '1'; document.getElementById("user-greeting").innerText = appState.firstName; loadDashboard(false); startPolling(); }, 600); } 
  else { elIin.disabled = false; elPass.disabled = false; document.getElementById("login-error").innerText = res.error; document.getElementById("toast").classList.remove("show"); }
}

function switchTab(tab, direction = null) {
  let scroller = document.getElementById("scrollable-body"); if (scroller && lastActiveTab) savedScrollPos[lastActiveTab] = scroller.scrollTop;
  if (tab !== 'details') lastActiveTab = tab; if(appState.token) loadDashboard(true);
  document.querySelectorAll('#main-tabs .icon-btn').forEach(btn => btn.classList.remove('active-tab')); 
  if(tab === 'time') document.getElementById('nav-time-icon').classList.add('active-tab'); if(tab === 'create') document.getElementById('nav-create-icon').classList.add('active-tab'); if(tab === 'inbox') document.getElementById('inbox-icon').classList.add('active-tab'); if(tab === 'adm-outs') document.getElementById('nav-adm-outs').classList.add('active-tab'); if(tab === 'adm-main') document.getElementById('nav-adm-main').classList.add('active-tab'); if(tab === 'adm-inbox') document.getElementById('nav-adm-inbox').classList.add('active-tab');
  document.querySelectorAll('#scrollable-body > div').forEach(el => el.classList.add("hidden"));
  let sections = document.querySelectorAll('#scrollable-body > div'); let animClass = 'slide-up-fade'; if (direction === 'right') animClass = 'slide-in-right'; else if (direction === 'left') animClass = 'slide-in-left';
  sections.forEach(s => { s.classList.remove('fade-in', 'slide-up-fade', 'slide-in-right', 'slide-in-left'); s.style.animation = 'none'; s.offsetHeight; s.style.animation = null; });
  let roleStr = String(appState.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); let isZavSklad = roleStr.includes("заведующий складом"); let isSeller = !isUserPromoter && !isDir && !isZavSklad; 
  let isCreateTabActive = (tab === 'create'); let isAnyFormActive = isCreateTabActive && document.getElementById("menu-list").classList.contains("hidden"); let dash = document.getElementById("info-dashboard"); if (isSeller && tab !== 'details' && !tab.startsWith('adm') && !isAnyFormActive) { if (dash.classList.contains("hidden")) { dash.classList.remove("hidden"); dash.classList.remove("fade-in", "slide-up-fade"); dash.classList.add("slide-down-fade"); } } else { dash.classList.add("hidden"); }
  let targetEl = document.getElementById("content-" + tab); if(targetEl) { targetEl.classList.remove("hidden"); targetEl.classList.add(animClass); }
  if(tab === 'adm-outs') renderAdminOuts(); if(tab === 'adm-main') { if (isZavSklad && window.currentAdminMainView === 'plan') window.currentAdminMainView = 'emps'; if (typeof window.currentAdminMainView === 'undefined') window.currentAdminMainView = isZavSklad ? 'emps' : 'plan'; toggleAdminMain(window.currentAdminMainView); } if(tab === 'adm-inbox') renderAdminHistory(currentHistFilter);
  if (scroller) { setTimeout(() => { scroller.scrollTop = savedScrollPos[tab] || 0; }, 10); }
}

function applyLimits(state) { if (!appState.currentAction) { document.getElementById("btn-break").disabled = !state.canBreak; document.getElementById("btn-lunch").disabled = !state.canLunch; document.getElementById("btn-snack").disabled = !state.canSnack; document.getElementById("action-hint").innerText = (state.canBreak || state.canLunch || state.canSnack) ? "Выберите действие:" : "Очередь заполнена или лимит исчерпан"; } if (state.activeOuts) { globalActiveOuts = state.activeOuts; renderActiveOuts(); } }

async function triggerUniversalAutoReturn(iin, actionType, roleGroup) { const todayStart = new Date(); todayStart.setHours(0,0,0,0); const { data } = await supabaseClient.from('time_tracking').select('*').eq('iin', iin).eq('action_type', actionType).in('direction', ['Возврат', 'Автовозврат']).gte('created_at', todayStart.toISOString()); if (!data || data.length === 0) { await supabaseClient.from('time_tracking').insert([{ iin: iin, action_type: actionType, direction: 'Автовозврат', role_group: roleGroup }]); } }

function renderActiveOuts() {
   const container = document.getElementById("active-outs-container"); const list = document.getElementById("active-outs-list"); if (!globalActiveOuts || globalActiveOuts.length === 0) { container.classList.add("hidden"); if (activeOutsTimer) clearInterval(activeOutsTimer); return; } container.classList.remove("hidden");
   function updateTimers() { const now = Date.now(); list.innerHTML = globalActiveOuts.map(out => { let elapsedMin = Math.floor((now - out.leftAt) / 60000); let diffMin = out.limit - elapsedMin; let timeClass = ""; let timeText = ""; let rRole = String(out.role || "").toLowerCase(); let isProm = rRole.includes('промоутер');
           if (diffMin <= 0 && !isProm) { triggerUniversalAutoReturn(out.iin, out.action, out.role); if (out.iin === appState.iin && appState.currentAction === out.action) { appState.currentAction = null; saveMemory("currentAction", ""); renderTimeUI(); document.getElementById("btn-break").disabled = false; document.getElementById("action-hint").innerText = "Выберите действие:"; } return ""; }
           if (diffMin > 0) { timeText = `${diffMin} мин`; } else { timeClass = "late"; timeText = `<span style="color:#e74c3c; font-size:9px; text-transform:uppercase;">Опаздывает</span><br>${Math.abs(diffMin)} мин!`; } 
           let actionTitle = out.action; if(actionTitle.includes("Перерыв")) actionTitle = "Перерыв"; let roleLabel = isProm ? out.role : `Продавец — ${out.dept || 'Сотрудник'}`; 
           return `<div class="active-out-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(150,150,150,0.1);"><div style="flex: 1; min-width: 0; display: flex; flex-direction: column;"><span class="active-out-name" style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${out.name}</span><span style="font-size: 10px; color: gray; margin-top: 2px;">${roleLabel}</span></div><div style="width: 80px; text-align: center; font-size: 12px; font-weight: bold; color: var(--btn-color);">${actionTitle}</div><div class="active-out-time ${timeClass}" style="width: 70px; text-align: right; font-size: 13px; font-weight: bold; line-height: 1.1;">${timeText}</div></div>`; 
       }).join(""); 
   } updateTimers(); if (activeOutsTimer) clearInterval(activeOutsTimer); activeOutsTimer = setInterval(updateTimers, 10000); 
}

async function triggerAutoReturn(actionToReturnFrom) { if (!appState.currentAction) return; appState.currentAction = null; saveMemory("currentAction", ""); renderTimeUI(); document.querySelectorAll("#standard-buttons button").forEach(b => b.disabled = true); document.getElementById("btn-break").disabled = false; document.getElementById("action-hint").innerText = "Очередь заполнена или лимит исчерпан"; await callBackend('recordAction', { token: appState.token, iin: appState.iin, actionType: actionToReturnFrom, isReturn: true, isAutoReturn: true }); let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin }); applyLimits(state); }
async function triggerAction(actionType) { vibrate(50); let prevAction = appState.currentAction; appState.currentAction = actionType; saveMemory("currentAction", actionType); renderTimeUI(); let res = await callBackend('recordAction', { token: appState.token, iin: appState.iin, actionType: actionType, isReturn: false, isSilentAutoReturn: false }); if (res.success && res.savedAction) { appState.currentAction = res.savedAction; saveMemory("currentAction", res.savedAction); renderTimeUI(); let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin, tgUserId: null }); applyLimits(state); } else { appState.currentAction = prevAction; saveMemory("currentAction", prevAction || ""); renderTimeUI(); let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin, tgUserId: null }); applyLimits(state); showToast("Ошибка: " + res.error, true); } }
async function triggerReturn() { vibrate(50); const actionToReturnFrom = appState.currentAction; appState.currentAction = null; saveMemory("currentAction", ""); renderTimeUI(); document.querySelectorAll("#standard-buttons button").forEach(b => b.disabled = true); document.getElementById("btn-break").disabled = false; document.getElementById("action-hint").innerText = "Фиксируем возвращение..."; let res = await callBackend('recordAction', { token: appState.token, iin: appState.iin, actionType: actionToReturnFrom, isReturn: true, isAutoReturn: false }); if (res.success) { document.getElementById("action-hint").innerText = "Обновление лимитов..."; let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin }); document.getElementById("action-hint").innerText = "Выберите действие:"; applyLimits(state); } else { appState.currentAction = actionToReturnFrom; saveMemory("currentAction", actionToReturnFrom); renderTimeUI(); showToast("Ошибка возврата: " + res.error, true); let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin }); applyLimits(state); } }

function getDeclension(action) { if (!action) return ""; if (action.startsWith("Перерыв")) return "Перерыва"; if (action === "Обед") return "Обеда"; if (action === "Полдник") return "Полдника"; return action.toLowerCase(); }
function renderTimeUI() { const standardBtns = document.getElementById("standard-buttons"); const returnContainer = document.getElementById("return-button-container"); let actStr = String(appState.currentAction); if (appState.currentAction && actStr !== "null" && actStr !== "undefined" && actStr !== "") { document.getElementById("btn-return").disabled = false; standardBtns.classList.add("hidden"); returnContainer.classList.remove("hidden"); const declension = getDeclension(appState.currentAction); document.getElementById("return-text").innerText = "Вернуться с " + declension; document.getElementById("action-hint").innerText = "Ожидаем возвращения:"; } else { standardBtns.classList.remove("hidden"); returnContainer.classList.add("hidden"); } }

function initSmartDates() { const today = formatDateLocal(new Date()); document.querySelectorAll('.smart-date').forEach(el => { el.dataset.realdate = today; el.value = "Сегодня"; el.addEventListener('focus', function() { this.type = 'date'; this.value = this.dataset.realdate; if(this.showPicker) this.showPicker(); }); el.addEventListener('blur', function() { if(!this.value) this.value = today; this.dataset.realdate = this.value; if (this.value === today) { this.type = 'text'; this.value = "Сегодня"; } else { this.type = 'text'; const d = new Date(this.value); this.value = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear(); } }); el.addEventListener('change', function() { this.blur(); }); }); }
function initAutoScroll() { const scroller = document.getElementById("scroll-container"); let scrollDir = 1; let scrollTimer = setInterval(() => { if (!autoScrollAnimation || !scroller || scroller.closest('.hidden')) return; scroller.scrollLeft += 1 * scrollDir; if (scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1) scrollDir = -1; else if (scroller.scrollLeft <= 0) scrollDir = 1; }, 40); if(scroller) { scroller.addEventListener('touchstart', () => autoScrollAnimation = false, {passive: true}); scroller.addEventListener('touchend', () => { setTimeout(()=>autoScrollAnimation=true, 2000); }, {passive: true}); } }

async function openAdminPanel() { switchTab('adm-main'); toggleAdminMain('plan'); await loadDashboard(true); }

async function loadDashboard(isSilent = false) { 
  let cachedData = localStorage.getItem("dashData_" + appState.iin); 
  if (!isSilent) { if (cachedData) { try { renderDashboardData(JSON.parse(cachedData), true); let roleStr = String(appState.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); let isZavSklad = roleStr.includes("заведующий складом"); if (isDir) { switchTab('adm-main'); toggleAdminMain('plan'); } else if (isZavSklad) { switchTab('adm-main'); toggleAdminMain('emps'); } else { switchTab('time'); } hideLoader(); isSilent = true; } catch(e) { localStorage.removeItem("dashData_" + appState.iin); showLoader(); } } else showLoader(); } 
  let data = await callBackend('getDashboardData', { token: appState.token }); 
  if (!data || data.error === "Оффлайн режим") { if (!isSilent) hideLoader(); return; } if (data.authorized === false) { forceLogout(); return; } 
  let activeEl = document.activeElement; let isTyping = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT'); let hasUnsavedText = false; document.querySelectorAll("textarea[id^='remark-reply-']").forEach(ta => { if (ta.value.length > 0) hasUnsavedText = true; });
  localStorage.setItem("dashData_" + appState.iin, JSON.stringify(data)); 
  if (!isTyping && !hasUnsavedText) { renderDashboardData(data, isSilent); } if (!isSilent) hideLoader(); 
  let roleStr = String(appState.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); let isZavSklad = roleStr.includes("заведующий складом");
  let state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin, tgUserId: null }); 
  if(state && state.authorized !== false) { globalActiveOuts = state.activeOuts || []; if (!isDir && !isZavSklad) { appState.currentAction = state.myActiveAction || ""; saveMemory("currentAction", appState.currentAction); renderTimeUI(); applyLimits(state); } else { if (!document.getElementById("content-adm-outs").classList.contains("hidden")) renderAdminOuts(); } }
}

function renderTradeInList() { let container = document.getElementById("tradein-list"); if (!container) return; container.innerHTML = tradeInModelsGlobal.map(m => { let isSel = (selectedTradeInModel === m); return `<div class="sc-item ${isSel ? 'selected' : ''}" onclick="selectTradeIn('${m}')"><div style="font-size:13px;">${m}</div></div>`; }).join(""); }
function selectTradeIn(m) { selectedTradeInModel = m; renderTradeInList(); }

function openDetails(type) {
  let prevTab = lastActiveTab; switchTab('details'); document.getElementById("btn-details-back").onclick = () => switchTab(prevTab); document.getElementById("details-kpi-circle-container").innerHTML = ""; let listHtml = "";
  if (type === 'sc') { document.getElementById("details-title").innerText = "Детали СЦ | BRZY"; listHtml = generateDatePanelHTML('my-sc', 'window.triggerMyScReload'); listHtml += "<div id='my-sc-list-container' class='card' style='padding:0; overflow:hidden;'></div>"; document.getElementById("details-list").innerHTML = listHtml; window.triggerMyScReload = function(t, val) { if(t && t !== 'search') setPanelDates(t, val, 'my-sc', () => window.triggerMyScReload('search')); else { let startParts = document.getElementById('my-sc-start').value.split('-'); let st = new Date(startParts[0], startParts[1]-1, startParts[2], 0, 0, 0).getTime(); let endParts = document.getElementById('my-sc-end').value.split('-'); let en = new Date(endParts[0], endParts[1]-1, endParts[2], 23, 59, 59).getTime(); let arr = myScHistory.filter(i => { let rd = parseCustomDate(i.date); return rd >= st && rd <= en; }); arr.sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date)); let h = ""; if(arr.length > 0) { h += arr.map((i, idx) => buildStandardRow({title: `${idx + 1}. ${i.reason}`, typeText: i.source, typeColor: getSourceColor(i.source), dateText: i.date, hasBorder: false})).join(""); } else { h = "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>В выбранном периоде пусто</div>"; } document.getElementById('my-sc-list-container').innerHTML = h; } }; window.triggerMyScReload('search'); return; } 
  else if (type === 'points') { document.getElementById("details-title").innerText = "История Баллов"; listHtml = generateDatePanelHTML('my-pts', 'window.triggerMyPtsReload'); listHtml += "<div id='my-pts-list-container' class='card' style='padding:0; overflow:hidden;'></div>"; document.getElementById("details-list").innerHTML = listHtml; window.triggerMyPtsReload = function(t, val) { if(t && t !== 'search') setPanelDates(t, val, 'my-pts', () => window.triggerMyPtsReload('search')); else { let startParts = document.getElementById('my-pts-start').value.split('-'); let st = new Date(startParts[0], startParts[1]-1, startParts[2], 0, 0, 0).getTime(); let endParts = document.getElementById('my-pts-end').value.split('-'); let en = new Date(endParts[0], endParts[1]-1, endParts[2], 23, 59, 59).getTime(); let arr = myDisplayPointsHistory.filter(i => { let rd = parseCustomDate(i.date); return rd >= st && rd <= en; }); document.getElementById('my-pts-list-container').innerHTML = groupAndRenderByMonth(arr, i => renderHistoryItem(i, true)); } }; window.triggerMyPtsReload('search'); return; }
  else if (type === 'kpi') { document.getElementById("details-title").innerText = "Детали КФ. ЭФФ."; listHtml = "<div class='card' style='padding:0; overflow:hidden;'>"; let currentKpi = myKpiDetails.filter(k => isCurrentMonth(k.date)); currentKpi.forEach(k => { let col = k.val > 0 ? 'detail-plus' : (k.val < 0 ? 'detail-minus' : 'detail-val'); let valStr = k.val > 0 ? `+${k.val}%` : `${k.val}%`; let srcColor = getSourceColor(k.source); let dispName = k.name; if (k.source === "База" || k.name === "Ошибки") dispName = k.name; if (k.name === "Больничный" || k.name === "Прогул") { dispName = k.name; srcColor = "#7f8c8d"; } listHtml += buildStandardRow({ title: dispName, isBoldTitle: (dispName === "Базовый KPI" || dispName === "База" || dispName === "Ошибки" || dispName === "Больничный" || dispName === "Прогул"), typeText: k.source, typeColor: srcColor, dateText: k.date || "За месяц", valText: valStr, valClass: col, hasBorder: false }); }); listHtml += "</div>"; }
  else if (type === 'report') { document.getElementById("details-title").innerText = "Мои отчеты"; listHtml = "<div style='padding-top:5px;'>"; listHtml += myReports.map(generateHorizontalGrid).join(''); listHtml += "</div>"; }
  else if (type === 'tabel') { document.getElementById("btn-details-back").onclick = () => switchTab(lastActiveTab); document.getElementById("details-title").innerText = "Нарушения (Штрафы и Замечания)"; listHtml = "<div style='padding-top:5px;'>"; let currentFines = myMoneyFinesHistory.filter(i => isCurrentMonth(i.date)); currentFines.sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date)); if (currentFines.length > 0) listHtml += currentFines.map(i => renderMoneyFineItem(i)).join(""); else listHtml += "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>Штрафов в этом месяце нет</div>"; let myRemarks = JSON.parse(localStorage.getItem("dashData_" + appState.iin))?.info?.remarks || []; if (myRemarks.length > 0) { listHtml += `<div class="grid-details-title" style="color:#f39c12; margin-top:10px;">Замечания</div>` + groupAndRenderByMonth(myRemarks, r => { let authorStr = formatRemarkAuthor(r.authorName, r.authorRole); return `<div class="req-item" style="border-left-color: #f39c12; margin-bottom:8px;"><div class="req-title" style="color:#f39c12; font-size:12px;">${authorStr} <span style="float:right; color:gray; font-size:10px;">${r.date}</span></div><div class="req-desc" style="color:var(--text-color); font-size:12px; white-space:pre-wrap;">${formatRemarkText(r.details)}</div></div>`; }); } listHtml += "</div>"; }
  document.getElementById("details-list").innerHTML = listHtml;
}

function openEmpKpiDetails(iin, fromDetails = false) { 
  const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin)); if(!emp) return; let prevTab = lastActiveTab; switchTab('details'); document.getElementById("btn-details-back").onclick = () => { if (fromDetails) openEmpDetails(iin); else switchTab(prevTab); }; document.getElementById("details-title").innerText = "КФ. ЭФФ: " + emp.name; document.getElementById("details-kpi-circle-container").innerHTML = ""; 
  let listHtml = "<div class='card' style='padding:0; overflow:hidden;'>"; emp.kpiDetails.forEach(k => { let col = k.val > 0 ? 'detail-plus' : (k.val < 0 ? 'detail-minus' : 'detail-val'); let valStr = k.val > 0 ? `+${k.val}%` : `${k.val}%`; let srcColor = getSourceColor(k.source); let dispName = k.name; if (k.source === "База" || k.name === "Ошибки") dispName = k.name; if (k.name === "Больничный" || k.name === "Прогул") { dispName = k.name; srcColor = "#7f8c8d"; } listHtml += buildStandardRow({ title: dispName, isBoldTitle: (dispName === "Базовый KPI" || dispName === "База" || dispName === "Ошибки" || dispName === "Больничный" || dispName === "Прогул"), typeText: k.source, typeColor: srcColor, dateText: k.date || "За месяц", valText: valStr, valClass: col, hasBorder: false }); }); listHtml += "</div>"; document.getElementById("details-list").innerHTML = listHtml; 
}

function openEmpDetails(iin) {
  const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin)); if(!emp) return; let prevTab = lastActiveTab; switchTab('details'); document.getElementById("btn-details-back").onclick = () => switchTab(prevTab); 
  let kpiFontSizeDet = String(emp.kpi).includes('.') ? (String(emp.kpi).length > 4 ? '6.5px' : '7.5px') : '9px';
  document.getElementById("details-title").innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;"><span style="flex:1; text-align:center; padding-left:28px;">${emp.name}</span><div class="circle-box" style="width:28px; min-width:28px; height:28px; margin:0; cursor:pointer; box-shadow:none;" onclick="openEmpKpiDetails('${emp.iin}', true)"><div class="kpi-container" style="background: conic-gradient(${setKpiColor(emp.kpi, null, null)} ${emp.kpi > 100 ? 100 : emp.kpi}%, var(--inner-bg) 0);"><div class="kpi-inner" style="width:24px; height:24px;"><span style="font-size:${kpiFontSizeDet}; font-weight:bold; color:${setKpiColor(emp.kpi, null, null)}; letter-spacing:-0.3px;">${emp.kpi}%</span></div></div></div></div>`;
  document.getElementById("details-kpi-circle-container").innerHTML = "";
  let tabsHtml = `<div style="display:flex; gap:6px; margin-bottom:12px; padding:0 4px;"><button id="emp-tab-rep" class="admin-flt active-flt" onclick="renderEmpDetailTab('rep', '${iin}')">Отчет</button><button id="emp-tab-pts" class="admin-flt" onclick="renderEmpDetailTab('pts', '${iin}')">Баллы</button><button id="emp-tab-viol" class="admin-flt" onclick="renderEmpDetailTab('viol', '${iin}')">Нарушения</button></div><div id="emp-detail-content" class="slide-up-fade"></div>`;
  document.getElementById("details-list").innerHTML = tabsHtml; renderEmpDetailTab(window.currentEmpDetailTab || 'rep', iin); 
}

function renderEmpDetailTab(tab, iin) {
  window.currentEmpDetailTab = tab; const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin)); if(!emp) return;
  document.getElementById('emp-tab-rep').classList.remove('active-flt'); document.getElementById('emp-tab-pts').classList.remove('active-flt'); document.getElementById('emp-tab-viol').classList.remove('active-flt'); document.getElementById('emp-tab-'+tab).classList.add('active-flt');
  let content = document.getElementById('emp-detail-content'); content.classList.remove("slide-up-fade"); void content.offsetWidth; content.classList.add("slide-up-fade"); let html = "";
  if (tab === 'rep') { html = emp.reports.map(generateHorizontalGrid).join('') || "<p style='text-align:center;color:gray;font-size:12px;'>Отчетов нет</p>"; }
  else if (tab === 'pts') { 
    html = `<div class="grid-details-container inner-block"><div style="display:flex; justify-content:space-around; text-align:center; margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:10px;"><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Нач.</div><b style="font-size:15px;">${emp.pts.acc || 0}</b></div><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Исп.</div><b style="font-size:15px;">${emp.pts.use || 0}</b></div><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Ост.</div><b style="font-size:15px; color:#27ae60;">${emp.pts.rem || 0}</b></div><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Штрф.</div><b style="font-size:15px; color:#e74c3c;">${emp.pts.fin || 0}</b></div></div><div class="grid-details-title">История баллов</div></div>`; 
    html += generateDatePanelHTML('emp-pts', `window.triggerEmpPtsReload_${iin}`); html += `<div id="emp-pts-render-area" class="card" style="padding:0; overflow:hidden;"></div>`;
    window[`triggerEmpPtsReload_${iin}`] = function(t, val) {
        if(t && t !== 'search') setPanelDates(t, val, 'emp-pts', () => window[`triggerEmpPtsReload_${iin}`]('search'));
        else {
            let startParts = document.getElementById('emp-pts-start').value.split('-'); let st = new Date(startParts[0], startParts[1]-1, startParts[2], 0, 0, 0).getTime(); let endParts = document.getElementById('emp-pts-end').value.split('-'); let en = new Date(endParts[0], endParts[1]-1, endParts[2], 23, 59, 59).getTime();
            let displayHistory = (emp.ptsHistory || []).filter(p => { let ptsVal = parseFloat(String(p.val).replace(',', '.')) || 0; if (p.type === "KPI" && p.source !== "Горячий чек") return false; if (p.type === "KPI" && p.source === "Горячий чек" && ptsVal === 0) return false; let rd = parseCustomDate(p.date); return ptsVal !== 0 && rd >= st && rd <= en; });
            document.getElementById('emp-pts-render-area').innerHTML = groupAndRenderByMonth(displayHistory, p => { return renderHistoryItem(p, true); });
        }
    }; setTimeout(() => window[`triggerEmpPtsReload_${iin}`]('search'), 100);
  }
  else if (tab === 'viol') {
    html = `<div style="display:flex; gap:8px; margin-bottom:12px;"><button class="btn-red" onclick="document.getElementById('fine-form-${iin}').classList.toggle('hidden')" style="padding:10px; font-size:12px; margin:0;">Выписать штраф</button><button class="btn-orange" onclick="document.getElementById('remark-form-${iin}').classList.toggle('hidden')" style="padding:10px; font-size:12px; margin:0;">Сделать замечание</button></div>`;
    html += `<div id="fine-form-${iin}" class="hidden inner-block slide-up-fade" style="border:1px solid #e74c3c; background:rgba(231, 76, 60, 0.05);"><input type="text" id="fine-reason-${iin}" placeholder="Причина штрафа..." style="box-sizing: border-box; width:100%; height:36px; margin-top:0; margin-bottom:8px; font-size:13px; background:var(--card-bg);"><div style="display:flex; gap:8px; margin-bottom:8px;"><input type="number" id="fine-amount-${iin}" placeholder="0 (Баллы)" style="box-sizing: border-box; height:36px; margin:0; flex:1; font-size:14px; background:var(--card-bg);"><input type="number" id="fine-money-${iin}" placeholder="0 (Сумма ₸)" style="box-sizing: border-box; height:36px; margin:0; flex:1; font-size:14px; background:var(--card-bg);"></div><button class="btn-red" onclick="executeFine('${iin}', '${emp.name}')" style="padding:8px; font-size:12px; margin:0;">Подтвердить штраф</button></div>`;
    html += `<div id="remark-form-${iin}" class="hidden inner-block slide-up-fade" style="border:1px solid #f39c12; background:rgba(243, 156, 18, 0.05);"><textarea id="remark-text-${iin}" placeholder="Текст замечания..." style="box-sizing: border-box; width:100%; height:60px; margin-bottom:8px; border-radius:8px; padding:8px; border:1px solid var(--border-color); background:var(--card-bg); color:var(--text-color); font-family:inherit; resize:none;"></textarea><button class="btn-orange" onclick="executeRemark('${iin}', '${emp.name}')" style="padding:8px; font-size:12px; margin:0;">Отправить замечание</button></div>`;
    let allFines = (emp.ptsHistory || []).filter(p => p.type === "Штраф" && (parseFloat(String(p.moneyFine).replace(',', '.')) || 0) !== 0); let finesHtml = groupAndRenderByMonth(allFines, p => renderMoneyFineItem({...p, moneyFine: parseFloat(String(p.moneyFine).replace(',', '.')) || 0})); let remarksHtml = groupAndRenderByMonth((emp.remarks || []), r => { let desc = formatRemarkText(r.details); let authorStr = formatRemarkAuthor(r.authorName, r.authorRole); let d = r.date ? String(r.date) : ""; return `<div class="req-item" style="border-left-color: #f39c12; margin-bottom:8px;"><div class="req-title" style="font-size:12px;"><b style="color:#f39c12;">${authorStr}</b> <span style="float:right; color:gray; font-size:10px;">${r.date}</span></div><div class="req-desc" style="color:var(--text-color); font-size:12px; white-space:pre-wrap;">${desc}</div></div>`; });
    if (allFines.length > 0) html += `<div class="grid-details-title" style="color:#e74c3c; margin-top:10px;">Штрафы (Сумма)</div>${finesHtml}`; if ((emp.remarks || []).length > 0) html += `<div class="grid-details-title" style="color:#f39c12; margin-top:10px;">Замечания</div>${remarksHtml}`; if (allFines.length === 0 && (emp.remarks || []).length === 0) html += `<p style='text-align:center;color:gray;font-size:12px; margin-top:15px;'>Нарушений нет</p>`;
  }
  content.innerHTML = html;
}

async function executeRemark(iin, name) { let text = document.getElementById(`remark-text-${iin}`).value; if (!text) return showToast("Укажите текст замечания!", true); vibrate(50); showToast("Отправка...", false, 9999); let res = await callBackend('submitRemark', { token: appState.token, targetIin: iin, targetName: name, text: text }); if (res.success) { showToast("Замечание отправлено!"); loadDashboard(true); closeDetails(); } else showToast(res.error, true); }
async function executeFine(iin, name) { let reason = document.getElementById(`fine-reason-${iin}`).value; let amount = document.getElementById(`fine-amount-${iin}`).value || "0"; let moneyAmount = document.getElementById(`fine-money-${iin}`).value || "0"; if (!reason) return showToast("Укажите причину штрафа!", true); if (parseFloat(amount) >= 0 && parseFloat(moneyAmount) >= 0) return showToast("Укажите штраф (баллы или сумма) меньше 0!", true); vibrate(50); showToast("Отправка...", false, 9999); let res = await callBackend('submitFine', { token: appState.token, iin: iin, name: name, reason: reason, amount: amount, moneyAmount: moneyAmount }); if (res.success) { showToast("Штраф выписан/запрошен!"); loadDashboard(true); closeDetails(); } else showToast(res.error, true); }
function closeDetails() { switchTab('adm-main'); }

function toggleAdminMain(view) { window.currentAdminMainView = view; document.getElementById("admin-plan-list").classList.add("hidden"); document.getElementById("admin-sc-list").classList.add("hidden"); document.getElementById("admin-emp-container").classList.add("hidden"); document.getElementById("admin-plan-list").classList.remove("fade-in"); document.getElementById("admin-sc-list").classList.remove("fade-in"); document.getElementById("admin-emp-container").classList.remove("fade-in"); document.getElementById("btn-adm-plan").classList.remove('active-flt'); document.getElementById("btn-adm-sc").classList.remove('active-flt'); document.getElementById("btn-adm-emp").classList.remove('active-flt'); if(view === 'plan') { document.getElementById("admin-plan-list").classList.remove("hidden"); document.getElementById("admin-plan-list").classList.add("fade-in"); document.getElementById("btn-adm-plan").classList.add("active-flt"); } else if(view === 'sc') { document.getElementById("admin-sc-list").classList.remove("hidden"); document.getElementById("admin-sc-list").classList.add("fade-in"); document.getElementById("btn-adm-sc").classList.add("active-flt"); renderAdminScItems(currentAdminScDept, document.getElementById(`flt-${currentAdminScDept.toLowerCase()}`)); } else { document.getElementById("admin-emp-container").classList.remove("hidden"); document.getElementById("admin-emp-container").classList.add("fade-in"); document.getElementById("btn-adm-emp").classList.add("active-flt"); renderAdminEmps(currentEmpDept, document.getElementById(`flt-emp-${currentEmpDept.toLowerCase()}`)); } }
function markAsSeen(id, el) { let stored = {}; try { stored = JSON.parse(localStorage.getItem("seenH_" + appState.iin) || "{}"); } catch(e){} stored[id] = true; localStorage.setItem("seenH_" + appState.iin, JSON.stringify(stored)); let badge = el.querySelector('.new-badge'); if (badge) badge.style.display = 'none'; el.style.opacity = '0.9'; el.style.boxShadow = 'none'; }

function renderAdminOuts() {
  let list = globalActiveOuts || []; const now = Date.now();
  document.getElementById('admin-outs-list').innerHTML = list.map(out => { 
      let elapsedMin = Math.floor((now - out.leftAt) / 60000); let diffMin = out.limit - elapsedMin; let timeClass = ""; let timeText = ""; let rRole = String(out.role || "").toLowerCase(); let isProm = rRole.includes('промоутер');
      if (diffMin <= 0 && !isProm) { triggerUniversalAutoReturn(out.iin, out.action, out.role); return ""; }
      if (diffMin > 0) { timeText = `${diffMin} мин`; } else { timeClass = "late"; timeText = `<span style="color:#e74c3c; font-size:9px; text-transform:uppercase;">Опаздывает</span><br>${Math.abs(diffMin)} мин!`; } 
      let actionTitle = out.action; if(actionTitle.includes("Перерыв")) actionTitle = "Перерыв"; let roleLabel = isProm ? out.role : `Продавец — ${out.dept || 'Сотрудник'}`; 
      return `<div class="active-out-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(150,150,150,0.1);"><div style="flex: 1; min-width: 0; display: flex; flex-direction: column;"><span class="active-out-name" style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${out.name}</span><span style="font-size: 10px; color: gray; margin-top: 2px;">${roleLabel}</span></div><div style="width: 80px; text-align: center; font-size: 12px; font-weight: bold; color: var(--btn-color);">${actionTitle}</div><div class="active-out-time ${timeClass}" style="width: 70px; text-align: right; font-size: 13px; font-weight: bold; line-height: 1.1;">${timeText}</div></div>`; 
  }).join("") || "<p style='color:gray; font-size:13px; text-align:center;'>Все на местах</p>";
}

function renderAdminEmps(dept, btnElement) {
   currentEmpDept = dept; if (btnElement) { document.getElementById('flt-emp-cifra').classList.remove('active-flt'); document.getElementById('flt-emp-mbt').classList.remove('active-flt'); document.getElementById('flt-emp-kbt').classList.remove('active-flt'); btnElement.classList.add('active-flt'); }
   let container = document.getElementById("admin-emp-list"); let filtered = allEmployeesData.filter(e => e.dept.toLowerCase().includes(dept.toLowerCase())); let currentMonth = new Date().getMonth() + 1; let currentYear = new Date().getFullYear(); let monthSuffix = ("0" + currentMonth).slice(-2) + "." + currentYear;
   container.innerHTML = filtered.map(e => { 
       let monthScHist = e.ptsHistory.filter(p => p.type === "Начисление" && typeof p.date === 'string' && p.date.includes(monthSuffix)); let curMonthSc = monthScHist.filter(p => !p.source.toLowerCase().includes("trade-in")).length; let curMonthTrade = monthScHist.filter(p => p.source.toLowerCase().includes("trade-in")).length; let kpiFontSize = e.kpi % 1 !== 0 ? '8px' : '10px';
       return `<div class="req-item" style="border-left-color: var(--btn-color); border-left-width: 2px; padding: 10px 8px; margin-bottom: 8px; cursor:pointer;" onclick="openEmpDetails('${e.iin}')"><div style="font-size:13px; font-weight:bold; margin-bottom:6px; color:var(--text-color);">${e.name}</div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;"><div class="inner-block" style="flex:1; margin:0; padding:2px 4px; height:34px; display:flex; align-items:center; justify-content:space-evenly;">${e.tabelStr}</div><div class="circle-box" style="width:34px; min-width:34px; height:34px; margin:0; cursor:pointer; box-shadow:none; flex-shrink:0;" onclick="event.stopPropagation(); openEmpKpiDetails('${e.iin}')"><div class="kpi-container" style="background: conic-gradient(${setKpiColor(e.kpi, null, null)} ${e.kpi > 100 ? 100 : e.kpi}%, var(--inner-bg) 0);"><div class="kpi-inner" style="width:28px; height:28px;"><span style="font-size:${kpiFontSize}; font-weight:bold; color:${setKpiColor(e.kpi, null, null)}">${e.kpi}%</span></div></div></div></div><div style="display:flex; justify-content:space-between; font-size:11px; align-items:center; color:var(--desc-color);"><span onclick="event.stopPropagation(); openEmpScDetails('${e.iin}')" style="padding: 4px 8px; background: rgba(39, 174, 96, 0.1); border-radius: 8px; cursor: pointer;">СЦ: <b style="color:var(--btn-color);">${curMonthSc}</b> | BRZY: <b style="color:var(--btn-color);">${curMonthTrade}</b></span><span>Ошибки: <b style="color:var(--text-color);">${e.reportErrors}</b></span></div></div>`; 
   }).join("") || "<p style='color:gray; font-size:12px; text-align:center;'>Сотрудников нет</p>";
}

function switchScAdminTab(tabType) { currentAdminScTabType = tabType; document.getElementById('tab-sc-active').classList.remove('active-flt'); document.getElementById('tab-sc-sold').classList.remove('active-flt'); document.getElementById('tab-sc-' + tabType).classList.add('active-flt'); renderAdminScItems(currentAdminScDept, null); }

function switchScDept(dept) { currentScTabDept = dept; document.getElementById('sc-tab-cifra').classList.remove('active-flt'); document.getElementById('sc-tab-mbt').classList.remove('active-flt'); document.getElementById('sc-tab-kbt').classList.remove('active-flt'); let tabId = 'sc-tab-cifra'; if (dept === 'МБТ') tabId = 'sc-tab-mbt'; if (dept === 'КБТ') tabId = 'sc-tab-kbt'; document.getElementById(tabId).classList.add('active-flt'); renderScItems(); }

function openForm(type) {
  document.getElementById("menu-list").classList.add("hidden"); let dash = document.getElementById("info-dashboard"); dash.classList.add("hidden"); 
  if(type === 'sc') { selectedScItem = null; document.getElementById("sc-search").value = ""; document.getElementById("btn-act-doc").style.opacity = "0.3"; document.getElementById("btn-act-doc").style.pointerEvents = "none"; let deptToSet = appState.dept || 'Цифра'; if (deptToSet !== 'Цифра' && deptToSet !== 'МБТ' && deptToSet !== 'КБТ') deptToSet = 'Цифра'; switchScDept(deptToSet); document.getElementById("form-sc").classList.remove("hidden"); document.getElementById("form-sc").classList.add("slide-up-fade"); }
  if(type === 'tradein') { selectedTradeInModel = null; renderTradeInList(); document.getElementById("form-tradein").classList.remove("hidden"); document.getElementById("form-tradein").classList.add("slide-up-fade"); }
  if(type === 'points') { 
      let remVal = parseFloat(document.getElementById("pt-rem").innerText.replace(',','.')); let isZero = isNaN(remVal) || remVal <= 0; let noticeBox = document.getElementById("fp-balance-notice"); 
      if (window.myCurrentKpi < 80) { noticeBox.innerHTML = `⚠️ <b>Ваш КФ. ЭФФ. ниже 80% (${window.myCurrentKpi}%)</b><br>Использование баллов временно недоступно.`; noticeBox.style = "background: rgba(231, 76, 60, 0.1); color: #c0392b; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; margin-bottom: 12px; border: 1px dashed #e74c3c; box-shadow: 0 2px 8px rgba(0,0,0,0.03);"; document.getElementById("fp-action").classList.add("hidden"); document.getElementById("fp-time").classList.add("hidden"); document.getElementById("fp-date").classList.add("hidden"); document.getElementById("fp-date-label").classList.add("hidden"); document.getElementById("fp-submit-btn").disabled = true; document.getElementById("fp-submit-btn").style.background = "#95a5a6"; } 
      else if (isZero) { noticeBox.innerHTML = "<b>У вас нет оставшихся баллов</b>"; noticeBox.style = "background: rgba(231, 76, 60, 0.1); color: #c0392b; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; margin-bottom: 12px; border: 1px dashed #e74c3c; box-shadow: 0 2px 8px rgba(0,0,0,0.03);"; document.getElementById("fp-action").classList.add("hidden"); document.getElementById("fp-time").classList.add("hidden"); document.getElementById("fp-date").classList.add("hidden"); document.getElementById("fp-date-label").classList.add("hidden"); document.getElementById("fp-submit-btn").disabled = true; document.getElementById("fp-submit-btn").style.background = "#95a5a6"; } 
      else { noticeBox.innerHTML = `🔥 Вы можете использовать: <b style="font-size:16px;">${document.getElementById("pt-rem").innerText}</b> баллов`; noticeBox.style = "background: rgba(41, 128, 185, 0.1); color: #2980b9; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; margin-bottom: 12px; border: 1px dashed var(--btn-color); box-shadow: 0 2px 8px rgba(0,0,0,0.03);"; document.getElementById("fp-action").classList.remove("hidden"); document.getElementById("fp-time").classList.remove("hidden"); document.getElementById("fp-date").classList.remove("hidden"); document.getElementById("fp-date-label").classList.remove("hidden"); document.getElementById("fp-submit-btn").disabled = false; document.getElementById("fp-submit-btn").style.background = "var(--btn-color)"; } 
      document.getElementById("form-points").classList.remove("hidden"); document.getElementById("form-points").classList.add("slide-up-fade"); 
  }
  if(type === 'swap') { const select = document.getElementById("fs-target"); select.innerHTML = '<option value="" disabled selected>Выберите сменщика</option>' + globalSellers.map(s => `<option value="${s.iin}">${s.name}</option>`).join(""); document.getElementById("fs-extra").classList.add("hidden"); document.getElementById("form-swap").classList.remove("hidden"); document.getElementById("form-swap").classList.add("slide-up-fade"); }
  let scroller = document.getElementById("scrollable-body"); if (scroller) scroller.scrollTop = 0;
}

function closeForm() { let roleStr = String(appState.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); let isZavSklad = roleStr.includes("заведующий складом"); let dash = document.getElementById("info-dashboard"); if (!isUserPromoter && !isDir && !isZavSklad) { dash.classList.remove("hidden"); dash.classList.remove("fade-in", "slide-up-fade", "slide-down-fade"); dash.classList.add("slide-down-fade"); } ["form-sc", "form-tradein", "form-points", "form-swap"].forEach(id => { let el = document.getElementById(id); el.classList.add("hidden"); el.classList.remove("slide-up-fade"); }); let menu = document.getElementById("menu-list"); menu.classList.remove("hidden"); menu.style.animation = 'none'; menu.offsetHeight; menu.style.animation = null; menu.classList.add("fade-in"); let scroller = document.getElementById("scrollable-body"); if (scroller) scroller.scrollTop = 0; }
function checkSwapFields() { const target = document.getElementById("fs-target").value; if (target) document.getElementById("fs-extra").classList.remove("hidden"); }

function renderScItems() {
  const q = document.getElementById("sc-search").value.toLowerCase(); const list = document.getElementById("sc-list"); list.innerHTML = "";
  let scList = globalScItems.filter(i => i.dept === currentScTabDept && i.type === 'СЦ'); if (q) scList = scList.filter(i => i.name.toLowerCase().includes(q));
  let focusList = globalScItems.filter(i => i.dept === currentScTabDept && i.type === 'Фокус'); if (q) focusList = focusList.filter(i => i.name.toLowerCase().includes(q)); let sortedFiltered = [...scList, ...focusList];
  if (sortedFiltered.length === 0) { list.innerHTML = "<p style='padding:12px; color:gray; font-size:12px; text-align:center;'>Ничего не найдено</p>"; return; }
  sortedFiltered.forEach(i => { let div = document.createElement("div"); let isSelected = (selectedScItem && selectedScItem.row === i.row && selectedScItem.type === i.type && selectedScItem.dept === i.dept); div.className = "sc-item" + (isSelected ? " selected" : ""); let typeCol = i.type === 'СЦ' ? '#e67e22' : '#e74c3c'; let ptNoun = formatPointsNoun(i.pts); let ptsText = i.type === 'СЦ' ? '2 балла' : `${String(i.pts).replace('.', ',')} ${ptNoun}`; let deptLabel = i.type === 'Фокус' ? `<span style="color:gray; font-weight:normal;"> (${i.dept})</span>` : ''; div.innerHTML = `<div><div style="margin-bottom:4px; font-size:13px;">${i.name}${deptLabel}</div><div style="display:flex; justify-content:space-between; align-items:center;"><div class="type-label" style="font-size:10px; color:${typeCol}; font-weight:bold;">${i.type} — ${ptsText}</div>${i.discount ? `<div style="font-weight:bold; color:#e74c3c; font-size:11px;">-${i.discount.replace(/%/g, '% ')}</div>` : ''}</div></div>`; div.onclick = () => { selectedScItem = i; let docBtn = document.getElementById("btn-act-doc"); if (i.docUrl) { docBtn.style.opacity = "1"; docBtn.style.pointerEvents = "auto"; } else { docBtn.style.opacity = "0.3"; docBtn.style.pointerEvents = "none"; } renderScItems(); }; list.appendChild(div); });
}

function openScDoc() { if (selectedScItem && selectedScItem.docUrl) { if (tg && tg.openLink) tg.openLink(selectedScItem.docUrl); else window.open(selectedScItem.docUrl, '_blank'); } }
function submitScForm() { if(!selectedScItem) return showToast("Выберите товар из списка", true); let scDateVal = document.getElementById("sc-date").dataset.realdate; let dStr = scDateVal; if(dStr==="Сегодня") { dStr = formatDateLocal(new Date()); } else { let d = new Date(dStr); dStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear(); } selectedScItem.date = dStr; executeSubmit("Продажа СЦ/Фокус", selectedScItem.name, null, JSON.stringify(selectedScItem)); }
function submitTradeIn() { if(!selectedTradeInModel) return showToast("Выберите модель!", true); const dateVal = document.getElementById("ft-date").dataset.realdate; let dStr = dateVal==="Сегодня" ? formatDateLocal(new Date()) : (()=>{let d=new Date(dateVal); return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();})(); let meta = JSON.stringify({ date: dStr, text: selectedTradeInModel }); executeSubmit("Продажа Trade-In", selectedTradeInModel, null, meta); }
function submitPoints() { const act = document.getElementById("fp-action").value; const time = document.getElementById("fp-time").value; const dateVal = document.getElementById("fp-date").dataset.realdate; let dStr = dateVal==="Сегодня" ? formatDateLocal(new Date()) : (()=>{let d=new Date(dateVal); return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();})(); let meta = JSON.stringify({ date: dStr }); executeSubmit("Баллы мотивации", `${act} на ${time}`, null, meta); }
function submitFixShift() { const shiftStr = document.getElementById("fs-fix-shift").value; if (!shiftStr) return showToast("Выберите новую смену", true); const dStr = (()=>{let d=new Date(); return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();})(); executeSubmit("Исправление смены", shiftStr, null, dStr, "Запрос на исправление отправлен"); }
function submitSwap() { const select = document.getElementById("fs-target"); const targetIin = select.value; if(!targetIin) return showToast("Выберите сменщика", true); const dateVal = document.getElementById("fs-date").dataset.realdate; let dStr = dateVal==="Сегодня" ? formatDateLocal(new Date()) : (()=>{let d=new Date(dateVal); return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();})(); const shiftStr = document.getElementById("fs-shift").value; const targetName = select.options[select.selectedIndex].text; const details = `Дата: ${dStr}, Смена: ${shiftStr}`; executeSubmit("Обмен сменами", details, targetIin, "", "Запрос отправлен: " + targetName); }
async function processReq(id, action, replyText = "") { vibrate(50); showToast("Обработка...", false, 9999); processedReqIds.add(String(id)); let el = document.getElementById("req-" + id); if (el) { el.style.display = 'none'; } let res = await callBackend('processRequest', { token: appState.token, reqId: id, reqAction: action, replyText: replyText }); if(res.success) { showToast(res.msg); loadDashboard(true); } else { showToast(res.error, true); loadDashboard(true); } }

function openAdminPlanScDetails() {
    let prevTab = lastActiveTab; switchTab('details'); document.getElementById("btn-details-back").onclick = () => switchTab(prevTab); document.getElementById("details-title").innerText = "СЦ | BRZY (План)"; document.getElementById("details-kpi-circle-container").innerHTML = ""; 
    let startD = document.getElementById("plan-filter-start") ? document.getElementById("plan-filter-start").value : "2000-01-01"; let endD = document.getElementById("plan-filter-end") ? document.getElementById("plan-filter-end").value : "2099-01-01"; let startTime = new Date(startD).getTime(); let endTime = new Date(endD).getTime() + 86400000;
    let sales = []; if (window.adminHistoryGlobal) { sales = window.adminHistoryGlobal.filter(r => { let rd = parseCustomDate(r.date); return rd >= startTime && rd <= endTime && r.status === 'approved' && (r.type === 'Продажа СЦ/Фокус' || r.type === 'Продажа Trade-In'); }); }
    let listHtml = "<div class='card' style='padding:0; overflow:hidden;'>"; if (sales.length > 0) { sales.sort((a,b) => parseCustomDate(b.date) - parseCustomDate(a.date)); listHtml += sales.map((i, idx) => { let srcColor = getSourceColor(i.type); let sourceText = i.type === 'Продажа Trade-In' ? 'Trade-In' : 'СЦ/Фокус'; let rawDetails = i.details; let match = rawDetails.match(/\n\[(.*?)\]$/); if (match) { rawDetails = rawDetails.replace(/\n\[(.*?)\]$/, "").trim(); } try { let m = JSON.parse(i.meta); if (m.type) sourceText = m.type; } catch(e){} return buildStandardRow({ title: `${idx + 1}. ${rawDetails}`, typeText: sourceText, typeColor: srcColor, dateText: i.date, nameText: i.authorName, hasBorder: false }); }).join(""); } else { listHtml += "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>В этом периоде пусто</div>"; } listHtml += "</div>"; document.getElementById("details-list").innerHTML = listHtml;
}

function openEmpScDetails(iin) {
    let emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin)); if(!emp) return; let prevTab = lastActiveTab; switchTab('details'); document.getElementById("btn-details-back").onclick = () => switchTab(prevTab); document.getElementById("details-title").innerText = `СЦ | BRZY: ${emp.name}`; document.getElementById("details-kpi-circle-container").innerHTML = ""; 
    let d = new Date(); let defStart = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1)); let defEnd = formatDateLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    let headerHtml = `<div class="inner-block card date-panel-wrapper" style="padding:12px; margin-bottom:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div class="no-swipe" style="display:flex; gap:6px; align-items:center;" ontouchstart="event.stopPropagation();" ontouchmove="event.stopPropagation();"><input type="date" id="emp-sc-start" value="${defStart}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><span style="color:gray; font-weight:bold;">-</span><input type="date" id="emp-sc-end" value="${defEnd}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="date" onchange="setEmpScDates('single', this.value, '${iin}'); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;">📅</button></div><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="month" onchange="setEmpScDates('month', this.value, '${iin}'); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;">🗓️</button></div><button class="btn-green" style="margin:0; border-radius:8px; width:36px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:0;" onclick="renderEmpScDetailsData('${iin}')">🔍</button></div></div><div id="emp-sc-render-area"></div>`;
    document.getElementById("details-list").innerHTML = headerHtml; renderEmpScDetailsData(iin);
}

function setEmpScDates(type, val, iin) { let endD = new Date(); let startD = new Date(); if (type === 'single') { if (val) { let parts = val.split('-'); startD = new Date(parts[0], parts[1] - 1, parts[2]); endD = new Date(parts[0], parts[1] - 1, parts[2]); } } else if (type === 'month') { if (val) { let parts = val.split('-'); startD = new Date(parts[0], parts[1] - 1, 1); endD = new Date(parts[0], parts[1], 0); } } document.getElementById('emp-sc-start').value = formatDateLocal(startD); document.getElementById('emp-sc-end').value = formatDateLocal(endD); renderEmpScDetailsData(iin); }

function renderEmpScDetailsData(iin) {
    let emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin)); if(!emp) return;
    let startD = document.getElementById("emp-sc-start").value; let endD = document.getElementById("emp-sc-end").value; let startTime = new Date(startD).getTime(); let endTime = new Date(endD).getTime() + 86400000;
    let sales = emp.ptsHistory.filter(p => { if (p.type !== "Начисление") return false; let s = String(p.source).toLowerCase(); if (!(s.includes("сц") || s.includes("фокус") || s.includes("trade-in"))) return false; let rd = parseCustomDate(p.date); return rd >= startTime && rd <= endTime; });
    let listHtml = "<div class='card' style='padding:0; overflow:hidden;'>";
    if (sales.length > 0) { listHtml += groupAndRenderByMonth(sales, i => { let rawDetails = i.reason || ""; let match = rawDetails.match(/\n\[(.*?)\]$/); if (match) { rawDetails = rawDetails.replace(/\n\[(.*?)\]$/, "").trim(); } return buildStandardRow({ title: rawDetails, typeText: i.source, typeColor: getSourceColor(i.source), dateText: i.date, nameText: emp.name, hasBorder: false }); }); } else { listHtml += "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>В выбранном периоде пусто</div>"; }
    listHtml += "</div>"; document.getElementById("emp-sc-render-area").innerHTML = listHtml;
}
