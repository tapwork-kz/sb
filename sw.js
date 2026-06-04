const CACHE_NAME = 'motivation-app-v3'; // Подняли версию для принудительного обновления кэша на устройствах
const urlsToCache = [
  './',
  './index.html',
  './styles.css',     // Кэшируем стили приложения
  './app.js',         // Кэшируем основную логику приложения
  './manifest.json',
  './icon.png'        // Кэшируем иконку для работы в автономном режиме PWA
];

// Установка Service Worker и первоначальное кэширование основных файлов
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Кэш успешно открыт и инициализирован');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация и автоматическое удаление устаревших версий кэша
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Удаляем старый устаревший кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват сетевых запросов (стратегия Cache First с переходом в Network)
self.addEventListener('fetch', event => {
  // Не перехватываем и не кэшируем POST/PUT/DELETE запросы к Supabase API и бэкенду Google Apps Script
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response; // Если файл найден в кэше — мгновенно отдаем его
        
        // ИСПРАВЛЕНО: Убран пустой .catch(), возвращавший undefined.
        // Теперь сетевая ошибка при отсутствии интернета беспрепятственно летит в app.js,
        // где стабильно и безопасно обрабатывается локальными блоками try/catch.
        return fetch(event.request); 
      })
  );
});

// ============================================================================
// --- ОБРАБОТКА PUSH-УВЕДОМЛЕНИЙ И НАВИГАЦИИ ---
// ============================================================================

// 1. Прием push-сигнала от серверов Supabase (работает даже при закрытом приложении)
self.addEventListener('push', function(event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json(); // Ожидаем структурированный JSON-пакет
        } catch (e) {
            data = { body: event.data.text() }; // Резервный случай, если пришел чистый текст
        }
    }

    const title = data.title || "Новое уведомление";
    const options = {
        body: data.body || "У вас есть новые сообщения во входящих.",
        icon: './icon.png', // Главное изображение пуша
        badge: './icon.png', // Маленький значок для панели уведомлений Android
        vibrate: [200, 100, 200, 100, 200], // Шаблон вибрации устройства
        data: {
            // Передаем абсолютный или относительный URL-маршрут на вкладку приложения
            url: data.url || 'https://tapwork-kz.github.io/sb/#inbox' 
        }
    };

    // Отображаем уведомление в операционной системе смартфона/ПК
    event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Обработка клика пользователя по всплывающему пуш-уведомлению
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Сразу убираем пуш с экрана устройства
    
    // ИСПРАВЛЕНО: Безопасное извлечение целевого URL-адреса с защитой от пустых метаданных
    const targetUrl = event.notification.data && event.notification.data.url 
        ? event.notification.data.url 
        : 'https://tapwork-kz.github.io/sb/#inbox';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Шаг А: Проверяем, запущено ли наше приложение на телефоне прямо сейчас (вкладка открыта или свернута)
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                // Ищем по совпадению домена размещения (self.location.origin)
                if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
                    
                    // МГНОВЕННО шлем postMessage команду на переход во "Входящие" внутрь app.js
                    if (client.postMessage) {
                        client.postMessage({ action: 'navigate', url: targetUrl });
                    }
                    
                    // Разворачиваем свернутую вкладку приложения на весь экран устройства
                    return client.focus(); 
                }
            }
            
            // Шаг Б: Если приложение было полностью закрыто пользователем или выгружено системой из памяти —
            // мы принудительно открываем окно браузера с точным URL из пуш-пакета
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
