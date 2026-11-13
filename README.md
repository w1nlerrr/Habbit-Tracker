# Habit Tracker — трекер привычек

Учебный проект по специальности **09.02.07 «Информационные системы и программирование»**.

Приложение для отслеживания привычек: список привычек, ежедневные отметки,
подсчёт текущей и максимальной серии дней подряд, календарь активности и
статистика за неделю/месяц.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | React 19, TypeScript, Vite, TanStack Query, Tailwind CSS, Recharts |
| Backend | Node.js 24, Express 5, TypeScript, Prisma 7, Zod, pino |
| База данных | PostgreSQL 18 (роли, представления, триггеры, резервное копирование) |
| Тесты | Vitest, Supertest, Playwright |
| Инфраструктура | Caddy (HTTPS, reverse proxy), PM2, Планировщик заданий Windows |

## Структура репозитория

```
apps/server      — REST API (слои: presentation → application → domain → infrastructure)
apps/client      — SPA на React
packages/shared  — общие DTO и Zod-схемы (единый контракт клиента и сервера)
docs/            — архитектура, БД, API, развёртывание, бэкапы
ops/             — конфигурация сервера (Caddy, PM2, задачи Windows)
scripts/         — резервное копирование, восстановление, обслуживание
```

## Быстрый старт (кратко)

```powershell
npm install            # установка зависимостей монорепо
npm run build:shared   # сборка общего пакета контрактов
npm run db:migrate     # миграции Prisma
npm run db:seed        # демонстрационные данные
npm run dev:server     # API на http://127.0.0.1:3000
```

Проверка работоспособности: `GET http://127.0.0.1:3000/api/health`.

> Подробные инструкции — в `docs/`.
