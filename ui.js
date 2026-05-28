// ui.js
import { 
    fmtSum, getSourceColor, formatShortName, formatNumberWithSpaces, 
    formatPointsNoun, parseCustomDate, getMonthName, formatRemarkText, formatRemarkAuthor,
    isCurrentMonth, formatDateLocal
} from './utils.js';

// === БАЗОВЫЕ КОМПОНЕНТЫ ===
export function buildStandardRow(p) { 
    let borderStyle = p.hasBorder ? `border-left: 3px solid ${p.borderColor || p.typeColor};` : ''; 
    let titleWeight = p.isBoldTitle ? 'bold' : 'normal'; 
    let rightTopHtml = p.valText ? `<div class="${p.valClass}" style="margin-left:10px; font-weight:bold; white-space:nowrap; flex-shrink:0;">${p.valText}</div>` : ''; 
    let rightBottomHtml = p.nameText ? `<div style="color:gray; font-size:10px; white-space:nowrap; margin-left:8px; flex-shrink:0; text-align:right;">${p.nameText}</div>` : ''; 
    return `<div style="padding: 12px; border-bottom: 1px solid rgba(150,150,150,0.1); background: transparent; display: flex; flex-direction: column; justify-content: center; ${borderStyle}"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;"><div style="color:var(--text-color); font-size:12px; font-weight:${titleWeight}; flex:1; min-width:0; white-space:normal; word-break:break-word; line-height:1.3;">${p.title}</div>${rightTopHtml}</div><div style="display: flex; justify-content: space-between; align-items: center;"><div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0;"><b style="color:${p.typeColor}; font-size:10px;">${p.typeText}</b><span style="color:gray; font-size:10px;"> • ${p.dateText}</span></div>${rightBottomHtml}</div></div>`; 
}

export function generateHorizontalGrid(dataObj) { 
    if (!dataObj.headers || dataObj.headers.length === 0) return "<div style='padding:8px;text-align:center;color:gray;font-size:12px;'>Нет данных</div>"; 
    let gridCols = `repeat(${dataObj.headers.length}, 1fr)`; 
    let html = `<div class="grid-details-container inner-block"><div class="grid-details-title" style="margin-bottom: 6px;">${dataObj.title}</div><div class="grid-details-box" style="grid-template-columns: ${gridCols}; gap:3px;">`; 
    dataObj.headers.forEach(h => { html += `<div class="grid-details-header">${h || '-'}</div>`; }); 
    dataObj.values.forEach(v => { 
        let displayVal = '-'; 
        if (v === '✔') displayVal = '<span class="material-symbols-rounded icon-success" style="color:#27ae60;">task_alt</span>'; 
        else if (v === '✖') displayVal = '<span class="material-symbols-rounded icon-error" style="color:#e74c3c;">cancel</span>'; 
        else if (v === 'ПР') displayVal = '<span style="color:#e74c3c;font-weight:bold;">ПР</span>'; 
        else if (v !== '' && v !== '-') displayVal = `<span style="color:#f39c12;font-weight:bold;">${v}</span>`; 
        else displayVal = v || '-'; 
        html += `<div class="grid-details-value" style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:6px; padding:4px 0; display:flex; align-items:center; justify-content:center; min-height:28px; width:100%; box-sizing:border-box;">${displayVal}</div>`; 
    }); 
    html += `</div></div>`; return html; 
}

export function groupAndRenderByMonth(itemsArray, renderItemFn) {
    if (!itemsArray || itemsArray.length === 0) return "<p style='color:gray;text-align:center;font-size:13px;'>История пуста</p>";
    let sortedArray = [...itemsArray].sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
    let grouped = {}; let currentMonthKey = ("0" + (new Date().getMonth() + 1)).slice(-2) + "." + new Date().getFullYear();
    sortedArray.forEach(i => { let key = "Неизвестно"; let dStr = i.date || ""; let match = String(dStr).match(/\d{2}\.(\d{2}\.\d{4})/); if (match) key = match[1]; else if (String(dStr).match(/^\d{2}\.\d{4}$/)) key = dStr; if(!grouped[key]) grouped[key] = []; grouped[key].push(i); });
    let html = ""; for(let m in grouped) { if (m !== currentMonthKey && m !== "Неизвестно") { html += `<div style="text-align:center; color:var(--text-color); opacity: 0.6; font-size:11px; font-weight:bold; margin: 15px 0 8px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">${getMonthName(m)}</div>`; } grouped[m].forEach(i => { html += renderItemFn(i); }); } return html;
}

export function generateDatePanelHTML(idPrefix) {
    let d = new Date(); let defStart = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1)); let defEnd = formatDateLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return `<div class="inner-block card date-panel-wrapper" style="padding:12px; margin-bottom:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div class="no-swipe" style="display:flex; gap:6px; align-items:center;"><input type="date" id="${idPrefix}-start" value="${defStart}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; text-align:center; box-sizing:border-box; font-size:12px;"><span style="color:gray; font-weight:bold;">-</span><input type="date" id="${idPrefix}-end" value="${defEnd}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; text-align:center; box-sizing:border-box; font-size:12px;"><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="date" data-action="date-single" data-prefix="${idPrefix}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_today</span></button></div><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="month" data-action="date-month" data-prefix="${idPrefix}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_month</span></button></div><button class="btn-green" style="margin:0; border-radius:8px; width:36px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:0;" data-action="date-search" data-prefix="${idPrefix}"><span class="material-symbols-rounded" style="font-size:18px; color:white;">search</span></button></div></div>`;
}

export function setKpiColor(val, elCircle, elText) { 
    let color = "#27ae60"; 
    if (val >= 100) color = "#1e8449"; else if (val >= 80 && val < 90) color = "#f39c12"; else if (val < 80) color = "#e74c3c"; 
    if(elCircle) { let trackColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; elCircle.style.background = `conic-gradient(${color} ${val > 100 ? 100 : val}%, ${trackColor} 0)`; } 
    if(elText) elText.style.color = color; return color; 
}

// === РЕНДЕР ИСТОРИИ И ЗАЯВОК ===
export function renderUserInbox(uInbox, currentIin, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!uInbox || uInbox.length === 0) { container.innerHTML = "<p style='color:gray;text-align:center;font-size:13px;'>Уведомлений нет</p>"; return; }

    container.innerHTML = uInbox.map(r => { 
        let rawDesc = String(r.details || ""); let approverName = ""; let metaObj = {}; 
        try { metaObj = JSON.parse(r.meta || r.metadata || "{}"); } catch(e){} 
        let match = rawDesc.match(/\n\[(.*?)\]$/); if (match) { approverName = formatShortName(match[1]); rawDesc = rawDesc.replace(/\n\[(.*?)\]$/, "").trim(); } 
        if (metaObj.approver) approverName = formatShortName(metaObj.approver);
        let selDateHtml = metaObj.date ? `<br><span style="color:gray; font-size:11px; display:inline-flex; align-items:center; gap:4px; margin-top:2px;"><span class="material-symbols-rounded" style="font-size:12px;">calendar_today</span> Дата в заявке: <b>${metaObj.date}</b></span>` : ""; 
        let desc = formatRemarkText(rawDesc); let authorStr = r.type === "Замечание" ? formatRemarkAuthor(r.authorName, r.authorRole) : `<b>От:</b> ${r.authorName}`; let d = r.date ? String(r.date) : "";

        if (r.type === "Замечание" && (r.status === "approved" || r.status === "pending_user_reply" || r.status === "pending_admin_view_remark")) {
            if (r.targetIin === currentIin) {
                return `<div class="req-item" id="req-${r.id}" style="border-left-color: #f39c12;"><div class="req-title" style="color:#f39c12; display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">warning</span> Замечание <span style="float:right; color:gray; font-size:10px; font-weight:normal;">${d}</span></div><div class="req-desc" style="color:var(--text-color); font-size:13px;"><b style="color:#f39c12;">${authorStr}</b><br>${desc}${selDateHtml}</div><textarea id="remark-reply-${r.id}" placeholder="Ваша обратная связь..." style="box-sizing: border-box; width:100%; height:60px; margin-bottom:8px; border-radius:8px; padding:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color); font-family:inherit; resize:none;"></textarea><button class="btn-orange" data-action="reply_remark" data-id="${r.id}">Ответить</button></div>`;
            } else {
                return `<div class="req-item" id="req-${r.id}" style="border-left-color: #f39c12;"><div class="req-title" style="color:#f39c12; display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">warning</span> Замечание <span style="float:right; color:gray; font-size:10px; font-weight:normal;">${d}</span></div><div class="req-desc" style="color:var(--text-color); font-size:13px;"><b style="color:#f39c12;">${authorStr}</b><br><b>${r.targetName}</b> — ${desc}${selDateHtml}</div><div class="grid-btns" style="grid-template-columns: 1fr;"><button class="btn-gray" data-action="dismiss_notification" data-id="${r.id}">Просмотрено</button></div></div>`;
            }
        }
        if (r.status === "notify_user_fine") { 
            return `<div class="req-item" id="req-${r.id}" style="border-left-color: #e74c3c;"><div class="req-title" style="color:#e74c3c; display:flex; align-items:center; gap:4px;"><span class="material-symbols-rounded" style="font-size:16px;">gavel</span> Вам выписан штраф <span style="float:right; color:gray; font-size:10px; font-weight:normal;">${d}</span></div><div class="req-desc"><b style="color:#e74c3c;">${formatRemarkAuthor(r.authorName, r.authorRole)}</b><br><b>Причина:</b> ${desc}<br>Баллы: <b style="color:#e74c3c;">${metaObj.amount || 0}</b> | Сумма: <b style="color:#e74c3c;">${metaObj.moneyAmount || 0} ₸</b>${selDateHtml}</div><div class="grid-btns" style="grid-template-columns: 1fr;"><button class="btn-gray" data-action="dismiss_notification" data-id="${r.id}">Ознакомлен</button></div></div>`; 
        }
        return `<div class="req-item" id="req-${r.id}"><div class="req-title">Обмен сменами</div><div class="req-desc">${r.authorName || 'Коллега'} просит поменяться.<br><b>${desc}</b>${selDateHtml}</div><div class="grid-btns"><button class="btn-red" data-action="reject_user" data-id="${r.id}">Отклонить</button><button class="btn-green" data-action="approve_user" data-id="${r.id}">Одобрить</button></div></div>`; 
    }).join("");
}

export function renderActiveOuts(list, containerId, listId) {
    const container = document.getElementById(containerId); const listEl = document.getElementById(listId); 
    if (!list || list.length === 0) { container.classList.add("hidden"); return; } 
    container.classList.remove("hidden"); const now = Date.now(); 
    listEl.innerHTML = list.map(out => { 
        let elapsedMin = Math.floor((now - out.leftAt) / 60000); let diffMin = out.limit - elapsedMin; let timeClass = "", timeText = ""; let isProm = String(out.role || "").toLowerCase().includes('промоутер');
        if (diffMin <= 0 && !isProm) return ""; 
        if (diffMin > 0) { timeText = `${diffMin} мин`; } else { timeClass = "late"; timeText = `<span style="color:#e74c3c; font-size:9px; text-transform:uppercase;">Опаздывает</span><br>${Math.abs(diffMin)} мин!`; } 
        return `<div class="active-out-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(150,150,150,0.1);"><div style="flex: 1; min-width: 0; display: flex; flex-direction: column;"><span class="active-out-name" style="font-size: 13px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${out.name}</span><span style="font-size: 10px; color: gray; margin-top: 2px;">${isProm ? out.role : `Продавец — ${out.dept || 'Сотрудник'}`}</span></div><div style="width: 80px; text-align: center; font-size: 12px; font-weight: bold; color: var(--btn-color);">${out.action.includes("Перерыв") ? "Перерыв" : out.action}</div><div class="active-out-time ${timeClass}" style="width: 70px; text-align: right; font-size: 13px; font-weight: bold; line-height: 1.1;">${timeText}</div></div>`; 
    }).join(""); 
}

export function renderHistoryItem(i, isCompact = false) { 
    let rawNum = parseFloat(String(i.val).replace(',', '.').replace('+', '')) || 0; let valStr = String(rawNum).replace('.', ',');
    if (rawNum > 0 && !String(i.type).toLowerCase().includes('штраф')) { valStr = '+' + valStr; } else if (rawNum < 0) { valStr = '-' + Math.abs(rawNum).toString().replace('.', ','); }
    let col = String(i.type).toLowerCase().includes('начисл') || valStr.includes('+') ? 'detail-plus' : 'detail-minus'; if(String(i.type).toLowerCase().includes('штраф')) col = 'detail-fine'; 
    let srcColor = getSourceColor(i.source); let finalType = i.source; let finalColor = srcColor;
    if (String(i.type).toLowerCase().includes('использ')) { finalColor = "#f39c12"; finalType = "Мотивация"; } else if (String(i.type).toLowerCase().includes('штраф')) { finalColor = "#e74c3c"; finalType = "Штраф"; } else if (String(i.type).toLowerCase() === "kpi" && i.source === "Горячий чек") { finalColor = "#27ae60"; finalType = "Горячий чек"; col = "detail-plus"; i.approver = ""; }
    let rightText = formatShortName(String(i.type).toLowerCase().includes('штраф') ? i.source : i.approver);
    let bColor = rawNum > 0 ? "#27ae60" : (String(i.type).toLowerCase().includes('штраф') ? "#e74c3c" : "#f39c12");
    return buildStandardRow({ title: i.reason, typeText: finalType, typeColor: finalColor, borderColor: bColor, dateText: i.date, nameText: rightText, valText: valStr, valClass: col, hasBorder: isCompact });
}

export function renderMoneyFineItem(i) { 
    let moneyVal = parseFloat(String(i.moneyFine).replace(',', '.')) || 0; let ptsVal = parseFloat(String(i.val).replace(',', '.')) || 0; let badgeHtml = ""; 
    if (moneyVal !== 0) badgeHtml += `<span class="detail-fine" style="margin-left:10px; white-space:nowrap;">${formatNumberWithSpaces(String(moneyVal).replace('.',','))} ₸</span>`; 
    if (ptsVal !== 0) badgeHtml += `<span class="detail-fine" style="margin-left:10px; white-space:nowrap;">${String(ptsVal).replace('.',',')} б.</span>`; 
    if (badgeHtml === "") badgeHtml = `<span class="detail-fine" style="margin-left:10px;">0</span>`; 
    let issuerHtml = i.source ? `<span style="color:gray; font-size:10px; font-weight:normal;">${formatShortName(i.source)}</span>` : ''; 
    return `<div class="req-item" style="border-left-color: #e74c3c; border-left-width: 2px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;"><div style="flex:1;"><b style="font-size:12px; color:#e74c3c; display:inline-block; margin-bottom:3px;">Штраф</b><br><span style="color:var(--text-color); font-size:12px; display:inline-block; margin-bottom:3px;">${i.reason}</span><br><div style="display:flex; justify-content:space-between; align-items:center;"><div><span style="color:gray;font-size:10px;">${i.date}</span></div>${issuerHtml}</div></div><div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">${badgeHtml}</div></div>`; 
}
