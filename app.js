<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <meta charset="utf-8">
  <title>TapWork</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#f4f4f5">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="TapWork">
  <link rel="apple-touch-icon" href="icon.png">

  <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css">

  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
  
  <style>
    /* Небольшая корректировка для центрирования новых иконок в меню */
    .material-symbols-rounded {
      font-size: 24px;
      vertical-align: middle;
    }
  </style>
</head>
<body style="display: flex; flex-direction: column;">
  <div id="toast">Уведомление</div>
  <div id="loader-screen"><p style="color: gray; font-size: 16px; font-style: italic;">Идентификация...</p></div>
  
  <div id="auth-screen" class="hidden scrollable-content" style="max-width: 400px; margin: 0 auto; text-align:center; transition: opacity 0.6s ease;">
    <h2 style="margin-top:20px;">Вход в систему</h2>
    <p style="color:gray; font-size:14px;">Введите ваши данные</p>
    
    <input type="text" id="iin-input" placeholder="Введите ИИН (12 цифр)" inputmode="numeric">
    <input type="password" id="password-input" placeholder="Введите пароль">
    <button id="btn-login" class="btn-green" style="margin-top: 15px;">Войти</button>
    <div id="login-error" style="color: #e74c3c; text-align:center; margin-top: 10px;"></div>
  </div>

  <div id="main-screen" class="hidden" style="display:flex; flex-direction:column; height:100%; transition: opacity 0.6s ease;">
    <div class="fixed-header glass">
      <div class="header-container"><h2 id="user-greeting" style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;"></h2>
        <div class="top-icons" id="main-tabs">
          <div id="nav-time-icon" class="icon-btn active-tab hidden" data-tab="time"><span class="material-symbols-rounded">timer</span></div>
          <div id="nav-create-icon" class="icon-btn hidden" data-tab="create"><span class="material-symbols-rounded">add_box</span></div>
          <div id="nav-adm-outs" class="icon-btn hidden" data-tab="adm-outs"><span class="material-symbols-rounded">pending_actions</span></div>
          <div id="nav-adm-main" class="icon-btn hidden" data-tab="adm-main"><span class="material-symbols-rounded">dashboard</span></div>
          <div id="inbox-icon" class="icon-btn hidden" data-tab="inbox"><span class="material-symbols-rounded">inbox</span><span id="user-badge" class="badge hidden"></span></div>
          <div id="nav-adm-inbox" class="icon-btn hidden" data-tab="adm-inbox"><span class="material-symbols-rounded">mark_email_unread</span><span id="admin-badge" class="badge hidden"></span></div>
        </div>
      </div>
      <div class="banner-wrapper hidden fade-in" id="info-dashboard">
        <div class="info-wrapper">
          <div class="scrollable-blocks" id="scroll-container">
            <div class="info-box" id="btn-details-sc"><div class="info-box-title">СЦ | Brzy</div><div class="info-box-value" id="info-sc-val">- | -</div></div>
            <div class="info-box pts-box" id="btn-details-points"><div class="info-box-title">Мои баллы</div><div class="pts-grid" style="display:flex; gap:3px; margin-top:4px; width:100%; justify-content:space-between;"><div class="inner-block" style="border-radius:6px; padding:4px 2px; margin-bottom:0; flex:1;"><div style="font-size:8px; color:gray;">Нач.</div><div style="font-size:12px; font-weight:bold; color:#4d4d4d;" id="pt-acc">-</div></div><div class="inner-block" style="border-radius:6px; padding:4px 2px; margin-bottom:0; flex:1;"><div style="font-size:8px; color:gray;">Исп.</div><div style="font-size:12px; font-weight:bold; color:#4d4d4d;" id="pt-use">-</div></div><div class="inner-block" style="border-radius:6px; padding:4px 2px; margin-bottom:0; flex:1; background:rgba(41, 128, 185, 0.1);"><div style="font-size:8px; color:gray;">Ост.</div><div style="font-size:12px; font-weight:bold; color:#27ae60;" id="pt-rem">-</div></div><div class="inner-block" style="border-radius:6px; padding:4px 2px; margin-bottom:0; flex:1; background:rgba(231, 76, 60, 0.1);"><div style="font-size:8px; color:gray;">Штрф.</div><div style="font-size:12px; font-weight:bold; color:#e74c3c;" id="pt-fin">-</div></div></div></div>
            <div class="info-box" id="btn-details-report"><div class="info-box-title">Мои отчеты</div><div class="info-box-value" style="font-size:12px; line-height: 24px;">См. детали</div></div>
            <div class="info-box tabel-box" id="btn-details-tabel"><div class="info-box-title">Табель / Штрафы</div><div class="tabel-grid" id="info-tabel"></div></div>
          </div>
          <div class="info-box circle-box" id="btn-details-kpi"><div class="kpi-container" id="kpi-circle"><div class="kpi-inner"><span id="kpi-val" style="font-size:13px; font-weight:bold;">90%</span><span style="font-size:7px; color:gray; line-height:1; margin-top: 1px;">КФ. ЭФФ.</span></div></div></div>
        </div>
      </div>
    </div> 
    <div class="scrollable-content slide-up-fade" id="scrollable-body" style="padding-top: 5px;">
      
      <div id="content-time" class="hidden" style="max-width: 400px; margin: 0 auto; text-align:center;">
        <p id="action-hint" style="margin-bottom: 12px; font-weight:bold; padding-top: 5px; font-size:15px;">Загрузка лимитов...</p>
        <div id="standard-buttons">
            <button id="btn-break" class="btn-break" data-action="Перерыв" disabled><span>Перерыв</span><span class="desc" id="desc-break">10 мин</span></button>
            <button id="btn-lunch" class="btn-lunch" data-action="Обед" disabled><span>Обед</span><span class="desc" id="desc-lunch">40 мин</span></button>
            <button id="btn-snack" class="btn-snack" data-action="Полдник" disabled><span>Полдник</span><span class="desc" id="desc-snack">30 мин</span></button>
        </div>
        <div id="return-button-container" class="hidden"><button id="btn-return" class="btn-return"><span id="return-text">Вернуться</span></button></div>
        <div id="active-outs-container" class="active-outs-box hidden inner-block" style="background:var(--card-bg);"><div class="active-outs-title">В отсутствии:</div><div id="active-outs-list"></div></div>
      </div>
      
      <div id="content-create" class="hidden">...</div>
      <div id="content-inbox" class="hidden">...</div>
      <div id="content-adm-outs" class="hidden">...</div>
      <div id="content-adm-main" class="hidden">...</div>
      <div id="content-adm-inbox" class="hidden">...</div>
      <div id="content-details" class="hidden">...</div>

    </div>

  <script type="module" src="app.js"></script>
</body>
</html>
