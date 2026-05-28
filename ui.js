// ui.js
import { formatDateLocal, parseCustomDate, getMonthName } from './utils.js';

export function setKpiColor(val, elCircle, elText) { 
    let color = "#27ae60"; 
    if (val >= 100) color = "#1e8449"; else if (val >= 80 && val < 90) color = "#f39c12"; else if (val < 80) color = "#e74c3c"; 
    if(elCircle) { let trackColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'; elCircle.style.background = `conic-gradient(${color} ${val > 100 ? 100 : val}%, ${trackColor} 0)`; } 
    if(elText) elText.style.color = color; 
    return color; 
}

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
        if (v === '✔') displayVal = '<span class="material-symbols-rounded" style="font-size:18px; color:#27ae60;">check_circle</span>'; 
        else if (v === '✖') displayVal = '<span class="material-symbols-rounded" style="font-size:18px; color:#e74c3c;">cancel</span>'; 
        else if (v === 'ПР') displayVal = '<span style="color:#e74c3c;font-weight:bold;">ПР</span>'; 
        else if (v !== '' && v !== '-') displayVal = '<span style="color:#f39c12;font-weight:bold;">'+v+'</span>'; 
        else displayVal = v || '-'; 
        html += `<div class="grid-details-value" style="background:var(--bg-color); border:1px solid var(--border-color); border-radius:6px; padding:4px 0; display:flex; align-items:center; justify-content:center; min-height:28px; width:100%; box-sizing:border-box;">${displayVal}</div>`; 
    }); 
    html += `</div></div>`; 
    return html; 
}

export function groupAndRenderByMonth(itemsArray, renderItemFn) {
    if (!itemsArray || itemsArray.length === 0) return "<p style='color:gray;text-align:center;font-size:13px;'>История пуста</p>";
    let sortedArray = [...itemsArray].sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
    let grouped = {}; let currentMonthKey = ("0" + (new Date().getMonth() + 1)).slice(-2) + "." + new Date().getFullYear();
    sortedArray.forEach(i => { let key = "Неизвестно"; let dStr = i.date || ""; let match = String(dStr).match(/\d{2}\.(\d{2}\.\d{4})/); if (match) key = match[1]; else if (String(dStr).match(/^\d{2}\.\d{4}$/)) key = dStr; if(!grouped[key]) grouped[key] = []; grouped[key].push(i); });
    let html = ""; for(let m in grouped) { if (m !== currentMonthKey && m !== "Неизвестно") { html += `<div style="text-align:center; color:var(--text-color); opacity: 0.6; font-size:11px; font-weight:bold; margin: 15px 0 8px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">${getMonthName(m)}</div>`; } grouped[m].forEach(i => { html += renderItemFn(i); }); } return html;
}

export function generateDatePanelHTML(idPrefix, onChangeFuncName) {
    let d = new Date(); let defStart = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1)); let defEnd = formatDateLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return `<div class="inner-block card date-panel-wrapper" style="padding:12px; margin-bottom:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div class="no-swipe" style="display:flex; gap:6px; align-items:center;" ontouchstart="event.stopPropagation();" ontouchmove="event.stopPropagation();"><input type="date" id="${idPrefix}-start" value="${defStart}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><span style="color:gray; font-weight:bold;">-</span><input type="date" id="${idPrefix}-end" value="${defEnd}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="date" onchange="${onChangeFuncName}('single', this.value); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_today</span></button></div><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="month" onchange="${onChangeFuncName}('month', this.value); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_month</span></button></div><button class="btn-green" style="margin:0; border-radius:8px; width:36px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:0;" onclick="${onChangeFuncName}('search')"><span class="material-symbols-rounded" style="font-size:18px; color:white;">search</span></button></div></div>`;
}
