// utils.js

// === Работа с данными и хранилищем ===
export function saveMemory(key, value) { 
    try { localStorage.setItem(key, value); } catch(e){} 
    document.cookie = key + "=" + encodeURIComponent(value || "") + "; max-age=31536000; path=/"; 
}

export function getMemory(key) { 
    let val = null; 
    try { val = localStorage.getItem(key); } catch(e){} 
    if (!val) { 
        let match = document.cookie.match(new RegExp('(^| )' + key + '=([^;]+)')); 
        if (match) val = decodeURIComponent(match[2]); 
    } 
    return val; 
}

export function clearMemory() { 
    try { localStorage.clear(); } catch(e){} 
    let cookies = document.cookie.split("; "); 
    for (let c of cookies) document.cookie = c.split("=")[0] + "=; max-age=0; path=/"; 
}

export function safeIin(val) { 
    if(val === undefined || val === null) return ""; 
    return String(val).trim().replace(/^0+/, ''); 
}

// === Форматирование текста и чисел ===
export function fmtSum(val) { 
    if(!val) return "0"; 
    return String(Math.round(val)).replace(/\s/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, " "); 
}

export function formatShortName(fullName) { 
    if (!fullName) return ""; 
    let p = String(fullName).trim().split(/\s+/); 
    if (p.length > 1 && p[1]) return p[0] + " " + p[1].charAt(0).toUpperCase() + "."; 
    return p[0]; 
}

export function formatPointsNoun(num) { 
    let n = Math.abs(parseFloat(String(num).replace(',','.'))); 
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

// === Форматирование дат ===
export function formatDateLocal(d) { 
    if (!d) d = new Date(); 
    let y = d.getFullYear(); 
    let m = ("0" + (d.getMonth() + 1)).slice(-2); 
    let day = ("0" + d.getDate()).slice(-2); 
    return `${y}-${m}-${day}`; 
}

export function isCurrentMonth(dateStr) { 
    if (!dateStr) return true; 
    let d = new Date(); 
    let m = ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear(); 
    return String(dateStr).includes(m); 
}

export function getMonthName(dateStr) { 
    if(!dateStr) return "Неизвестно"; 
    let parts = dateStr.split('.'); 
    if(parts.length < 2) return dateStr; 
    let m = parseInt(parts[0], 10); 
    let months = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]; 
    return (months[m-1] || parts[0]) + " " + (parts[1].length === 4 ? parts[1] : parts[2] || ""); 
}

export function parseCustomDate(dStr) { 
    if (!dStr) return 0; 
    let parts = String(dStr).split(' '); 
    let dParts = parts[0].split('.'); 
    if (dParts.length !== 3) return 0; 
    let timeParts = parts[1] ? parts[1].split(':') : [0, 0]; 
    return new Date(dParts[2], dParts[1] - 1, dParts[0], timeParts[0] || 0, timeParts[1] || 0).getTime(); 
}

// === UI Утилиты (Уведомления и Вибрация) ===
export function requestNotificationPermission() { 
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission(); 
    }
}

export function showPushNotification(title, bodyText) { 
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: bodyText, icon: "icon.png" }); 
    }
}

export function showToast(msg, isError = false, duration = 3000) { 
    const t = document.getElementById("toast"); 
    t.innerText = msg; 
    t.style.background = isError ? "#e74c3c" : "#34495e"; 
    t.classList.add("show"); 
    if (duration !== 9999) setTimeout(() => t.classList.remove("show"), duration); 
}

export function vibrate(ms = 50) { 
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light'); 
    } else if (navigator.vibrate) {
        navigator.vibrate(ms); 
    }
}

// === Дизайн и Цвета ===
window.dynamicPrefixColors = window.dynamicPrefixColors || {};

export function getSourceColor(src) { 
    let originalSrc = String(src).trim();
    if (window.dynamicPrefixColors[originalSrc]) return window.dynamicPrefixColors[originalSrc];
    
    let s = originalSrc.toLowerCase(); 
    if(s.includes('сц')) return '#e67e22'; 
    if(s.includes('trade-in')) return '#8e44ad'; 
    if(s.includes('горячий')) return '#e84393'; 
    if(s.includes('обмен')) return '#f39c12'; 
    if(s.includes('исправл')) return '#3498db'; 
    if(s.includes('мотивац')) return '#3390ec'; 
    
    let hash = 0; 
    for(let i = 0; i < s.length; i++) {
        hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ['#e74c3c', '#1abc9c', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#d35400', '#c0392b', '#f39c12'];
    return colors[Math.abs(hash) % colors.length] || '#7f8c8d'; 
}
