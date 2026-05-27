window.onerror = function(message, source, lineno, colno, error) { if (lineno === 0 || !source) return true; alert("ОШИБКА: " + message + " в строке " + lineno); };
window.onunhandledrejection = function(event) { alert("ОШИБКА ПРОМИСА: " + event.reason); };

const SUPABASE_URL = 'https://qvkhfueivkwdqydnhlsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mXpXBbeHRecrahRlDxkDAQ_Xe3zyb5G';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const GAS_URL = "https://script.google.com/macros/s/AKfycbxb2UW5ctVar9QhWmjI-IIFA1EOxDCovRDoNBcbN31x4L4-mCh1lGcF-ZdH-62pUrbR/exec";

let tg = window.Telegram ? window.Telegram.WebApp : null; if (tg) { tg.expand(); }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }

function safeIin(val) { if(val === undefined || val === null) return ""; return String(val).trim().replace(/^0+/, ''); }
function requestNotificationPermission() { if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") Notification.requestPermission(); }
function showPushNotification(title, bodyText) { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body: bodyText, icon: "icon.png" }); }
function fmtSum(val) { if(!val) return "0"; return String(Math.round(val)).replace(/\s/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, " "); }
function formatDateLocal(d) { if (!d) d = new Date(); let y = d.getFullYear(); let m = ("0" + (d.getMonth() + 1)).slice(-2); let day = ("0" + d.getDate()).slice(-2); return `${y}-${m}-${day}`; }

window.nomListOpen = false;
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

function renderPlanUI(pData) {
    let area = document.getElementById("plan-render-area"); if (!area) return;
    if (!pData || !pData.to) { area.innerHTML = "<p style='text-align:center;color:gray;font-size:13px; padding:20px 0;'>Нет данных за этот период</p>"; return; }
    let getDynColor = (valStr, targetStr = "100") => { let val = parseFloat(String(valStr).replace(/\s/g, '').replace(',', '.')) || 0; let target = parseFloat(String(targetStr).replace(/\s/g, '').replace(',', '.')) || 100; if (target === 0) return val > 0 ? "#27ae60" : "#e74c3c"; let ratio = (val / target) * 100; return ratio >= 100 ? "#27ae60" : (ratio >= 80 ? "#f39c12" : "#e74c3c"); };
    let parse = (str) => parseFloat(String(str).replace(/\s/g, '').replace(',', '.')) || 0;
    let html = ""; let totalPlan = pData.totalPlan; let totalFact = pData.to.total.fact + pData.aks.total.fact + pData.usl.total.fact; let totalFactEd = pData.to.total.fact + pData.to.total.ed + pData.aks.total.fact + pData.aks.total.ed + pData.usl.total.fact + pData.usl.total.ed; let remPlan = totalPlan - totalFactEd; let totalPct = totalPlan > 0 ? ((totalFact / totalPlan) * 100).toFixed(2).replace('.', ',') : "0,00"; let totalPctEd = totalPlan > 0 ? ((totalFactEd / totalPlan) * 100).toFixed(2).replace('.', ',') : "0,00";
    let scCount = 0; let brzyCount = 0;
    if (window.adminHistoryGlobal) { let startD = document.getElementById("plan-filter-start") ? document.getElementById("plan-filter-start").value : "2000-01-01"; let endD = document.getElementById("plan-filter-end") ? document.getElementById("plan-filter-end").value : "2099-01-01"; let startTime = new Date(startD).getTime(); let endTime = new Date(endD).getTime() + 86400000; window.adminHistoryGlobal.forEach(r => { let rd = parseCustomDate(r.date); if (rd >= startTime && rd <= endTime && r.status === 'approved') { if (r.type === 'Продажа СЦ/Фокус') { try { let m = JSON.parse(r.meta); if(m.type !== "Фокус" && !r.details.toLowerCase().includes("фокус")) scCount++; } catch(e){} } if (r.type === 'Продажа Trade-In') brzyCount++; } }); }

    html += `<div class="inner-block card" style="margin-bottom:12px; padding:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><div style="font-size:14px; font-weight:bold; color:var(--text-color); text-transform:none;">Общая сводка</div><div onclick="openAdminPlanScDetails()" style="font-size:11px; font-weight:bold; color:var(--btn-color); cursor:pointer; padding: 4px 8px; background: rgba(39, 174, 96, 0.1); border-radius: 8px;">Фокус: ${scCount} | BRZY: ${brzyCount}</div></div><div style="background:var(--card-bg); padding:10px; border-radius:12px; border:1px solid var(--border-color); margin-bottom:12px;"><div style="color:#7f8c8d; font-size:12px; text-transform:uppercase; margin-bottom:8px; font-weight:bold; text-align:center; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;">Итоговый показатель</div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:bold;">${fmtSum(totalPlan)}</div><div style="margin-top:4px; font-size:10px; color:${remPlan <= 0 ? '#27ae60' : '#e74c3c'};">Ост: <b>${fmtSum(remPlan)}</b></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:bold; margin-bottom:2px;">${fmtSum(totalFact)}</div><div><span style="color:${getDynColor(totalPct)}; font-weight:bold; font-size:10px;">${totalPct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:bold; margin-bottom:2px;">${fmtSum(totalFactEd)}</div><div><span style="color:${getDynColor(totalPctEd)}; font-weight:bold; font-size:10px;">${totalPctEd}%</span></div></div></div></div>`;
    html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; margin-bottom:8px; border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;"><b style="color:#7f8c8d; font-size:12px; text-transform:uppercase;">Основной товарооборот</b><span style="color:#e84393; font-size:11px; font-weight:normal; font-style:italic;">+ЭД ${fmtSum(pData.to.total.ed)}</span></div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(pData.to.total.plan)}</div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.to.total.fact)}</div><div><span style="color:${getDynColor(pData.to.total.pct)}; font-weight:bold; font-size:10px;">${pData.to.total.pct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.to.total.fact + pData.to.total.ed)}</div><div><span style="color:${getDynColor(pData.to.total.pctEd)}; font-weight:bold; font-size:10px;">${pData.to.total.pctEd}%</span></div></div></div></div>`;
    html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; margin-bottom:8px; border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;"><b style="color:#7f8c8d; font-size:12px; text-transform:uppercase;">Сопутствующие товары</b><span style="color:#e84393; font-size:11px; font-weight:normal; font-style:italic;">+ЭД ${fmtSum(pData.aks.total.ed)}</span></div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(pData.aks.total.plan)}</div><div style="color:gray; font-size:9px; font-weight:bold; margin-top:4px;">Цель: <span style="color:var(--text-color);">${pData.aks.total.targetPct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.aks.total.fact)}</div><div><span style="color:${getDynColor(pData.aks.total.sumPct)}; font-size:10px; font-weight:bold;">${pData.aks.total.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.aks.total.pct, pData.aks.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.aks.total.pct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.aks.total.fact + pData.aks.total.ed)}</div><div><span style="color:${getDynColor(pData.aks.total.sumPctEd)}; font-size:10px; font-weight:bold;">${pData.aks.total.sumPctEd}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.aks.total.pctEd, pData.aks.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.aks.total.pctEd}%</span></div></div></div></div>`;
    html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; border:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;"><b style="color:#7f8c8d; font-size:12px; text-transform:uppercase;">Услуги</b></div><div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:4px; text-align:center; align-items:start;"><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ПЛАН</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(pData.usl.total.plan)}</div><div style="color:gray; font-size:9px; font-weight:bold; margin-top:4px;">Цель: <span style="color:var(--text-color);">${pData.usl.total.targetPct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ</div><div style="color:#27ae60; font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.usl.total.fact)}</div><div><span style="color:${getDynColor(pData.usl.total.sumPct)}; font-size:10px; font-weight:bold;">${pData.usl.total.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.usl.total.pct, pData.usl.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.usl.total.pct}%</span></div></div><div><div style="color:gray; font-size:9px; margin-bottom:2px;">ФАКТ с ЭД</div><div style="color:var(--btn-color); font-size:13px; font-weight:normal; margin-bottom:2px; letter-spacing:-0.5px;">${fmtSum(pData.usl.total.fact + pData.usl.total.ed)}</div><div><span style="color:${getDynColor(pData.usl.total.sumPctEd)}; font-size:10px; font-weight:bold;">${pData.usl.total.sumPctEd}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(pData.usl.total.pctEd, pData.usl.total.targetPct)}; font-weight:bold; font-size:10px;">${pData.usl.total.pctEd}%</span></div></div></div></div></div>`;

    if (pData.groups && pData.groups.length > 0) {
        html += `<div class="inner-block card" style="margin-bottom:12px; padding:0; overflow:hidden; border:1px solid var(--border-color); background:var(--card-bg);"><div onclick="window.nomListOpen = !window.nomListOpen; document.getElementById('nom-list').classList.toggle('hidden'); document.getElementById('nom-icon').innerText = window.nomListOpen ? '▲' : '▼';" style="padding:14px; display:flex; justify-content:space-between; align-items:center; background:rgba(150, 150, 150, 0.05); cursor:pointer; transition:0.3s;"><span style="font-weight:bold; font-size:13px; color:var(--text-color);">Номенклатурные группы</span><span id="nom-icon" style="color:var(--text-color); font-size:12px; font-weight:bold;">${window.nomListOpen ? '▲' : '▼'}</span></div><div id="nom-list" class="${window.nomListOpen ? '' : 'hidden'}" style="padding:4px 14px; background:var(--card-bg);">` + pData.groups.map(g => {
            let n = g.name.toLowerCase(); let p = parse(g.plan); let f = parse(g.fact); let e = parse(g.factEd || g.ed); let fEd = f + e;
            let pct = (p > 0) ? ((f / p) * 100).toFixed(2).replace('.', ',') : "0,00"; let pctEd = (p > 0) ? ((fEd / p) * 100).toFixed(2).replace('.', ',') : "0,00";
            let hideEd = n.includes('сертификат') || n.includes('фишк') || n.includes('услуг');
            let edContent = hideEd ? '' : (e > 0 ? `<span style="display:flex; align-items:center; gap:4px;"><span style="color:var(--btn-color); font-weight:bold;">${fmtSum(e)}</span> <span style="color:${getDynColor(pctEd)}; font-size:9px; font-weight:bold; background:var(--inner-bg); padding:2px 4px; border-radius:4px;">${pctEd}%</span></span>` : '');
            return `<div style="padding:10px 0; border-bottom:1px solid var(--border-color);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:12px;"><span style="color:gray; font-weight:bold; font-size:13px;">${fmtSum(p)}</span><div style="display:flex; gap:12px; align-items:center;"><span style="display:flex; align-items:center; gap:4px;"><span style="color:#27ae60; font-weight:bold;">${fmtSum(f)}</span> <span style="color:${getDynColor(pct)}; font-size:9px; font-weight:bold; background:var(--inner-bg); padding:2px 4px; border-radius:4px;">${pct}%</span></span>${edContent}</div></div><div style="color:var(--desc-color); font-size:11px; line-height:1.2;">${g.name}</div></div>`;
        }).join('') + `</div></div>`;
    }

    html += `<div class="inner-block card" style="margin-bottom:12px; padding:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div style="text-align:left; font-size:14px; font-weight:bold; color:var(--text-color); margin-bottom:12px;">Выполнение по отделам</div>`;
    let buildRow = (dTo, dAks, dUsl, isFact) => { let fTo = isFact ? dTo.fact : dTo.plan; let fAks = isFact ? dAks.fact : dAks.plan; let fUsl = isFact ? dUsl.fact : dUsl.plan; let cTo = isFact ? '#27ae60' : 'var(--text-color)'; let lbl = isFact ? 'Факт' : 'План'; return `<div style="color:gray; font-size:9px; text-align:left;">${lbl}</div><div style="color:${cTo}; font-size:12px; font-weight:normal;">${fmtSum(fTo)}</div><div style="color:${cTo}; font-size:12px; font-weight:normal;">${fmtSum(fAks)}</div><div style="color:${cTo}; font-size:12px; font-weight:normal;">${fmtSum(fUsl)}</div>`; };
    for (let i = 0; i < 3; i++) {
        let d = ['cifra', 'mbt', 'kbt'][i]; let dTo = pData.to[d]; let dAks = pData.aks[d]; let dUsl = pData.usl[d]; let title = d === 'cifra' ? 'Цифра / ЧТ' : (d === 'mbt' ? 'МБТ' : 'КБТ');
        html += `<div style="background:var(--card-bg); border-radius:12px; padding:10px; margin-bottom:8px; border:1px solid var(--border-color);"><div style="font-weight:bold; font-size:12px; margin-bottom:8px; color:var(--text-color); text-align:left; border-bottom:1px solid rgba(150,150,150,0.1); padding-bottom:6px;">${title}</div><div style="display:grid; grid-template-columns: 35px 1fr 1fr 1fr; gap:6px; font-size:11px; text-align:center; align-items:center;"><div></div> <div style="color:gray; font-size:9px; text-transform:uppercase;">ТО</div> <div style="color:gray; font-size:9px; text-transform:uppercase;">АКС</div> <div style="color:gray; font-size:9px; text-transform:uppercase;">УСЛ</div>${buildRow(dTo, dAks, dUsl, false)}${buildRow(dTo, dAks, dUsl, true)}<div></div><div><span style="color:${getDynColor(dTo.pct)}; font-size:10px; font-weight:bold;">${dTo.pct}%</span></div><div><span style="color:${getDynColor(dAks.sumPct)}; font-size:10px; font-weight:bold;">${dAks.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(dAks.pct, dAks.targetPct)}; font-size:10px; font-weight:bold;">${dAks.pct}%</span></div><div><span style="color:${getDynColor(dUsl.sumPct)}; font-size:10px; font-weight:bold;">${dUsl.sumPct}%</span> <span style="color:gray; font-size:9px; font-weight:normal;">/</span> <span style="color:${getDynColor(dUsl.pct, dUsl.targetPct)}; font-size:10px; font-weight:bold;">${dUsl.pct}%</span></div></div></div>`;
    }
    html += `</div>`;
    if (pData.sellers && pData.sellers.length > 0) {
        html += `<div class="inner-block card" style="padding:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div style="text-align:left; font-size:14px; font-weight:bold; color:var(--text-color); margin-bottom:12px;">План на продавца</div>`;
        pData.sellers.forEach((s, idx) => { html += `<div style="padding:10px 0; border-bottom:${idx === pData.sellers.length - 1 ? 'none' : '1px solid var(--border-color)'};"><div style="font-size:13px; margin-bottom:8px; color:var(--text-color); font-weight:bold;">${s.name}</div><div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);"><div style="text-align:center;"><div style="color:gray; font-size:9px;">ТО</div><div style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(s.to)}</div></div><div style="text-align:center;"><div style="color:gray; font-size:9px;">АКС</div><div style="display:flex; justify-content:center; align-items:center; gap:4px;"><span style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(s.aks)}</span><span style="color:gray; font-weight:bold; font-size:9px;">${s.aksPct}%</span></div></div><div style="text-align:center;"><div style="color:gray; font-size:9px;">УСЛ</div><div style="display:flex; justify-content:center; align-items:center; gap:4px;"><span style="color:var(--text-color); font-size:13px; font-weight:normal; letter-spacing:-0.5px;">${fmtSum(s.usl)}</span><span style="color:gray; font-weight:bold; font-size:9px;">${s.uslPct}%</span></div></div></div></div>`; });
        html += `</div>`;
    }
    area.innerHTML = html;
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
                  if (reqType === "Запрос на штраф") { await supabaseClient.from('user_details').insert([{ iin: req.target_iin, type: "Штраф", action_text: metaObj.reason || req.details, points_motivation: -(Math.abs(parseFloat(metaObj.amount) || 0)), fine_money: -(Math.abs(parseFloat(metaObj.moneyAmount) || 0)), manager_iin: appState.iin }]); await supabaseClient.from('requests').insert([{ author_iin: req.author_iin, type: "Уведомление о штрафе", details: metaObj.reason || req.details, target_iin: req.target_iin, status: "notify_user_fine", metadata: metaObj }]); newStatus = "approved_notify_zav"; isHandled = true; responseMsg = "Одобрено"; }
                  else if (reqType === "Горячий чек") { await supabaseClient.from('user_details').insert([{ iin: req.author_iin, type: "Горячий чек", action_text: req.details, points_motivation: parseFloat(metaObj.pts) || 0, kpi_change: parseFloat(metaObj.bonus) || 0, manager_iin: appState.iin }]); newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; }
                  else if (reqType === "Продажа СЦ/Фокус" || reqType === "Продажа Trade-In") { let isTradeIn = reqType === "Продажа Trade-In"; let earnSourceType = isTradeIn ? "Trade-In" : (metaObj.type || reqType); let pts = isTradeIn ? 1 : (parseFloat(metaObj.pts) || 0); await supabaseClient.from('user_details').insert([{ iin: req.author_iin, type: reqType, category: earnSourceType, action_text: req.details, points_motivation: pts, kpi_change: 3, manager_iin: appState.iin }]); newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                      if (reqType === "Продажа СЦ/Фокус" && metaObj.row && metaObj.dept) { const todayStr = formatDateLocal(new Date()); const { data: scData } = await supabaseClient.from('store_sc_items').select('*').eq('date', todayStr).maybeSingle(); if (scData && scData.items_data) { let updatedItems = scData.items_data.filter(i => !(i.row === metaObj.row && i.dept === metaObj.dept && i.type === metaObj.type)); await supabaseClient.from('store_sc_items').update({ items_data: updatedItems }).eq('date', todayStr); } fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "markScSold", payload: { row: metaObj.row, dept: metaObj.dept, type: metaObj.type } }) }).catch(()=>{}); }
                  }
                  else if (reqType.includes("Баллы мотивации")) { let cost = -1; if (req.details.includes("30 мин")) cost = -0.5; else if (req.details.includes("1 час")) cost = -1; else if (req.details.includes("2 часа")) cost = -2; else if (req.details.includes("3 часа")) cost = -3; await supabaseClient.from('user_details').insert([{ iin: req.author_iin, type: "Использование", category: "Мотивация", action_text: req.details, points_motivation: cost, manager_iin: appState.iin }]); newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; }
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
                  let rawVal = String(r[kpiCol] || "").trim(); let btnPts = String(r[ptsCol] || "0").replace('%', '').replace(',', '.').trim();
                  if (btnName.startsWith("_")) {
                      let title = btnName.substring(1).trim(); let prefix = ""; let defKpi = "0";
                      if (rawVal.startsWith("_")) { let spaceIdx = rawVal.indexOf(" "); if (spaceIdx !== -1) { prefix = rawVal.substring(1, spaceIdx).trim(); defKpi = rawVal.substring(spaceIdx).replace('%', '').replace(',', '.').trim(); } else { prefix = rawVal.substring(1).trim(); } } else { defKpi = rawVal.replace('%', '').replace(',', '.').trim(); }
                      activePromoList = { title: title, prefix: prefix, defKpi: defKpi, items: [] }; localData.promoLists.push(activePromoList);
                  } else if (btnName.includes("*")) { 
                      activePromoList = null; let btnVal = rawVal.replace('%', '').replace(',', '.').trim(); freshHotChecks.push({ sub: currentSub, name: btnName.replace(/\*/g, '').trim(), val: btnVal, pts: btnPts }); 
                  } else { 
                      if (activePromoList) { 
                          let parsedName = btnName; let qty = null; let linkUrl = null;
                          let match = btnName.match(/(.*?)\[(\d+),\s*(http.*?)\]/);
                          if (match) { parsedName = match[1].trim(); qty = parseInt(match[2]); linkUrl = match[3].trim(); }
                          let btnVal = rawVal.replace('%', '').replace(',', '.').trim();
                          if (!btnVal || btnVal === "0") btnVal = activePromoList.defKpi;
                          if (qty === null || qty > 0) { activePromoList.items.push({ name: parsedName, val: btnVal, pts: btnPts, qty: qty, url: linkUrl, originalName: btnName }); }
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
              if (ptsMotivation !== 0 || ud.type === "Штраф") {
                  let histItem = { date: dateStr, type: ud.type, source: ud.category || ud.type, reason: ud.action_text || "", val: ptsMotivation > 0 ? "+" + ptsMotivation : ptsMotivation, approver: managerName, moneyFine: ud.fine_money || 0, kpiChange: kpiChange };
                  if (ud.type === "Продажа СЦ/Фокус" || ud.type === "Продажа Trade-In") { histItem.type = "Начисление"; histItem.source = ud.category || (ud.type === "Продажа Trade-In" ? "Trade-In" : "СЦ"); histItem.val = "+" + ptsMotivation; } else if (ud.type === "Использование") { histItem.type = "Использование"; histItem.source = "Мотивация"; } else if (ud.type === "Штраф") { histItem.type = "Штраф"; histItem.source = managerName; } else if (ud.type === "Горячий чек") { histItem.type = "Начисление"; histItem.source = "Горячий чек"; histItem.val = "+" + ptsMotivation; }
                  if (ud.iin === appState.iin) { myPtsHistory.push(histItem); }
                  if (empMap[ud.iin]) { empMap[ud.iin].ptsHistory.push(histItem); if (histItem.type === "Начисление") { empMap[ud.iin].pts.acc += ptsMotivation; if (histItem.source === "Trade-In") empMap[ud.iin].sales.trade++; else empMap[ud.iin].sales.sc++; } if (histItem.type === "Использование") empMap[ud.iin].pts.use += Math.abs(ptsMotivation); if (histItem.type === "Штраф") empMap[ud.iin].pts.fin += Math.abs(ptsMotivation); }
              }
              if (kpiChange !== 0) {
                  let kName = ud.action_text || ud.type; let kSource = ud.category || (ud.type.includes("Trade-In") ? "Trade-In" : ud.type);
                  if (ud.type.includes("СЦ/Фокус")) kSource = ud.category || "СЦ"; if (ud.type === "Горячий чек") { kName = ud.action_text; kSource = "Горячий чек"; }
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

function vibrate(ms = 50) { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light'); else if (navigator.vibrate) navigator.vibrate(ms); }
let autoScrollAnimation = true; let activeOutsTimer = null; let globalActiveOuts = []; let isUserPromoter = false; let currentAdminScDept = 'Цифра'; let currentEmpDept = 'Цифра'; let currentScTabDept = 'Цифра'; let pollingTimer = null; let lastActiveTab = 'time'; let processedReqIds = new Set(); let tradeInModelsGlobal = []; let selectedTradeInModel = null;
function saveMemory(key, value) { try { localStorage.setItem(key, value); } catch(e){} document.cookie = key + "=" + encodeURIComponent(value || "") + "; max-age=31536000; path=/"; }
function getMemory(key) { let val = null; try { val = localStorage.getItem(key); } catch(e){} if (!val) { let match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)')); if (match) val = decodeURIComponent(match[2]); } return val; }
function clearMemory() { try { localStorage.clear(); } catch(e){} let cookies = document.cookie.split("; "); for (let c of cookies) document.cookie = c.split("=")[0] + "=; max-age=0; path=/"; }

let appState = { token: getMemory("userToken"), iin: getMemory("userIIN"), firstName: getMemory("userName") || "", currentAction: getMemory("currentAction"), role: getMemory("userRole") || "Продавец", dept: getMemory("userDept") || "Цифра", lastInboxCount: 0 };
let savedScrollPos = {}; function formatShortName(fullName) { if (!fullName) return ""; let p = String(fullName).trim().split(/\s+/); if (p.length > 1 && p[1]) return p[0] + " " + p[1].charAt(0).toUpperCase() + "."; return p[0]; }
let globalSellers = []; let globalScItems = []; let adminScItemsGlobal = []; let selectedScItem = null; let myReports = []; let myPointsHistory = []; let myDisplayPointsHistory = []; let myScHistory = []; let myKpiDetails = []; let allEmployeesData = []; let myMoneyFinesHistory = [];
function isCurrentMonth(dateStr) { if (!dateStr) return true; let d = new Date(); let m = ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear(); return String(dateStr).includes(m); }
function getMonthName(dateStr) { if(!dateStr) return "Неизвестно"; let parts = dateStr.split('.'); if(parts.length < 2) return dateStr; let m = parseInt(parts[0], 10); let months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]; return (months[m-1] || parts[0]) + " " + (parts[1].length === 4 ? parts[1] : parts[2] || ""); }
function parseCustomDate(dStr) { if (!dStr) return 0; let parts = String(dStr).split(' '); let dParts = parts[0].split('.'); if (dParts.length !== 3) return 0; let timeParts = parts[1] ? parts[1].split(':') : [0, 0]; return new Date(dParts[2], dParts[1] - 1, dParts[0], timeParts[0] || 0, timeParts[1] || 0).getTime(); }

function groupAndRenderByMonth(itemsArray, renderItemFn) {
    if (!itemsArray || itemsArray.length === 0) return "<p style='color:gray;text-align:center;font-size:13px;'>История пуста</p>";
    let sortedArray = [...itemsArray].sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
    let grouped = {}; let currentMonthKey = ("0" + (new Date().getMonth() + 1)).slice(-2) + "." + new Date().getFullYear();
    sortedArray.forEach(i => { let key = "Неизвестно"; let dStr = i.date || ""; let match = String(dStr).match(/\d{2}\.(\d{2}\.\d{4})/); if (match) key = match[1]; else if (String(dStr).match(/^\d{2}\.\d{4}$/)) key = dStr; if(!grouped[key]) grouped[key] = []; grouped[key].push(i); });
    let html = ""; for(let m in grouped) { if (m !== currentMonthKey && m !== "Неизвестно") { html += `<div style="text-align:center; color:var(--text-color); opacity: 0.6; font-size:11px; font-weight:bold; margin: 15px 0 8px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">${getMonthName(m)}</div>`; } grouped[m].forEach(i => { html += renderItemFn(i); }); } return html;
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

window.typingLockTime = 0; document.addEventListener('focusin', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') window.typingLockTime = Date.now(); }); document.addEventListener('input', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') window.typingLockTime = Date.now(); });
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

function setKpiColor(val, elCircle, elText) { let color = "#27ae60"; if (val >= 100) color = "#1e8449"; else if (val >= 80 && val < 90) color = "#f39c12"; else if (val < 80) color = "#e74c3c"; if(elCircle) { let trackColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; elCircle.style.background = `conic-gradient(${color} ${val > 100 ? 100 : val}%, ${trackColor} 0)`; } if(elText) elText.style.color = color; return color; }

function switchTab(tab, direction = null) {
  let scroller = document.getElementById("scrollable-body"); if (scroller && lastActiveTab) savedScrollPos[lastActiveTab] = scroller.scrollTop;
  if (tab !== 'details') lastActiveTab = tab; if(appState.token) loadDashboard(true);
  document.querySelectorAll('#main-tabs .icon-btn').forEach(btn => btn.classList.remove('active-tab')); 
  if(tab === 'time') document.getElementById('nav-time-icon').classList.add('active-tab'); if(tab === 'create') document.getElementById('nav-create-icon').classList.add('active-tab'); if(tab === 'inbox') document.getElementById('inbox-icon').classList.add('active-tab'); if(tab === 'adm-outs') document.getElementById('nav-adm-outs').classList.add('active-tab'); if(tab === 'adm-main') document.getElementById('nav-adm-main').classList.add('active-tab'); if(tab === 'adm-inbox') document.getElementById('nav-adm-inbox').classList.add('active-tab');
  document.querySelectorAll('#scrollable-body > div').forEach(el => el.classList.add("hidden"));
  let sections = document.querySelectorAll('#scrollable-body > div'); let animClass = 'slide-up-fade'; if (direction === 'right') animClass = 'slide-in-right'; else if (direction === 'left') animClass = 'slide-in-left';
  sections.forEach(s => { s.classList.remove('fade-in', 'slide-up-fade', 'slide-in-right', 'slide-in-left'); s.style.animation = 'none'; s.offsetHeight; s.style.animation = null; });
  let roleStr = String(appState.role).toLowerCase(); let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); let isZavSklad = roleStr.includes("заведующий складом"); let isSeller = !isUserPromoter && !isDir && !isZavSklad; 
  let isCreateTabActive = (tab === 'create'); let isAnyFormActive = isCreateTabActive && document.getElementById("menu-list").classList.contains("hidden"); let dash = document.getElementById("info-dashboard"); if (isSeller && tab !== 'details' && !isAnyFormActive) { if (dash.classList.contains("hidden")) { dash.classList.remove("hidden"); dash.classList.remove("fade-in", "slide-up-fade"); dash.classList.add("slide-down-fade"); } } else { dash.classList.add("hidden"); }
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
function formatPointsNoun(num) { let n = Math.abs(parseFloat(String(num).replace(',','.'))); if (isNaN(n)) return "баллов"; if (n % 1 !== 0) return "балла"; n = Math.floor(n) % 100; let n10 = n % 10; if (n >= 11 && n <= 19) return "баллов"; if (n10 === 1) return "балл"; if (n10 >= 2 && n10 <= 4) return "балла"; return "баллов"; }
function formatNumberWithSpaces(x) { if (!x) return "0"; return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

function submitPromoItem(el, submitType, fullText, valText, ptsText) {
    let promptMsg = `Подтверждаете продажу: ${fullText}?`;
    if (confirm(promptMsg)) {
        let pList = JSON.parse(localStorage.getItem("dashData_" + appState.iin));
        let found = false;
        if(pList && pList.promoLists) {
            pList.promoLists.forEach(list => {
                list.items.forEach(item => {
                    let cName = list.prefix ? `${list.prefix} ${item.name}` : item.name;
                    if (cName === fullText && item.qty !== null && item.qty > 0) {
                        item.qty--; found = true;
                    }
                });
                list.items = list.items.filter(i => i.qty === null || i.qty > 0);
            });
            if(found) { localStorage.setItem("dashData_" + appState.iin, JSON.stringify(pList)); renderDashboardData(pList, true); }
        }
        let dStr = formatDateLocal(new Date()); let metaStr = JSON.stringify({ date: dStr, bonus: valText, pts: ptsText, type: submitType });
        executeSubmit("Продажа СЦ/Фокус", fullText, null, metaStr);
    }
}
