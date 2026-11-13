# Развёртывание на локальном компьютере

> Раздел **ПП ПМ04**: настройка программного сервера, запуск, журналирование,
> защита и обслуживание. Приложение разворачивается как локальный HTTP-сервис,
> доступный по адресу `http://localhost:3000`.

## 1. Схема развёртывания

```
Браузер ──HTTP──> Node.js (Express + SPA) ──TCP 5432──> PostgreSQL 18
                  http://localhost:3000                127.0.0.1:5432
```

- Node.js раздаёт и API (`/api/*`), и собранный SPA — один процесс.
- PostgreSQL слушает **только** `127.0.0.1` (см. `docs/04-security-hardening.md`).
- Наружу ничего не публикуется: правило брандмауэра не требуется.

## 2. Требования

| Компонент | Версия |
|---|---|
| Windows | 10/11 |
| Node.js | 24+ |
| PostgreSQL | 16+ (проверено 18.6) |

## 3. Первый запуск

```bat
start.bat
```

Скрипт вызывает `scripts\bootstrap.ps1`, который:
1. находит `psql.exe`;
2. спрашивает суперпользователя PostgreSQL;
3. генерирует `.env` (случайные пароли ролей и JWT-секреты);
4. создаёт базу и четыре роли (`sql/00_roles.sql`);
5. выполняет `npm install`, `npm run build`, `prisma migrate deploy`, `prisma db seed`;
6. запускает сервер.

## 4. Последующие запуски

```bat
start.bat
```

Порядок действий внутри:
1. проверка Node.js;
2. если нет `node_modules` — `npm install`;
3. если нет `apps\client\dist` или `apps\server\dist` — `npm run build`;
4. `prisma migrate deploy` (применение новых миграций);
5. запуск `node apps\server\dist\index.js` с переменными:
   `NODE_ENV=production`, `SERVE_CLIENT=true`, `COOKIE_SECURE=false`;
6. открытие браузера `http://localhost:3000`.

Остановка — `Ctrl+C`.

## 5. Обновление версии

```bat
git pull
start.bat
```

`start.bat` сам пересоберёт проект и применит новые миграции.

## 6. Журналы и диагностика

| Что | Где |
|---|---|
| Логи API (JSON) | консоль `start.bat`, файлы `ops/logs/*.log` при ручном запуске |
| Журнал действий пользователей | таблица `audit_log` |
| Журнал резервных копий | таблица `backup_jobs` (виден в «Настройках») |
| Проверка работоспособности | `GET http://localhost:3000/api/health` |

Пример ответа health-check:

```json
{
  "status": "ok",
  "timestamp": "2026-11-13T21:01:58.000Z",
  "uptimeSec": 42,
  "database": { "ok": true, "latencyMs": 12 },
  "postgresVersion": "PostgreSQL 18.6 ..."
}
```

## 7. Типовые проблемы

| Симптом | Причина | Решение |
|---|---|---|
| `Node.js 24 or newer is required` | Node не установлен/старый | установить с nodejs.org |
| `PostgreSQL utilities (psql.exe) not found` | PostgreSQL не установлен | установить PostgreSQL 16+ |
| `Cannot connect to the database` | служба PostgreSQL остановлена | `Start-Service postgresql*` |
| `password authentication failed` | пароли в `.env` не совпадают с ролями БД | удалить `.env`, снова запустить `start.bat` |
| Порт 3000 занят | запущен другой экземпляр | закрыть предыдущее окно или изменить `PORT` в `.env` |
| Браузер не открылся | блокировка всплывающих окон | открыть `http://localhost:3000` вручную |

## 8. Резервное копирование и обслуживание

- пользовательский экспорт — «Настройки → Резервное копирование»;
- полная копия БД — `scripts\backup.ps1` (см. `docs/05-backup-restore.md`);
- восстановление — `scripts\restore.ps1 -File <dump>`;
- ежедневный запуск копии — задача Планировщика Windows (раздел 6 документа
  `docs/05-backup-restore.md`).

## 9. Защита

- приложение доступно только на петлевом интерфейсе (`HOST=127.0.0.1`);
- PostgreSQL слушает только `127.0.0.1`, аутентификация `scram-sha-256`;
- API работает под ролью `ht_app` без прав на изменение схемы;
- пароли и JWT-секреты хранятся в `.env` (исключён из git);
- refresh-cookie `httpOnly` + `SameSite=Strict`; по HTTP флаг `Secure` отключён
  (`COOKIE_SECURE=false`), при переходе на HTTPS его нужно включить;
- `helmet`, rate-limit на аутентификацию, валидация Zod, журнал аудита.

## 10. Ограничения локального режима

- нет TLS: трафик между браузером и сервером не шифруется (в пределах localhost);
- нет автоматического запуска при включении ПК — приложение запускается вручную
  файлом `start.bat` (по требованию к проекту);
- резервное копирование выполняется по расписанию Планировщика или вручную.
