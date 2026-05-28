import { supabaseClient, tg } from './config.js';
import {
  appState, globalActiveOuts, adminEmployeesGlobal, adminHistoryGlobal,
  allEmployeesData, globalSellers, globalScItems, adminScItemsGlobal,
  tradeInModelsGlobal, selectedTradeInModel, selectedScItem,
  myReports, myPointsHistory, myDisplayPointsHistory, myScHistory,
  myKpiDetails, myMoneyFinesHistory,
  isUserPromoter, lastActiveTab, processedReqIds,
  currentAdminScDept, currentEmpDept, currentScTabDept,
  currentHistFilter, currentAdminMainView,
  savedScrollPos, window_nomListOpen
} from './state.js';
import {
  callBackend, loadDashboard, triggerAction, triggerReturn, triggerAutoReturn,
  triggerUniversalAutoReturn, loadPlanHistory, setPlanDates, executeSubmit,
  processReq, executeRemark, executeFine
} from './api.js';
import {
  safeIin, fmtSum, formatDateLocal, parseCustomDate, showToast, vibrate,
  getMemory, saveMemory, formatShortName, getSourceColor, buildStandardRow,
  generateDatePanelHTML, setPanelDates, groupAndRenderByMonth, getMonthName,
  renderHistoryItem, renderMoneyFineItem, formatRemarkAuthor, formatRemarkText,
  isCurrentMonth, setKpiColor, formatPointsNoun, formatNumberWithSpaces,
  generateHorizontalGrid
} from './utils.js';

/* ========== Рендер UI плана ========== */
export function renderPlanUI(pData) {
  const area = document.getElementById("plan-render-area");
  if (!area) return;
  if (!pData || !pData.to) {
    area.innerHTML = "<p style='text-align:center;color:gray;font-size:13px; padding:20px 0;'>Нет данных за этот период</p>";
    return;
  }

  const getDynColor = (valStr, targetStr = "100") => {
    const val = parseFloat(String(valStr).replace(/\s/g, '').replace(',', '.')) || 0;
    const target = parseFloat(String(targetStr).replace(/\s/g, '').replace(',', '.')) || 100;
    if (target === 0) return val > 0 ? "#27ae60" : "#e74c3c";
    const ratio = (val / target) * 100;
    return ratio >= 100 ? "#27ae60" : (ratio >= 80 ? "#f39c12" : "#e74c3c");
  };
  const parse = (str) => parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;

  let html = "";
  const totalPlan = pData.totalPlan;
  const totalFact = pData.to.total.fact + pData.aks.total.fact + pData.usl.total.fact;
  const totalFactEd = pData.to.total.fact + pData.to.total.ed + pData.aks.total.fact + pData.aks.total.ed + pData.usl.total.fact + pData.usl.total.ed;
  const remPlan = totalPlan - totalFactEd;
  const totalPct = totalPlan > 0 ? ((totalFact / totalPlan) * 100).toFixed(2).replace('.', ',') : "0,00";
  const totalPctEd = totalPlan > 0 ? ((totalFactEd / totalPlan) * 100).toFixed(2).replace('.', ',') : "0,00";

  let scCount = 0, brzyCount = 0;
  if (adminHistoryGlobal) {
    const startD = document.getElementById("plan-filter-start")?.value || "2000-01-01";
    const endD = document.getElementById("plan-filter-end")?.value || "2099-01-01";
    const startTime = new Date(startD).getTime();
    const endTime = new Date(endD).getTime() + 86400000;
    adminHistoryGlobal.forEach(r => {
      const rd = parseCustomDate(r.date);
      if (rd >= startTime && rd <= endTime && r.status === 'approved') {
        if (r.type === 'Продажа СЦ/Фокус') {
          try {
            const m = JSON.parse(r.meta);
            if (m.type !== "Фокус" && !r.details.toLowerCase().includes("фокус")) scCount++;
          } catch (e) {}
        }
        if (r.type === 'Продажа Trade-In') brzyCount++;
      }
    });
  }

  html += `<div class="inner-block card" style="margin-bottom:12px; padding:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><div style="font-size:14px; font-weight:bold; color:var(--text-color); text-transform:none;">Общая сводка</div><div onclick="openAdminPlanScDetails()" style="font-size:11px; font-weight:bold; color:var(--btn-color); cursor:pointer; padding: 4px 8px; background: rgba(39, 174, 96, 0.1); border-radius: 8px;">СЦ: ${scCount} | BRZY: ${brzyCount}</div></div><div style="background:var(--card-bg); padding:10px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px;"><div style="color:#7f8c8d; font-size:12px; text-transform:uppercase; margin-bottom:8px; font-weight:bold; text-align:center; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;">Итоговый показатель</div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:bold;">${fmtSum(totalPlan)}</div><div style="margin-top:4px; font-size:10px; color:${remPlan <= 0 ? '#27ae60' : '#e74c3c'};">Ост: <b>${fmtSum(remPlan)}</b></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:bold; margin-bottom:2px;">${fmtSum(totalFact)}</div><div><span style="color:${getDynColor(totalPct)}; font-weight:bold; font-size:10px;">${totalPct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:bold; margin-bottom:2px;">${fmtSum(totalFactEd)}</div><div><span style="color:${getDynColor(totalPctEd)}; font-weight:bold; font-size:10px;">${totalPctEd}%</span></div></div></div></div>`;
  html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; margin-bottom:8px; border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;"><b style="color:#7f8c8d; font-size:12px; text-transform:uppercase;">Основной товарооборот</b><span style="color:#e84393; font-size:11px; font-weight:normal; font-style:italic;">+ЭД ${fmtSum(pData.to.total.ed)}</span></div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(pData.to.total.plan)}</div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.to.total.fact)}</div><div><span style="color:${getDynColor(pData.to.total.pct)}; font-weight:bold; font-size:10px;">${pData.to.total.pct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.to.total.fact + pData.to.total.ed)}</div><div><span style="color:${getDynColor(pData.to.total.pctEd)}; font-weight:bold; font-size:10px;">${pData.to.total.pctEd}%</span></div></div></div></div>`;
  html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; margin-bottom:8px; border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;"><b style="color:#7f8c8d; font-size:12px; text-transform:uppercase;">Сопутствующие товары</b><span style="color:#e84393; font-size:11px; font-weight:normal; font-style:italic;">+ЭД ${fmtSum(pData.aks.total.ed)}</span></div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(pData.aks.total.plan)}</div><div style="color:gray; font-size:9px; font-weight:bold; margin-top:4px;">Цель: <span style="color:var(--text-color);">${pData.aks.total.targetPct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.aks.total.fact)}</div><div><span style="color:${getDynColor(pData.aks.total.sumPct)}; font-size:10px; font-weight:bold;">${pData.aks.total.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.aks.total.pct, pData.aks.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.aks.total.pct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.aks.total.fact + pData.aks.total.ed)}</div><div><span style="color:${getDynColor(pData.aks.total.sumPctEd)}; font-size:10px; font-weight:bold;">${pData.aks.total.sumPctEd}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.aks.total.pctEd, pData.aks.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.aks.total.pctEd}%</span></div></div></div></div>`;
  html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;"><b style="color:#7f8c8d; font-size:12px; text-transform:uppercase;">Услуги</b></div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(pData.usl.total.plan)}</div><div style="color:gray; font-size:9px; font-weight:bold; margin-top:4px;">Цель: <span style="color:var(--text-color);">${pData.usl.total.targetPct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.usl.total.fact)}</div><div><span style="color:${getDynColor(pData.usl.total.sumPct)}; font-size:10px; font-weight:bold;">${pData.usl.total.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.usl.total.pct, pData.usl.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.usl.total.pct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.usl.total.fact + pData.usl.total.ed)}</div><div><span style="color:${getDynColor(pData.usl.total.sumPctEd)}; font-size:10px; font-weight:bold;">${pData.usl.total.sumPctEd}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.usl.total.pctEd, pData.usl.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.usl.total.pctEd}%</span></div></div></div></div></div>`;

  if (pData.groups && pData.groups.length > 0) {
    html += `<div class="inner-block card" style="margin-bottom:12px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--card-bg);"><div onclick="window.nomListOpen = !window.nomListOpen; document.getElementById('nom-list').classList.toggle('hidden'); document.getElementById('nom-icon').innerHTML = window.nomListOpen ? '<span class=\\'material-symbols-rounded\\' style=\\'font-size:20px;\\'>expand_less</span>' : '<span class=\\'material-symbols-rounded\\' style=\\'font-size:20px;\\'>expand_more</span>';" style="padding:14px; display:flex; justify-content:space-between; align-items:center; background:rgba(150, 150, 150, 0.05); cursor:pointer; transition:0.3s;"><span style="font-weight:bold; font-size:13px; color:var(--text-color);">Номенклатурные группы</span><span id="nom-icon" style="color:var(--text-color); font-size:16px; font-weight:bold; display:flex; align-items:center;">${window.nomListOpen ? '<span class="material-symbols-rounded" style="font-size:20px;">expand_less</span>' : '<span class="material-symbols-rounded" style="font-size:20px;">expand_more</span>'}</span></div><div id="nom-list" class="${window.nomListOpen ? '' : 'hidden'}" style="padding:4px 14px; background:var(--card-bg);">` + pData.groups.map(g => {
      const n = g.name.toLowerCase();
      const p = parse(g.plan);
      const f = parse(g.fact);
      const e = parse(g.factEd || g.ed);
      const fEd = f + e;
      const pct = (p > 0) ? ((f / p) * 100).toFixed(2).replace('.', ',') : "0,00";
      const pctEd = (p > 0) ? ((fEd / p) * 100).toFixed(2).replace('.', ',') : "0,00";
      const hideEd = n.includes('сертификат') || n.includes('фишк') || n.includes('услуг');
      const edContent = hideEd ? '' : (e > 0 ? `<span style="display:flex; align-items:center; gap:4px;"><span style="color:var(--btn-color); font-weight:bold;">${fmtSum(e)}</span> <span style="color:${getDynColor(pctEd)}; font-size:9px; font-weight:bold; background:var(--inner-bg); padding:2px 4px; border-radius:4px;">${pctEd}%</span></span>` : '');
      return `<div style="padding:10px 0; border-bottom:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:12px;"><span style="color:gray; font-weight:bold; font-size:13px;">${fmtSum(p)}</span><div style="display:flex; gap:12px; align-items:center;"><span style="display:flex; align-items:center; gap:4px;"><span style="color:#27ae60; font-weight:bold;">${fmtSum(f)}</span> <span style="color:${getDynColor(pct)}; font-size:9px; font-weight:bold; background:var(--inner-bg); padding:2px 4px; border-radius:4px;">${pct}%</span></span>${edContent}</div></div><div style="color:var(--desc-color); font-size:11px; line-height:1.2;">${g.name}</div></div>`;
    }).join('') + `</div></div>`;
  }

  html += `<div class="inner-block card" style="margin-bottom:12px; padding:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div style="text-align:left; font-size:14px; font-weight:bold; color:var(--text-color); margin-bottom:12px;">Выполнение по отделам</div>`;
  const buildRow = (dTo, dAks, dUsl, isFact) => {
    const fTo = isFact ? dTo.fact : dTo.plan;
    const fAks = isFact ? dAks.fact : dAks.plan;
    const fUsl = isFact ? dUsl.fact : dUsl.plan;
    const cTo = isFact ? '#27ae60' : 'var(--text-color)';
    const lbl = isFact ? 'Факт' : 'План';
    return `<div style="color:gray; font-size:9px; text-align:left;">${lbl}</div><div style="color:${cTo}; font-size:12px; font-weight:normal;">${fmtSum(fTo)}</div><div style="color:${cTo}; font-size:12px; font-weight:normal;">${fmtSum(fAks)}</div><div style="color:${cTo}; font-size:12px; font-weight:normal;">${fmtSum(fUsl)}</div>`;
  };
  for (let i = 0; i < 3; i++) {
    const d = ['cifra', 'mbt', 'kbt'][i];
    const dTo = pData.to[d], dAks = pData.aks[d], dUsl = pData.usl[d];
    const title = d === 'cifra' ? 'Цифра / ЧТ' : (d === 'mbt' ? 'МБТ' : 'КБТ');
    html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; margin-bottom:8px; border:1px solid var(--border-color);"><div style="font-weight:bold; font-size:12px; margin-bottom:8px; color:var(--text-color); text-align:left; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;">${title}</div><div style="display:grid; grid-template-columns: 35px 1fr 1fr 1fr; gap:6px; font-size:11px; text-align:center; align-items:center;"><div></div> <div style="color:gray; font-size:9px; text-transform:uppercase;">ТО</div> <div style="color:gray; font-size:9px; text-transform:uppercase;">АКС</div> <div style="color:gray; font-size:9px; text-transform:uppercase;">УСЛ</div>${buildRow(dTo, dAks, dUsl, false)}${buildRow(dTo, dAks, dUsl, true)}<div></div><div><span style="color:${getDynColor(dTo.pct)}; font-size:10px; font-weight:bold;">${dTo.pct}%</span></div><div><span style="color:${getDynColor(dAks.sumPct)}; font-size:10px; font-weight:bold;">${dAks.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(dAks.pct, dAks.targetPct)}; font-size:10px; font-weight:bold;">${dAks.pct}%</span></div><div><span style="color:${getDynColor(dUsl.sumPct)}; font-size:10px; font-weight:bold;">${dUsl.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(dUsl.pct, dUsl.targetPct)}; font-size:10px; font-weight:bold;">${dUsl.pct}%</span></div></div></div>`;
  }
  html += `</div>`;
  if (pData.sellers && pData.sellers.length > 0) {
    html += `<div class="inner-block card" style="padding:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div style="text-align:left; font-size:14px; font-weight:bold; color:var(--text-color); margin-bottom:12px;">План на продавца</div>`;
    pData.sellers.forEach((s, idx) => {
      html += `<div style="padding:10px 0; border-bottom:${idx === pData.sellers.length - 1 ? 'none' : '1px solid var(--border-color)'};"><div style="font-size:13px; margin-bottom:8px; color:var(--text-color); font-weight:bold;">${s.name}</div><div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);"><div style="text-align:center;"><div style="color:gray; font-size:9px;">ТО</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(s.to)}</div></div><div style="text-align:center;"><div style="color:gray; font-size:9px;">АКС</div><div style="display:flex; justify-content:center; align-items:center; gap:4px;"><span style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(s.aks)}</span><span style="color:gray; font-weight:bold; font-size:9px;">${s.aksPct}%</span></div></div><div style="text-align:center;"><div style="color:gray; font-size:9px;">УСЛ</div><div style="display:flex; justify-content:center; align-items:center; gap:4px;"><span style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(s.usl)}</span><span style="color:gray; font-weight:bold; font-size:9px;">${s.uslPct}%</span></div></div></div></div>`;
    });
    html += `</div>`;
  }
  area.innerHTML = html;
}

/* ========== UI времени ========== */
export function renderTimeUI() {
  const standardBtns = document.getElementById("standard-buttons");
  const returnContainer = document.getElementById("return-button-container");
  const actStr = String(appState.currentAction);
  if (appState.currentAction && actStr !== "null" && actStr !== "undefined" && actStr !== "") {
    document.getElementById("btn-return").disabled = false;
    standardBtns.classList.add("hidden");
    returnContainer.classList.remove("hidden");
    const declension = getDeclension(appState.currentAction);
    document.getElementById("return-text").innerText = "Вернуться с " + declension;
    document.getElementById("action-hint").innerText = "Ожидаем возвращения:";
  } else {
    standardBtns.classList.remove("hidden");
    returnContainer.classList.add("hidden");
  }
}

export function applyLimits(state) {
  if (!appState.currentAction) {
    document.getElementById("btn-break").disabled = !state.canBreak;
    document.getElementById("btn-lunch").disabled = !state.canLunch;
    document.getElementById("btn-snack").disabled = !state.canSnack;
    document.getElementById("action-hint").innerText = (state.canBreak || state.canLunch || state.canSnack) ? "Выберите действие:" : "Очередь заполнена или лимит исчерпан";
  }
  if (state.activeOuts) {
    globalActiveOuts = state.activeOuts;
    renderActiveOuts();
  }
}

export function renderActiveOuts() {
  const container = document.getElementById("active-outs-container");
  const list = document.getElementById("active-outs-list");
  if (!globalActiveOuts || globalActiveOuts.length === 0) {
    container.classList.add("hidden");
    if (activeOutsTimer) clearInterval(activeOutsTimer);
    return;
  }
  container.classList.remove("hidden");

  function updateTimers() {
    const now = Date.now();
    list.innerHTML = globalActiveOuts.map(out => {
      const elapsedMin = Math.floor((now - out.leftAt) / 60000);
      const diffMin = out.limit - elapsedMin;
      let timeClass = "";
      let timeText = "";
      const rRole = String(out.role || "").toLowerCase();
      const isProm = rRole.includes('промоутер');

      if (diffMin <= 0 && !isProm) {
        triggerUniversalAutoReturn(out.iin, out.action, out.role);
        if (out.iin === appState.iin && appState.currentAction === out.action) {
          appState.currentAction = null;
          saveMemory("currentAction", "");
          renderTimeUI();
          document.getElementById("btn-break").disabled = false;
          document.getElementById("action-hint").innerText = "Выберите действие:";
        }
        return "";
      }

      if (diffMin > 0) {
        timeText = `${diffMin} мин`;
      } else {
        timeClass = "late";
        timeText = `<span style="color:#e74c3c; font-size:9px; text-transform:uppercase;">Опаздывает</span><br>${Math.abs(diffMin)} мин!`;
      }

      let actionTitle = out.action;
      if (actionTitle.includes("Перерыв")) actionTitle = "Перерыв";
      const roleLabel = isProm ? out.role : `Продавец — ${out.dept || 'Сотрудник'}`;

      return `<div class="active-out-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(150,150,150,0.1);"><div style="flex: 1; min-width: 0; display: flex; flex-direction: column;"><span class="active-out-name" style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${out.name}</span><span style="font-size: 10px; color: gray; margin-top: 2px;">${roleLabel}</span></div><div style="width: 80px; text-align: center; font-size: 12px; font-weight: bold; color: var(--btn-color);">${actionTitle}</div><div class="active-out-time ${timeClass}" style="width: 70px; text-align: right; font-size: 13px; font-weight: bold; line-height: 1.1;">${timeText}</div></div>`;
    }).join("");
  }

  updateTimers();
  if (activeOutsTimer) clearInterval(activeOutsTimer);
  activeOutsTimer = setInterval(updateTimers, 10000);
}

export function renderAdminOuts() {
  const list = document.getElementById('admin-outs-list');
  const now = Date.now();
  list.innerHTML = (globalActiveOuts || []).map(out => {
    const elapsedMin = Math.floor((now - out.leftAt) / 60000);
    const diffMin = out.limit - elapsedMin;
    let timeClass = "";
    let timeText = "";
    const rRole = String(out.role || "").toLowerCase();
    const isProm = rRole.includes('промоутер');

    if (diffMin <= 0 && !isProm) {
      triggerUniversalAutoReturn(out.iin, out.action, out.role);
      return "";
    }

    if (diffMin > 0) {
      timeText = `${diffMin} мин`;
    } else {
      timeClass = "late";
      timeText = `<span style="color:#e74c3c; font-size:9px; text-transform:uppercase;">Опаздывает</span><br>${Math.abs(diffMin)} мин!`;
    }

    let actionTitle = out.action;
    if (actionTitle.includes("Перерыв")) actionTitle = "Перерыв";
    const roleLabel = isProm ? out.role : `Продавец — ${out.dept || 'Сотрудник'}`;

    return `<div class="active-out-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(150,150,150,0.1);"><div style="flex: 1; min-width: 0; display: flex; flex-direction: column;"><span class="active-out-name" style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${out.name}</span><span style="font-size: 10px; color: gray; margin-top: 2px;">${roleLabel}</span></div><div style="width: 80px; text-align: center; font-size: 12px; font-weight: bold; color: var(--btn-color);">${actionTitle}</div><div class="active-out-time ${timeClass}" style="width: 70px; text-align: right; font-size: 13px; font-weight: bold; line-height: 1.1;">${timeText}</div></div>`;
  }).join("") || "<p style='color:gray; font-size:13px; text-align:center;'>Все на местах</p>";
}

/* ========== Trade-In ========== */
export function renderTradeInList() {
  const container = document.getElementById("tradein-list");
  if (!container) return;
  container.innerHTML = tradeInModelsGlobal.map(m => {
    const isSel = (selectedTradeInModel === m);
    return `<div class="sc-item ${isSel ? 'selected' : ''}" onclick="selectTradeIn('${m}')"><div style="font-size:13px;">${m}</div></div>`;
  }).join("");
}

export function selectTradeIn(m) {
  selectedTradeInModel = m;
  renderTradeInList();
}

/* ========== Формы ========== */
export function openForm(type) {
  document.getElementById("menu-list").classList.add("hidden");
  const dash = document.getElementById("info-dashboard");
  dash.classList.add("hidden");

  if (type === 'sc') {
    selectedScItem = null;
    document.getElementById("sc-search").value = "";
    document.getElementById("btn-act-doc").style.opacity = "0.3";
    document.getElementById("btn-act-doc").style.pointerEvents = "none";
    let deptToSet = appState.dept || 'Цифра';
    if (deptToSet !== 'Цифра' && deptToSet !== 'МБТ' && deptToSet !== 'КБТ') deptToSet = 'Цифра';
    switchScDept(deptToSet);
    document.getElementById("form-sc").classList.remove("hidden");
    document.getElementById("form-sc").classList.add("slide-up-fade");
  }
  if (type === 'tradein') {
    selectedTradeInModel = null;
    renderTradeInList();
    document.getElementById("form-tradein").classList.remove("hidden");
    document.getElementById("form-tradein").classList.add("slide-up-fade");
  }
  if (type === 'points') {
    const remVal = parseFloat(document.getElementById("pt-rem").innerText.replace(',', '.'));
    const isZero = isNaN(remVal) || remVal <= 0;
    const noticeBox = document.getElementById("fp-balance-notice");

    if (window.myCurrentKpi < 80) {
      noticeBox.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:4px;"><span class="material-symbols-rounded" style="font-size:18px;">warning</span> <b>Ваш КФ. ЭФФ. ниже 80% (${window.myCurrentKpi}%)</b></div>Использование баллов временно недоступно.`;
      noticeBox.style = "background: rgba(231, 76, 60, 0.1); color: #c0392b; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; margin-bottom: 12px; border: 1px dashed #e74c3c; box-shadow: 0 2px 8px rgba(0,0,0,0.03);";
      document.getElementById("fp-action").classList.add("hidden");
      document.getElementById("fp-time").classList.add("hidden");
      document.getElementById("fp-date").classList.add("hidden");
      document.getElementById("fp-date-label").classList.add("hidden");
      document.getElementById("fp-submit-btn").disabled = true;
      document.getElementById("fp-submit-btn").style.background = "#95a5a6";
    } else if (isZero) {
      noticeBox.innerHTML = "<b>У вас нет оставшихся баллов</b>";
      noticeBox.style = "background: rgba(231, 76, 60, 0.1); color: #c0392b; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; margin-bottom: 12px; border: 1px dashed #e74c3c; box-shadow: 0 2px 8px rgba(0,0,0,0.03);";
      document.getElementById("fp-action").classList.add("hidden");
      document.getElementById("fp-time").classList.add("hidden");
      document.getElementById("fp-date").classList.add("hidden");
      document.getElementById("fp-date-label").classList.add("hidden");
      document.getElementById("fp-submit-btn").disabled = true;
      document.getElementById("fp-submit-btn").style.background = "#95a5a6";
    } else {
      noticeBox.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; gap:6px;"><span class="material-symbols-rounded" style="font-size:18px; color:#e74c3c;">local_fire_department</span> <span>Вы можете использовать: <b style="font-size:16px;">${document.getElementById("pt-rem").innerText}</b> баллов</span></div>`;
      noticeBox.style = "background: rgba(41, 128, 185, 0.1); color: #2980b9; padding: 12px; border-radius: 12px; font-size: 13px; text-align: center; margin-bottom: 12px; border: 1px dashed var(--btn-color); box-shadow: 0 2px 8px rgba(0,0,0,0.03);";
      document.getElementById("fp-action").classList.remove("hidden");
      document.getElementById("fp-time").classList.remove("hidden");
      document.getElementById("fp-date").classList.remove("hidden");
      document.getElementById("fp-date-label").classList.remove("hidden");
      document.getElementById("fp-submit-btn").disabled = false;
      document.getElementById("fp-submit-btn").style.background = "var(--btn-color)";
    }
    document.getElementById("form-points").classList.remove("hidden");
    document.getElementById("form-points").classList.add("slide-up-fade");
  }
  if (type === 'swap') {
    const select = document.getElementById("fs-target");
    select.innerHTML = '<option value="" disabled selected>Выберите сменщика</option>' + globalSellers.map(s => `<option value="${s.iin}">${s.name}</option>`).join("");
    document.getElementById("fs-extra").classList.add("hidden");
    document.getElementById("form-swap").classList.remove("hidden");
    document.getElementById("form-swap").classList.add("slide-up-fade");
  }
  const scroller = document.getElementById("scrollable-body");
  if (scroller) scroller.scrollTop = 0;
}

export function closeForm() {
  const roleStr = String(appState.role).toLowerCase();
  const isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
  const isZavSklad = roleStr.includes("заведующий складом");
  const dash = document.getElementById("info-dashboard");
  if (!isUserPromoter && !isDir && !isZavSklad) {
    dash.classList.remove("hidden");
    dash.classList.remove("fade-in", "slide-up-fade", "slide-down-fade");
    dash.classList.add("slide-down-fade");
  }
  ["form-sc", "form-tradein", "form-points", "form-swap"].forEach(id => {
    const el = document.getElementById(id);
    el.classList.add("hidden");
    el.classList.remove("slide-up-fade");
  });
  const menu = document.getElementById("menu-list");
  menu.classList.remove("hidden");
  menu.style.animation = 'none';
  menu.offsetHeight;
  menu.style.animation = null;
  menu.classList.add("fade-in");
  const scroller = document.getElementById("scrollable-body");
  if (scroller) scroller.scrollTop = 0;
}

export function checkSwapFields() {
  const target = document.getElementById("fs-target").value;
  if (target) document.getElementById("fs-extra").classList.remove("hidden");
}

/* ========== Переключение вкладок ========== */
export function switchTab(tab, direction = null) {
  const scroller = document.getElementById("scrollable-body");
  if (scroller && lastActiveTab) savedScrollPos[lastActiveTab] = scroller.scrollTop;

  if (tab !== 'details') lastActiveTab = tab;
  if (appState.token) loadDashboard(true);

  document.querySelectorAll('#main-tabs .icon-btn').forEach(btn => btn.classList.remove('active-tab'));
  if (tab === 'time') document.getElementById('nav-time-icon').classList.add('active-tab');
  if (tab === 'create') document.getElementById('nav-create-icon').classList.add('active-tab');
  if (tab === 'inbox') document.getElementById('inbox-icon').classList.add('active-tab');
  if (tab === 'adm-outs') document.getElementById('nav-adm-outs').classList.add('active-tab');
  if (tab === 'adm-main') document.getElementById('nav-adm-main').classList.add('active-tab');
  if (tab === 'adm-inbox') document.getElementById('nav-adm-inbox').classList.add('active-tab');

  document.querySelectorAll('#scrollable-body > div').forEach(el => el.classList.add("hidden"));
  const sections = document.querySelectorAll('#scrollable-body > div');
  const animClass = direction === 'right' ? 'slide-in-right' : (direction === 'left' ? 'slide-in-left' : 'slide-up-fade');
  sections.forEach(s => {
    s.classList.remove('fade-in', 'slide-up-fade', 'slide-in-right', 'slide-in-left');
    s.style.animation = 'none';
    s.offsetHeight;
    s.style.animation = null;
  });

  const roleStr = String(appState.role).toLowerCase();
  const isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
  const isZavSklad = roleStr.includes("заведующий складом");
  const isSeller = !isUserPromoter && !isDir && !isZavSklad;
  const isCreateTabActive = (tab === 'create');
  const isAnyFormActive = isCreateTabActive && document.getElementById("menu-list").classList.contains("hidden");
  const dash = document.getElementById("info-dashboard");

  if (isSeller && tab !== 'details' && !tab.startsWith('adm') && !isAnyFormActive) {
    if (dash.classList.contains("hidden")) {
      dash.classList.remove("hidden");
      dash.classList.remove("fade-in", "slide-up-fade");
      dash.classList.add("slide-down-fade");
    }
  } else {
    dash.classList.add("hidden");
  }

  const targetEl = document.getElementById("content-" + tab);
  if (targetEl) {
    targetEl.classList.remove("hidden");
    targetEl.classList.add(animClass);
  }

  if (tab === 'adm-outs') renderAdminOuts();
  if (tab === 'adm-main') {
    if (isZavSklad && currentAdminMainView === 'plan') currentAdminMainView = 'emps';
    if (typeof currentAdminMainView === 'undefined') currentAdminMainView = isZavSklad ? 'emps' : 'plan';
    toggleAdminMain(currentAdminMainView);
  }
  if (tab === 'adm-inbox') renderAdminHistory(currentHistFilter);

  if (scroller) {
    setTimeout(() => {
      scroller.scrollTop = savedScrollPos[tab] || 0;
    }, 10);
  }
}

/* ========== Главный рендер дашборда ========== */
export function renderDashboardData(data, isSilent = false) {
  if (!data) return;
  isUserPromoter = data.isPromoter || false;
  appState.role = data.role || "Продавец";
  appState.dept = (data.info && data.info.dept) ? data.info.dept : "Цифра";
  saveMemory("userRole", appState.role);
  saveMemory("userDept", appState.dept);

  const roleStr = String(appState.role).toLowerCase();
  const isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
  const isZavSklad = roleStr.includes("заведующий складом");
  const isSeller = !isUserPromoter && !isDir && !isZavSklad;

  const elContentCreate = document.getElementById("content-create");
  const isCreateTabActive = elContentCreate && !elContentCreate.classList.contains("hidden");
  const elMenuList = document.getElementById("menu-list");
  const isAnyFormActive = isCreateTabActive && elMenuList && elMenuList.classList.contains("hidden");
  const dash = document.getElementById("info-dashboard");

  if (isZavSklad) {
    document.getElementById("nav-time-icon")?.classList.add("hidden");
    document.getElementById("nav-create-icon")?.classList.add("hidden");
    document.getElementById("inbox-icon")?.classList.remove("hidden");
    document.getElementById("nav-adm-outs")?.classList.remove("hidden");
    document.getElementById("nav-adm-main")?.classList.remove("hidden");
    document.getElementById("nav-adm-inbox")?.classList.add("hidden");
    const btnPlan = document.getElementById("btn-adm-plan");
    if (btnPlan) btnPlan.style.display = "none";
    const inboxTitle = document.querySelector("#content-inbox h3");
    if (inboxTitle) inboxTitle.innerText = "Входящие";
    if (currentAdminMainView === 'plan' || !currentAdminMainView) currentAdminMainView = 'emps';
    const match = roleStr.match(/заведующий складом\s+(цифра|мбт|кбт)/i);
    if (match && !window.zavScDeptSet) {
      const extracted = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      appState.dept = extracted;
      currentAdminScDept = extracted;
      currentEmpDept = extracted;
      window.zavScDeptSet = true;
    }
    const filteredUserInbox = data.userInbox ? data.userInbox.filter(r => r && r.id && !processedReqIds.has(String(r.id))) : [];
    const uBadge = document.getElementById("user-badge");
    if (filteredUserInbox.length > 0) {
      if (uBadge) { uBadge.innerText = filteredUserInbox.length; uBadge.classList.remove("hidden"); }
      if (filteredUserInbox.length > appState.lastInboxCount) showPushNotification("Уведомление!", "У вас новое уведомление");
      appState.lastInboxCount = filteredUserInbox.length;
    } else {
      if (uBadge) uBadge.classList.add("hidden");
      appState.lastInboxCount = 0;
    }
    if (document.querySelectorAll("#scrollable-body > div:not(.hidden)").length === 0) {
      switchTab('adm-main');
      toggleAdminMain('emps');
    }
  } else if (isDir) {
    document.getElementById("nav-time-icon")?.classList.add("hidden");
    document.getElementById("nav-create-icon")?.classList.add("hidden");
    document.getElementById("inbox-icon")?.classList.add("hidden");
    document.getElementById("nav-adm-outs")?.classList.remove("hidden");
    document.getElementById("nav-adm-main")?.classList.remove("hidden");
    document.getElementById("nav-adm-inbox")?.classList.remove("hidden");
    const btnPlan = document.getElementById("btn-adm-plan");
    if (btnPlan) btnPlan.style.display = "";
    const filteredAdminInbox = data.adminInbox ? data.adminInbox.filter(r => r && r.id && !processedReqIds.has(String(r.id))) : [];
    const aBadge = document.getElementById("admin-badge");
    if (filteredAdminInbox.length > 0) {
      if (aBadge) { aBadge.innerText = filteredAdminInbox.length; aBadge.classList.remove("hidden"); }
      if (filteredAdminInbox.length > appState.lastInboxCount) showPushNotification("Новая заявка!", "Появилась заявка в админке");
      appState.lastInboxCount = filteredAdminInbox.length;
    } else {
      if (aBadge) aBadge.classList.add("hidden");
      appState.lastInboxCount = 0;
    }
    const adminPlanList = document.getElementById("admin-plan-list");
    if (adminPlanList) {
      const planFiltersExist = document.getElementById("plan-filter-start");
      if (!planFiltersExist) {
        const d = new Date();
        const defStart = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1));
        const defEnd = formatDateLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
        adminPlanList.innerHTML = `<style>.hide-scrollbar::-webkit-scrollbar { display: none; }</style><div class="inner-block card" style="padding:12px; margin-bottom:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div class="hide-scrollbar no-swipe" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:10px;" ontouchstart="event.stopPropagation();" ontouchmove="event.stopPropagation();"><button class="admin-flt" style="margin:0; padding:6px 12px; min-width:max-content; border-radius:8px;" onclick="setPlanDates('today')">Сегодня</button><button class="admin-flt" style="margin:0; padding:6px 12px; min-width:max-content; border-radius:8px;" onclick="setPlanDates('yesterday')">Вчера</button><div style="position:relative; display:inline-block; min-width:max-content; overflow:hidden;"><input type="month" id="plan-month-picker" onclick="this.value=''" onchange="setPlanDates('month', this.value)" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; z-index:2;"><button class="admin-flt" style="margin:0; padding:6px 12px; border-radius:8px; pointer-events:none; position:relative; z-index:1;">Месяц</button></div><button class="admin-flt" style="margin:0; padding:6px 12px; min-width:max-content; border-radius:8px;" onclick="setPlanDates('all')">За весь период</button></div><div class="no-swipe" style="display:flex; gap:6px; align-items:center;" ontouchstart="event.stopPropagation();" ontouchmove="event.stopPropagation();"><input type="date" id="plan-filter-start" value="${defStart}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><span style="color:gray; font-weight:bold;">-</span><input type="date" id="plan-filter-end" value="${defEnd}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><div style="position:relative; width:44px; height:36px; flex-shrink:0;"><input type="date" id="plan-single-picker2" onchange="setPlanDates('single', this.value)" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_today</span></button></div><button class="btn-green" style="margin:0; border-radius:8px; width:44px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:0;" onclick="loadPlanHistory(false)"><span class="material-symbols-rounded" style="font-size:18px; color:white;">search</span></button></div></div><div id="plan-render-area"></div>`;
        setTimeout(() => loadPlanHistory(true), 100);
      } else {
        if (!isSensitiveState()) loadPlanHistory(true);
      }
    }
    if (document.querySelectorAll("#scrollable-body > div:not(.hidden)").length === 0) {
      switchTab('adm-main');
      toggleAdminMain('plan');
    }
  } else {
    if (isUserPromoter) {
      document.getElementById("nav-create-icon")?.classList.add("hidden");
      document.getElementById("inbox-icon")?.classList.add("hidden");
      const db = document.getElementById("desc-break"); if (db) db.innerText = "15 мин";
      const dl = document.getElementById("desc-lunch"); if (dl) dl.innerText = "1 час";
      const ds = document.getElementById("desc-snack"); if (ds) ds.innerText = "30 мин";
      dash.classList.add("hidden");
    } else {
      document.getElementById("nav-time-icon")?.classList.remove("hidden");
      document.getElementById("nav-create-icon")?.classList.remove("hidden");
      document.getElementById("inbox-icon")?.classList.remove("hidden");
      const db = document.getElementById("desc-break"); if (db) db.innerText = "10 мин";
      const dl = document.getElementById("desc-lunch"); if (dl) dl.innerText = "40 мин";
      const ds = document.getElementById("desc-snack"); if (ds) ds.innerText = "30 мин";
      if (isSeller && document.querySelectorAll("#content-adm-main:not(.hidden)").length === 0 && document.querySelectorAll("#content-details:not(.hidden)").length === 0 && !isAnyFormActive) {
        if (dash.classList.contains("hidden")) {
          dash.classList.remove("hidden");
          dash.classList.remove("fade-in", "slide-up-fade");
          dash.classList.add("slide-down-fade");
        }
      } else {
        dash.classList.add("hidden");
      }
    }
    document.getElementById("nav-adm-outs")?.classList.add("hidden");
    document.getElementById("nav-adm-main")?.classList.add("hidden");
    document.getElementById("nav-adm-inbox")?.classList.add("hidden");
    const filteredUserInbox = data.userInbox ? data.userInbox.filter(r => r && r.id && !processedReqIds.has(String(r.id))) : [];
    const uBadge = document.getElementById("user-badge");
    if (filteredUserInbox.length > 0) {
      if (uBadge) { uBadge.innerText = filteredUserInbox.length; uBadge.classList.remove("hidden"); }
      if (filteredUserInbox.length > appState.lastInboxCount) showPushNotification("Уведомление!", "Непрочитанные сообщения");
      appState.lastInboxCount = filteredUserInbox.length;
    } else {
      if (uBadge) uBadge.classList.add("hidden");
      appState.lastInboxCount = 0;
    }
    if (document.querySelectorAll("#scrollable-body > div:not(.hidden)").length === 0) switchTab('time');
  }

  // Обновление инфо
  const pAcc = document.getElementById("pt-acc"); if (pAcc) pAcc.innerText = data.info?.ptsAccrued ?? '-';
  const pUse = document.getElementById("pt-use"); if (pUse) pUse.innerText = data.info?.ptsUsed ?? '-';
  const remVal = parseFloat(String(data.info?.ptsLeft).replace(',', '.')) || 0;
  const ptRemEl = document.getElementById("pt-rem");
  if (ptRemEl) { ptRemEl.innerText = data.info?.ptsLeft ?? '-'; ptRemEl.style.color = remVal >= 0 ? "#27ae60" : "#e67e22"; }
  const pFin = document.getElementById("pt-fin"); if (pFin) pFin.innerText = data.info?.ptsFine ?? '-';

  const kpiValue = data.info?.kpiValue ?? data.info?.baseKpi ?? 0;
  const kValEl = document.getElementById("kpi-val");
  if (kValEl) kValEl.innerText = kpiValue + '%';
  setKpiColor(kpiValue, document.getElementById("kpi-circle"), document.getElementById("kpi-val"));
  myKpiDetails = data.info?.kpiDetails || [];

  const infoTabel = document.getElementById("info-tabel");
  if (infoTabel) {
    infoTabel.innerHTML = `<div class="tabel-item" style="color:#f39c12"><span class="tabel-lbl">БС.</span>${data.info?.tabel?.bs ?? 0}</div><div class="tabel-item" style="color:#e67e22"><span class="tabel-lbl">БЛ.</span>${data.info?.tabel?.bl ?? 0}</div><div class="tabel-item" style="color:#e74c3c"><span class="tabel-lbl">ПР.</span>${data.info?.tabel?.pr ?? 0}</div><div class="tabel-item" style="color:#f1c40f"><span class="tabel-lbl">ОТ.</span>${data.info?.tabel?.ot ?? 0}</div><div class="tabel-item" style="color:#27ae60"><span class="tabel-lbl">РД.</span>${data.info?.tabel?.rd ?? 0}</div>`;
  }

  myReports = data.info?.reports || [];
  myPointsHistory = data.info?.myPtsHistory || [];
  myMoneyFinesHistory = myPointsHistory.filter(p => p && p.type === "Штраф");
  myScHistory = myPointsHistory.filter(p => p && p.type === "Начисление" && p.source !== "Горячий чек");
  window.myCurrentKpi = kpiValue;
  myDisplayPointsHistory = myPointsHistory.filter(p => {
    const ptsVal = parseFloat(String(p.val).replace(',', '.')) || 0;
    if (p.type === "KPI" && p.source !== "Горячий чек") return false;
    if (p.type === "KPI" && p.source === "Горячий чек" && ptsVal === 0) return false;
    return ptsVal !== 0;
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthSuffix = ("0" + currentMonth).slice(-2) + "." + currentYear;
  const monthSc = myScHistory.filter(p => p && typeof p.date === 'string' && p.date.includes(monthSuffix));
  const countSc = monthSc.filter(p => p && p.source && !String(p.source).toLowerCase().includes("trade-in")).length;
  const countTrade = monthSc.filter(p => p && p.source && String(p.source).toLowerCase().includes("trade-in")).length;
  const scEl = document.getElementById("info-sc-val");
  if (scEl) {
    scEl.innerText = `${countSc} | ${countTrade}`;
    if (countSc + countTrade > 0) scEl.style.color = "#27ae60";
    else scEl.style.color = "#e74c3c";
  }

  // Горячие чеки и промо
  const hcCard = document.getElementById("hot-check-card");
  if (hcCard) {
    hcCard.innerHTML = "";
    let hasContent = false;
    if (data.hotChecks && data.hotChecks.length > 0) {
      hasContent = true;
      let hcHtml = `<h3 style="margin-bottom: 10px; font-size: 14px; color: #e84393;">Горячий чек</h3>`;
      const groups = {};
      data.hotChecks.forEach(hc => { if (!groups[hc.sub]) groups[hc.sub] = []; groups[hc.sub].push(hc); });
      for (const sub in groups) {
        if (sub) hcHtml += `<div style="margin-bottom: 8px; font-size:12px; font-weight:bold; color:gray; border-top: 1px solid var(--border-color); padding-top: 10px; margin-top: 10px;">${sub}</div>`;
        const colsCount = Math.min(groups[sub].length, 4);
        hcHtml += `<div style="display: grid; grid-template-columns: repeat(${colsCount}, 1fr); gap: 6px; margin-bottom: 6px;">`;
        groups[sub].forEach(btn => {
          const combinedName = sub ? `${sub} ${btn.name}` : btn.name;
          let badgeHtml = "";
          const ptsVal = parseFloat(String(btn.pts || "0").replace(',', '.'));
          const kpiBonus = parseFloat(String(btn.val || "0").replace(',', '.'));
          if (ptsVal > 0 || kpiBonus > 0) {
            badgeHtml = `<div style="position:absolute; top:-8px; right:-6px; display:flex; gap:2px; z-index: 5;">`;
            if (kpiBonus > 0) badgeHtml += `<span style="background:#3498db; color:white; font-size:9px; font-weight:bold; padding:2px 4px; border-radius:8px; border: 1px solid var(--card-bg); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">+${kpiBonus}%</span>`;
            if (ptsVal > 0) badgeHtml += `<span style="background:#e74c3c; color:white; font-size:9px; font-weight:bold; padding:2px 4px; border-radius:8px; border: 1px solid var(--card-bg); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">+${ptsVal}</span>`;
            badgeHtml += `</div>`;
          }
          hcHtml += `<div style="position:relative; display:flex; flex:1;"><button class="btn-green" style="padding:10px 4px; font-size:12px; margin:0; width:100%;" onclick="submitHotCheck('${combinedName}', '${btn.val}', '${btn.pts || 0}')">${btn.name}</button>${badgeHtml}</div>`;
        });
        hcHtml += `</div>`;
      }
      hcCard.innerHTML += hcHtml;
    }

    const promoLists = data.promoLists || [];
    if (promoLists.length > 0) {
      let promoHtml = "";
      promoLists.forEach((list, lIdx) => {
        const headerColor = list.listColor || "var(--text-color)";
        promoHtml += `<div class="inner-block card" style="margin-top: 12px; margin-bottom: 12px; padding: 14px 12px; border: 1px solid var(--border-color); background: var(--card-bg); position: relative;">`;
        promoHtml += `<div style="font-size:14px; font-weight:bold; color:${headerColor}; margin-bottom: 14px;">${list.title}</div>`;
        promoHtml += `<div style="display: flex; flex-direction: column; gap: 10px;">`;

        list.items.forEach((item, iIdx) => {
          const ptsVal = parseFloat(String(item.pts || "0").replace(',', '.'));
          const kpiBonus = parseFloat(String(item.val || "0").replace(',', '.'));
          const rawName = item.name;
          const cleanName = item.cleanName || rawName;
          let link = "";
          const bracketIdx = rawName.indexOf('[');
          if (bracketIdx !== -1) {
            const metaStr = rawName.substring(bracketIdx);
            const urlMatch = metaStr.match(/https?:\/\/[^\s\]]+/);
            if (urlMatch) link = urlMatch[0];
          }

          if (item.currentCount !== null && item.currentCount <= 0) return;

          let badgeHtml = "";
          if (item.currentCount !== null || kpiBonus > 0 || ptsVal > 0) {
            badgeHtml = `<div style="position:absolute; top:-8px; right:4px; display:flex; gap:3px; z-index: 5;">`;
            if (item.currentCount !== null) badgeHtml += `<span id="count-${lIdx}-${iIdx}" style="background:#f39c12; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:8px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">Ост: <span class="val">${item.currentCount}</span></span>`;
            if (kpiBonus > 0) badgeHtml += `<span style="background:#3498db; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:8px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">+${kpiBonus}%</span>`;
            if (ptsVal > 0) badgeHtml += `<span style="background:#e74c3c; color:white; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:8px; box-shadow: 0 1px 3px rgba(0,0,0,0.15);">+${ptsVal} б.</span>`;
            badgeHtml += `</div>`;
          }

          const linkBtn = link ? `<div onclick="event.stopPropagation(); event.preventDefault(); if(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openLink) { window.Telegram.WebApp.openLink('${link}'); } else { window.open('${link}', '_blank'); }" style="display:flex; align-items:center; justify-content:center; background:#f39c12; color:white; width:22px; height:22px; border-radius:5px; margin-right:8px; flex-shrink:0; box-sizing:border-box; border:1px solid rgba(0,0,0,0.05); cursor:pointer;"><span class="material-symbols-rounded" style="font-size:16px;">open_in_new</span></div>` : '';

          promoHtml += `
          <div id="promo-item-${lIdx}-${iIdx}" style="position:relative; display:flex; align-items:center; width:100%; margin-bottom:4px;">
              ${linkBtn}
              <div style="flex:1; background:var(--inner-bg, rgba(150,150,150,0.06)); border-radius:10px; padding:8px 12px; display:flex; align-items:center; cursor:pointer; min-height:34px; box-sizing:border-box;" onclick="submitPromoCheck('${cleanName}', '${item.val}', '${item.pts || 0}', '${lIdx}', '${iIdx}', '${list.prefix}')">
                  <span style="font-size:13px; font-weight:normal; color:#555; line-height:1.2; text-align:left;">${cleanName}</span>
              </div>
              ${badgeHtml}
          </div>`;
        });
        promoHtml += `</div></div>`;
      });

      let promoContainer = document.getElementById("promo-lists-container");
      if (!promoContainer) {
        promoContainer = document.createElement("div");
        promoContainer.id = "promo-lists-container";
        hcCard.parentNode.insertBefore(promoContainer, hcCard.nextSibling);
      }
      promoContainer.innerHTML = promoHtml;
    } else {
      const promoContainer = document.getElementById("promo-lists-container");
      if (promoContainer) promoContainer.innerHTML = "";
    }

    if (hasContent) hcCard.classList.remove("hidden");
    else hcCard.classList.add("hidden");
  }

  // Инбоксы
  const savedReplies = {};
  document.querySelectorAll("textarea[id^='remark-reply-']").forEach(ta => { savedReplies[ta.id] = ta.value; });

  const uInbox = data.userInbox ? data.userInbox.filter(r => r && r.id && !processedReqIds.has(String(r.id))) : [];
  const inboxList = document.getElementById("inbox-list");
  if (inboxList) {
    inboxList.innerHTML = uInbox.map(r => {
      let rawDesc = String(r.details || "");
      let approverName = "";
      let metaObj = {};
      try { metaObj = JSON.parse(r.meta || r.metadata || "{}"); } catch (e) {}
      const match = rawDesc.match(/\n\[(.*?)\]$/);
      if (match) { approverName = formatShortName(match[1]); rawDesc = rawDesc.replace(/\n\[(.*?)\]$/, "").trim(); }
      if (metaObj.approver) approverName = formatShortName(metaObj.approver);
      const selDateHtml = metaObj.date ? `<br><span style="color:gray; font-size:11px; display:inline-flex; align-items:center; gap:4px; margin-top:2px;"><span class="material-symbols-rounded" style="font-size:12px;">calendar_today</span> Дата в заявке: <b>${metaObj.date}</b></span>` : "";
      const desc = formatRemarkText(rawDesc);
      const authorStr = r.type === "Замечание" ? formatRemarkAuthor(r.authorName, r.authorRole) : `<b>От:</b> ${r.authorName}`;
      const d = r.date ? String(r.date) : "";

      if (r.status === "rejected_notify_zav") return `<div class="req-item" id="req-${r.id}" style="border-left-color: #e74c3c;"><div class="req-title" style="display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">cancel</span> Штраф отклонен</div><div class="req-desc">Ваш запрос на штраф сотрудника <b>${r.targetName}</b> отклонен: <b>${approverName || 'Руководителем'}</b>.<br>Причина штрафа: ${desc}${selDateHtml}</div><div class="grid-btns" style="grid-template-columns: 1fr;"><button class="btn-gray" onclick="processReq('${r.id}', 'dismiss_notification')">Ознакомлен</button></div></div>`;
      if (r.status === "approved_notify_zav") return `<div class="req-item" id="req-${r.id}" style="border-left-color: #27ae60;"><div class="req-title" style="display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">check_circle</span> Штраф одобрен</div><div class="req-desc">Ваш запрос на штраф сотрудника <b>${r.targetName}</b> одобрен: <b>${approverName || 'Руководителем'}</b>.<br>Причина штрафа: ${desc}${selDateHtml}</div><div class="grid-btns" style="grid-template-columns: 1fr;"><button class="btn-gray" onclick="processReq('${r.id}', 'dismiss_notification')">Ознакомлен</button></div></div>`;
      if (r.type === "Замечание" && (r.status === "approved" || r.status === "pending_user_reply" || r.status === "pending_admin_view_remark")) {
        if (r.targetIin === appState.iin) {
          return `<div class="req-item" id="req-${r.id}" style="border-left-color: #f39c12;">
            <div class="req-title" style="color:#f39c12; display:flex; align-items:center; gap:4px;">
                <span class="material-symbols-rounded" style="font-size:16px;">warning</span> Замечание 
                <span style="float:right; color:gray; font-size:10px; font-weight:normal;">${d}</span>
            </div>
            <div class="req-desc" style="color:var(--text-color); font-size:13px;">
                <b style="color:#f39c12;">${authorStr}</b><br>${desc}${selDateHtml}
            </div>
            <textarea id="remark-reply-${r.id}" placeholder="Ваша обратная связь..." style="box-sizing: border-box; width:100%; height:60px; margin-bottom:8px; border-radius:8px; padding:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color); font-family:inherit; resize:none;"></textarea>
            <button class="btn-orange" onclick="processReq('${r.id}', 'reply_remark', document.getElementById('remark-reply-${r.id}').value)">Ответить</button>
          </div>`;
        } else {
          return `<div class="req-item" id="req-${r.id}" style="border-left-color: #f39c12;">
            <div class="req-title" style="color:#f39c12; display:flex; align-items:center; gap:4px;">
                <span class="material-symbols-rounded" style="font-size:16px;">warning</span> Замечание 
                <span style="float:right; color:gray; font-size:10px; font-weight:normal;">${d}</span>
            </div>
            <div class="req-desc" style="color:var(--text-color); font-size:13px;">
                <b style="color:#f39c12;">${authorStr}</b><br><b>${r.targetName}</b> — ${desc}${selDateHtml}
            </div>
            <div class="grid-btns" style="grid-template-columns: 1fr;">
                <button class="btn-gray" onclick="processReq('${r.id}', 'dismiss_notification')">Просмотрено</button>
            </div>
          </div>`;
        }
      }
      if (r.status === "rejected_notify_user") return `<div class="req-item" id="req-${r.id}" style="border-left-color: #e74c3c;"><div class="req-title" style="display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">cancel</span> Запрос отклонен</div><div class="req-desc">Ваш запрос на <b>${r.type || 'запрос'}</b> был отклонен: <b>${approverName || 'Руководителем'}</b>.<br><b>Детали:</b> ${desc}${selDateHtml}</div><div class="grid-btns" style="grid-template-columns: 1fr;"><button class="btn-gray" onclick="processReq('${r.id}', 'dismiss_rejection')">Ознакомлен</button></div></div>`;
      if (r.status === "notify_user_fine") {
        const authorDetails = formatRemarkAuthor(r.authorName, r.authorRole);
        return `<div class="req-item" id="req-${r.id}" style="border-left-color: #e74c3c;"><div class="req-title" style="color:#e74c3c; display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">gavel</span> Вам выписан штраф <span style="float:right; color:gray; font-size:10px; font-weight:normal;">${d}</span></div><div class="req-desc"><b style="color:#e74c3c;">${authorDetails}</b><br><b>Причина:</b> ${desc}<br>Баллы: <b style="color:#e74c3c;">${metaObj.amount || 0}</b> | Сумма: <b style="color:#e74c3c;">${metaObj.moneyAmount || 0} ₸</b>${selDateHtml}</div><div class="grid-btns" style="grid-template-columns: 1fr;"><button class="btn-gray" onclick="processReq('${r.id}', 'dismiss_notification')">Ознакомлен</button></div></div>`;
      }
      return `<div class="req-item" id="req-${r.id}"><div class="req-title">Обмен сменами</div><div class="req-desc">${r.authorName || 'Коллега'} просит поменяться.<br><b>${desc}</b>${selDateHtml}</div><div class="grid-btns"><button class="btn-red" onclick="processReq('${r.id}', 'reject_user')">Отклонить</button><button class="btn-green" onclick="processReq('${r.id}', 'approve_user')">Одобрить</button></div></div>`;
    }).join("") || "<p style='color:gray;text-align:center;font-size:13px;'>Уведомлений нет</p>";
  }

  Object.keys(savedReplies).forEach(id => {
    const ta = document.getElementById(id);
    if (ta) ta.value = savedReplies[id];
  });

  const uHistory = (data.userHistory || []).filter(r => !(r.type === "Запрос на штраф" && r.targetIin === appState.iin));
  const uHistList = document.getElementById("user-history-list");
  if (uHistList) {
    if (!document.getElementById("user-hist-panel")) {
      const panelDiv = document.createElement("div");
      panelDiv.id = "user-hist-panel";
      panelDiv.innerHTML = generateDatePanelHTML('user-hist', 'window.triggerUserHistReload');
      uHistList.parentNode.insertBefore(panelDiv, uHistList);
      window.triggerUserHistReload = function(type, val) {
        if (type) setPanelDates(type, val, 'user-hist', () => {
          const dStr = localStorage.getItem("dashData_" + appState.iin);
          if (dStr) renderDashboardData(JSON.parse(dStr), true);
        });
      };
    }
    const usD = document.getElementById("user-hist-start").value;
    const ueD = document.getElementById("user-hist-end").value;
    const usTime = new Date(usD).getTime();
    const ueTime = new Date(ueD).getTime() + 86400000;
    const filteredUHistory = uHistory.filter(r => {
      const rd = parseCustomDate(r.date);
      return rd >= usTime && rd <= ueTime;
    });
    uHistList.innerHTML = groupAndRenderByMonth(filteredUHistory, r => {
      let stText = "Просмотрен";
      let stColor = "#95a5a6";
      if (r.status.includes("approved")) { stText = "Одобрен"; stColor = "#27ae60"; }
      else if (r.status.includes("rejected")) { stText = "Отклонен"; stColor = "#e74c3c"; }
      if (r.type === "Исправление смены") {
        if (r.status.includes("approved")) stText = "Исправлен";
        else if (r.status.includes("rejected")) stText = "Отклонен";
      }
      let rawDesc = String(r.details || "");
      let approverName = "";
      let metaObj = {};
      try { metaObj = JSON.parse(r.meta || r.metadata || "{}"); } catch (e) {}
      const match = rawDesc.match(/\n\[(.*?)\]$/);
      if (match) { approverName = formatShortName(match[1]); rawDesc = rawDesc.replace(/\n\[(.*?)\]$/, "").trim(); }
      if (metaObj.approver) approverName = formatShortName(metaObj.approver);
      if (!approverName && r.approver) approverName = formatShortName(r.approver);
      const selDateHtml = metaObj.date ? `<br><span style="color:gray; font-size:11px;">📅 Дата в заявке: <b>${metaObj.date}</b></span>` : "";
      let desc = r.type === "Обмен сменами" ? `Сменщик: ${r.targetName || ''}<br>${rawDesc}` : rawDesc;
      desc = formatRemarkText(desc, r.type === 'Замечание' ? r.targetName : null);
      let finalDescHtml = r.type === "Замечание" ? `<b>${r.targetName}</b> — ${desc}` : `<b>Детали:</b> ${desc}${selDateHtml}`;
      const deptStr = r.authorDept ? ` — ${r.authorDept}` : '';
      let authorStr = r.type === "Замечание" || r.type === "Запрос на штраф" ? `<b style="color:#f39c12;">${formatRemarkAuthor(r.authorName, r.authorRole)}${deptStr}</b>` : `<b>От:</b> ${r.adminDisplayName || r.authorName + deptStr}`;
      if (r.type === "Уведомление о штрафе") {
        stColor = "#e74c3c"; stText = "Ознакомлен";
        desc = `<b>Причина:</b> ${metaObj.reason || desc}<br>Баллы: <b style="color:#e74c3c;">${metaObj.amount}</b> | Сумма: <b style="color:#e74c3c;">${metaObj.moneyAmount} ₸</b>`;
        authorStr = `<b style="color:#e74c3c;">${formatRemarkAuthor(r.authorName, r.authorRole)}</b>`;
        finalDescHtml = desc + selDateHtml;
        r.type = "Штраф";
      } else if (r.type === "Запрос на штраф") {
        desc = `Нарушитель: <b>${r.targetName}</b><br>Причина: ${metaObj.reason || desc}<br>Баллы: <b style="color:#e74c3c;">${metaObj.amount}</b> | Сумма: <b style="color:#e74c3c;">${metaObj.moneyAmount} ₸</b>`;
        finalDescHtml = `<b>Детали:</b> ${desc}${selDateHtml}`;
      }
      const approverLabel = approverName ? `<span style="color:gray; font-size:10px; font-weight:normal;">${approverName}</span>` : '';
      let titleColor = getSourceColor(r.type);
      if (r.type === "Продажа СЦ/Фокус" && String(r.details).toLowerCase().includes("фокус")) titleColor = '#e74c3c';
      if (r.type === "Штраф" || r.type === "Запрос на штраф" || r.type === "Уведомление о штрафе") titleColor = '#e74c3c';
      return `<div class="req-item" style="border-left-color: ${stColor}; opacity: 0.9;"><div class="req-title" style="color:${titleColor};">${r.type || 'Запрос'} <span style="font-size:12px; font-weight:normal; color:gray; float:right;">${r.date || ''}</span></div><div class="req-desc" style="color:var(--text-color);">${authorStr}<br>${finalDescHtml}<br><div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;"><b style="color:${stColor}">Статус: ${stText}</b>${approverLabel}</div></div></div>`;
    });
  }

  const aInbox = data.adminInbox ? data.adminInbox.filter(r => r && r.id && !processedReqIds.has(String(r.id))) : [];
  const adminList = document.getElementById("admin-list");
  if (adminList) {
    adminList.innerHTML = aInbox.map(r => {
      let btns = `<div class="grid-btns"><button class="btn-red" onclick="processReq('${r.id}', 'reject_admin')">Отклонить</button><button class="btn-green" onclick="processReq('${r.id}', 'approve_admin')">Подтвердить</button></div>`;
      let rawDesc = String(r.details || "");
      let metaObj = {};
      try { metaObj = JSON.parse(r.meta || r.metadata || "{}"); } catch (e) {}
      const match = rawDesc.match(/\n\[(.*?)\]$/);
      if (match) rawDesc = rawDesc.replace(/\n\[(.*?)\]$/, "").trim();
      const selDateHtml = metaObj.date ? `<br><span style="color:gray; font-size:11px;">📅 Дата в заявке: <b>${metaObj.date}</b></span>` : "";
      let desc = r.type === "Обмен сменами" ? `Сменщик: ${r.targetName || ''}<br>${rawDesc}` : rawDesc;
      desc = formatRemarkText(desc);
      if (r.type === "Запрос на штраф") {
        desc = `Нарушитель: <b>${r.targetName}</b><br>Причина: ${metaObj.reason || desc}<br>Баллы: <b style="color:#e74c3c;">${metaObj.amount}</b> | Сумма: <b style="color:#e74c3c;">${metaObj.moneyAmount} ₸</b>`;
      }
      if (r.type === "Замечание") {
        desc = `<b>${r.targetName}</b> — ${desc}`;
        btns = `<div class="grid-btns" style="grid-template-columns: 1fr;"><button class="btn-gray" onclick="processReq('${r.id}', 'dismiss_notification')">Просмотрено</button></div>`;
      }
      let authorStr = r.type === "Замечание" ? `<b style="color:#f39c12;">${formatRemarkAuthor(r.authorName, r.authorRole)}</b>` : `<b>От:</b> ${r.adminDisplayName || r.authorName || ''}`;
      let finalDescHtml = r.type === "Замечание" ? desc + selDateHtml : `<b>Детали:</b> ${desc}${selDateHtml}`;
      let titleColor = getSourceColor(r.type);
      if (r.type === "Продажа СЦ/Фокус" && String(r.details).toLowerCase().includes("фокус")) titleColor = '#e74c3c';
      if (r.type === "Штраф" || r.type === "Запрос на штраф" || r.type === "Уведомление о штрафе") titleColor = '#e74c3c';
      return `<div class="req-item admin" id="req-${r.id}"><div class="req-title" style="color:${titleColor};">${r.type || 'Запрос'} <span style="font-size:12px; font-weight:normal; color:gray; float:right;">${r.date || ''}</span></div><div class="req-desc" style="color:var(--text-color);">${authorStr}<br>${finalDescHtml}</div>${btns}</div>`;
    }).join("") || "<p style='color:gray;text-align:center;font-size:13px;'>Новых запросов нет</p>";
  }

  adminHistoryGlobal.length = 0;
  Array.prototype.push.apply(adminHistoryGlobal, data.adminHistory || []);
  if (isDir) renderAdminHistory();
  adminScItemsGlobal = data.adminScItems || [];
  globalSellers = data.sellers || [];
  globalScItems = data.scItems || [];
  allEmployeesData.length = 0;
  Array.prototype.push.apply(allEmployeesData, data.adminEmployees || []);
  tradeInModelsGlobal = data.tradeInModels || [];

  if ((isDir || isZavSklad)) renderAdminEmps(currentEmpDept, null);
}

/* ========== Детали ========== */
export function openDetails(type) {
  const prevTab = lastActiveTab;
  switchTab('details');
  document.getElementById("btn-details-back").onclick = () => switchTab(prevTab);
  document.getElementById("details-kpi-circle-container").innerHTML = "";
  let listHtml = "";

  if (type === 'sc') {
    document.getElementById("details-title").innerText = "Детали СЦ | BRZY";
    listHtml = generateDatePanelHTML('my-sc', 'window.triggerMyScReload');
    listHtml += "<div id='my-sc-list-container' class='card' style='padding:0; overflow:hidden;'></div>";
    document.getElementById("details-list").innerHTML = listHtml;
    window.triggerMyScReload = function(t, val) {
      if (t && t !== 'search') setPanelDates(t, val, 'my-sc', () => window.triggerMyScReload('search'));
      else {
        const startParts = document.getElementById('my-sc-start').value.split('-');
        const st = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0).getTime();
        const endParts = document.getElementById('my-sc-end').value.split('-');
        const en = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59).getTime();
        const arr = myScHistory.filter(i => {
          const rd = parseCustomDate(i.date);
          return rd >= st && rd <= en;
        });
        arr.sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
        let h = "";
        if (arr.length > 0) {
          h += arr.map((i, idx) => buildStandardRow({
            title: `${idx + 1}. ${i.reason}`,
            typeText: i.source,
            typeColor: getSourceColor(i.source),
            dateText: i.date,
            hasBorder: false
          })).join("");
        } else {
          h = "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>В выбранном периоде пусто</div>";
        }
        document.getElementById('my-sc-list-container').innerHTML = h;
      }
    };
    window.triggerMyScReload('search');
    return;
  } else if (type === 'points') {
    document.getElementById("details-title").innerText = "История Баллов";
    listHtml = generateDatePanelHTML('my-pts', 'window.triggerMyPtsReload');
    listHtml += "<div id='my-pts-list-container' class='card' style='padding:0; overflow:hidden;'></div>";
    document.getElementById("details-list").innerHTML = listHtml;
    window.triggerMyPtsReload = function(t, val) {
      if (t && t !== 'search') setPanelDates(t, val, 'my-pts', () => window.triggerMyPtsReload('search'));
      else {
        const startParts = document.getElementById('my-pts-start').value.split('-');
        const st = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0).getTime();
        const endParts = document.getElementById('my-pts-end').value.split('-');
        const en = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59).getTime();
        const arr = myDisplayPointsHistory.filter(i => {
          const rd = parseCustomDate(i.date);
          return rd >= st && rd <= en;
        });
        document.getElementById('my-pts-list-container').innerHTML = groupAndRenderByMonth(arr, i => renderHistoryItem(i, true));
      }
    };
    window.triggerMyPtsReload('search');
    return;
  } else if (type === 'kpi') {
    document.getElementById("details-title").innerText = "Детали КФ. ЭФФ.";
    listHtml = "<div class='card' style='padding:0; overflow:hidden;'>";
    const currentKpi = myKpiDetails.filter(k => isCurrentMonth(k.date));
    currentKpi.forEach(k => {
      const col = k.val > 0 ? 'detail-plus' : (k.val < 0 ? 'detail-minus' : 'detail-val');
      const valStr = k.val > 0 ? `+${k.val}%` : `${k.val}%`;
      let srcColor = getSourceColor(k.source);
      let dispName = k.name;
      if (k.source === "База" || k.name === "Ошибки") dispName = k.name;
      if (k.name === "Больничный" || k.name === "Прогул") { dispName = k.name; srcColor = "#7f8c8d"; }
      listHtml += buildStandardRow({
        title: dispName,
        isBoldTitle: (dispName === "Базовый KPI" || dispName === "База" || dispName === "Ошибки" || dispName === "Больничный" || dispName === "Прогул"),
        typeText: k.source,
        typeColor: srcColor,
        dateText: k.date || "За месяц",
        valText: valStr,
        valClass: col,
        hasBorder: false
      });
    });
    listHtml += "</div>";
  } else if (type === 'report') {
    document.getElementById("details-title").innerText = "Мои отчеты";
    listHtml = "<div style='padding-top:5px;'>";
    listHtml += myReports.map(generateHorizontalGrid).join('');
    listHtml += "</div>";
  } else if (type === 'tabel') {
    document.getElementById("btn-details-back").onclick = () => switchTab(lastActiveTab);
    document.getElementById("details-title").innerText = "Нарушения (Штрафы и Замечания)";
    listHtml = "<div style='padding-top:5px;'>";
    const currentFines = myMoneyFinesHistory.filter(i => isCurrentMonth(i.date));
    currentFines.sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
    if (currentFines.length > 0) listHtml += currentFines.map(i => renderMoneyFineItem(i)).join("");
    else listHtml += "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>Штрафов в этом месяце нет</div>";
    const myRemarks = JSON.parse(localStorage.getItem("dashData_" + appState.iin))?.info?.remarks || [];
    if (myRemarks.length > 0) {
      listHtml += `<div class="grid-details-title" style="color:#f39c12; margin-top:10px;">Замечания</div>` +
        groupAndRenderByMonth(myRemarks, r => {
          const authorStr = formatRemarkAuthor(r.authorName, r.authorRole);
          return `<div class="req-item" style="border-left-color: #f39c12; margin-bottom:8px;"><div class="req-title" style="color:#f39c12; font-size:12px;">${authorStr} <span style="float:right; color:gray; font-size:10px;">${r.date}</span></div><div class="req-desc" style="color:var(--text-color); font-size:12px; white-space:pre-wrap;">${formatRemarkText(r.details)}</div></div>`;
        });
    }
    listHtml += "</div>";
  }

  document.getElementById("details-list").innerHTML = listHtml;
}

export function openEmpKpiDetails(iin, fromDetails = false) {
  const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin));
  if (!emp) return;
  const prevTab = lastActiveTab;
  switchTab('details');
  document.getElementById("btn-details-back").onclick = () => {
    if (fromDetails) openEmpDetails(iin);
    else switchTab(prevTab);
  };
  document.getElementById("details-title").innerText = "КФ. ЭФФ: " + emp.name;
  document.getElementById("details-kpi-circle-container").innerHTML = "";
  let listHtml = "<div class='card' style='padding:0; overflow:hidden;'>";
  emp.kpiDetails.forEach(k => {
    const col = k.val > 0 ? 'detail-plus' : (k.val < 0 ? 'detail-minus' : 'detail-val');
    const valStr = k.val > 0 ? `+${k.val}%` : `${k.val}%`;
    let srcColor = getSourceColor(k.source);
    let dispName = k.name;
    if (k.source === "База" || k.name === "Ошибки") dispName = k.name;
    if (k.name === "Больничный" || k.name === "Прогул") { dispName = k.name; srcColor = "#7f8c8d"; }
    listHtml += buildStandardRow({
      title: dispName,
      isBoldTitle: (dispName === "Базовый KPI" || dispName === "База" || dispName === "Ошибки" || dispName === "Больничный" || dispName === "Прогул"),
      typeText: k.source,
      typeColor: srcColor,
      dateText: k.date || "За месяц",
      valText: valStr,
      valClass: col,
      hasBorder: false
    });
  });
  listHtml += "</div>";
  document.getElementById("details-list").innerHTML = listHtml;
}

export function openEmpDetails(iin) {
  const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin));
  if (!emp) return;
  const prevTab = lastActiveTab;
  switchTab('details');
  document.getElementById("btn-details-back").onclick = () => switchTab(prevTab);
  const kpiFontSizeDet = String(emp.kpi).includes('.') ? (String(emp.kpi).length > 4 ? '6.5px' : '7.5px') : '9px';
  document.getElementById("details-title").innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; width:100%;"><span style="flex:1; text-align:center; padding-left:28px;">${emp.name}</span><div class="circle-box" style="width:28px; min-width:28px; height:28px; margin:0; cursor:pointer; box-shadow:none;" onclick="openEmpKpiDetails('${emp.iin}', true)"><div class="kpi-container" style="background: conic-gradient(${setKpiColor(emp.kpi, null, null)} ${emp.kpi > 100 ? 100 : emp.kpi}%, var(--inner-bg) 0);"><div class="kpi-inner" style="width:24px; height:24px;"><span style="font-size:${kpiFontSizeDet}; font-weight:bold; color:${setKpiColor(emp.kpi, null, null)}; letter-spacing:-0.3px;">${emp.kpi}%</span></div></div></div></div>`;
  document.getElementById("details-kpi-circle-container").innerHTML = "";
  const tabsHtml = `<div style="display:flex; gap:6px; margin-bottom:12px; padding:0 4px;"><button id="emp-tab-rep" class="admin-flt active-flt" onclick="renderEmpDetailTab('rep', '${iin}')">Отчет</button><button id="emp-tab-pts" class="admin-flt" onclick="renderEmpDetailTab('pts', '${iin}')">Баллы</button><button id="emp-tab-viol" class="admin-flt" onclick="renderEmpDetailTab('viol', '${iin}')">Нарушения</button></div><div id="emp-detail-content" class="slide-up-fade"></div>`;
  document.getElementById("details-list").innerHTML = tabsHtml;
  renderEmpDetailTab(window.currentEmpDetailTab || 'rep', iin);
}

export function renderEmpDetailTab(tab, iin) {
  window.currentEmpDetailTab = tab;
  const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin));
  if (!emp) return;
  document.getElementById('emp-tab-rep').classList.remove('active-flt');
  document.getElementById('emp-tab-pts').classList.remove('active-flt');
  document.getElementById('emp-tab-viol').classList.remove('active-flt');
  document.getElementById('emp-tab-' + tab).classList.add('active-flt');

  const content = document.getElementById('emp-detail-content');
  content.classList.remove("slide-up-fade");
  void content.offsetWidth;
  content.classList.add("slide-up-fade");
  let html = "";

  if (tab === 'rep') {
    html = emp.reports.map(generateHorizontalGrid).join('') || "<p style='text-align:center;color:gray;font-size:12px;'>Отчетов нет</p>";
  } else if (tab === 'pts') {
    html = `<div class="grid-details-container inner-block"><div style="display:flex; justify-content:space-around; text-align:center; margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:10px;"><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Нач.</div><b style="font-size:15px;">${emp.pts.acc || 0}</b></div><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Исп.</div><b style="font-size:15px;">${emp.pts.use || 0}</b></div><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Ост.</div><b style="font-size:15px; color:#27ae60;">${emp.pts.rem || 0}</b></div><div><div style="color:gray; font-size:10px; margin-bottom:4px;">Штрф.</div><b style="font-size:15px; color:#e74c3c;">${emp.pts.fin || 0}</b></div></div><div class="grid-details-title">История баллов</div></div>`;
    html += generateDatePanelHTML('emp-pts', `window.triggerEmpPtsReload_${iin}`);
    html += `<div id="emp-pts-render-area" class="card" style="padding:0; overflow:hidden;"></div>`;
    window[`triggerEmpPtsReload_${iin}`] = function(t, val) {
      if (t && t !== 'search') setPanelDates(t, val, 'emp-pts', () => window[`triggerEmpPtsReload_${iin}`]('search'));
      else {
        const startParts = document.getElementById('emp-pts-start').value.split('-');
        const st = new Date(startParts[0], startParts[1] - 1, startParts[2], 0, 0, 0).getTime();
        const endParts = document.getElementById('emp-pts-end').value.split('-');
        const en = new Date(endParts[0], endParts[1] - 1, endParts[2], 23, 59, 59).getTime();
        const displayHistory = (emp.ptsHistory || []).filter(p => {
          const ptsVal = parseFloat(String(p.val).replace(',', '.')) || 0;
          if (p.type === "KPI" && p.source !== "Горячий чек") return false;
          if (p.type === "KPI" && p.source === "Горячий чек" && ptsVal === 0) return false;
          const rd = parseCustomDate(p.date);
          return ptsVal !== 0 && rd >= st && rd <= en;
        });
        document.getElementById('emp-pts-render-area').innerHTML = groupAndRenderByMonth(displayHistory, p => {
          return renderHistoryItem(p, true);
        });
      }
    };
    setTimeout(() => window[`triggerEmpPtsReload_${iin}`]('search'), 100);
  } else if (tab === 'viol') {
    html = `<div style="display:flex; gap:8px; margin-bottom:12px;"><button class="btn-red" onclick="document.getElementById('fine-form-${iin}').classList.toggle('hidden')" style="padding:10px; font-size:12px; margin:0;">Выписать штраф</button><button class="btn-orange" onclick="document.getElementById('remark-form-${iin}').classList.toggle('hidden')" style="padding:10px; font-size:12px; margin:0;">Сделать замечание</button></div>`;
    html += `<div id="fine-form-${iin}" class="hidden inner-block slide-up-fade" style="border:1px solid #e74c3c; background:rgba(231, 76, 60, 0.05);"><input type="text" id="fine-reason-${iin}" placeholder="Причина штрафа..." style="box-sizing: border-box; width:100%; height:36px; margin-top:0; margin-bottom:8px; font-size:13px; background:var(--card-bg);"><div style="display:flex; gap:8px; margin-bottom:8px;"><input type="number" id="fine-amount-${iin}" placeholder="0 (Баллы)" style="box-sizing: border-box; height:36px; margin:0; flex:1; font-size:14px; background:var(--card-bg);"><input type="number" id="fine-money-${iin}" placeholder="0 (Сумма ₸)" style="box-sizing: border-box; height:36px; margin:0; flex:1; font-size:14px; background:var(--card-bg);"></div><button class="btn-red" onclick="executeFine('${iin}', '${emp.name}')" style="padding:8px; font-size:12px; margin:0;">Подтвердить штраф</button></div>`;
    html += `<div id="remark-form-${iin}" class="hidden inner-block slide-up-fade" style="border:1px solid #f39c12; background:rgba(243, 156, 18, 0.05);"><textarea id="remark-text-${iin}" placeholder="Текст замечания..." style="box-sizing: border-box; width:100%; height:60px; margin-bottom:8px; border-radius:8px; padding:8px; border:1px solid var(--border-color); background:var(--card-bg); color:var(--text-color); font-family:inherit; resize:none;"></textarea><button class="btn-orange" onclick="executeRemark('${iin}', '${emp.name}')" style="padding:8px; font-size:12px; margin:0;">Отправить замечание</button></div>`;
    const allFines = (emp.ptsHistory || []).filter(p => p.type === "Штраф");
    const finesHtml = groupAndRenderByMonth(allFines, p => renderMoneyFineItem({ ...p, moneyFine: parseFloat(String(p.moneyFine).replace(',', '.')) || 0 }));
    const remarksHtml = groupAndRenderByMonth((emp.remarks || []), r => {
      const desc = formatRemarkText(r.details);
      const authorStr = formatRemarkAuthor(r.authorName, r.authorRole);
      const d = r.date ? String(r.date) : "";
      return `<div class="req-item" style="border-left-color: #f39c12; margin-bottom:8px;"><div class="req-title" style="font-size:12px;"><b style="color:#f39c12;">${authorStr}</b> <span style="float:right; color:gray; font-size:10px;">${r.date}</span></div><div class="req-desc" style="color:var(--text-color); font-size:12px; white-space:pre-wrap;">${desc}</div></div>`;
    });
    if (allFines.length > 0) html += `<div class="grid-details-title" style="color:#e74c3c; margin-top:10px;">Штрафы (Сумма)</div>${finesHtml}`;
    if ((emp.remarks || []).length > 0) html += `<div class="grid-details-title" style="color:#f39c12; margin-top:10px;">Замечания</div>${remarksHtml}`;
    if (allFines.length === 0 && (emp.remarks || []).length === 0) html += `<p style='text-align:center;color:gray;font-size:12px; margin-top:15px;'>Нарушений нет</p>`;
  }
  content.innerHTML = html;
}

export function closeDetails() {
  switchTab('adm-main');
}

/* ========== Админка ========== */
export function toggleAdminMain(view) {
  currentAdminMainView = view;
  document.getElementById("admin-plan-list").classList.add("hidden");
  document.getElementById("admin-sc-list").classList.add("hidden");
  document.getElementById("admin-emp-container").classList.add("hidden");
  document.getElementById("admin-plan-list").classList.remove("fade-in");
  document.getElementById("admin-sc-list").classList.remove("fade-in");
  document.getElementById("admin-emp-container").classList.remove("fade-in");
  document.getElementById("btn-adm-plan").classList.remove('active-flt');
  document.getElementById("btn-adm-sc").classList.remove('active-flt');
  document.getElementById("btn-adm-emp").classList.remove('active-flt');

  if (view === 'plan') {
    document.getElementById("admin-plan-list").classList.remove("hidden");
    document.getElementById("admin-plan-list").classList.add("fade-in");
    document.getElementById("btn-adm-plan").classList.add("active-flt");
  } else if (view === 'sc') {
    document.getElementById("admin-sc-list").classList.remove("hidden");
    document.getElementById("admin-sc-list").classList.add("fade-in");
    document.getElementById("btn-adm-sc").classList.add("active-flt");
    renderAdminScItems(currentAdminScDept, document.getElementById(`flt-${currentAdminScDept.toLowerCase()}`));
  } else {
    document.getElementById("admin-emp-container").classList.remove("hidden");
    document.getElementById("admin-emp-container").classList.add("fade-in");
    document.getElementById("btn-adm-emp").classList.add("active-flt");
    renderAdminEmps(currentEmpDept, document.getElementById(`flt-emp-${currentEmpDept.toLowerCase()}`));
  }
}

export function renderAdminHistory(filterType) {
  if (filterType) currentHistFilter = filterType;
  ['all', 'sales', 'pts', 'viol'].forEach(f => {
    const el = document.getElementById('flt-hist-' + f);
    if (el) el.classList.remove('active-flt');
  });
  const activeEl = document.getElementById('flt-hist-' + currentHistFilter);
  if (activeEl) activeEl.classList.add('active-flt');

  const listContainer = document.getElementById("admin-history-list");
  if (!document.getElementById("admin-hist-panel")) {
    const panelDiv = document.createElement("div");
    panelDiv.id = "admin-hist-panel";
    panelDiv.innerHTML = generateDatePanelHTML('admin-hist', 'window.triggerAdminHistReload');
    listContainer.parentNode.insertBefore(panelDiv, listContainer);
    window.triggerAdminHistReload = function(type, val) {
      if (type) setPanelDates(type, val, 'admin-hist', () => renderAdminHistory(currentHistFilter));
      else renderAdminHistory(currentHistFilter);
    };
  }

  const startD = document.getElementById("admin-hist-start").value;
  const endD = document.getElementById("admin-hist-end").value;
  const startTime = new Date(startD).getTime();
  const endTime = new Date(endD).getTime() + 86400000;

  let aHist = [...(adminHistoryGlobal || [])];
  aHist = aHist.filter(r => {
    const rd = parseCustomDate(r.date);
    return rd >= startTime && rd <= endTime;
  });

  if (currentHistFilter === 'sales') {
    aHist = aHist.filter(r => ["Продажа СЦ/Фокус", "Продажа Trade-In", "Горячий чек"].includes(r.type));
  } else if (currentHistFilter === 'pts') {
    aHist = aHist.filter(r => r.type === "Баллы мотивации");
  } else if (currentHistFilter === 'viol') {
    aHist = aHist.filter(r => r.type === "Замечание" || r.type === "Штраф" || r.type === "Запрос на штраф");
  }

  listContainer.innerHTML = groupAndRenderByMonth(aHist, r => {
    let stColor = r.status === "approved" || r.status === "approved_notify_zav" ? "#27ae60" : (r.status === "rejected" || r.status === "rejected_by_user" || r.status === "rejected_notify_user" || r.status === "rejected_notify_zav" ? "#e74c3c" : "#95a5a6");
    let stText = r.status === "approved" || r.status === "approved_notify_zav" ? "Одобрен" : (String(r.status).includes("rejected") ? "Отклонен" : "Просмотрен");
    if (r.status === "rejected_by_user") stText = "Отклонен сменщиком";
    if (r.type === "Исправление смены") {
      if (r.status.includes("approved")) stText = "Исправлен";
      else if (r.status.includes("rejected")) stText = "Отклонен";
    }
    let rawDesc = String(r.details || "");
    let approverName = "";
    let metaObj = {};
    try { metaObj = JSON.parse(r.meta || r.metadata || "{}"); } catch (e) {}
    const match = rawDesc.match(/\n\[(.*?)\]$/);
    if (match) { approverName = formatShortName(match[1]); rawDesc = rawDesc.replace(/\n\[(.*?)\]$/, "").trim(); }
    if (metaObj.approver) approverName = formatShortName(metaObj.approver);
    if (!approverName && r.approver) approverName = formatShortName(r.approver);
    const selDateHtml = metaObj.date ? `<br><span style="color:gray; font-size:11px;">📅 Дата в заявке: <b>${metaObj.date}</b></span>` : "";
    let desc = r.type === "Обмен сменами" ? `Сменщик: ${r.targetName || ''}<br>${rawDesc}` : rawDesc;
    desc = formatRemarkText(desc, r.type === 'Замечание' ? r.targetName : null);
    let finalDescHtml = r.type === "Замечание" ? `<b>${r.targetName}</b> — ${desc}` : `<b>Детали:</b> ${desc}${selDateHtml}`;
    const deptStr = r.authorDept ? ` — ${r.authorDept}` : '';
    let authorStr = r.type === "Замечание" || r.type === "Запрос на штраф" ? `<b style="color:#f39c12;">${formatRemarkAuthor(r.authorName, r.authorRole)}${deptStr}</b>` : `<b>От:</b> ${r.adminDisplayName || r.authorName + deptStr}`;
    if (r.type === "Уведомление о штрафе") {
      stColor = "#e74c3c"; stText = "Ознакомлен";
      desc = `<b>Причина:</b> ${metaObj.reason || desc}<br>Баллы: <b style="color:#e74c3c;">${metaObj.amount}</b> | Сумма: <b style="color:#e74c3c;">${metaObj.moneyAmount} ₸</b>`;
      authorStr = `<b style="color:#e74c3c;">${formatRemarkAuthor(r.authorName, r.authorRole)}</b>`;
      finalDescHtml = desc + selDateHtml;
      r.type = "Штраф";
    } else if (r.type === "Запрос на штраф") {
      desc = `Нарушитель: <b>${r.targetName}</b><br>Причина: ${metaObj.reason || desc}<br>Баллы: <b style="color:#e74c3c;">${metaObj.amount}</b> | Сумма: <b style="color:#e74c3c;">${metaObj.moneyAmount} ₸</b>`;
      finalDescHtml = `<b>Детали:</b> ${desc}${selDateHtml}`;
    }
    const approverLabel = approverName ? `<span style="color:gray; font-size:10px; font-weight:normal;">${approverName}</span>` : '';
    let titleColor = getSourceColor(r.type);
    if (r.type === "Продажа СЦ/Фокус" && String(r.details).toLowerCase().includes("фокус")) titleColor = '#e74c3c';
    if (r.type === "Штраф" || r.type === "Запрос на штраф" || r.type === "Уведомление о штрафе") titleColor = '#e74c3c';
    return `<div class="req-item" style="border-left-color: ${stColor}; opacity: 0.9;"><div class="req-title" style="color:${titleColor};">${r.type || 'Запрос'} <span style="font-size:12px; font-weight:normal; color:gray; float:right;">${r.date || ''}</span></div><div class="req-desc" style="color:var(--text-color);">${authorStr}<br>${finalDescHtml}<br><div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;"><b style="color:${stColor}">Статус: ${stText}</b>${approverLabel}</div></div></div>`;
  });
}

export function renderAdminEmps(dept, btnElement) {
  currentEmpDept = dept;
  if (btnElement) {
    document.getElementById('flt-emp-cifra').classList.remove('active-flt');
    document.getElementById('flt-emp-mbt').classList.remove('active-flt');
    document.getElementById('flt-emp-kbt').classList.remove('active-flt');
    btnElement.classList.add('active-flt');
  }
  const container = document.getElementById("admin-emp-list");
  const filtered = allEmployeesData.filter(e => e.dept.toLowerCase().includes(dept.toLowerCase()));
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthSuffix = ("0" + currentMonth).slice(-2) + "." + currentYear;

  container.innerHTML = filtered.map(e => {
    const monthScHist = e.ptsHistory.filter(p => p.type === "Начисление" && typeof p.date === 'string' && p.date.includes(monthSuffix));
    const curMonthSc = monthScHist.filter(p => !p.source.toLowerCase().includes("trade-in")).length;
    const curMonthTrade = monthScHist.filter(p => p.source.toLowerCase().includes("trade-in")).length;
    const kpiFontSize = e.kpi % 1 !== 0 ? '8px' : '10px';
    return `<div class="req-item" style="border-left-color: var(--btn-color); border-left-width: 2px; padding: 10px 8px; margin-bottom: 8px; cursor:pointer;" onclick="openEmpDetails('${e.iin}')"><div style="font-size:13px; font-weight:bold; margin-bottom:6px; color:var(--text-color);">${e.name}</div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:8px;"><div class="inner-block" style="flex:1; margin:0; padding:2px 4px; height:34px; display:flex; align-items:center; justify-content:space-evenly;">${e.tabelStr}</div><div class="circle-box" style="width:34px; min-width:34px; height:34px; margin:0; cursor:pointer; box-shadow:none; flex-shrink:0;" onclick="event.stopPropagation(); openEmpKpiDetails('${e.iin}')"><div class="kpi-container" style="background: conic-gradient(${setKpiColor(e.kpi, null, null)} ${e.kpi > 100 ? 100 : e.kpi}%, var(--inner-bg) 0);"><div class="kpi-inner" style="width:28px; height:28px;"><span style="font-size:${kpiFontSize}; font-weight:bold; color:${setKpiColor(e.kpi, null, null)}">${e.kpi}%</span></div></div></div></div><div style="display:flex; justify-content:space-between; font-size:11px; align-items:center; color:var(--desc-color);"><span onclick="event.stopPropagation(); openEmpScDetails('${e.iin}')" style="padding: 4px 8px; background: rgba(39, 174, 96, 0.1); border-radius: 8px; cursor: pointer;">СЦ: <b style="color:var(--btn-color);">${curMonthSc}</b> | BRZY: <b style="color:var(--btn-color);">${curMonthTrade}</b></span><span>Ошибки: <b style="color:var(--text-color);">${e.reportErrors}</b></span></div></div>`;
  }).join("") || "<p style='color:gray; font-size:12px; text-align:center;'>Сотрудников нет</p>";
}

let currentAdminScTabType = 'active';
export function switchScAdminTab(tabType) {
  currentAdminScTabType = tabType;
  document.getElementById('tab-sc-active').classList.remove('active-flt');
  document.getElementById('tab-sc-sold').classList.remove('active-flt');
  document.getElementById('tab-sc-' + tabType).classList.add('active-flt');
  renderAdminScItems(currentAdminScDept, null);
}

export function renderAdminScItems(dept, btnElement) {
  dept = dept || currentAdminScDept;
  currentAdminScDept = dept;
  if (btnElement) {
    document.getElementById('flt-cifra').classList.remove('active-flt');
    document.getElementById('flt-mbt').classList.remove('active-flt');
    document.getElementById('flt-kbt').classList.remove('active-flt');
    document.getElementById('flt-focus').classList.remove('active-flt');
    btnElement.classList.add('active-flt');
  }
  const container = document.getElementById("admin-sc-container");
  const searchInput = document.getElementById("admin-sc-search");
  const searchQ = searchInput ? searchInput.value.toLowerCase() : "";
  container.innerHTML = "";

  if (currentAdminScTabType === 'active') {
    let filtered = adminScItemsGlobal.filter(i => (dept === "Фокус" ? i.type === "Фокус" : (i.dept === dept && i.type === "СЦ")));
    if (searchQ) filtered = filtered.filter(i => i.name.toLowerCase().includes(searchQ));
    if (filtered.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:gray; padding:15px; font-size:12px;'>Пусто</p>";
      return;
    }
    if (dept === "Фокус") {
      const groups = { "Цифра": [], "МБТ": [], "КБТ": [] };
      filtered.forEach(i => { if (groups[i.dept]) groups[i.dept].push(i); });
      for (const [dName, items] of Object.entries(groups)) {
        if (items.length === 0) continue;
        const headerText = items[0].focusHeader || `${dName} Фокус`;
        let html = `<div class="inner-block card" style="margin-bottom:8px; padding:8px; background: var(--card-bg);"><div style="font-size:13px; font-weight:bold; color:var(--text-color); margin-bottom:6px;">${headerText}</div>`;
        items.forEach((i, idx) => {
          const ptNoun = formatPointsNoun(i.pts);
          html += `<div class="sc-item" onclick="this.classList.toggle('selected')" style="padding:10px; border-bottom:1px solid rgba(130, 130, 130, 0.35); display:flex; justify-content:space-between; margin-bottom:4px;"><div><div style="font-size:12px; margin-bottom:2px;"><b>${idx + 1}.</b> ${i.name}</div><div class="type-label" style="font-size:10px; color:#e74c3c; font-weight:bold;">Фокус — ${String(i.pts).replace('.', ',')} ${ptNoun}</div></div></div>`;
        });
        html += `</div>`;
        container.innerHTML += html;
      }
    } else {
      let html = `<div class="card" style="padding: 6px;">`;
      filtered.forEach((i, idx) => {
        const docBtn = i.docUrl ? `<a href="${i.docUrl}" target="_blank" style="text-decoration:none; background:var(--inner-bg); color:var(--text-color); padding:4px 8px; border-radius:8px; display:inline-flex; align-items:center; transition:0.6s;" onclick="event.stopPropagation()"><span class="material-symbols-rounded" style="font-size:20px;">description</span></a>` : '';
        html += `<div class="sc-item" onclick="this.classList.toggle('selected')" style="padding:10px; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><div><div style="font-size:12px; margin-bottom:2px;"><b>${idx + 1}.</b> ${i.name}</div><div class="type-label" style="font-size:10px; color:#e67e22; font-weight:bold;">СЦ${i.discount ? `<span style="color:#e74c3c; margin-left:10px;">-${i.discount.replace(/%/g, '% ')}</span>` : ''}</div></div><div>${docBtn}</div></div>`;
      });
      html += `</div>`;
      container.innerHTML = html;
    }
  } else {
    let sold = (adminHistoryGlobal || []).filter(r => r.status === "approved" && r.type === "Продажа СЦ/Фокус");
    if (dept === "Фокус") {
      sold = sold.filter(r => {
        try { const m = JSON.parse(r.meta); return m.type === "Фокус"; } catch (e) { return r.details.toLowerCase().includes("фокус"); }
      });
    } else {
      sold = sold.filter(r => {
        try { const m = JSON.parse(r.meta); return m.dept === dept && m.type !== "Фокус"; } catch (e) { return false; }
      });
    }
    if (searchQ) sold = sold.filter(r => r.details.toLowerCase().includes(searchQ) || r.authorName.toLowerCase().includes(searchQ));
    if (sold.length === 0) {
      container.innerHTML = "<p style='text-align:center; color:gray; padding:15px; font-size:12px;'>Нет проданных товаров</p>";
      return;
    }
    container.innerHTML = groupAndRenderByMonth(sold, r => {
      const isFocus = dept === "Фокус";
      const tagColor = isFocus ? "#f39c12" : "#3390ec";
      let metaObj = {};
      try { metaObj = JSON.parse(r.meta); } catch (e) {}
      const displayAct = r.actUrl || metaObj.docUrl || "";
      const displayDisc = r.discount || metaObj.discount || "0%";
      let rawDetails = String(r.details || "");
      const match = rawDetails.match(/\n\[(.*?)\]$/);
      let approverName = "";
      if (match) { approverName = formatShortName(match[1]); rawDetails = rawDetails.replace(/\n\[(.*?)\]$/, "").trim(); }
      const actHtml = displayAct ? `<span style="display:inline-flex; align-items:center; gap:4px; vertical-align:middle;"><span class="material-symbols-rounded" style="font-size:14px; color:#3390ec;">description</span> <a href="${displayAct}" target="_blank" style="color:#3390ec; text-decoration:none; font-weight:bold;" onclick="event.stopPropagation()">Акт товара</a></span>` : (isFocus ? '' : '<span style="color:gray; font-size:10px;">(Акт не прикреплен)</span>');
      const approverHtml = approverName ? `<div style="margin-top:6px; font-size:10px; color:gray; text-align:right;">Одобрил: ${approverName}</div>` : '';
      return `<div class="inner-block sc-item card" onclick="this.classList.toggle('selected')" style="padding:10px; margin-bottom:8px; border-left: 3px solid ${tagColor}; cursor: pointer; background: var(--card-bg);"><div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span class="type-label" style="font-size:9px; font-weight:bold; color:${tagColor};">${isFocus ? 'ФОКУС' : 'СЦ'}</span><span style="font-size:9px; color:gray;">${r.date}</span></div><div style="font-size:12px; font-weight:bold; margin-bottom:4px;">${rawDetails}</div><div style="font-size:11px; line-height:1.6; display:flex; flex-direction:column; gap:2px; margin-bottom:4px;"><div style="display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:14px; color:gray;">badge</span> <span><span style="color:gray;">Продавец:</span> <b>${r.authorName}</b></span></div>${displayDisc !== "0%" ? `<div style="display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:14px; color:gray;">sell</span> <span><span style="color:gray;">Скидка:</span> <b style="color:#e74c3c;">${displayDisc}</b></span></div>` : ''}<div>${actHtml}</div></div>${approverHtml}</div>`;
    });
  }
}

export function switchScDept(dept) {
  currentScTabDept = dept;
  document.getElementById('sc-tab-cifra').classList.remove('active-flt');
  document.getElementById('sc-tab-mbt').classList.remove('active-flt');
  document.getElementById('sc-tab-kbt').classList.remove('active-flt');
  let tabId = 'sc-tab-cifra';
  if (dept === 'МБТ') tabId = 'sc-tab-mbt';
  if (dept === 'КБТ') tabId = 'sc-tab-kbt';
  document.getElementById(tabId).classList.add('active-flt');
  renderScItems();
}

export function renderScItems() {
  const q = document.getElementById("sc-search").value.toLowerCase();
  const list = document.getElementById("sc-list");
  list.innerHTML = "";
  let scList = globalScItems.filter(i => i.dept === currentScTabDept && i.type === 'СЦ');
  if (q) scList = scList.filter(i => i.name.toLowerCase().includes(q));
  let focusList = globalScItems.filter(i => i.dept === currentScTabDept && i.type === 'Фокус');
  if (q) focusList = focusList.filter(i => i.name.toLowerCase().includes(q));
  const sortedFiltered = [...scList, ...focusList];
  if (sortedFiltered.length === 0) {
    list.innerHTML = "<p style='padding:12px; color:gray; font-size:12px; text-align:center;'>Ничего не найдено</p>";
    return;
  }
  sortedFiltered.forEach(i => {
    const div = document.createElement("div");
    const isSelected = (selectedScItem && selectedScItem.row === i.row && selectedScItem.type === i.type && selectedScItem.dept === i.dept);
    div.className = "sc-item" + (isSelected ? " selected" : "");
    const typeCol = i.type === 'СЦ' ? '#e67e22' : '#e74c3c';
    const ptNoun = formatPointsNoun(i.pts);
    const ptsText = i.type === 'СЦ' ? '2 балла' : `${String(i.pts).replace('.', ',')} ${ptNoun}`;
    const displayType = i.type === 'Фокус' ? 'Дефект' : i.type;
    const deptLabel = i.type === 'Фокус' ? `<span style="color:gray; font-weight:normal;"> (${i.dept})</span>` : '';
    div.innerHTML = `<div><div style="margin-bottom:4px; font-size:13px;">${i.name}${deptLabel}</div><div style="display:flex; justify-content:space-between; align-items:center;"><div class="type-label" style="font-size:10px; color:${typeCol}; font-weight:bold;">${displayType} — ${ptsText}</div>${i.discount ? `<div style="font-weight:bold; color:#e74c3c; font-size:11px;">-${i.discount.replace(/%/g, '% ')}</div>` : ''}</div></div>`;
    div.onclick = () => {
      selectedScItem = i;
      const docBtn = document.getElementById("btn-act-doc");
      if (i.docUrl) {
        docBtn.style.opacity = "1";
        docBtn.style.pointerEvents = "auto";
      } else {
        docBtn.style.opacity = "0.3";
        docBtn.style.pointerEvents = "none";
      }
      renderScItems();
    };
    list.appendChild(div);
  });
}

export function openScDoc() {
  if (selectedScItem && selectedScItem.docUrl) {
    if (tg && tg.openLink) tg.openLink(selectedScItem.docUrl);
    else window.open(selectedScItem.docUrl, '_blank');
  }
}

export function markAsSeen(id, el) {
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem("seenH_" + appState.iin) || "{}"); } catch (e) {}
  stored[id] = true;
  localStorage.setItem("seenH_" + appState.iin, JSON.stringify(stored));
  const badge = el.querySelector('.new-badge');
  if (badge) badge.style.display = 'none';
  el.style.opacity = '0.9';
  el.style.boxShadow = 'none';
}

/* ========== Отправка форм ========== */
export function submitScForm() {
  if (!selectedScItem) return showToast("Выберите товар из списка", true);
  let scDateVal = document.getElementById("sc-date").dataset.realdate;
  let dStr = scDateVal;
  if (dStr === "Сегодня") {
    dStr = formatDateLocal(new Date());
  } else {
    const d = new Date(dStr);
    dStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  }
  selectedScItem.date = dStr;
  executeSubmit("Продажа СЦ/Фокус", selectedScItem.name, null, JSON.stringify(selectedScItem));
}

export function submitTradeIn() {
  if (!selectedTradeInModel) return showToast("Выберите модель!", true);
  const dateVal = document.getElementById("ft-date").dataset.realdate;
  let dStr = dateVal === "Сегодня" ? formatDateLocal(new Date()) : (() => {
    const d = new Date(dateVal);
    return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  })();
  const meta = JSON.stringify({ date: dStr, text: selectedTradeInModel });
  executeSubmit("Продажа Trade-In", selectedTradeInModel, null, meta);
}

export function submitPoints() {
  const act = document.getElementById("fp-action").value;
  const time = document.getElementById("fp-time").value;
  const dateVal = document.getElementById("fp-date").dataset.realdate;
  let dStr = dateVal === "Сегодня" ? formatDateLocal(new Date()) : (() => {
    const d = new Date(dateVal);
    return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  })();
  const meta = JSON.stringify({ date: dStr });
  executeSubmit("Баллы мотивации", `${act} на ${time}`, null, meta);
}

export function submitFixShift() {
  const shiftStr = document.getElementById("fs-fix-shift").value;
  if (!shiftStr) return showToast("Выберите новую смену", true);
  const dStr = (() => {
    const d = new Date();
    return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  })();
  executeSubmit("Исправление смены", shiftStr, null, dStr, "Запрос на исправление отправлен");
}

export function submitSwap() {
  const select = document.getElementById("fs-target");
  const targetIin = select.value;
  if (!targetIin) return showToast("Выберите сменщика", true);
  const dateVal = document.getElementById("fs-date").dataset.realdate;
  let dStr = dateVal === "Сегодня" ? formatDateLocal(new Date()) : (() => {
    const d = new Date(dateVal);
    return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  })();
  const shiftStr = document.getElementById("fs-shift").value;
  const targetName = select.options[select.selectedIndex].text;
  const details = `Дата: ${dStr}, Смена: ${shiftStr}`;
  executeSubmit("Обмен сменами", details, targetIin, "", "Запрос отправлен: " + targetName);
}

export function submitHotCheck(typeText, valText, ptsText) {
  const promptMsg = `Вы подтверждаете продажу: ${typeText}?`;
  const dStr = (() => {
    const d = new Date();
    return ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  })();
  const metaStr = JSON.stringify({ date: dStr, bonus: valText, pts: ptsText });
  if (tg && tg.showPopup) {
    try {
      tg.showPopup({
        title: 'Горячий чек',
        message: promptMsg,
        buttons: [{ id: 'yes', type: 'ok', text: 'Да' }, { type: 'cancel', text: 'Отмена' }]
      }, (btnId) => { if (btnId === 'yes') executeSubmit("Горячий чек", typeText, null, metaStr); });
    } catch (e) {
      if (confirm(promptMsg)) executeSubmit("Горячий чек", typeText, null, metaStr);
    }
  } else {
    if (confirm(promptMsg)) executeSubmit("Горячий чек", typeText, null, metaStr);
  }
}

export function submitPromoCheck(typeText, valText, ptsText, lIdx, iIdx, prefixType) {
  const promptMsg = `Вы подтверждаете продажу: ${typeText}?`;
  const d = new Date();
  const formattedDate = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  const metaStr = JSON.stringify({ date: formattedDate, bonus: valText, pts: ptsText, type: prefixType });

  const exec = () => {
    const cntEl = document.querySelector(`#count-${lIdx}-${iIdx} .val`);
    if (cntEl) {
      const cur = parseInt(cntEl.innerText) || 0;
      if (cur > 1) {
        cntEl.innerText = cur - 1;
      } else {
        document.getElementById(`promo-item-${lIdx}-${iIdx}`).style.display = 'none';
      }
    }
    executeSubmit(prefixType, typeText, null, metaStr);
  };

  if (tg && tg.showPopup) {
    try {
      tg.showPopup({
        title: prefixType,
        message: promptMsg,
        buttons: [{ id: 'yes', type: 'ok', text: 'Да' }, { type: 'cancel', text: 'Отмена' }]
      }, (btnId) => { if (btnId === 'yes') exec(); });
    } catch (e) {
      if (confirm(promptMsg)) exec();
    }
  } else {
    if (confirm(promptMsg)) exec();
  }
}

/* ========== Детали СЦ плана ========== */
export function openAdminPlanScDetails() {
  const prevTab = lastActiveTab;
  switchTab('details');
  document.getElementById("btn-details-back").onclick = () => switchTab(prevTab);
  document.getElementById("details-title").innerText = "СЦ | BRZY (План)";
  document.getElementById("details-kpi-circle-container").innerHTML = "";

  const startD = document.getElementById("plan-filter-start")?.value || "2000-01-01";
  const endD = document.getElementById("plan-filter-end")?.value || "2099-01-01";
  const startTime = new Date(startD).getTime();
  const endTime = new Date(endD).getTime() + 86400000;

  let sales = [];
  if (adminHistoryGlobal) {
    sales = adminHistoryGlobal.filter(r => {
      const rd = parseCustomDate(r.date);
      return rd >= startTime && rd <= endTime && r.status === 'approved' && (r.type === 'Продажа СЦ/Фокус' || r.type === 'Продажа Trade-In');
    });
  }

  let listHtml = "<div class='card' style='padding:0; overflow:hidden;'>";
  if (sales.length > 0) {
    sales.sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
    listHtml += sales.map((i, idx) => {
      const srcColor = getSourceColor(i.type);
      let sourceText = i.type === 'Продажа Trade-In' ? 'Trade-In' : 'СЦ/Фокус';
      let rawDetails = i.details;
      const match = rawDetails.match(/\n\[(.*?)\]$/);
      if (match) rawDetails = rawDetails.replace(/\n\[(.*?)\]$/, "").trim();
      try {
        const m = JSON.parse(i.meta);
        if (m.type) sourceText = m.type;
      } catch (e) {}
      return buildStandardRow({
        title: `${idx + 1}. ${rawDetails}`,
        typeText: sourceText,
        typeColor: srcColor,
        dateText: i.date,
        nameText: i.authorName,
        hasBorder: false
      });
    }).join("");
  } else {
    listHtml += "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>В этом периоде пусто</div>";
  }
  listHtml += "</div>";
  document.getElementById("details-list").innerHTML = listHtml;
}

export function openEmpScDetails(iin) {
  const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin));
  if (!emp) return;
  const prevTab = lastActiveTab;
  switchTab('details');
  document.getElementById("btn-details-back").onclick = () => switchTab(prevTab);
  document.getElementById("details-title").innerText = `СЦ | BRZY: ${emp.name}`;
  document.getElementById("details-kpi-circle-container").innerHTML = "";

  const d = new Date();
  const defStart = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1));
  const defEnd = formatDateLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  const headerHtml = `<div class="inner-block card date-panel-wrapper" style="padding:12px; margin-bottom:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div class="no-swipe" style="display:flex; gap:6px; align-items:center;" ontouchstart="event.stopPropagation();" ontouchmove="event.stopPropagation();"><input type="date" id="emp-sc-start" value="${defStart}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><span style="color:gray; font-weight:bold;">-</span><input type="date" id="emp-sc-end" value="${defEnd}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="date" onchange="setEmpScDates('single', this.value, '${iin}'); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_today</span></button></div><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="month" onchange="setEmpScDates('month', this.value, '${iin}'); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_month</span></button></div><button class="btn-green" style="margin:0; border-radius:8px; width:36px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:0;" onclick="renderEmpScDetailsData('${iin}')"><span class="material-symbols-rounded" style="font-size:18px; color:white;">search</span></button></div></div><div id="emp-sc-render-area"></div>`;
  document.getElementById("details-list").innerHTML = headerHtml;
  renderEmpScDetailsData(iin);
}

export function setEmpScDates(type, val, iin) {
  let endD = new Date();
  let startD = new Date();
  if (type === 'single') {
    if (val) {
      const parts = val.split('-');
      startD = new Date(parts[0], parts[1] - 1, parts[2]);
      endD = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  } else if (type === 'month') {
    if (val) {
      const parts = val.split('-');
      startD = new Date(parts[0], parts[1] - 1, 1);
      endD = new Date(parts[0], parts[1], 0);
    }
  }
  document.getElementById('emp-sc-start').value = formatDateLocal(startD);
  document.getElementById('emp-sc-end').value = formatDateLocal(endD);
  renderEmpScDetailsData(iin);
}

export function renderEmpScDetailsData(iin) {
  const emp = allEmployeesData.find(e => safeIin(e.iin) === safeIin(iin));
  if (!emp) return;
  const startD = document.getElementById("emp-sc-start").value;
  const endD = document.getElementById("emp-sc-end").value;
  const startTime = new Date(startD).getTime();
  const endTime = new Date(endD).getTime() + 86400000;

  const sales = emp.ptsHistory.filter(p => {
    if (p.type !== "Начисление") return false;
    const s = String(p.source).toLowerCase();
    if (!(s.includes("сц") || s.includes("фокус") || s.includes("trade-in"))) return false;
    const rd = parseCustomDate(p.date);
    return rd >= startTime && rd <= endTime;
  });

  let listHtml = "<div class='card' style='padding:0; overflow:hidden;'>";
  if (sales.length > 0) {
    listHtml += groupAndRenderByMonth(sales, i => {
      let rawDetails = i.reason || "";
      const match = rawDetails.match(/\n\[(.*?)\]$/);
      if (match) rawDetails = rawDetails.replace(/\n\[(.*?)\]$/, "").trim();
      return buildStandardRow({
        title: rawDetails,
        typeText: i.source,
        typeColor: getSourceColor(i.source),
        dateText: i.date,
        nameText: emp.name,
        hasBorder: false
      });
    });
  } else {
    listHtml += "<div style='padding:15px;text-align:center;color:gray;font-size:13px;'>В выбранном периоде пусто</div>";
  }
  listHtml += "</div>";
  document.getElementById("emp-sc-render-area").innerHTML = listHtml;
}
