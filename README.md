# Habit Tracker — трекер привычек

Учебный проект по специальности **09.02.07 «Информационные системы и программирование»**.

Полноценное веб-приложение для отслеживания привычек: список привычек с расписанием,
ежедневные отметки, текущая и максимальная серия дней подряд, календарь активности,
статистика за неделю и месяц, резервное копирование и восстановление данных.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query, React Hook Form, Tailwind CSS, Recharts |
| Backend | Node.js 24, Express 5, TypeScript, Prisma 7, Zod, pino |
| База данных | PostgreSQL 18: роли и права, представления, триггеры, `pg_dump` / `pg_restore` |
| Тесты | Vitest (28 unit-тестов доменной логики) |
| Инфраструктура | npm workspaces, Caddy (HTTPS), PM2, Планировщик заданий Windows |

## Требования

- **Node.js 24+**
- **PostgreSQL 16+** (проверено на 18.6), запущенный локально на порту 5432
- Права суперпользователя PostgreSQL — нужны **один раз** для создания базы и ролей

## Быстрый старт (для другого компьютера)

```bat
:: 1. Первичная настройка (зависимости, БД, роли, миграции, демо-данные)
setup.bat

:: 2. Запуск приложения
start.bat
```

`start.bat` собирает проект (если нужно), применяет миграции, запускает сервер
и открывает браузер: **http://127.0.0.1:3000**. Один процесс раздаёт и API, и интерфейс.

Перед первым запуском `setup.bat` создаст `.env` из `.env.example` — заполните
`PG_SUPERUSER_USER`, `PG_SUPERUSER_PASSWORD`, пароли ролей и `JWT_*` секреты.

### Демонстрационные учётные записи

| Почта | Пароль | Роль |
|---|---|---|
| `demo@habit.local` | `Demo12345!` | пользователь |
| `admin@habit.local` | `Admin12345!` | администратор |

## Режим разработки

```bat
dev.bat
```

Откроются два окна: API (`http://127.0.0.1:3000`) и Vite (`http://127.0.0.1:5173`)
с горячей перезагрузкой и проксированием `/api` на сервер.

Либо вручную:

```powershell
npm install
npm run build:shared
npm run dev:server        # терминал 1
npm run dev:client        # терминал 2
```

## Полезные команды

| Команда | Назначение |
|---|---|
| `npm run build` | сборка shared + server + client |
| `npm run test` | unit-тесты доменной логики |
| `npm run typecheck` | проверка типов всех пакетов |
| `npm run db:migrate` | миграции Prisma (dev) |
| `npm run db:deploy -w @habit/server` | применение миграций (без shadow DB) |
| `npm run db:seed` | демонстрационные данные |
| `npm run db:studio -w @habit/server` | Prisma Studio |
| `scripts\backup.ps1` | резервная копия БД (`pg_dump` + SHA-256 + ротация) |
| `scripts\restore.ps1 -File <dump>` | восстановление БД с проверкой контрольной суммы |
| `scripts\setup-db.ps1` | создание базы и ролей PostgreSQL |

## Структура репозитория

```
apps/server        REST API: presentation → application → domain → infrastructure
apps/client        SPA на React
packages/shared    общие DTO и Zod-схемы (единый контракт клиента и сервера)
docs/              архитектура, БД, API, безопасность, резервное копирование
ops/               конфигурация сервера (Caddy, PM2, PostgreSQL)
scripts/           установка БД, резервное копирование и восстановление
setup.bat          первичная настройка
start.bat          запуск приложения одним процессом
dev.bat            запуск в режиме разработки
```

## Документация

- `docs/04-security-hardening.md` — усиление защиты PostgreSQL (scram-sha-256, localhost)
- `docs/05-backup-restore.md` — регламент резервного копирования и восстановления
- `docs/07-modules-mapping.md` — соответствие учебным модулям (ПМ02, ПМ04, ПМ11)

## Безопасность

- Argon2id для паролей, JWT access-токен 15 минут, refresh-токен в `httpOnly` cookie
  с ротацией и хешированием в БД;
- роли PostgreSQL с минимальными правами (`ht_app` не может менять схему);
- `helmet`, rate-limit, CORS-whitelist, валидация всех входных данных через Zod;
- журнал действий `audit_log`, журнал бэкапов `backup_jobs`;
- секреты — только в `.env`, файл исключён из git.

