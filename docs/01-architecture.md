# Архитектура приложения

## 1. Общая схема

```
┌──────────────────────────────────────────────────────────────┐
│ Браузер                                                      │
│ React SPA: pages → features → components/ui                   │
│ api-клиент (fetch + TanStack Query), контракты @habit/shared  │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP, JSON, Bearer + refresh-cookie
┌───────────────────────────▼──────────────────────────────────┐
│ Node.js + Express 5 (http://localhost:3000)                  │
│                                                              │
│ ① presentation  routes → middleware (auth, validate, limit)  │
│                 → controllers (HTTP-коды, DTO)               │
│ ② application   services: Auth, Habit, Entry, Stats, Backup  │
│ ③ domain        чистые функции: dates, schedule, streak      │
│ ④ infrastructure Prisma + adapter-pg, pino, password, env    │
└───────────────────────────┬──────────────────────────────────┘
                            │ Prisma / параметризованный SQL
┌───────────────────────────▼──────────────────────────────────┐
│ PostgreSQL 18 (127.0.0.1:5432)                               │
│ таблицы · CHECK · частичные индексы · VIEW · триггеры        │
│ роли: ht_owner / ht_app / ht_readonly / ht_backup            │
└──────────────────────────────────────────────────────────────┘
```

## 2. Слои и их ответственность

| Слой | Каталог | Задача | Запрещено |
|---|---|---|---|
| presentation | `src/modules/*/routes.ts`, `controller.ts` | HTTP, коды, DTO | обращаться к Prisma |
| application | `src/modules/*/service.ts` | бизнес-правила, транзакции | знать про `req`/`res` |
| domain | `src/domain` | расчёты серий, дат, расписания | зависеть от БД |
| infrastructure | `src/infra` | Prisma, логи, пароли, конфиг | содержать бизнес-логику |

Правило зависимостей: `presentation → application → domain`, инфраструктура
подключается через репозитории.

## 3. Пример потока: отметка привычки

```
UI: «Отметить»
 → PUT /api/v1/habits/:id/entries/2026-11-13
 → authenticate → validate (Zod)
 → EntryController.upsert
 → EntryService:
     1. проверить владельца привычки (404 для чужой)
     2. запретить архив и дату в будущем
     3. upsert habit_entries (UNIQUE(habit_id, entry_date))
     4. пересчитать серию через domain/streak.ts
     5. обновить кэш habit_stats
     6. записать audit_log
 → ответ { entry, stats }
 → TanStack Query инвалидирует dashboard/habits
 → UI обновляет галочку и серию без перезагрузки
```

## 4. Ключевые решения

| Решение | Причина |
|---|---|
| Серии считаются в TypeScript (`domain/streak.ts`) | быстрые unit-тесты, один источник истины |
| Кэш `habit_stats` обновляется в транзакции отметки | дашборд не пересчитывает всю историю |
| Единый контракт `packages/shared` (DTO + Zod) | нет дублирования правил клиента и сервера |
| Prisma 7 + `@prisma/adapter-pg` | чистый JS-драйвер, миграции, типобезопасность |
| Access-токен в памяти, refresh — в httpOnly cookie | защита от XSS и восстановление сессии |
| PostgreSQL с ролями и представлениями | требования ПМ11/ПП ПМ11 |
| Один процесс Node.js раздаёт API и SPA | простой запуск `start.bat` |
| Code-splitting Recharts | основной бандл легче на ~400 КБ |

## 5. Тестирование

- unit-тесты домена: `apps/server/tests/unit` (28 тестов);
- проверка типов: `npm run typecheck` (все пакеты);
- CI GitHub Actions: install → prisma generate → typecheck → test → build.

## 6. Точки расширения

- уведомления (email/push) — отдельный модуль + очередь;
- привычки «N раз в неделю» — расширение `habit_schedule_days` и `domain/schedule.ts`;
- роли и совместный доступ — новые таблицы + RLS PostgreSQL;
- мобильный клиент — переиспользование `packages/shared` и REST API.
