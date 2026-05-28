// utils.js

export function safeIin(val) {
  if (val === undefined || val === null) return "";
  return String(val).trim().replace(/^0+/, '');
}

export function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied")
    Notification.requestPermission();
}

export function showPushNotification(title, bodyText) {
  if ("Notification" in window && Notification.permission === "granted")
    new Notification(title, { body: bodyText, icon: "icon.png" });
}

export function fmtSum(val) {
  if (!val) return "0";
  return String(Math.round(val)).replace(/\s/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatDateLocal(d) {
  if (!d) d = new Date();
  let y = d.getFullYear();
  let m = ("0" + (d.getMonth() + 1)).slice(-2);
  let day = ("0" + d.getDate()).slice(-2);
  return `${y}-${m}-${day}`;
}

export function parseCustomDate(dStr) {
  if (!dStr) return 0;
  let parts = String(dStr).split(' ');
  let dParts = parts[0].split('.');
  if (dParts.length !== 3) return 0;
  let timeParts = parts[1] ? parts[1].split(':') : [0, 0];
  return new Date(dParts[2], dParts[1] - 1, dParts[0], timeParts[0] || 0, timeParts[1] || 0).getTime();
}

export function formatShortName(fullName) {
  if (!fullName) return "";
  let p = String(fullName).trim().split(/\s+/);
  if (p.length > 1 && p[1]) return p[0] + " " + p[1].charAt(0).toUpperCase() + ".";
  return p[0];
}

export function getDeclension(action) {
  if (!action) return "";
  if (action.startsWith("Перерыв")) return "Перерыва";
  if (action === "Обед") return "Обеда";
  if (action === "Полдник") return "Полдника";
  return action.toLowerCase();
}

export function formatPointsNoun(num) {
  let n = Math.abs(parseFloat(String(num).replace(',', '.')));
  if (isNaN(n)) return "баллов";
  if (n % 1 !== 0) return "балла";
  n = Math.floor(n) % 100;
  let n10 = n % 10;
  if (n >= 11 && n <= 19) return "баллов";
  if (n10 === 1) return "балл";
  if (n10 >= 2 && n10 <= 4) return "балла";
  return "баллов";
}

export function formatNumberWithSpaces(x) {
  if (!x) return "0";
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function getSourceColor(src) {
  let originalSrc = String(src).trim();
  if (window.dynamicPrefixColors[originalSrc]) return window.dynamicPrefixColors[originalSrc];
  let s = originalSrc.toLowerCase();
  if (s.includes('сц')) return '#e67e22';
  if (s.includes('trade-in')) return '#8e44ad';
  if (s.includes('горячий')) return '#e84393';
  if (s.includes('обмен')) return '#f39c12';
  if (s.includes('исправл')) return '#3498db';
  if (s.includes('мотивац')) return '#3390ec';
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#e74c3c', '#1abc9c', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#f39c12'];
  return colors[Math.abs(hash) % colors.length] || '#7f8c8d';
}

export function buildStandardRow(p) {
  let borderStyle = p.hasBorder ? `border-left: 3px solid ${p.borderColor || p.typeColor};` : '';
  let titleWeight = p.isBoldTitle ? 'bold' : 'normal';
  let rightTopHtml = p.valText ? `<div class="${p.valClass}" style="margin-left:10px; font-weight:bold; white-space:nowrap; flex-shrink:0;">${p.valText}</div>` : '';
  let rightBottomHtml = p.nameText ? `<div style="color:gray; font-size:10px; white-space:nowrap; margin-left:8px; flex-shrink:0; text-align:right;">${p.nameText}</div>` : '';
  return `<div style="padding: 12px; border-bottom: 1px solid rgba(150,150,150,0.1); background: transparent; display: flex; flex-direction: column; justify-content: center; ${borderStyle}"><div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;"><div style="color:var(--text-color); font-size:12px; font-weight:${titleWeight}; flex:1; min-width:0; white-space:normal; word-break:break-word; line-height:1.3;">${p.title}</div>${rightTopHtml}</div><div style="display: flex; justify-content: space-between; align-items: center;"><div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0;"><b style="color:${p.typeColor}; font-size:10px;">${p.typeText}</b><span style="color:gray; font-size:10px;"> • ${p.dateText}</span></div>${rightBottomHtml}</div></div>`;
}

export function generateDatePanelHTML(idPrefix, onChangeFuncName) {
  let d = new Date();
  let defStart = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1));
  let defEnd = formatDateLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return `<div class="inner-block card date-panel-wrapper" style="padding:12px; margin-bottom:12px; background:var(--card-bg); border:1px solid var(--border-color);"><div class="no-swipe" style="display:flex; gap:6px; align-items:center;" ontouchstart="event.stopPropagation();" ontouchmove="event.stopPropagation();"><input type="date" id="${idPrefix}-start" value="${defStart}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><span style="color:gray; font-weight:bold;">-</span><input type="date" id="${idPrefix}-end" value="${defEnd}" style="flex:1; background:var(--card-bg); border:1px solid var(--border-color); color:var(--text-color); border-radius:8px; padding:0; height:36px; line-height:34px; text-align:center; box-sizing:border-box; margin:0; font-family:inherit; font-size:12px; letter-spacing:-0.5px; -webkit-appearance:none;"><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="date" onchange="${onChangeFuncName}('single', this.value); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_today</span></button></div><div style="position:relative; width:36px; height:36px; flex-shrink:0;"><input type="month" onchange="${onChangeFuncName}('month', this.value); this.value='';" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;"><button class="btn-gray" style="margin:0; width:100%; height:100%; border-radius:8px; padding:0; display:flex; justify-content:center; align-items:center; background:var(--card-bg); border: 1px solid var(--border-color); color:var(--text-color); font-size:16px;"><span class="material-symbols-rounded" style="font-size:18px;">calendar_month</span></button></div><button class="btn-green" style="margin:0; border-radius:8px; width:36px; height:36px; flex-shrink:0; display:flex; justify-content:center; align-items:center; padding:0;" onclick="${onChangeFuncName}('search')"><span class="material-symbols-rounded" style="font-size:18px; color:white;">search</span></button></div></div>`;
}

export function setPanelDates(type, val, idPrefix, reloadFn) {
  let endD = new Date();
  let startD = new Date();
  if (type === 'single') {
    if (val) {
      let parts = val.split('-');
      startD = new Date(parts[0], parts[1] - 1, parts[2]);
      endD = new Date(parts[0], parts[1] - 1, parts[2]);
    }
  } else if (type === 'month') {
    if (val) {
      let parts = val.split('-');
      startD = new Date(parts[0], parts[1] - 1, 1);
      endD = new Date(parts[0], parts[1], 0);
    }
  }
  if (type !== 'search') {
    document.getElementById(idPrefix + '-start').value = formatDateLocal(startD);
    document.getElementById(idPrefix + '-end').value = formatDateLocal(endD);
  }
  if (reloadFn) reloadFn();
}

export function groupAndRenderByMonth(itemsArray, renderItemFn) {
  if (!itemsArray || itemsArray.length === 0) return "<p style='color:gray;text-align:center;font-size:13px;'>История пуста</p>";
  let sortedArray = [...itemsArray].sort((a, b) => parseCustomDate(b.date) - parseCustomDate(a.date));
  let grouped = {};
  let currentMonthKey = ("0" + (new Date().getMonth() + 1)).slice(-2) + "." + new Date().getFullYear();
  sortedArray.forEach(i => {
    let key = "Неизвестно";
    let dStr = i.date || "";
    let match = String(dStr).match(/\d{2}\.(\d{2}\.\d{4})/);
    if (match) key = match[1];
    else if (String(dStr).match(/^\d{2}\.\d{4}$/)) key = dStr;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(i);
  });
  let html = "";
  for (let m in grouped) {
    if (m !== currentMonthKey && m !== "Неизвестно") {
      html += `<div style="text-align:center; color:var(--text-color); opacity: 0.6; font-size:11px; font-weight:bold; margin: 15px 0 8px 0; border-bottom: 1px solid var(--border-color); padding-bottom: 4px;">${getMonthName(m)}</div>`;
    }
    grouped[m].forEach(i => { html += renderItemFn(i); });
  }
  return html;
}

export function getMonthName(dateStr) {
  if (!dateStr) return "Неизвестно";
  let parts = dateStr.split('.');
  if (parts.length < 2) return dateStr;
  let m = parseInt(parts[0], 10);
  let months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
  return (months[m - 1] || parts[0]) + " " + (parts[1].length === 4 ? parts[1] : parts[2] || "");
}

export function renderHistoryItem(i, isCompact = false) {
  let roleStr = String(window.appState?.role || "").toLowerCase();
  let isDirOrZav = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер") || roleStr.includes("заведующий складом");
  let rawNum = parseFloat(String(i.val).replace(',', '.').replace('+', '')) || 0;
  let valStr = String(rawNum).replace('.', ',');
  if (rawNum > 0 && !String(i.type).toLowerCase().includes('штраф')) {
    valStr = '+' + valStr;
  } else if (rawNum < 0) {
    valStr = '-' + Math.abs(rawNum).toString().replace('.', ',');
  }
  let col = String(i.type).toLowerCase().includes('начисл') || valStr.includes('+') ? 'detail-plus' : 'detail-minus';
  if (String(i.type).toLowerCase().includes('штраф')) col = 'detail-fine';
  let srcColor = getSourceColor(i.source);
  let finalType = i.source;
  let finalColor = srcColor;
  if (String(i.type).toLowerCase().includes('использ')) { finalColor = "#f39c12"; finalType = "Мотивация"; }
  else if (String(i.type).toLowerCase().includes('штраф')) { finalColor = "#e74c3c"; finalType = "Штраф"; }
  else if (String(i.type).toLowerCase() === "kpi" && i.source === "Горячий чек") { finalColor = "#27ae60"; finalType = "Горячий чек"; col = "detail-plus"; i.approver = ""; }
  let rightText = isDirOrZav ? formatShortName(String(i.type).toLowerCase().includes('штраф') ? i.source : i.approver) : "";
  let bColor = rawNum > 0 ? "#27ae60" : (String(i.type).toLowerCase().includes('штраф') ? "#e74c3c" : "#f39c12");
  return buildStandardRow({ title: i.reason, typeText: finalType, typeColor: finalColor, borderColor: bColor, dateText: i.date, nameText: rightText, valText: valStr, valClass: col, hasBorder: isCompact });
}

export function renderMoneyFineItem(i) {
  let roleStr = String(window.appState?.role || "").toLowerCase();
  let isDirOrZav = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер") || roleStr.includes("заведующий складом");
  let moneyVal = parseFloat(String(i.moneyFine).replace(',', '.')) || 0;
  let ptsVal = parseFloat(String(i.val).replace(',', '.')) || 0;
  let badgeHtml = "";
  if (moneyVal !== 0) badgeHtml += `<span class="detail-fine" style="margin-left:10px; white-space:nowrap;">${formatNumberWithSpaces(String(moneyVal).replace('.', ','))} ₸</span>`;
  if (ptsVal !== 0) badgeHtml += `<span class="detail-fine" style="margin-left:10px; white-space:nowrap;">${String(ptsVal).replace('.', ',')} б.</span>`;
  if (badgeHtml === "") badgeHtml = `<span class="detail-fine" style="margin-left:10px;">0</span>`;
  let issuerHtml = (i.source && isDirOrZav) ? `<span style="color:gray; font-size:10px; font-weight:normal;">${formatShortName(i.source)}</span>` : '';
  return `<div class="req-item" style="border-left-color: #e74c3c; border-left-width: 2px; padding: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;"><div style="flex:1;"><b style="font-size:12px; color:#e74c3c; display:inline-block; margin-bottom:3px;">Штраф</b><br><span style="color:var(--text-color); font-size:12px; display:inline-block; margin-bottom:3px;">${i.reason}</span><br><div style="display:flex; justify-content:space-between; align-items:center;"><div><span style="color:gray;font-size:10px;">${i.date}</span></div>${issuerHtml}</div></div><div style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">${badgeHtml}</div></div>`;
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

export function formatRemarkAuthor(name, role) {
  let r = String(role || "руководителя").toLowerCase();
  let decl = "руководителя";
  if (r.includes("директор")) decl = "директора";
  else if (r.includes("супервайзер")) decl = "супервайзера";
  else if (r.includes("управляющ")) decl = "управляющего";
  else if (r.includes("админ")) decl = "администратора";
  else if (r.includes("заведующий складом") || r.includes("зав. складом")) decl = "заведующего";
  let parts = String(name).trim().split(/\s+/);
  let shortName = parts[0];
  if (parts.length > 1 && parts[1]) shortName += " " + parts[1].charAt(0).toUpperCase() + ".";
  return `От ${decl} ${shortName}`;
}

export function formatRemarkText(text, targetName = null) {
  if (!text) return "";
  let str = String(text);
  let splitRegex = /\n\n>\s*(.*?)\n/i;
  let parts = str.split(splitRegex);
  if (parts.length >= 3) {
    let main = parts[0];
    let authorLabel = parts[1];
    let quote = parts.slice(2).join("");
    return `${main}<div style="margin-top:8px; padding:8px 12px; background:var(--inner-bg); border-left:3px solid var(--btn-color); border-radius:0 8px 8px 0; font-style:italic; font-size:12px;"><b style="color:var(--btn-color); font-style:normal;">${authorLabel}</b><br>${quote}</div>`;
  }
  let oldRegex = /(Ответ.*?:\s*)/i;
  let oldParts = str.split(oldRegex);
  if (oldParts.length >= 3) {
    return `${oldParts[0]}<div style="margin-top:8px; padding:8px 12px; background:var(--inner-bg); border-left:3px solid var(--btn-color); border-radius:0 8px 8px 0; font-style:italic; font-size:12px;"><b style="color:var(--btn-color); font-style:normal;">${oldParts[1]}</b><br>${oldParts.slice(2).join("")}</div>`;
  }
  if (targetName) {
    let targetShort = targetName;
    let tParts = String(targetName).trim().split(/\s+/);
    if (tParts.length > 1 && tParts[1]) targetShort = tParts[0] + " " + tParts[1].charAt(0).toUpperCase() + ".";
    return `${str}<div style="margin-top:8px; padding:8px 12px; background:var(--inner-bg); border-left:3px solid gray; border-radius:0 8px 8px 0; font-style:italic; font-size:12px;"><b style="color:gray; font-style:normal;">${targetShort}</b><br><span style="color:gray;">Ожидает ответа...</span></div>`;
  }
  return str;
}

export function setKpiColor(val, elCircle, elText) {
  let color = "#27ae60";
  if (val >= 100) color = "#1e8449";
  else if (val >= 80 && val < 90) color = "#f39c12";
  else if (val < 80) color = "#e74c3c";
  if (elCircle) {
    let trackColor = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    elCircle.style.background = `conic-gradient(${color} ${val > 100 ? 100 : val}%, ${trackColor} 0)`;
  }
  if (elText) elText.style.color = color;
  return color;
}

export function vibrate(ms = 50) {
  const tg = window.Telegram?.WebApp;
  if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
  else if (navigator.vibrate) navigator.vibrate(ms);
}

export function saveMemory(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
  document.cookie = key + "=" + encodeURIComponent(value || "") + "; max-age=31536000; path=/";
}

export function getMemory(key) {
  let val = null;
  try { val = localStorage.getItem(key); } catch (e) {}
  if (!val) {
    let match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)'));
    if (match) val = decodeURIComponent(match[2]);
  }
  return val;
}

export function clearMemory() {
  try { localStorage.clear(); } catch (e) {}
  let cookies = document.cookie.split("; ");
  for (let c of cookies) document.cookie = c.split("=")[0] + "=; max-age=0; path=/";
}

export function isCurrentMonth(dateStr) {
  if (!dateStr) return true;
  let d = new Date();
  let m = ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
  return String(dateStr).includes(m);
}

export function showToast(msg, isError = false, duration = 3000) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.innerText = msg;
  t.style.background = isError ? "#e74c3c" : "#34495e";
  t.classList.add("show");
  if (duration !== 9999) setTimeout(() => t.classList.remove("show"), duration);
}

export function initSmartDates() {
  const today = formatDateLocal(new Date());
  document.querySelectorAll('.smart-date').forEach(el => {
    el.dataset.realdate = today;
    el.value = "Сегодня";
    el.addEventListener('focus', function() {
      this.type = 'date';
      this.value = this.dataset.realdate;
      if (this.showPicker) this.showPicker();
    });
    el.addEventListener('blur', function() {
      if (!this.value) this.value = today;
      this.dataset.realdate = this.value;
      if (this.value === today) {
        this.type = 'text';
        this.value = "Сегодня";
      } else {
        this.type = 'text';
        const d = new Date(this.value);
        this.value = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear();
      }
    });
    el.addEventListener('change', function() { this.blur(); });
  });
}

export function initAutoScroll() {
  const scroller = document.getElementById("scroll-container");
  if (!scroller) return;
  let scrollDir = 1;
  let autoScrollAnimation = true;
  let scrollTimer = setInterval(() => {
    if (!autoScrollAnimation || scroller.closest('.hidden')) return;
    scroller.scrollLeft += 1 * scrollDir;
    if (scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1) scrollDir = -1;
    else if (scroller.scrollLeft <= 0) scrollDir = 1;
  }, 40);
  scroller.addEventListener('touchstart', () => autoScrollAnimation = false, { passive: true });
  scroller.addEventListener('touchend', () => { setTimeout(() => autoScrollAnimation = true, 2000); }, { passive: true });
}
