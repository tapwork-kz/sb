const CACHE_NAME = 'motivation-app-v2'; // Поменяли на v2 для обновления
const urlsToCache = [
  './',
  './index.html',
  './styles.css',     // НОВОЕ: кэшируем стили
  './app.js',         // НОВОЕ: кэшируем логику
  './manifest.json',
  './icon.png'        // Добавил иконку, чтобы она тоже была в памяти
];

// Установка Service Worker и кэширование основных файлов
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Активация и удаление старых кэшей (очистит старый motivation-app-v1)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Перехват запросов (возвращаем кэш, если нет интернета)
self.addEventListener('fetch', event => {
  // Мы не кэшируем POST-запросы к Google Apps Script и Supabase API
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) return response; // Отдаем из кэша
        return fetch(event.request).catch(() => {
            // Если нет сети, запрос просто тихо умрет (мы это обрабатываем в app.js)
        });
      })
  );
});

// ============================================================================
// --- НОВОЕ: ОБРАБОТКА PUSH-УВЕДОМЛЕНИЙ ---
// ============================================================================

// 1. Слушаем сигнал с сервера (даже когда приложение закрыто)
self.addEventListener('push', function(event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json(); // Ожидаем JSON формат
        } catch (e) {
            data = { body: event.data.text() }; // Запасной вариант, если просто текст
        }
    }

    const title = data.title || "Новое уведомление";
    const options = {
        body: data.body || "У вас есть новые сообщения.",
        icon: './icon.png', // Главная иконка
        badge: './icon.png', // Маленькая иконка для строки состояния Android
        vibrate: [200, 100, 200, 100, 200], // Вибрация
        data: {
            url: data.url || '/' // URL, который откроется при клике
        }
    };

    // Показываем системное уведомление на телефоне
    event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Обработка клика пользователя по уведомлению
self.addEventListener('notificationclick', function(event) {
    event.notification.close(); // Закрываем уведомление

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            // Ищем уже открытую вкладку с приложением
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url && client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus(); // Фокусируемся на открытом приложении
                }
            }
            // Если приложение было полностью закрыто, открываем его
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
