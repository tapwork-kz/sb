// api.js
import { formatDateLocal } from './utils.js';

// === КОНФИГУРАЦИЯ БАЗЫ ДАННЫХ ===
const SUPABASE_URL = 'https://qvkhfueivkwdqydnhlsr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mXpXBbeHRecrahRlDxkDAQ_Xe3zyb5G';
const GAS_URL = "https://script.google.com/macros/s/AKfycbxb2UW5ctVar9QhWmjI-IIFA1EOxDCovRDoNBcbN31x4L4-mCh1lGcF-ZdH-62pUrbR/exec";

// Экспортируем клиент, чтобы его можно было использовать для realtime-подписок в app.js
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Вспомогательная функция для определения группы лимитов
function getRoleGroup(roleText) {
    const r = (roleText || "").toLowerCase();
    if (r.includes("промоутер")) return "Промоутер";
    if (r.includes("продавец")) return "Продавец";
    return "Продавец";
}

// === ОСНОВНОЙ API ОБЪЕКТ ===
export const api = {
    
    // --- АВТОРИЗАЦИЯ ---
    async login(iin, password) {
        try {
            const { data, error } = await supabase.from('users').select('*').eq('iin', iin).single();
            
            if (error || !data) return { success: false, error: "Этот ИИН не найден в базе данных" };
            if (String(data.password) !== String(password)) return { success: false, error: "Неверный пароль" };
            if (data.login_status === false || String(data.login_status).toUpperCase() === 'FALSE') {
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
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // --- УЧЕТ РАБОЧЕГО ВРЕМЕНИ ---
    async startupCheck(iin, exactRole) {
        try {
            const roleGroup = getRoleGroup(exactRole); 
            const dayOfWeek = new Date().getDay() || 7; 
            const todayStart = new Date(); 
            todayStart.setHours(0, 0, 0, 0); 
            const currentHour = new Date().getHours();

            const [ { data: limitData }, { data: todayLogs } ] = await Promise.all([ 
                supabase.from('time_limits').select('*').eq('role_group', roleGroup).eq('day_of_week', dayOfWeek).maybeSingle(), 
                supabase.from('time_tracking').select('*, users(full_name, role, dept)').gte('created_at', todayStart.toISOString()).order('created_at', { ascending: true }) 
            ]);

            let activeOutsMap = {}; 
            let myLogs = [];

            (todayLogs || []).forEach(log => { 
                if (log.iin === iin) myLogs.push(log); 
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

            let myActiveAction = activeOutsMap[iin] ? activeOutsMap[iin].action : null; 
            let outByAction = { 'Перерыв': 0, 'Обед': 0, 'Полдник': 0 }; 
            let totalOut = 0;

            for (let key in activeOutsMap) { 
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

            const activeOuts = Object.values(activeOutsMap).map(o => { 
                let timerLimit = 10; 
                let rRole = String(o.role || "").toLowerCase(); 
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
            });

            return { 
                authorized: true, 
                activeOuts, 
                myActiveAction, 
                canBreak: hasBreakSlot, 
                canLunch: hasLunchSlot && isLunchTime && !tookLunch, 
                canSnack: hasSnackSlot && isSnackTime && !tookSnack 
            };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async recordAction({ iin, actionType, isReturn, isAutoReturn, exactRole }) {
        try {
            const roleGroup = getRoleGroup(exactRole); 
            if (!isReturn) {
                const currentHour = new Date().getHours();
                if (actionType === 'Обед' && (currentHour < 12 || currentHour >= 17)) return { success: false, error: "Обед доступен только с 12:00 до 17:00" };
                if (actionType === 'Полдник' && (currentHour < 16 || currentHour >= 20)) return { success: false, error: "Полдник доступен только с 16:00 до 20:00" };
                
                const dayOfWeek = new Date().getDay() || 7; 
                const limitField = actionType === 'Обед' ? 'lunch_limit' : (actionType === 'Полдник' ? 'snack_limit' : 'break_limit');
                const todayStart = new Date(); 
                todayStart.setHours(0,0,0,0);
                
                const [ { data: limitData }, { data: todayLogs } ] = await Promise.all([ 
                    supabase.from('time_limits').select('*').eq('role_group', roleGroup).eq('day_of_week', dayOfWeek).maybeSingle(), 
                    supabase.from('time_tracking').select('*, users(role)').gte('created_at', todayStart.toISOString()) 
                ]);

                if (actionType === 'Обед' || actionType === 'Полдник') { 
                    const hasTakenToday = (todayLogs || []).some(log => log.iin === iin && log.action_type === actionType && log.direction === 'Уход'); 
                    if (hasTakenToday) return { success: false, error: `Вы уже ходили на ${actionType.toLowerCase()} сегодня` }; 
                }
                
                const maxAllowed = limitData ? limitData[limitField] : 1; 
                const totalAllowed = limitData ? limitData.total_limit : 2;
                
                let userStates = {}; 
                (todayLogs || []).forEach(log => { 
                    let r = log.users ? log.users.role : log.role_group; 
                    if (String(r).toLowerCase().includes(roleGroup.toLowerCase())) { 
                        if (log.direction === 'Уход') userStates[log.iin] = log.action_type; 
                        else delete userStates[log.iin]; 
                    } 
                });
                
                let activeCounts = { 'Перерыв': 0, 'Обед': 0, 'Полдник': 0 }; 
                let totalOut = 0; 
                for (let key in userStates) { activeCounts[userStates[key]]++; totalOut++; }
                
                if (activeCounts[actionType] >= maxAllowed || totalOut >= totalAllowed) {
                    return { success: false, error: `Мест на ${actionType} нет` };
                }
            }

            let direction = isReturn ? (isAutoReturn ? 'Автовозврат' : 'Возврат') : 'Уход'; 
            let roleToSave = roleGroup === 'Промоутер' ? exactRole : roleGroup;
            
            const { error } = await supabase.from('time_tracking').insert([{ iin: iin, action_type: actionType, direction: direction, role_group: roleToSave }]);
            
            if (error) return { success: false, error: "Ошибка записи в БД" };
            return { success: true, savedAction: isReturn ? null : actionType };
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    async forceAutoReturn(iin, actionType, roleGroup) {
        const todayStart = new Date(); 
        todayStart.setHours(0,0,0,0); 
        const { data } = await supabase.from('time_tracking').select('*').eq('iin', iin).eq('action_type', actionType).in('direction', ['Возврат', 'Автовозврат']).gte('created_at', todayStart.toISOString()); 
        if (!data || data.length === 0) { 
            await supabase.from('time_tracking').insert([{ iin: iin, action_type: actionType, direction: 'Автовозврат', role_group: roleGroup }]); 
        }
    },

    // --- ОБРАБОТКА ЗАЯВОК (АДМИН/ЮЗЕР) ---
    async processRequest({ reqId, reqAction, replyText, currentIin }) {
        try {
            const { data: req, error: reqErr } = await supabase.from('requests').select('*').eq('id', reqId).single(); 
            const { data: currentUser } = await supabase.from('users').select('*').eq('iin', currentIin).single();
            
            if (reqErr || !req) return { success: false, error: "Запрос не найден" };
            
            let currentStatus = String(req.status || "").trim().toLowerCase(); 
            let reqType = String(req.type || "").trim(); 
            let newStatus = currentStatus; 
            let newDetails = req.details; 
            let metaObj = {}; 
            
            try { metaObj = typeof req.metadata === 'string' ? JSON.parse(req.metadata) : (req.metadata || {}); } catch(e){} 
            
            let isHandled = false; 
            let responseMsg = "Обработано";

            if (["approved", "rejected", "rejected_by_user", "viewed"].includes(currentStatus) && !reqAction.includes("dismiss")) { 
                return { success: false, error: `Уже обработана` }; 
            }

            // Логика переходов статусов
            if ((currentStatus === "rejected_notify_zav" || currentStatus === "approved_notify_zav") && reqAction === "dismiss_notification") { 
                newStatus = currentStatus.includes("rejected") ? "rejected" : "approved"; isHandled = true; responseMsg = "Ознакомлен"; 
            }
            else if (currentStatus === "notify_user_fine" && reqAction === "dismiss_notification") { 
                newStatus = "viewed_fine"; isHandled = true; responseMsg = "Ознакомлен"; 
            }
            else if ((currentStatus === "pending_user_reply" || currentStatus === "pending_admin_view_remark") && reqAction === "dismiss_notification") { 
                if (!metaObj.dismissedBy) metaObj.dismissedBy = []; 
                if (!metaObj.dismissedBy.includes(currentIin)) metaObj.dismissedBy.push(currentIin); 
                isHandled = true; responseMsg = "Перенесено в историю"; 
            }
            else if (currentStatus === "pending_user" && reqAction === "approve_user") { 
                newStatus = "pending_admin"; isHandled = true; responseMsg = "Отправлено директору"; 
            }
            else if (currentStatus === "pending_user" && reqAction === "reject_user") { 
                newStatus = "rejected_by_user"; isHandled = true; responseMsg = "Отклонено"; 
            }
            else if (currentStatus === "rejected_notify_user" && reqAction === "dismiss_rejection") { 
                newStatus = "rejected"; isHandled = true; responseMsg = "Скрыто"; 
            }
            else if (currentStatus === "pending_user_reply" && reqAction === "reply_remark") { 
                let safeReply = replyText ? replyText.substring(0, 500) : "Без комментариев"; 
                let targetShort = currentUser.full_name; 
                let parts = String(targetShort).trim().split(/\s+/); 
                if(parts.length > 1) targetShort = parts[0] + " " + parts[1].charAt(0).toUpperCase() + "."; 
                newDetails = req.details + `\n\n> ${targetShort}\n${safeReply}`; 
                newStatus = "pending_admin_view_remark"; isHandled = true; responseMsg = "Ответ отправлен"; 
            }
            else {
                // Блок для руководителей
                let roleStr = String(currentUser.role).toLowerCase(); 
                let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер");
                
                if (isDir) {
                    if (reqAction === "reject_admin") { 
                        metaObj.approver = currentUser.full_name; 
                        metaObj.approverIin = currentIin; 
                        newDetails = req.details; 
                        newStatus = reqType === "Запрос на штраф" ? "rejected_notify_zav" : "rejected_notify_user"; 
                        isHandled = true; responseMsg = "Отклонено"; 
                    }
                    else if ((currentStatus === "pending_admin_view" || currentStatus === "pending") && reqAction === "viewed") { 
                        newStatus = "viewed"; isHandled = true; responseMsg = "Просмотрено"; 
                    }
                    else if ((currentStatus === "pending_admin" || currentStatus === "pending") && reqAction === "approve_admin") {
                        metaObj.approver = currentUser.full_name; 
                        metaObj.approverIin = currentIin; 
                        newDetails = req.details; 
                        
                        if (reqType === "Запрос на штраф") { 
                            await supabase.from('user_details').insert([{ iin: req.target_iin, type: "Штраф", action_text: metaObj.reason || req.details, points_motivation: -(Math.abs(parseFloat(metaObj.amount) || 0)), fine_money: -(Math.abs(parseFloat(metaObj.moneyAmount) || 0)), manager_iin: currentIin }]); 
                            await supabase.from('requests').insert([{ author_iin: req.author_iin, type: "Уведомление о штрафе", details: metaObj.reason || req.details, target_iin: req.target_iin, status: "notify_user_fine", metadata: metaObj }]); 
                            newStatus = "approved_notify_zav"; isHandled = true; responseMsg = "Одобрено"; 
                        }
                        else if (reqType === "Горячий чек") { 
                            await supabase.from('user_details').insert([{ iin: req.author_iin, type: "Горячий чек", action_text: req.details, points_motivation: parseFloat(metaObj.pts) || 0, kpi_change: parseFloat(metaObj.bonus) || 0, manager_iin: currentIin }]); 
                            newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                        }
                        else if (reqType === "Продажа СЦ/Фокус" || reqType === "Продажа Trade-In" || metaObj.type || reqType === metaObj.type) { 
                            let earnSourceType = (reqType === "Продажа Trade-In") ? "Trade-In" : (metaObj.type || reqType); 
                            let pts = (reqType === "Продажа Trade-In") ? 1 : (parseFloat(metaObj.pts) || 0); 
                            let bonus = metaObj.bonus ? parseFloat(metaObj.bonus) : (reqType === "Продажа СЦ/Фокус" ? 3 : 0);
                            
                            await supabase.from('user_details').insert([{ iin: req.author_iin, type: reqType, category: earnSourceType, action_text: req.details, points_motivation: pts, kpi_change: bonus, manager_iin: currentIin }]); 
                            newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                            
                            if ((reqType === "Продажа СЦ/Фокус" || metaObj.type) && metaObj.row && metaObj.dept) { 
                                const todayStr = formatDateLocal(new Date()); 
                                const { data: scData } = await supabase.from('store_sc_items').select('*').eq('date', todayStr).maybeSingle(); 
                                if (scData && scData.items_data) { 
                                    let updatedItems = scData.items_data.filter(i => !(i.row === metaObj.row && i.dept === metaObj.dept && i.type === metaObj.type)); 
                                    await supabase.from('store_sc_items').update({ items_data: updatedItems }).eq('date', todayStr); 
                                } 
                                fetch(GAS_URL, { method: "POST", body: JSON.stringify({ action: "markScSold", payload: { row: metaObj.row, dept: metaObj.dept, type: metaObj.type } }) }).catch(()=>{}); 
                            }
                        }
                        else if (reqType.includes("Баллы мотивации")) { 
                            let cost = -1; 
                            if (req.details.includes("30 мин")) cost = -0.5; 
                            else if (req.details.includes("1 час")) cost = -1; 
                            else if (req.details.includes("2 часа")) cost = -2; 
                            else if (req.details.includes("3 часа")) cost = -3; 
                            await supabase.from('user_details').insert([{ iin: req.author_iin, type: "Использование", category: "Мотивация", action_text: req.details, points_motivation: cost, manager_iin: currentIin }]); 
                            newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                        }
                        else { 
                            newStatus = "approved"; isHandled = true; responseMsg = "Одобрено"; 
                        }
                    }
                }
            }

            if (isHandled) { 
                await supabase.from('requests').update({ status: newStatus, details: newDetails, metadata: metaObj }).eq('id', reqId); 
                return { success: true, msg: responseMsg }; 
            } else { 
                return { success: false, error: `Действие не распознано` }; 
            }
        } catch (err) {
            return { success: false, error: err.message };
        }
    },

    // --- ОТПРАВКА ДАННЫХ В БАЗУ ---
    async submitRemark({ authorIin, targetIin, targetName, text }) {
        const { error } = await supabase.from('requests').insert([{ author_iin: authorIin, type: "Замечание", details: text, target_iin: targetIin, status: "pending_user_reply", metadata: {} }]); 
        if (error) return { success: false, error: error.message }; 
        return { success: true };
    },

    async submitFine({ authorIin, targetIin, targetName, reason, amount, moneyAmount }) {
        const { data: currentUser } = await supabase.from('users').select('*').eq('iin', authorIin).single();
        let roleStr = String(currentUser.role).toLowerCase(); 
        let isDir = roleStr.includes("директор") || roleStr.includes("управляющий") || roleStr.includes("админ") || roleStr.includes("супервайзер"); 
        let isZavSklad = roleStr.includes("заведующий складом");
        
        let metaObj = { reason: reason, amount: amount, moneyAmount: moneyAmount }; 
        let ptsAmount = -(Math.abs(parseFloat(amount) || 0)); 
        let fineMoneyAmount = -(Math.abs(parseFloat(moneyAmount) || 0));
        
        if (isZavSklad) { 
            await supabase.from('requests').insert([{ author_iin: authorIin, type: "Запрос на штраф", details: reason, target_iin: targetIin, status: "pending_admin", metadata: metaObj }]); 
        } 
        else if (isDir) { 
            await supabase.from('user_details').insert([{ iin: targetIin, type: "Штраф", action_text: reason, points_motivation: ptsAmount, fine_money: fineMoneyAmount, manager_iin: authorIin }]); 
            await supabase.from('requests').insert([{ author_iin: authorIin, type: "Уведомление о штрафе", details: reason, target_iin: targetIin, status: "notify_user_fine", metadata: metaObj }]); 
        }
        return { success: true };
    },

    async submitGeneralRequest({ authorIin, type, details, targetIin, metadata }) {
        let metaObj = {}; 
        try { metaObj = metadata ? JSON.parse(metadata) : {}; } catch(e) {}
        const { error } = await supabase.from('requests').insert([{ author_iin: authorIin, type: type, details: details, target_iin: targetIin, status: "pending", metadata: metaObj }]);
        if (error) return { success: false, error: error.message }; 
        return { success: true };
    },

    // --- ПЛАНЫ ПРОДАЖ ---
    async fetchPlanHistory(startD, endD) {
        const { data, error } = await supabase.from('store_plans').select('*').gte('date', startD).lte('date', endD).order('date', { ascending: false });
        if (error) return { error: error.message };
        return { data };
    },

    // --- ГЛОБАЛЬНАЯ ЗАГРУЗКА ДАШБОРДА ---
    async getDashboardData(currentIin) {
        try {
            const { data: userData, error: userErr } = await supabase.from('users').select('*').eq('iin', currentIin).maybeSingle();
            if (userErr || !userData) return { authorized: false };

            let localData = {}; 
            const [ 
                { data: allUsers }, 
                { data: allReqs }, 
                { data: allUserDetails }, 
                { data: kpiDataRaw }, 
                { data: allSheetInfo }, 
                { data: scItemsRaw }, 
                { data: tradeInRaw } 
            ] = await Promise.all([ 
                supabase.from('users').select('iin, full_name, role, dept'), 
                supabase.from('requests').select('*').order('created_at', { ascending: false }), 
                supabase.from('user_details').select('*').order('created_at', { ascending: false }), 
                supabase.from('sheet_kpi_params').select('*').order('date', { ascending: false }).limit(1), 
                supabase.from('user_sheet_info').select('*'), 
                supabase.from('store_sc_items').select('*').order('date', { ascending: false }).limit(1), 
                supabase.from('trade_in_models').select('model_name').order('sort_order', { ascending: true }) 
            ]);

            let finalScItems = (scItemsRaw && scItemsRaw.length > 0 && scItemsRaw[0].items_data) ? scItemsRaw[0].items_data : []; 
            let tradeInList = (tradeInRaw && tradeInRaw.length > 0) ? tradeInRaw.map(item => item.model_name) : [];
            
            let kpiCfg = { base: 80, rev: -5, revsn: -5, price: -4, ub: -7, bl: -1, pr: -10 }; 
            let freshHotChecks = [];

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

                window.dynamicPrefixColors = window.dynamicPrefixColors || {};
                const allDeptsCols = [
                    {n: 'col_e_cifra_name', k: 'col_f_cifra_kpi', p: 'col_g_cifra_pts'},
                    {n: 'col_h_mbt_name', k: 'col_i_mbt_kpi', p: 'col_j_mbt_pts'},
                    {n: 'col_k_kbt_name', k: 'col_l_kbt_kpi', p: 'col_m_kbt_pts'}
                ];
                
                allDeptsCols.forEach(cols => {
                    rows.forEach(r => {
                        let btnName = String(r[cols.n] || "").trim();
                        let rawVal = String(r[cols.k] || "").trim();
                        let rawPts = String(r[cols.p] || "").trim();
                        
                        if (btnName.startsWith("_") && rawVal.startsWith("_") && rawPts.startsWith("_#")) {
                            let prefix = rawVal.indexOf(" ") !== -1 ? rawVal.substring(1, rawVal.indexOf(" ")).trim() : rawVal.substring(1).trim();
                            let listColor = rawPts.indexOf(" ") !== -1 ? rawPts.substring(1, rawPts.indexOf(" ")).trim() : rawPts.substring(1).trim();
                            if (prefix) window.dynamicPrefixColors[prefix] = listColor;
                        }
                    });
                });

                let d = String(userData.dept).toLowerCase(); 
                let nameCol, kpiCol, ptsCol;
                
                if (d.includes("цифра") || d.includes("чт")) { nameCol = 'col_e_cifra_name'; kpiCol = 'col_f_cifra_kpi'; ptsCol = 'col_g_cifra_pts'; }
                else if (d.includes("мбт")) { nameCol = 'col_h_mbt_name'; kpiCol = 'col_i_mbt_kpi'; ptsCol = 'col_j_mbt_pts'; }
                else if (d.includes("кбт")) { nameCol = 'col_k_kbt_name'; kpiCol = 'col_l_kbt_kpi'; ptsCol = 'col_m_kbt_pts'; }
                
                if (nameCol) {
                    let currentSub = ""; 
                    let activePromoList = null; 
                    localData.promoLists = []; 
                    freshHotChecks = [];
                    
                    rows.forEach(r => {
                        let btnName = String(r[nameCol] || "").trim(); 
                        if (!btnName) return;
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
                                if (prefix) window.dynamicPrefixColors[prefix] = listColor;
                            }
                            
                            activePromoList = { title: title, prefix: prefix, defKpi: defKpi, listColor: listColor, items: [] };
                            localData.promoLists.push(activePromoList);
                        } else if (btnName.includes("*")) { 
                            activePromoList = null; 
                            let btnVal = rawVal.replace('%', '').replace(',', '.').trim();
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

            let userMap = {}; 
            let adminEmployees = []; 
            let empMap = {};
            
            if (allUsers) {
                allUsers.forEach(u => {
                    userMap[u.iin] = u; 
                    let sInfo = (allSheetInfo || []).find(s => String(s.iin) === String(u.iin)) || { tabel_data: {bs:0, bl:0, pr:0, ot:0, rd:0}, reports_data: [] };
                    let kpiVal = kpiCfg.base; 
                    let kDetails = [{ name: "Базовый KPI", source: "База", val: kpiCfg.base, date: "" }]; 
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
                        if (penalty !== 0) { kpiVal += penalty; kDetails.push({ name: "Ошибки", source: rep.title, val: penalty, date: "" }); }
                    });
                    
                    let bBl = parseFloat(String(sInfo.tabel_data.bl || "0").replace(',', '.')) || 0; 
                    let bPr = parseFloat(String(sInfo.tabel_data.pr || "0").replace(',', '.')) || 0; 
                    let blPen = bBl * kpiCfg.bl; 
                    let prPen = bPr * kpiCfg.pr;
                    
                    kpiVal += blPen + prPen; 
                    if (blPen !== 0) kDetails.push({ name: "Больничный", source: "Табель", val: blPen, date: "" }); 
                    if (prPen !== 0) kDetails.push({ name: "Прогул", source: "Табель", val: prPen, date: "" });
                    
                    if (u.role.toLowerCase().includes("продавец")) {
                        let emp = { 
                            iin: u.iin, name: u.full_name, dept: u.dept || 'Цифра', role: u.role || 'Продавец', 
                            kpi: kpiVal, kpiDetails: kDetails, pts: { acc: 0, use: 0, rem: 0, fin: 0 }, 
                            sales: { sc: 0, trade: 0 }, reportErrors: repErrors, reports: sInfo.reports_data, 
                            ptsHistory: [], remarks: [], 
                            tabelStr: `<div class="tabel-item" style="color:#f39c12"><span class="tabel-lbl">БС.</span>${sInfo.tabel_data.bs}</div><div class="tabel-item" style="color:#e67e22"><span class="tabel-lbl">БЛ.</span>${sInfo.tabel_data.bl}</div><div class="tabel-item" style="color:#e74c3c"><span class="tabel-lbl">ПР.</span>${sInfo.tabel_data.pr}</div><div class="tabel-item" style="color:#f1c40f"><span class="tabel-lbl">ОТ.</span>${sInfo.tabel_data.ot}</div><div class="tabel-item" style="color:#27ae60"><span class="tabel-lbl">РД.</span>${sInfo.tabel_data.rd}</div>`, 
                            rawTabel: sInfo.tabel_data, directPenaltyPoints: directPenaltyPoints 
                        };
                        adminEmployees.push(emp); 
                        empMap[u.iin] = emp;
                    }
                });
            }

            // Экспортируем глобальную переменную для использования в UI (позже уберем глобалки, но пока сохраняем совместимость)
            window.adminEmployeesGlobal = adminEmployees;

            let myEmp = empMap[currentIin];
            if (!myEmp) { 
                let mySheet = (allSheetInfo || []).find(s => String(s.iin) === String(currentIin)) || { tabel_data: {bs:0, bl:0, pr:0, ot:0, rd:0}, reports_data: [] }; 
                localData.info = { tabel: mySheet.tabel_data, reports: mySheet.reports_data, kpiValue: kpiCfg.base, kpiDetails: [], baseKpi: kpiCfg.base, reportErrors: 0, directPenaltyPoints: 0, remarks: [], myPtsHistory: [] }; 
            } else { 
                localData.info = { tabel: myEmp.rawTabel, reports: myEmp.reports, kpiValue: myEmp.kpi, kpiDetails: myEmp.kpiDetails, baseKpi: kpiCfg.base, reportErrors: myEmp.reportErrors, directPenaltyPoints: myEmp.directPenaltyPoints, remarks: [], myPtsHistory: [] }; 
            }

            let myPtsHistory = []; 
            let myKpiChanges = 0;
            
            if (allUserDetails) {
                allUserDetails.forEach(ud => {
                    let d = new Date(ud.created_at); 
                    let dateStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                    let ptsMotivation = parseFloat(ud.points_motivation) || 0; 
                    let kpiChange = parseFloat(ud.kpi_change) || 0; 
                    let managerName = ud.manager_iin ? (userMap[ud.manager_iin]?.full_name || ud.manager_iin) : "";
                    
                    let dynamicType = ud.category || ud.type;
                    let cleanActionText = ud.action_text || "";
                    if (dynamicType && cleanActionText.startsWith(dynamicType + " ")) {
                        cleanActionText = cleanActionText.substring(dynamicType.length + 1).trim();
                    }

                    if (ptsMotivation !== 0 || ud.type === "Штраф") {
                        let histItem = { date: dateStr, type: ud.type, source: dynamicType, reason: cleanActionText, val: ptsMotivation > 0 ? "+" + ptsMotivation : ptsMotivation, approver: managerName, moneyFine: ud.fine_money || 0, kpiChange: kpiChange };
                        if (ud.type === "Штраф") { 
                            histItem.type = "Штраф"; histItem.source = managerName; 
                        } else if (ud.type === "Продажа СЦ/Фокус" || ud.type === "Продажа Trade-In" || ud.type === dynamicType) { 
                            histItem.type = "Начисление"; histItem.source = dynamicType; histItem.val = "+" + ptsMotivation; 
                        } else if (ud.type === "Использование") { 
                            histItem.type = "Использование"; histItem.source = "Мотивация"; 
                        } else if (ud.type === "Горячий чек") { 
                            histItem.type = "Начисление"; histItem.source = "Горячий чек"; 
                            let firstWord = String(cleanActionText).split(' ')[0];
                            if(firstWord && firstWord !== "Горячий" && cleanActionText.includes(firstWord + ' ')) { histItem.source = firstWord; }
                            histItem.val = "+" + ptsMotivation; 
                        }
                        
                        if (ud.iin === currentIin) { myPtsHistory.push(histItem); }
                        
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
                        let kName = cleanActionText || ud.type; 
                        let kSource = dynamicType;
                        let kpiItem = { name: kName, source: kSource, val: kpiChange, date: dateStr };
                        
                        if (ud.iin === currentIin) { 
                            if (!localData.info.kpiDetails) localData.info.kpiDetails = []; 
                            localData.info.kpiDetails.push(kpiItem); 
                            myKpiChanges += kpiChange; 
                        }
                        if (empMap[ud.iin]) { 
                            empMap[ud.iin].kpi += kpiChange; 
                            if (ud.iin !== currentIin) empMap[ud.iin].kpiDetails.push(kpiItem); 
                        }
                    }
                });
            }

            adminEmployees.forEach(e => { e.pts.rem = e.pts.acc - e.pts.use - e.pts.fin + e.directPenaltyPoints; });
            
            let myAcc = 0, myUse = 0, myFin = 0; 
            myPtsHistory.forEach(h => { 
                let pts = parseFloat(String(h.val).replace('+','').replace(',','.')) || 0; 
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

            let userInbox = [], userHistory = [], adminInbox = [], adminHistory = [];
            let isDir = userData.role.toLowerCase().includes("директор") || userData.role.toLowerCase().includes("управляющий") || userData.role.toLowerCase().includes("админ") || userData.role.toLowerCase().includes("супервайзер");
            let isZavSklad = userData.role.toLowerCase().includes("заведующий складом");

            if (allReqs) {
                allReqs.forEach(r => {
                    let author = userMap[r.author_iin] || {}; 
                    let target = userMap[r.target_iin] || {}; 
                    let d = new Date(r.created_at); 
                    let dateStr = ("0" + d.getDate()).slice(-2) + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + d.getFullYear() + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
                    
                    let reqObj = { 
                        id: r.id, date: dateStr, authorIin: r.author_iin, authorName: author.full_name || r.author_iin, 
                        authorRole: author.role || "Продавец", authorDept: author.dept || "", 
                        adminDisplayName: author.dept ? `${author.full_name} — ${author.dept}` : author.full_name, 
                        type: r.type, details: r.details, targetIin: r.target_iin, targetName: target.full_name || "", 
                        status: r.status === 'pending' ? 'pending_admin' : r.status, 
                        meta: r.metadata ? JSON.stringify(r.metadata) : "{}" 
                    };
                    
                    let isDismissedByMe = false; 
                    try { let m = r.metadata || {}; if (m.dismissedBy && m.dismissedBy.includes(currentIin)) isDismissedByMe = true; } catch(e) {}
                    
                    if (r.type === "Замечание" && (r.status === "approved" || r.status === "pending_user_reply" || r.status === "pending_admin_view_remark")) { 
                        if (empMap[r.target_iin]) empMap[r.target_iin].remarks.push({ details: r.details, authorName: author.full_name, authorRole: author.role, date: dateStr }); 
                        if (r.target_iin === currentIin) { 
                            if (!localData.info.remarks) localData.info.remarks = []; 
                            localData.info.remarks.push({ details: r.details, authorName: author.full_name, authorRole: author.role, date: dateStr }); 
                        } 
                    }
                    
                    if (isDir) { 
                        if (reqObj.status === "pending_admin" || reqObj.status === "pending_admin_view") adminInbox.push(reqObj); 
                        if (reqObj.status === "pending_admin_view_remark" && !isDismissedByMe) adminInbox.push(reqObj); 
                        if (reqObj.type === "Замечание" && reqObj.status === "pending_user_reply" && reqObj.authorIin !== currentIin && !isDismissedByMe) adminInbox.push(reqObj); 
                        if (["approved", "rejected", "viewed", "rejected_by_user", "rejected_notify_user", "approved_notify_zav", "rejected_notify_zav"].includes(reqObj.status) || isDismissedByMe) { 
                            if (adminHistory.length < 200) adminHistory.push(reqObj); 
                        } 
                    }
                    
                    if (isZavSklad) { 
                        if ((reqObj.status === "rejected_notify_zav" || reqObj.status === "approved_notify_zav") && reqObj.authorIin === currentIin) userInbox.push(reqObj); 
                        else if (reqObj.status === "pending_user" && reqObj.targetIin === currentIin) userInbox.push(reqObj); 
                        else if (reqObj.status === "rejected_notify_user" && reqObj.authorIin === currentIin) userInbox.push(reqObj); 
                        else if (reqObj.status === "pending_user_reply" && reqObj.targetIin === currentIin) userInbox.push(reqObj); 
                        else if (reqObj.type === "Замечание" && (reqObj.status === "pending_user_reply" || reqObj.status === "pending_admin_view_remark") && reqObj.targetIin !== currentIin && reqObj.authorIin !== currentIin && !isDismissedByMe) userInbox.push(reqObj); 
                        else if (reqObj.status === "notify_user_fine" && reqObj.targetIin === currentIin && !isDismissedByMe) userInbox.push(reqObj); 
                        
                        if (["approved", "rejected", "viewed", "rejected_by_user", "rejected_notify_user", "approved_notify_zav", "rejected_notify_zav", "viewed_fine"].includes(reqObj.status) || isDismissedByMe) { 
                            if (adminHistory.length < 200) adminHistory.push(reqObj); 
                        } 
                    }
                    
                    if (!isDir && !isZavSklad) { 
                        if (reqObj.status === "pending_user" && reqObj.targetIin === currentIin && !isDismissedByMe) userInbox.push(reqObj); 
                        else if (reqObj.status === "rejected_notify_user" && reqObj.authorIin === currentIin && !isDismissedByMe) userInbox.push(reqObj); 
                        else if (reqObj.status === "pending_user_reply" && reqObj.targetIin === currentIin && !isDismissedByMe) userInbox.push(reqObj); 
                        else if (reqObj.status === "notify_user_fine" && reqObj.targetIin === currentIin && !isDismissedByMe) userInbox.push(reqObj); 
                    }
                    
                    let isClosedForUser = ["approved", "rejected", "viewed", "rejected_by_user", "approved_notify_zav", "rejected_notify_zav", "rejected_notify_user", "viewed_fine"].includes(reqObj.status);
                    if ((reqObj.authorIin === currentIin || reqObj.targetIin === currentIin) && (isClosedForUser || (reqObj.status === "pending_admin_view_remark" && reqObj.targetIin === currentIin) || isDismissedByMe)) { 
                        if (userHistory.length < 50) userHistory.push(reqObj); 
                    }
                });
            }
            
            let mySellers = adminEmployees.filter(e => e.dept === userData.dept && e.iin !== currentIin).map(e => ({ iin: e.iin, name: e.name }));
            
            return { 
                authorized: true, role: userData.role, name: userData.full_name, dept: userData.dept, 
                isPromoter: userData.role.toLowerCase().includes("промоутер"), scItems: finalScItems, 
                adminScItems: finalScItems, tradeInModels: tradeInList, hotChecks: localData.hotChecks || [], 
                promoLists: localData.promoLists || [], info: localData.info, userHistory: userHistory, 
                userInbox: userInbox, adminInbox: adminInbox, adminHistory: adminHistory, 
                adminEmployees: adminEmployees, sellers: mySellers 
            };
        } catch (error) { 
            return { success: false, error: error.message }; 
        }
    }
};
