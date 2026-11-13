# Соответствие учебным модулям

> Карта «модуль → артефакт → как показать на защите».
> Все пути указаны относительно корня репозитория.

## УП ПМ02 — разработка программных модулей

| Что требуется | Артефакт в проекте |
|---|---|
| Разработка модулей ПО | `apps/server/src/modules/*` (auth, habits, entries, stats, backup) |
| Разработка интерфейса | `apps/client/src/pages`, `apps/client/src/features`, `components/ui` |
| Валидация пользовательского ввода | Zod-схемы в `packages/shared/src/schemas.ts`, middleware `validate.ts` |
| Тестирование и отладка | `apps/server/tests/unit` (28 тестов), `npm test` |
| Обработка ошибок | `middleware/error-handler.ts`, `errors/app-error.ts` |

**Демонстрация:** создание привычки через UI → проверка данных в Prisma Studio →
некорректный ввод (пустое название, дата в будущем) → понятная ошибка 400.

## ПП ПМ02 — архитектура и интеграция модулей

| Что требуется | Артефакт |
|---|---|
| Архитектура приложения | `docs/01-architecture.md`, слои `presentation → application → domain → infrastructure` |
| Интеграция модулей | монорепозиторий npm workspaces, общий контракт `packages/shared` |
| Документирование API | таблица эндпоинтов в `docs/03-api.md` |
| Тестирование интеграции | единый контракт DTO + Zod на клиенте и сервере |
| Документация | `README.md`, `docs/*`, комментарии в коде |

**Демонстрация:** схема слоёв; один и тот же тип `HabitDto` импортируется сервером и клиентом;
`npm run typecheck` проходит по всем пакетам.

## УП ПМ04 — сопровождение и резервное копирование

| Что требуется | Артефакт |
|---|---|
| Сопровождение ПО | `README.md`, `docs/04-deployment.md`, история коммитов git |
| Резервное копирование | `docs/05-backup-restore.md`, `scripts/backup.ps1` (`pg_dump -Fc` + SHA-256 + ротация) |
| Восстановление данных | `scripts/restore.ps1`, пользовательский экспорт/импорт JSON |
| Рефакторинг | вынос бизнес-логики серий в `domain/streak.ts`, общие проверки в `users/service.ts`, `habits/access.ts` |
| Журналирование операций | таблицы `backup_jobs`, `audit_log` |

**Демонстрация:** «Настройки → Резервное копирование» — скачать копию, изменить данные,
восстановить (replace) → счётчики и серии совпадают; журнал операций с контрольными суммами.

## ПП ПМ04 — администрирование сервера, защита и оптимизация

| Что требуется | Артефакт |
|---|---|
| Настройка сервера | `docs/04-deployment.md`: один процесс Node.js на `localhost:3000`, раздача SPA |
| Защита | `docs/04-security-hardening.md`: `scram-sha-256`, `listen_addresses=localhost`, роли БД с минимальными правами |
| Аутентификация и сессии | Argon2id, JWT 15 минут, refresh-токен в `httpOnly` cookie с ротацией |
| Защита API | `helmet`, `express-rate-limit`, CORS-whitelist, проверка владельца ресурсов |
| Оптимизация | индексы и частичные индексы, кэш `habit_stats`, код-сплиттинг клиента, `EXPLAIN` для тяжёлых выборок |

**Демонстрация:** `psql -U ht_app` → `CREATE TABLE` запрещён; вход без пароля к БД запрещён;
`GET /api/health` с версией PostgreSQL; два чанка сборки клиента (основной + графики).

## УП ПМ11 — проектирование и работа с БД

| Что требуется | Артефакт |
|---|---|
| Проектирование БД | `apps/server/prisma/schema.prisma`, `docs/02-database.md` |
| Подключение к БД | `infra/db.ts` (Prisma 7 + драйвер `pg`), миграции в `prisma/migrations` |
| Вывод данных | запросы Prisma, представления `v_habit_daily_status`, `v_habit_week_stats`, `v_habit_month_stats`, `v_user_day_totals`, `v_habit_overview` |
| CRUD-операции | `modules/habits`, `modules/entries`: создание, чтение, изменение, удаление, архивация |

**Демонстрация:** ER-диаграмма; `SELECT * FROM v_habit_week_stats`; Prisma Studio;
создание/изменение/удаление привычки через API и UI.

## ПП ПМ11 — реализация, администрирование и защита БД

| Что требуется | Артефакт |
|---|---|
| Реализация схемы | 9 таблиц, 10 CHECK-ограничений, частичные индексы, 5 триггеров |
| Целостность | внешние ключи с каскадами, `UNIQUE(habit_id, entry_date)`, проверка владельца отметки триггером |
| Администрирование | роли `ht_owner / ht_app / ht_readonly / ht_backup`, `ALTER DEFAULT PRIVILEGES`, `GRANT`/`REVOKE` |
| Резервное копирование БД | `pg_dump`/`pg_restore`, журнал `backup_jobs`, проверка контрольной суммы |
| Защита БД | `scram-sha-256`, доступ только с localhost, запрет DDL для `ht_app`, аудит изменений |
| Отчётность | представления и SQL-агрегаты (`date_trunc`, `FILTER`, `generate_series`) |

**Демонстрация:** `apps/server/sql/00_roles.sql`; попытка изменить `entry_date` существующей
отметки → ошибка триггера; `ht_readonly` читает только VIEW; восстановление дампа.

---

## Быстрая шпаргалка команд для защиты

```powershell
npm run dev:server          # API
npm run dev:client          # SPA
npm test                    # 28 unit-тестов
npm run typecheck           # проверка типов всех пакетов
npm run db:studio -w @habit/server
scripts\backup.ps1
scripts\restore.ps1 -File data\backups\<файл>.dump
```
