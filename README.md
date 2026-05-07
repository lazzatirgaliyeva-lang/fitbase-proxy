# Fitbase CORS Proxy — деплой на Vercel

## Быстрый старт (5 минут)

### 1. Загрузите проект на GitHub
Создайте новый репозиторий на github.com и загрузите все файлы из этой папки.

### 2. Задеплойте на Vercel
1. Зайдите на vercel.com → Sign up (бесплатно)
2. Нажмите "Add New Project" → Import из GitHub
3. Выберите ваш репозиторий → Deploy
4. Через 1 минуту получите URL вида: https://fitbase-proxy-xxx.vercel.app

### 3. Вставьте URL в дашборд
Скопируйте URL из Vercel и вставьте в поле "Proxy URL" в дашборде Fitness CEO Advisor.

## Как работает прокси

Дашборд → Vercel Proxy → Fitbase API

Запросы идут:
GET /api/proxy?path=v2/client&page=1
Headers: domain: f38915, Authorization: Bearer TOKEN

Прокси добавляет CORS-заголовки и пересылает запрос на api.fitbase.io

## Безопасность
- Токен хранится только в браузере пользователя
- Прокси не логирует данные
- Можно добавить CORS whitelist под конкретный домен
