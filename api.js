import { supabaseClient, GAS_URL, NOM_DICT } from './config.js';
import {
  appState, globalActiveOuts, adminEmployeesGlobal, adminHistoryGlobal,
  allEmployeesData, globalSellers, globalScItems, adminScItemsGlobal,
  tradeInModelsGlobal,
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
  isCurrentMonth, setKpiColor
} from './utils.js';
import {
  renderTimeUI, applyLimits, renderActiveOuts, renderAdminOuts,
  renderDashboardData, switchTab, toggleAdminMain, closeDetails
} from './ui.js';

/* ========== Плановый движок ========== */
export function calcPlanEngine(rawPlanData) {
  if (!rawPlanData) return null;
  const parse = (str) => parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;
  const rawGroups = rawPlanData.groups || [];
  const totalStorePlan = parse(rawPlanData.totalPlan || "0");
  const r = {
    totalPlan: totalStorePlan,
    to: {
      total: { plan: 0, fact: 0, ed: 0 },
      cifra: { plan: 0, fact: 0, ed: 0 },
      mbt: { plan: 0, fact: 0, ed: 0 },
      kbt: { plan: 0, fact: 0, ed: 0 }
    },
    aks: {
      total: { plan: 0, fact: 0, ed: 0 },
      cifra: { plan: 0, fact: 0, ed: 0 },
      mbt: { plan: 0, fact: 0, ed: 0 },
      kbt: { plan: 0, fact: 0, ed: 0 }
    },
    usl: {
      total: { plan: 0, fact: 0, ed: 0 },
      cifra: { plan: 0, fact: 0, ed: 0 },
      mbt: { plan: 0, fact: 0, ed: 0 },
      kbt: { plan: 0, fact: 0, ed: 0 }
    },
    groups: rawGroups
  };

  rawGroups.forEach(g => {
    const p = parse(g.plan), f = parse(g.fact), e = parse(g.factEd || g.ed);
    for (const cat of ['to', 'aks', 'usl']) {
      for (const dept of ['cifra', 'mbt', 'kbt']) {
        if (NOM_DICT[cat][dept].includes(g.name.trim())) {
          r[cat][dept].plan += p;
          r[cat][dept].fact += f;
          r[cat][dept].ed += e;
          r[cat].total.plan += p;
          r[cat].total.fact += f;
          r[cat].total.ed += e;
        }
      }
    }
  });

  const safePctTo = (num, den) => den > 0 ? ((num / den) * 100).toFixed(2).replace('.', ',') : "0,00";

  const setPcts = (catObj, isTo) => {
    for (const k of ['total', 'cifra', 'mbt', 'kbt']) {
      const toObj = r.to[k];
      const fEd = catObj[k].fact + catObj[k].ed;
      const toFEd = toObj.fact + toObj.ed;
      if (isTo) {
        catObj[k].targetPct = "100,00";
        catObj[k].pct = safePctTo(catObj[k].fact, catObj[k].plan);
        catObj[k].pctEd = safePctTo(fEd, catObj[k].plan);
        catObj[k].sumPct = catObj[k].pct;
        catObj[k].sumPctEd = catObj[k].pctEd;
      } else {
        catObj[k].targetPct = safePctTo(catObj[k].plan, toObj.plan);
        catObj[k].pct = safePctTo(catObj[k].fact, toObj.fact);
        catObj[k].pctEd = safePctTo(fEd, toFEd);
        catObj[k].sumPct = safePctTo(catObj[k].fact, catObj[k].plan);
        catObj[k].sumPctEd = safePctTo(fEd, catObj[k].plan);
      }
    }
  };

  setPcts(r.to, true);
  setPcts(r.aks, false);
  setPcts(r.usl, false);

  const sCount = { cifra: 0, mbt: 0, kbt: 0 };
  if (adminEmployeesGlobal) {
    adminEmployeesGlobal.forEach(e => {
      const d = String(e.dept).toLowerCase().trim();
      const role = String(e.role || "").toLowerCase().trim();
      if (role.includes('продавец-консультант') || role.includes('продавец консультант')) {
        if (d === 'цифра' || d === 'чт' || d === 'цифра/чт') sCount.cifra++;
        else if (d === 'мбт') sCount.mbt++;
        else if (d === 'кбт') sCount.kbt++;
      }
    });
  }

  const sPlan = (cat, dept, count) => count > 0 ? Math.round(r[cat][dept].plan / count) : r[cat][dept].plan;
  const getRatio = (cat, dept) => r.to[dept].plan > 0 ? ((r[cat][dept].plan / r.to[dept].plan) * 100).toFixed(2).replace('.', ',') : "0,00";

  r.sellers = [
    { name: "Цифра/ЧТ", to: sPlan('to', 'cifra', sCount.cifra), aks: sPlan('aks', 'cifra', sCount.cifra), usl: sPlan('usl', 'cifra', sCount.cifra), aksPct: getRatio('aks', 'cifra'), uslPct: getRatio('usl', 'cifra') },
    { name: "МБТ", to: sPlan('to', 'mbt', sCount.mbt), aks: sPlan('aks', 'mbt', sCount.mbt), usl: sPlan('usl', 'mbt', sCount.mbt), aksPct: getRatio('aks', 'mbt'), uslPct: getRatio('usl', 'mbt') },
    { name: "КБТ", to: sPlan('to', 'kbt', sCount.kbt), aks: sPlan('aks', 'kbt', sCount.kbt), usl: sPlan('usl', 'kbt', sCount.kbt), aksPct: getRatio('aks', 'kbt'), uslPct: getRatio('usl', 'kbt') }
  ];

  return r;
}

/* ========== Универсальный вызов бэкенда ========== */
export async function callBackend(actionName, payloadData = {}) {
  try {
    const getRoleGroup = (roleText) => {
      const r = (roleText || appState.role || "").toLowerCase();
      if (r.includes("промоутер")) return "Промоутер";
      if (r.includes("продавец")) return "Продавец";
      return "Продавец";
    };

    if (actionName === "loginByIIN") {
      const { iin, password } = payloadData;
      const { data, error } = await supabaseClient.from('users').select('*').eq('iin', iin).single();
      if (error || !data) return { success: false, error: "Этот ИИН не найден в базе данных" };
      if (String(data.password) !== String(password)) return { success: false, error: "Неверный пароль" };
      if (data.login_status === false || data.login_status === 'FALSE' || data.login_status === 'false') {
        return { success: false, error: "Доступ запрещен" };
      }
      return {
        success: true,
        token: 'sb_' + data.iin,
        iin: data.iin,
        firstName: data.full_name,
        role: data.role,
        dept: data.dept,
        gender: data.gender,
        isPromoter: data.role.toLowerCase().includes("промоутер")
      };
    }

    if (actionName === "recordAction") {
      const { iin, actionType, isReturn, isAutoReturn } = payloadData;
      const roleGroup = getRoleGroup();
      const exactRole = appState.role;

      if (!isReturn) {
        const currentHour = new Date().getHours();
        if (actionType === 'Обед' && (currentHour < 12 || currentHour >= 17)) {
          return { success: false, error: "Обед доступен только с 12:00 до 17:00" };
        }
        if (actionType === 'Полдник' && (currentHour < 16 || currentHour >= 20)) {
          return { success: false, error: "Полдник доступен только с 16:00 до 20:00" };
        }

        const dayOfWeek = new Date().getDay() || 7;
        const limitField = actionType === 'Обед' ? 'lunch_limit' : (actionType === 'Полдник' ? 'snack_limit' : 'break_limit');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [{ data: limitData }, { data: todayLogs }] = await Promise.all([
          supabaseClient.from('time_limits').select('*').eq('role_group', roleGroup).eq('day_of_week', dayOfWeek).maybeSingle(),
          supabaseClient.from('time_tracking').select('*, users(role)').gte('created_at', todayStart.toISOString())
        ]);

        if (actionType === 'Обед' || actionType === 'Полдник') {
          const hasTakenToday = (todayLogs || []).some(log =>
            log.iin === iin && log.action_type === actionType && log.direction === 'Уход'
          );
          if (hasTakenToday) return { success: false, error: `Вы уже ходили на ${actionType.toLowerCase()} сегодня` };
        }

        const maxAllowed = limitData ? limitData[limitField] : 1;
        const totalAllowed = limitData ? limitData.total_limit : 2;

        const userStates = {};
        (todayLogs || []).forEach(log => {
          const r = log.users ? log.users.role : log.role_group;
          if (String(r).toLowerCase().includes(roleGroup.toLowerCase())) {
            if (log.direction === 'Уход') userStates[log.iin] = log.action_type;
            else delete userStates[log.iin];
          }
        });

        const activeCounts = { 'Перерыв': 0, 'Обед': 0, 'Полдник': 0 };
        let totalOut = 0;
        for (const key in userStates) {
          activeCounts[userStates[key]]++;
          totalOut++;
        }

        if (activeCounts[actionType] >= maxAllowed || totalOut >= totalAllowed) {
          return { success: false, error: `Мест на ${actionType} нет` };
        }
      }

      const direction = isReturn ? (isAutoReturn ? 'Автовозврат' : 'Возврат') : 'Уход';
      const roleToSave = roleGroup === 'Промоутер' ? exactRole : roleGroup;

      const { error } = await supabaseClient.from('time_tracking').insert([{
        iin: iin,
        action_type: actionType,
        direction: direction,
        role_group: roleToSave
      }]);

      if (error) return { success: false, error: "Ошибка записи в БД" };
      return { success: true, savedAction: isReturn ? null : actionType };
    }

    if (actionName === "startupCheck") {
      const roleGroup = getRoleGroup();
      const dayOfWeek = new Date().getDay() || 7;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const currentHour = new Date().getHours();

      const [{ data: limitData }, { data: todayLogs }] = await Promise.all([
        supabaseClient.from('time_limits').select('*').eq('role_group', roleGroup).eq('day_of_week', dayOfWeek).maybeSingle(),
        supabaseClient.from('time_tracking').select('*, users(full_name, role, dept)').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: true })
      ]);

      const activeOutsMap = {};
      const myLogs = [];

      (todayLogs || []).forEach(log => {
        if (log.iin === payloadData.iin) myLogs.push(log);
        if (log.direction === 'Уход') {
          activeOutsMap[log.iin] = {
            iin: log.iin,
            action: log.action_type,
            leftAt: new Date(log.created_at).getTime(),
            name: log.users ? log.users.full_name : 'Сотрудник',
            role: log.users ? log.users.role : log.role_group,
            dept: log.users ? log.users.dept : 'Цифра'
          };
        } else {
          delete activeOutsMap[log.iin];
        }
      });

      const myActiveAction = activeOutsMap[payloadData.iin] ? activeOutsMap[payloadData.iin].action : null;
      const outByAction = { 'Перерыв': 0, 'Обед': 0, 'Полдник': 0 };
      let totalOut = 0;

      for (const key in activeOutsMap) {
        if (activeOutsMap[key].role.toLowerCase().includes(roleGroup.toLowerCase())) {
          outByAction[activeOutsMap[key].action]++;
          totalOut++;
        }
      }

      const tookLunch = myLogs.some(l => l.action_type === 'Обед' && l.direction === 'Уход');
      const tookSnack = myLogs.some(l => l.action_type === 'Полдник' && l.direction === 'Уход');
      const isLunchTime = currentHour >= 12 && currentHour < 17;
      const isSnackTime = currentHour >= 16 && currentHour < 20;
      const hasLunchSlot = (outByAction['Обед'] < (limitData?.lunch_limit || 1)) && (totalOut < (limitData?.total_limit || 2));
      const hasSnackSlot = (outByAction['Полдник'] < (limitData?.snack_limit || 1)) && (totalOut < (limitData?.total_limit || 2));
      const hasBreakSlot = (outByAction['Перерыв'] < (limitData?.break_limit || 1)) && (totalOut < (limitData?.total_limit || 2));

      return {
        authorized: true,
        activeOuts: Object.values(activeOutsMap).map(o => {
          let timerLimit = 10;
          const rRole = String(o.role || "").toLowerCase();
          if (rRole.includes('промоутер')) {
            if (o.action === 'Обед') timerLimit = 60;
            else if (o.action === 'Полдник') timerLimit = 30;
            else timerLimit = 15;
          } else {
            if (o.action === 'Обед') timerLimit = 40;
            else if (o.action === 'Полдник') timerLimit = 30;
            else timerLimit = 10;
          }
          return { ...o, limit: timerLimit };
        }),
        myActiveAction,
        canBreak: hasBreakSlot,
        canLunch: hasLunchSlot && isLunchTime && !tookLunch,
        canSnack: hasSnackSlot && isSnackTime && !tookSnack
      };
    }

    if (actionName === "processRequest") {
      const { reqId, reqAction, replyText } = payloadData;
      const { data: req, error: reqErr } = await supabaseClient.from('requests').select('*').eq('id', reqId).single();
      const { data: currentUser } = await supabaseClient.from('users').select('*').eq('iin', appState.iin).single();

      if (reqErr || !req) return { success: false, error: "Запрос не найден" };

      let currentStatus = String(req.status || "").trim().toLowerCase();
      const reqType = String(req.type || "").trim();
      let newStatus = currentStatus;
      let newDetails = req.details;
      let metaObj = {};
      try { metaObj = typeof req.metadata === 'string' ? JSON.parse(req.metadata) : (req.metadata || {}); } catch (e) {}
      let isHandled = false;
      let responseMsg = "Обработано";

      if (["approved", "rejected", "rejected_by_user", "viewed"].includes(currentStatus) && !reqAction.includes("dismiss")) {
        return { success: false, error: `Уже обработана` };
      }

      if ((currentStatus === "rejected_notify_zav" || currentStatus === "approved_notify_zav") && reqAction === "dismiss_notification") {
        newStatus = currentStatus.includes("rejected") ? "rejected" : "approved";
        isHandled = true;
        responseMsg = "Ознакомлен";
      } else if (currentStatus === "notify_user_fine" && reqAction === "dismiss_notification") {
        newStatus = "viewed_fine";
        isHandled = true;
        responseMsg = "Ознакомлен";
      } else if ((currentStatus === "pending_user_reply" || currentStatus === "pending_admin_view_remark") && reqAction === "dismiss_notification") {
        if (!metaObj.dismissedBy) metaObj.dismissedBy = [];
        if (!metaObj.dismissedBy.includes(appState.iin)) metaObj.dismissedBy.push(appState.iin);
        isHandled = true;
        responseMsg = "Перенесено в историю";
      } else if (currentStatus === "pending_user" && reqAction === "approve_user") {
        newStatus = "pending_admin";
        isHandled = true;
        responseMsg = "Отправлено директору";
      } else if (currentStatus === "pending_user" && reqAction === "reject_user") {
        newStatus = "rejected_by_user";
        isHandled = true;
        responseMsg = "Отклонено";
      } else if (currentStatus === "rejected_notify_user" && reqAction === "dismiss_rejection") {
        newStatus = "rejected";
        isHandled = true;
        responseMsg = "Скрыто";
      } else if (currentStatus === "pending_user_reply" && reqAction === "reply_remark") {
        const safeReply = replyText ? replyText.substring(0, 500) : "Без комментариев";
        let targetShort = currentUser.full_name;
        const parts = String(targetShort).trim().split(/\s+/);
        if (parts.length > 1) targetShort = parts[0] + " " + parts[1].charAt(0).toUpperCase() + ".";
        newDetails = req.details + `\n\n> ${targetShort}\n${safeReply}`;
        newStatus = "pending_admin_view_remark";
        isHandled = true;
        responseMsg = "Ответ отправлен";
      } else {
        const roleStr = String(currentUser.role).toLowerCase();
        const isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");

        if (isDir) {
          if (reqAction === "reject_admin") {
            metaObj.approver = currentUser.full_name;
            metaObj.approverIin = appState.iin;
            newDetails = req.details;
            newStatus = reqType === "Запрос на штраф" ? "rejected_notify_zav" : "rejected_notify_user";
            isHandled = true;
            responseMsg = "Отклонено";
          } else if ((currentStatus === "pending_admin_view" || currentStatus === "pending") && reqAction === "viewed") {
            newStatus = "viewed";
            isHandled = true;
            responseMsg = "Просмотрено";
          } else if ((currentStatus === "pending_admin" || currentStatus === "pending") && reqAction === "approve_admin") {
            metaObj.approver = currentUser.full_name;
            metaObj.approverIin = appState.iin;
            newDetails = req.details;

            if (reqType === "Запрос на штраф") {
              await supabaseClient.from('user_details').insert([{
                iin: req.target_iin,
                type: "Штраф",
                action_text: metaObj.reason || req.details,
                points_motivation: -(Math.abs(parseFloat(metaObj.amount) || 0)),
                fine_money: -(Math.abs(parseFloat(metaObj.moneyAmount) || 0)),
                manager_iin: appState.iin
              }]);
              await supabaseClient.from('requests').insert([{
                author_iin: req.author_iin,
                type: "Уведомление о штрафе",
                details: metaObj.reason || req.details,
                target_iin: req.target_iin,
                status: "notify_user_fine",
                metadata: metaObj
              }]);
              newStatus = "approved_notify_zav";
              isHandled = true;
              responseMsg = "Одобрено";
            } else if (reqType === "Горячий чек") {
              await supabaseClient.from('user_details').insert([{
                iin: req.author_iin,
                type: "Горячий чек",
                action_text: req.details,
                points_motivation: parseFloat(metaObj.pts) || 0,
                kpi_change: parseFloat(metaObj.bonus) || 0,
                manager_iin: appState.iin
              }]);
              newStatus = "approved";
              isHandled = true;
              responseMsg = "Одобрено";
            } else if (reqType === "Продажа СЦ/Фокус" || reqType === "Продажа Trade-In" || metaObj.type || reqType === metaObj.type) {
              const earnSourceType = (reqType === "Продажа Trade-In") ? "Trade-In" : (metaObj.type || reqType);
              const pts = (reqType === "Продажа Trade-In") ? 1 : (parseFloat(metaObj.pts) || 0);
              const bonus = metaObj.bonus ? parseFloat(metaObj.bonus) : (reqType === "Продажа СЦ/Фокус" ? 3 : 0);

              await supabaseClient.from('user_details').insert([{
                iin: req.author_iin,
                type: reqType,
                category: earnSourceType,
                action_text: req.details,
                points_motivation: pts,
                kpi_change: bonus,
                manager_iin: appState.iin
              }]);
              newStatus = "approved";
              isHandled = true;
              responseMsg = "Одобрено";

              if ((reqType === "Продажа СЦ/Фокус" || metaObj.type) && metaObj.row && metaObj.dept) {
                const todayStr = formatDateLocal(new Date());
                const { data: scData } = await supabaseClient.from('store_sc_items').select('*').eq('date', todayStr).maybeSingle();
                if (scData && scData.items_data) {
                  const updatedItems = scData.items_data.filter(i => !(i.row === metaObj.row && i.dept === metaObj.dept && i.type === metaObj.type));
                  await supabaseClient.from('store_sc_items').update({ items_data: updatedItems }).eq('date', todayStr);
                }
                fetch(GAS_URL, {
                  method: "POST",
                  body: JSON.stringify({ action: "markScSold", payload: { row: metaObj.row, dept: metaObj.dept, type: metaObj.type } })
                }).catch(() => {});
              }
            } else if (reqType.includes("Баллы мотивации")) {
              let cost = -1;
              if (req.details.includes("30 мин")) cost = -0.5;
              else if (req.details.includes("1 час")) cost = -1;
              else if (req.details.includes("2 часа")) cost = -2;
              else if (req.details.includes("3 часа")) cost = -3;
              await supabaseClient.from('user_details').insert([{
                iin: req.author_iin,
                type: "Использование",
                category: "Мотивация",
                action_text: req.details,
                points_motivation: cost,
                manager_iin: appState.iin
              }]);
              newStatus = "approved";
              isHandled = true;
              responseMsg = "Одобрено";
            } else {
              newStatus = "approved";
              isHandled = true;
              responseMsg = "Одобрено";
            }
          }
        }
      }

      if (isHandled) {
        await supabaseClient.from('requests').update({
          status: newStatus,
          details: newDetails,
          metadata: metaObj
        }).eq('id', reqId);
        return { success: true, msg: responseMsg };
      } else {
        return { success: false, error: `Действие не распознано` };
      }
    }

    if (actionName === "submitRemark") {
      const { targetIin, targetName, text } = payloadData;
      const { error } = await supabaseClient.from('requests').insert([{
        author_iin: appState.iin,
        type: "Замечание",
        details: text,
        target_iin: targetIin,
        status: "pending_user_reply",
        metadata: {}
      }]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    if (actionName === "submitFine") {
      const { iin: targetIin, name: targetName, reason, amount, moneyAmount } = payloadData;
      const { data: currentUser } = await supabaseClient.from('users').select('*').eq('iin', appState.iin).single();
      const roleStr = String(currentUser.role).toLowerCase();
      const isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
      const isZavSklad = roleStr.includes("заведующий складом");
      const metaObj = { reason, amount, moneyAmount };
      const ptsAmount = -(Math.abs(parseFloat(amount) || 0));
      const fineMoneyAmount = -(Math.abs(parseFloat(moneyAmount) || 0));

      if (isZavSklad) {
        await supabaseClient.from('requests').insert([{
          author_iin: appState.iin,
          type: "Запрос на штраф",
          details: reason,
          target_iin: targetIin,
          status: "pending_admin",
          metadata: metaObj
        }]);
      } else if (isDir) {
        await supabaseClient.from('user_details').insert([{
          iin: targetIin,
          type: "Штраф",
          action_text: reason,
          points_motivation: ptsAmount,
          fine_money: fineMoneyAmount,
          manager_iin: appState.iin
        }]);
        await supabaseClient.from('requests').insert([{
          author_iin: appState.iin,
          type: "Уведомление о штрафе",
          details: reason,
          target_iin: targetIin,
          status: "notify_user_fine",
          metadata: metaObj
        }]);
      }
      return { success: true };
    }

    if (actionName === "submitRequest") {
      const { type, details, targetIin, metadata } = payloadData;
      let metaObj = {};
      try { metaObj = metadata ? JSON.parse(metadata) : {}; } catch (e) {}
      const { error } = await supabaseClient.from('requests').insert([{
        author_iin: appState.iin,
        type: type,
        details: details,
        target_iin: targetIin,
        status: "pending",
        metadata: metaObj
      }]);
      if (error) return { success: false, error: error.message };
      return { success: true };
    }

    if (actionName === "getDashboardData") {
      const { data: userData, error: userErr } = await supabaseClient.from('users').select('*').eq('iin', appState.iin).maybeSingle();
      if (userErr || !userData) return { authorized: false };

      const localData = {};
      const [
        { data: allUsers },
        { data: allReqs },
        { data: allUserDetails },
        { data: kpiDataRaw },
        { data: allSheetInfo },
        { data: scItemsRaw },
        { data: tradeInRaw }
      ] = await Promise.all([
        supabaseClient.from('users').select('iin, full_name, role, dept'),
        supabaseClient.from('requests').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('user_details').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('sheet_kpi_params').select('*').order('date', { ascending: false }).limit(1),
        supabaseClient.from('user_sheet_info').select('*'),
        supabaseClient.from('store_sc_items').select('*').order('date', { ascending: false }).limit(1),
        supabaseClient.from('trade_in_models').select('model_name').order('sort_order', { ascending: true })
      ]);

      const finalScItems = (scItemsRaw && scItemsRaw.length > 0 && scItemsRaw[0].items_data) ? scItemsRaw[0].items_data : [];
      const tradeInList = (tradeInRaw && tradeInRaw.length > 0) ? tradeInRaw.map(item => item.model_name) : [];
      const kpiCfg = { base: 80, rev: -5, revsn: -5, price: -4, ub: -7, bl: -1, pr: -10 };
      const freshHotChecks = [];

      if (kpiDataRaw && kpiDataRaw.length > 0) {
        const rows = kpiDataRaw[0].data || [];
        rows.forEach(r => {
          const pVal = parseFloat(String(r.col_d_penalty_val).replace(',', '.'));
          if (r.col_a_kpi_name === 'Базовы') kpiCfg.base = parseFloat(String(r.col_b_kpi_val).replace(',', '.')) || 80;
          if (r.col_c_penalty_name === 'Отзыв') kpiCfg.rev = pVal || -5;
          if (r.col_c_penalty_name === 'Ревизия') kpiCfg.revsn = pVal || -5;
          if (r.col_c_penalty_name === 'Проверка ценников') kpiCfg.price = pVal || -4;
          if (r.col_c_penalty_name === 'Ген. уборка') kpiCfg.ub = pVal || -7;
          if (r.col_c_penalty_name && r.col_c_penalty_name.includes('БЛ')) kpiCfg.bl = pVal || -1;
          if (r.col_c_penalty_name && r.col_c_penalty_name.includes('ПР')) kpiCfg.pr = pVal || -10;
        });

        window.dynamicPrefixColors = window.dynamicPrefixColors || {};
        const allDeptsCols = [
          { n: 'col_e_cifra_name', k: 'col_f_cifra_kpi', p: 'col_g_cifra_pts' },
          { n: 'col_h_mbt_name', k: 'col_i_mbt_kpi', p: 'col_j_mbt_pts' },
          { n: 'col_k_kbt_name', k: 'col_l_kbt_kpi', p: 'col_m_kbt_pts' }
        ];
        allDeptsCols.forEach(cols => {
          rows.forEach(r => {
            const btnName = String(r[cols.n] || "").trim();
            const rawVal = String(r[cols.k] || "").trim();
            const rawPts = String(r[cols.p] || "").trim();
            if (btnName.startsWith("_") && rawVal.startsWith("_") && rawPts.startsWith("_#")) {
              const prefix = rawVal.indexOf(" ") !== -1 ? rawVal.substring(1, rawVal.indexOf(" ")).trim() : rawVal.substring(1).trim();
              const listColor = rawPts.indexOf(" ") !== -1 ? rawPts.substring(1, rawPts.indexOf(" ")).trim() : rawPts.substring(1).trim();
              if (prefix) window.dynamicPrefixColors[prefix] = listColor;
            }
          });
        });

        const d = String(userData.dept).toLowerCase();
        let nameCol, kpiCol, ptsCol;
        if (d.includes("цифра") || d.includes("чт")) {
          nameCol = 'col_e_cifra_name'; kpiCol = 'col_f_cifra_kpi'; ptsCol = 'col_g_cifra_pts';
        } else if (d.includes("мбт")) {
          nameCol = 'col_h_mbt_name'; kpiCol = 'col_i_mbt_kpi'; ptsCol = 'col_j_mbt_pts';
        } else if (d.includes("кбт")) {
          nameCol = 'col_k_kbt_name'; kpiCol = 'col_l_kbt_kpi'; ptsCol = 'col_m_kbt_pts';
        }

        if (nameCol) {
          let currentSub = "";
          let activePromoList = null;
          localData.promoLists = [];
          rows.forEach(r => {
            const btnName = String(r[nameCol] || "").trim();
            if (!btnName) return;
            const rawVal = String(r[kpiCol] || "").trim();
            const rawPts = String(r[ptsCol] || "").trim();

            if (btnName.startsWith("_")) {
              const title = btnName.substring(1).trim();
              let prefix = "";
              let defKpi = "0";
              let listColor = "var(--text-color)";

              if (rawVal.startsWith("_")) {
                const spaceIdx = rawVal.indexOf(" ");
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
                const spaceIdx = rawPts.indexOf(" ");
                if (spaceIdx !== -1) {
                  listColor = rawPts.substring(1, spaceIdx).trim();
                } else {
                  listColor = rawPts.substring(1).trim();
                }
                if (prefix) window.dynamicPrefixColors[prefix] = listColor;
              }

              activePromoList = { title, prefix, defKpi, listColor, items: [] };
              localData.promoLists.push(activePromoList);
            } else if (btnName.includes("*")) {
              activePromoList = null;
              const btnVal = rawVal.replace('%', '').replace(',', '.').trim();
              const btnPts = rawPts.replace('%', '').replace(',', '.').trim() || "0";
              freshHotChecks.push({ sub: currentSub, name: btnName.replace(/\*/g, '').trim(), val: btnVal, pts: btnPts });
            } else {
              if (activePromoList) {
                let btnVal = rawVal.replace('%', '').replace(',', '.').trim();
                if (!btnVal || btnVal === "0") btnVal = activePromoList.defKpi;
                const btnPts = rawPts.replace('%', '').replace(',', '.').trim() || "0";

                let cleanName = btnName;
                let count = null;
                const bracketIdx = btnName.indexOf('[');
                if (bracketIdx !== -1) {
                  cleanName = btnName.substring(0, bracketIdx).trim();
                  const metaStr = btnName.substring(bracketIdx);
                  const countMatch = metaStr.match(/\[(\d+),/);
                  if (countMatch) count = parseInt(countMatch[1]) || 0;
                }

                if (count !== null && allReqs) {
                  const approvedCount = allReqs.filter(req =>
                    (req.status === 'approved' || req.status === 'approved_notify_zav') &&
                    String(req.details).trim() === cleanName &&
                    (req.type === activePromoList.prefix || (req.metadata && req.metadata.type === activePromoList.prefix) || (req.meta && req.meta.includes(`"type":"${activePromoList.prefix}"`)))
                  ).length;
                  count = Math.max(0, count - approvedCount);
                }

                activePromoList.items.push({ name: btnName, cleanName, currentCount: count, val: btnVal, pts: btnPts });
              } else {
                currentSub = btnName;
              }
            }
          });
        }
      }

      if (freshHotChecks.length > 0) localData.hotChecks = freshHotChecks;

      const userMap = {};
      const adminEmployees = [];
      const empMap = {};

      if (allUsers) {
        allUsers.forEach(u => {
          userMap[u.iin] = u;
          const sInfo = (allSheetInfo || []).find(s => String(s.iin) === String(u.iin)) || { tabel_data: { bs: 0, bl: 0, pr: 0, ot: 0, rd: 0 }, reports_data: [] };
          let kpiVal = kpiCfg.base;
          const kDetails = [{ name: "Базовый KPI", source: "База", val: kpiCfg.base, date: "" }];
          let repErrors = 0;
          let directPenaltyPoints = 0;

          sInfo.reports_data.forEach(rep => {
            repErrors += rep.errors;
            directPenaltyPoints += (rep.penaltySum || 0);
            let penalty = 0;
            if (rep.title.includes("Ценников") || rep.title.includes("Ценники")) penalty = rep.errors * kpiCfg.price;
            else if (rep.title.includes("Ревизия")) penalty = rep.errors * kpiCfg.revsn;
            else if (rep.title.includes("уборка")) penalty = rep.errors * kpiCfg.ub;
            else if (rep.title.includes("Отзыв")) penalty = rep.errors * kpiCfg.rev;
            if (penalty !== 0) {
              kpiVal += penalty;
              kDetails.push({ name: "Ошибки", source: rep.title, val: penalty, date: "" });
            }
          });

          const bBl = parseFloat(String(sInfo.tabel_data.bl || "0").replace(',', '.')) || 0;
          const bPr = parseFloat(String(sInfo.tabel_data.pr || "0").replace(',', '.')) || 0;
          const blPen = bBl * kpiCfg.bl;
          const prPen = bPr * kpiCfg.pr;
          kpiVal += blPen + prPen;
          if (blPen !== 0) kDetails.push({ name: "Больничный", source: "Табель", val: blPen, date: "" });
          if (prPen !== 0) kDetails.push({ name: "Прогул", source: "Табель", val: prPen, date: "" });

          if (u.role.toLowerCase().includes("продавец")) {
            const emp = {
              iin: u.iin,
              name: u.full_name,
              dept: u.dept || 'Цифра',
              role: u.role || 'Продавец',
              kpi: kpiVal,
              kpiDetails: kDetails,
              pts: { acc: 0, use: 0, rem: 0, fin: 0 },
              sales: { sc: 0, trade: 0 },
              reportErrors: repErrors,
              reports: sInfo.reports_data,
              ptsHistory: [],
              remarks: [],
              tabelStr: `<div class="tabel-item" style="color:#f39c12"><span class="tabel-lbl">БС.</span>${sInfo.tabel_data.bs}</div><div class="tabel-item" style="color:#e67e22"><span class="tabel-lbl">БЛ.</span>${sInfo.tabel_data.bl}</div><div class="tabel-item" style="color:#e74c3c"><span class="tabel-lbl">ПР.</span>${sInfo.tabel_data.pr}</div><div class="tabel-item" style="color:#f1c40f"><span class="tabel-lbl">ОТ.</span>${sInfo.tabel_data.ot}</div><div class="tabel-item" style="color:#27ae60"><span class="tabel-lbl">РД.</span>${sInfo.tabel_data.rd}</div>`,
              rawTabel: sInfo.tabel_data,
              directPenaltyPoints
            };
            adminEmployees.push(emp);
            empMap[u.iin] = emp;
          }
        });
      }
      adminEmployeesGlobal.length = 0;
      Array.prototype.push.apply(adminEmployeesGlobal, adminEmployees);

      const myEmp = empMap[appState.iin];
      if (!myEmp) {
        const mySheet = (allSheetInfo || []).find(s => String(s.iin) === String(appState.iin)) || { tabel_data: { bs: 0, bl: 0, pr: 0, ot: 0, rd: 0 }, reports_data: [] };
        localData.info = {
          tabel: mySheet.tabel_data,
          reports: mySheet.reports_data,
          kpiValue: kpiCfg.base,
          kpiDetails: [],
          baseKpi: kpiCfg.base,
          reportErrors: 0,
          directPenaltyPoints: 0,
          remarks: [],
          myPtsHistory: []
        };
      } else {
        localData.info = {
          tabel: myEmp.rawTabel,
          reports: myEmp.reports,
          kpiValue: myEmp.kpi,
          kpiDetails: myEmp.kpiDetails,
          baseKpi: kpiCfg.base,
          reportErrors: myEmp.reportErrors,
          directPenaltyPoints: myEmp.directPenaltyPoints,
          remarks: [],
          myPtsHistory: []
        };
      }

      const myPtsHistory = [];
      let myKpiChanges = 0;

      if (allUserDetails) {
        allUserDetails.forEach(ud => {
          const d = new Date(ud.created_at);
          const dateStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
          const ptsMotivation = parseFloat(ud.points_motivation) || 0;
          const kpiChange = parseFloat(ud.kpi_change) || 0;
          const managerName = ud.manager_iin ? (userMap[ud.manager_iin]?.full_name || ud.manager_iin) : "";

          let dynamicType = ud.category || ud.type;
          let cleanActionText = ud.action_text || "";
          if (dynamicType && cleanActionText.startsWith(dynamicType + " ")) {
            cleanActionText = cleanActionText.substring(dynamicType.length + 1).trim();
          }

          if (ptsMotivation !== 0 || ud.type === "Штраф") {
            const histItem = {
              date: dateStr,
              type: ud.type,
              source: dynamicType,
              reason: cleanActionText,
              val: ptsMotivation > 0 ? "+" + ptsMotivation : ptsMotivation,
              approver: managerName,
              moneyFine: ud.fine_money || 0,
              kpiChange
            };

            if (ud.type === "Штраф") {
              histItem.type = "Штраф";
              histItem.source = managerName;
            } else if (ud.type === "Продажа СЦ/Фокус" || ud.type === "Продажа Trade-In" || ud.type === dynamicType) {
              histItem.type = "Начисление";
              histItem.source = dynamicType;
              histItem.val = "+" + ptsMotivation;
            } else if (ud.type === "Использование") {
              histItem.type = "Использование";
              histItem.source = "Мотивация";
            } else if (ud.type === "Горячий чек") {
              histItem.type = "Начисление";
              histItem.source = "Горячий чек";
              const firstWord = String(cleanActionText).split(' ')[0];
              if (firstWord && firstWord !== "Горячий" && cleanActionText.includes(firstWord + ' ')) {
                histItem.source = firstWord;
              }
              histItem.val = "+" + ptsMotivation;
            }

            if (ud.iin === appState.iin) myPtsHistory.push(histItem);

            if (empMap[ud.iin]) {
              empMap[ud.iin].ptsHistory.push(histItem);
              if (histItem.type === "Начисление") {
                empMap[ud.iin].pts.acc += ptsMotivation;
                if (histItem.source === "Trade-In") empMap[ud.iin].sales.trade++;
                else empMap[ud.iin].sales.sc++;
              }
              if (histItem.type === "Использование") empMap[ud.iin].pts.use += Math.abs(ptsMotivation);
              if (histItem.type === "Штраф") empMap[ud.iin].pts.fin += Math.abs(ptsMotivation);
            }
          }

          if (kpiChange !== 0) {
            const kName = cleanActionText || ud.type;
            const kSource = dynamicType;
            const kpiItem = { name: kName, source: kSource, val: kpiChange, date: dateStr };
            if (ud.iin === appState.iin) {
              if (!localData.info.kpiDetails) localData.info.kpiDetails = [];
              localData.info.kpiDetails.push(kpiItem);
              myKpiChanges += kpiChange;
            }
            if (empMap[ud.iin]) {
              empMap[ud.iin].kpi += kpiChange;
              if (ud.iin !== appState.iin) empMap[ud.iin].kpiDetails.push(kpiItem);
            }
          }
        });
      }

      adminEmployees.forEach(e => {
        e.pts.rem = e.pts.acc - e.pts.use - e.pts.fin + e.directPenaltyPoints;
      });

      let myAcc = 0, myUse = 0, myFin = 0;
      myPtsHistory.forEach(h => {
        const pts = parseFloat(String(h.val).replace('+', '').replace(',', '.')) || 0;
        if (h.type === "Начисление") myAcc += pts;
        if (h.type === "Использование") myUse += Math.abs(pts);
        if (h.type === "Штраф") myFin += Math.abs(pts);
      });

      localData.info.myPtsHistory = myPtsHistory;
      localData.info.ptsAccrued = myAcc;
      localData.info.ptsUsed = myUse;
      localData.info.ptsFine = myFin + Math.abs(localData.info.directPenaltyPoints || 0);
      localData.info.ptsLeft = myAcc - myUse - myFin + (localData.info.directPenaltyPoints || 0);
      if (!isNaN(localData.info.kpiValue)) localData.info.kpiValue = parseFloat(localData.info.kpiValue) + myKpiChanges;

      const userInbox = [], userHistory = [], adminInbox = [], adminHistory = [];
      const isDir = userData.role.toLowerCase().includes("директор") || userData.role.toLowerCase().includes("управляющий") || userData.role.toLowerCase().includes("админ") || userData.role.toLowerCase().includes("супервайзер");
      const isZavSklad = userData.role.toLowerCase().includes("заведующий складом");

      if (allReqs) {
        allReqs.forEach(r => {
          const author = userMap[r.author_iin] || {};
          const target = userMap[r.target_iin] || {};
          const d = new Date(r.created_at);
          const dateStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
          const reqObj = {
            id: r.id,
            date: dateStr,
            authorIin: r.author_iin,
            authorName: author.full_name || r.author_iin,
            authorRole: author.role || "Продавец",
            authorDept: author.dept || "",
            adminDisplayName: author.dept ? `${author.full_name} — ${author.dept}` : author.full_name,
            type: r.type,
            details: r.details,
            targetIin: r.target_iin,
            targetName: target.full_name || "",
            status: r.status === 'pending' ? 'pending_admin' : r.status,
            meta: r.metadata ? JSON.stringify(r.metadata) : "{}"
          };

          let isDismissedByMe = false;
          try {
            const m = r.metadata || {};
            if (m.dismissedBy && m.dismissedBy.includes(appState.iin)) isDismissedByMe = true;
          } catch (e) {}

          if (r.type === "Замечание" && (r.status === "approved" || r.status === "pending_user_reply" || r.status === "pending_admin_view_remark")) {
            if (empMap[r.target_iin]) empMap[r.target_iin].remarks.push({ details: r.details, authorName: author.full_name, authorRole: author.role, date: dateStr });
            if (r.target_iin === appState.iin) {
              if (!localData.info.remarks) localData.info.remarks = [];
              localData.info.remarks.push({ details: r.details, authorName: author.full_name, authorRole: author.role, date: dateStr });
            }
          }

          if (isDir) {
            if (reqObj.status === "pending_admin" || reqObj.status === "pending_admin_view") adminInbox.push(reqObj);
            if (reqObj.status === "pending_admin_view_remark" && !isDismissedByMe) adminInbox.push(reqObj);
            if (reqObj.type === "Замечание" && reqObj.status === "pending_user_reply" && reqObj.authorIin !== appState.iin && !isDismissedByMe) adminInbox.push(reqObj);
            if (["approved", "rejected", "viewed", "rejected_by_user", "rejected_notify_user", "approved_notify_zav", "rejected_notify_zav"].includes(reqObj.status) || isDismissedByMe) {
              if (adminHistory.length < 200) adminHistory.push(reqObj);
            }
          }

          if (isZavSklad) {
            if ((reqObj.status === "rejected_notify_zav" || reqObj.status === "approved_notify_zav") && reqObj.authorIin === appState.iin) userInbox.push(reqObj);
            else if (reqObj.status === "pending_user" && reqObj.targetIin === appState.iin) userInbox.push(reqObj);
            else if (reqObj.status === "rejected_notify_user" && reqObj.authorIin === appState.iin) userInbox.push(reqObj);
            else if (reqObj.status === "pending_user_reply" && reqObj.targetIin === appState.iin) userInbox.push(reqObj);
            else if (reqObj.type === "Замечание" && (reqObj.status === "pending_user_reply" || reqObj.status === "pending_admin_view_remark") && reqObj.targetIin !== appState.iin && reqObj.authorIin !== appState.iin && !isDismissedByMe) userInbox.push(reqObj);
            else if (reqObj.status === "notify_user_fine" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj);
            if (["approved", "rejected", "viewed", "rejected_by_user", "rejected_notify_user", "approved_notify_zav", "rejected_notify_zav", "viewed_fine"].includes(reqObj.status) || isDismissedByMe) {
              if (adminHistory.length < 200) adminHistory.push(reqObj);
            }
          }

          if (!isDir && !isZavSklad) {
            if (reqObj.status === "pending_user" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj);
            else if (reqObj.status === "rejected_notify_user" && reqObj.authorIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj);
            else if (reqObj.status === "pending_user_reply" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj);
            else if (reqObj.status === "notify_user_fine" && reqObj.targetIin === appState.iin && !isDismissedByMe) userInbox.push(reqObj);
          }

          const isClosedForUser = ["approved", "rejected", "viewed", "rejected_by_user", "approved_notify_zav", "rejected_notify_zav", "rejected_notify_user", "viewed_fine"].includes(reqObj.status);
          if ((reqObj.authorIin === appState.iin || reqObj.targetIin === appState.iin) && (isClosedForUser || (reqObj.status === "pending_admin_view_remark" && reqObj.targetIin === appState.iin) || isDismissedByMe)) {
            if (userHistory.length < 50) userHistory.push(reqObj);
          }
        });
      }

      const mySellers = adminEmployees.filter(e => e.dept === userData.dept && e.iin !== appState.iin).map(e => ({ iin: e.iin, name: e.name }));

      return {
        authorized: true,
        role: userData.role,
        name: userData.full_name,
        dept: userData.dept,
        isPromoter: userData.role.toLowerCase().includes("промоутер"),
        scItems: finalScItems,
        adminScItems: finalScItems,
        adminPlan: localData.adminPlan || null,
        tradeInModels: tradeInList,
        hotChecks: localData.hotChecks || [],
        promoLists: localData.promoLists || [],
        info: localData.info,
        userHistory,
        userInbox,
        adminInbox,
        adminHistory,
        adminEmployees,
        sellers: mySellers
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/* ========== Загрузка плана ========== */
export async function loadPlanHistory(isSilent = false) {
  const startD = document.getElementById("plan-filter-start").value;
  const endD = document.getElementById("plan-filter-end").value;
  if (!isSilent) showToast("Загрузка периода...", false, 9999);

  const { data: plansData, error } = await supabaseClient
    .from('store_plans')
    .select('*')
    .gte('date', startD)
    .lte('date', endD)
    .order('date', { ascending: false });

  if (error) {
    if (!isSilent) showToast("Ошибка базы: " + error.message, true);
    return;
  }
  if (!plansData || plansData.length === 0) {
    if (!isSilent) showToast("За этот период данных нет", true);
    document.getElementById("plan-render-area").innerHTML =
      "<p style='text-align:center;color:gray;font-size:13px; padding:20px 0;'>Нет записей в базе за эти даты</p>";
    return;
  }
  document.getElementById("toast").classList.remove("show");

  const aggregatedGroups = JSON.parse(JSON.stringify(plansData[0].plan_data.groups || []));
  let aggTotalPlan = parseFloat(String(plansData[0].plan_data.totalPlan || "0").replace(/\s/g, '').replace(',', '.')) || 0;
  const parse = (str) => parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;

  if (plansData.length > 1) {
    aggregatedGroups.forEach(g => { g.fact = 0; g.factEd = 0; g.ed = 0; });
    plansData.forEach(day => {
      const groups = day.plan_data.groups;
      if (groups) {
        groups.forEach((g, idx) => {
          if (aggregatedGroups[idx]) {
            aggregatedGroups[idx].fact += parse(g.fact);
            const e = parse(g.factEd || g.ed);
            aggregatedGroups[idx].factEd = (aggregatedGroups[idx].factEd || 0) + e;
            aggregatedGroups[idx].ed = aggregatedGroups[idx].factEd;
          }
        });
      }
    });
  }

  const pData = calcPlanEngine({ groups: aggregatedGroups, totalPlan: aggTotalPlan });
  // renderPlanUI вызывается из ui, но мы здесь импортируем и вызываем
  const { renderPlanUI } = await import('./ui.js');
  renderPlanUI(pData);
}

export function setPlanDates(type, val = null) {
  let endD = new Date();
  let startD = new Date();
  if (type === 'single') {
    if (val) {
      const parts = val.split('-');
      startD = new Date(parts[0], parts[1] - 1, parts[2]);
      endD = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  } else if (type === 'today') {
  } else if (type === 'yesterday') {
    startD.setDate(startD.getDate() - 1);
    endD.setDate(endD.getDate() - 1);
  } else if (type === 'month') {
    if (val) {
      const parts = val.split('-');
      startD = new Date(parts[0], parts[1] - 1, 1);
      endD = new Date(parts[0], parts[1], 0);
    } else {
      startD.setDate(1);
    }
  } else if (type === 'all') {
    startD = new Date(2024, 0, 1);
  }
  document.getElementById('plan-filter-start').value = formatDateLocal(startD);
  document.getElementById('plan-filter-end').value = formatDateLocal(endD);
  loadPlanHistory();
}

/* ========== Управление временем ========== */
export async function triggerAction(actionType) {
  vibrate(50);
  const prevAction = appState.currentAction;
  appState.currentAction = actionType;
  saveMemory("currentAction", actionType);
  renderTimeUI();

  const res = await callBackend('recordAction', {
    token: appState.token,
    iin: appState.iin,
    actionType: actionType,
    isReturn: false,
    isSilentAutoReturn: false
  });

  if (res.success && res.savedAction) {
    appState.currentAction = res.savedAction;
    saveMemory("currentAction", res.savedAction);
    renderTimeUI();
    const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
    applyLimits(state);
  } else {
    appState.currentAction = prevAction;
    saveMemory("currentAction", prevAction || "");
    renderTimeUI();
    const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
    applyLimits(state);
    showToast("Ошибка: " + res.error, true);
  }
}

export async function triggerReturn() {
  vibrate(50);
  const actionToReturnFrom = appState.currentAction;
  appState.currentAction = null;
  saveMemory("currentAction", "");
  renderTimeUI();
  document.querySelectorAll("#standard-buttons button").forEach(b => b.disabled = true);
  document.getElementById("btn-break").disabled = false;
  document.getElementById("action-hint").innerText = "Фиксируем возвращение...";

  const res = await callBackend('recordAction', {
    token: appState.token,
    iin: appState.iin,
    actionType: actionToReturnFrom,
    isReturn: true,
    isAutoReturn: false
  });

  if (res.success) {
    document.getElementById("action-hint").innerText = "Обновление лимитов...";
    const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
    document.getElementById("action-hint").innerText = "Выберите действие:";
    applyLimits(state);
  } else {
    appState.currentAction = actionToReturnFrom;
    saveMemory("currentAction", actionToReturnFrom);
    renderTimeUI();
    showToast("Ошибка возврата: " + res.error, true);
    const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
    applyLimits(state);
  }
}

export async function triggerAutoReturn(actionToReturnFrom) {
  if (!appState.currentAction) return;
  appState.currentAction = null;
  saveMemory("currentAction", "");
  renderTimeUI();
  document.querySelectorAll("#standard-buttons button").forEach(b => b.disabled = true);
  document.getElementById("btn-break").disabled = false;
  document.getElementById("action-hint").innerText = "Очередь заполнена или лимит исчерпан";

  await callBackend('recordAction', {
    token: appState.token,
    iin: appState.iin,
    actionType: actionToReturnFrom,
    isReturn: true,
    isAutoReturn: true
  });

  const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
  applyLimits(state);
}

export async function triggerUniversalAutoReturn(iin, actionType, roleGroup) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data } = await supabaseClient
    .from('time_tracking')
    .select('*')
    .eq('iin', iin)
    .eq('action_type', actionType)
    .in('direction', ['Возврат', 'Автовозврат'])
    .gte('created_at', todayStart.toISOString());

  if (!data || data.length === 0) {
    await supabaseClient.from('time_tracking').insert([{
      iin: iin,
      action_type: actionType,
      direction: 'Автовозврат',
      role_group: roleGroup
    }]);
  }
}

/* ========== Авторизация ========== */
export async function manualLogin() {
  const elIin = document.getElementById("iin-input");
  const elPass = document.getElementById("password-input");
  const iinVal = elIin.value;
  const passVal = elPass.value;

  if (!iinVal || iinVal.length !== 12) {
    document.getElementById("login-error").innerText = "ИИН должен состоять из 12 цифр";
    return;
  }
  if (!passVal) {
    document.getElementById("login-error").innerText = "Введите пароль";
    return;
  }

  elIin.disabled = true;
  elPass.disabled = true;
  showToast("Авторизация...", false, 9999);

  const res = await callBackend('loginByIIN', { iin: iinVal, password: passVal });

  if (res.success) {
    appState.iin = res.iin;
    appState.token = res.token;
    appState.firstName = res.firstName;
    appState.currentAction = null;
    isUserPromoter = res.isPromoter;
    saveMemory("userIIN", appState.iin);
    saveMemory("userToken", appState.token);
    saveMemory("userName", appState.firstName);
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

/* ========== Штрафы и замечания ========== */
export async function executeRemark(iin, name) {
  const text = document.getElementById(`remark-text-${iin}`).value;
  if (!text) return showToast("Укажите текст замечания!", true);
  vibrate(50);
  showToast("Отправка...", false, 9999);
  const res = await callBackend('submitRemark', { token: appState.token, targetIin: iin, targetName: name, text });
  if (res.success) {
    showToast("Замечание отправлено!");
    loadDashboard(true);
    closeDetails();
  } else {
    showToast(res.error, true);
  }
}

export async function executeFine(iin, name) {
  const reason = document.getElementById(`fine-reason-${iin}`).value;
  const amount = document.getElementById(`fine-amount-${iin}`).value || "0";
  const moneyAmount = document.getElementById(`fine-money-${iin}`).value || "0";
  if (!reason) return showToast("Укажите причину штрафа!", true);
  if (parseFloat(amount) >= 0 && parseFloat(moneyAmount) >= 0) return showToast("Укажите штраф (баллы или сумма) меньше 0!", true);
  vibrate(50);
  showToast("Отправка...", false, 9999);
  const res = await callBackend('submitFine', { token: appState.token, iin, name, reason, amount, moneyAmount });
  if (res.success) {
    showToast("Штраф выписан/запрошен!");
    loadDashboard(true);
    closeDetails();
  } else {
    showToast(res.error, true);
  }
}

/* ========== Отправка запросов ========== */
export async function executeSubmit(type, details, targetIin = null, meta = "", customMsg = null) {
  vibrate(50);
  showToast("Отправка...", false, 9999);
  const res = await callBackend('submitRequest', { token: appState.token, type, details, targetIin, metadata: meta });
  if (res.success) {
    showToast(customMsg || "Запрос успешно отправлен!");
    // closeForm() вызывается из ui, но мы можем импортировать
    const { closeForm } = await import('./ui.js');
    closeForm();
    loadDashboard(true);
  } else {
    showToast("Ошибка: " + res.error, true);
  }
}

export async function processReq(id, action, replyText = "") {
  vibrate(50);
  showToast("Обработка...", false, 9999);
  processedReqIds.add(String(id));
  const el = document.getElementById("req-" + id);
  if (el) el.style.display = 'none';

  const res = await callBackend('processRequest', { token: appState.token, reqId: id, reqAction: action, replyText });
  if (res.success) {
    showToast(res.msg);
    loadDashboard(true);
  } else {
    showToast(res.error, true);
    loadDashboard(true);
  }
}

/* ========== Главный дашборд ========== */
export async function loadDashboard(isSilent = false) {
  const cachedData = localStorage.getItem("dashData_" + appState.iin);
  if (!isSilent) {
    if (cachedData) {
      try {
        renderDashboardData(JSON.parse(cachedData), true);
        const roleStr = String(appState.role).toLowerCase();
        const isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
        const isZavSklad = roleStr.includes("заведующий складом");
        if (isDir) {
          switchTab('adm-main');
          toggleAdminMain('plan');
        } else if (isZavSklad) {
          switchTab('adm-main');
          toggleAdminMain('emps');
        } else {
          switchTab('time');
        }
        hideLoader();
        isSilent = true;
      } catch (e) {
        localStorage.removeItem("dashData_" + appState.iin);
        showLoader();
      }
    } else {
      showLoader();
    }
  }

  const data = await callBackend('getDashboardData', { token: appState.token });
  if (!data || data.error === "Оффлайн режим") {
    if (!isSilent) hideLoader();
    return;
  }
  if (data.authorized === false) {
    forceLogout();
    return;
  }

  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT');
  let hasUnsavedText = false;
  document.querySelectorAll("textarea[id^='remark-reply-']").forEach(ta => {
    if (ta.value.length > 0) hasUnsavedText = true;
  });

  localStorage.setItem("dashData_" + appState.iin, JSON.stringify(data));
  if (!isTyping && !hasUnsavedText) {
    renderDashboardData(data, isSilent);
  }
  if (!isSilent) hideLoader();

  const roleStr = String(appState.role).toLowerCase();
  const isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
  const isZavSklad = roleStr.includes("заведующий складом");

  const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
  if (state && state.authorized !== false) {
    globalActiveOuts = state.activeOuts || [];
    if (!isDir && !isZavSklad) {
      appState.currentAction = state.myActiveAction || "";
      saveMemory("currentAction", appState.currentAction);
      renderTimeUI();
      applyLimits(state);
    } else {
      if (!document.getElementById("content-adm-outs").classList.contains("hidden")) {
        renderAdminOuts();
      }
    }
  }
}

/* ========== Polling ========== */
export function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);

  supabaseClient.channel('public-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, payload => {
      if (appState.token && !document.hidden && !isSensitiveState() && lastActiveTab !== 'inbox') {
        loadDashboard(true);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_details' }, payload => {
      if (appState.token && !document.hidden && !isSensitiveState() && lastActiveTab !== 'inbox') {
        loadDashboard(true);
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'time_tracking' }, async payload => {
      const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
      if (state) {
        globalActiveOuts = state.activeOuts || [];
        if (appState.role.toLowerCase().includes("директор") || appState.role.toLowerCase().includes("заведующий")) {
          renderAdminOuts();
        } else {
          applyLimits(state);
        }
      }
    })
    .subscribe();

  pollingTimer = setInterval(async () => {
    if (isSensitiveState()) return;
    if (appState.token && !document.hidden) {
      const state = await callBackend('startupCheck', { token: appState.token, iin: appState.iin });
      if (state) {
        globalActiveOuts = state.activeOuts || [];
        if (appState.role.toLowerCase().includes("директор") || appState.role.toLowerCase().includes("заведующий")) {
          renderAdminOuts();
        } else {
          applyLimits(state);
        }
      }
      if (lastActiveTab !== 'inbox') {
        const data = await callBackend('getDashboardData', { token: appState.token });
        if (data && data.authorized !== false) renderDashboardData(data, true);
      }
    }
  }, 30000);
}

function isSensitiveState() {
  if (lastActiveTab === 'inbox') return true;
  const activeEl = document.activeElement;
  const isTyping = activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT');
  let hasUnsavedText = false;
  document.querySelectorAll("textarea[id^='remark-reply-']").forEach(ta => {
    if (ta.value.length > 0) hasUnsavedText = true;
  });
  const isRecentlyTyping = (Date.now() - window.typingLockTime) < 10000;
  const isScOpen = document.getElementById("form-sc") && !document.getElementById("form-sc").classList.contains("hidden");
  const isTradeInOpen = document.getElementById("form-tradein") && !document.getElementById("form-tradein").classList.contains("hidden");
  const isPointsOpen = document.getElementById("form-points") && !document.getElementById("form-points").classList.contains("hidden");
  const isSwapOpen = document.getElementById("form-swap") && !document.getElementById("form-swap").classList.contains("hidden");
  let isDetailsFormOpen = false;
  document.querySelectorAll('[id^="fine-form-"], [id^="remark-form-"]').forEach(el => {
    if (!el.classList.contains("hidden")) isDetailsFormOpen = true;
  });
  return isTyping || isRecentlyTyping || hasUnsavedText || isScOpen || isTradeInOpen || isPointsOpen || isSwapOpen || isDetailsFormOpen;
}

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

export function forceLogout() {
    if (pollingTimer) clearInterval(pollingTimer);
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
