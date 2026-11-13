# REST API

Базовый адрес: `http://localhost:3000/api/v1`
Формат: JSON (UTF-8).
Аутентификация: `Authorization: Bearer <access-token>` (15 минут).
Refresh-токен: cookie `ht_refresh` (`httpOnly`, `SameSite=Strict`, путь `/api/v1/auth`).

## Формат ошибок

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Проверьте корректность введённых данных",
    "details": [{ "path": "title", "message": "Укажите название привычки" }],
    "requestId": "a8ee7963-dc91-489f-af78-3d2ad07258b5"
  }
}
```

Коды: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500).

## Аутентификация

| Метод | Путь | Назначение |
|---|---|---|
| POST | `/auth/register` | регистрация |
| POST | `/auth/login` | вход |
| POST | `/auth/refresh` | новый access + ротация refresh |
| POST | `/auth/logout` | отзыв сессии |
| GET | `/auth/me` | профиль |
| PATCH | `/auth/me` | имя, часовой пояс |

```http
POST /api/v1/auth/login
Content-Type: application/json

{ "email": "demo@habit.local", "password": "Demo12345!" }
```

```json
{
  "user": { "id": "...", "email": "demo@habit.local", "displayName": "Демо-пользователь", "role": "user", "timezone": "Europe/Moscow" },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresInSec": 900
}
```

## Привычки

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/habits?includeArchived=false` | список |
| POST | `/habits` | создание |
| GET | `/habits/:id` | одна привычка |
| PATCH | `/habits/:id` | изменение |
| PATCH | `/habits/:id/archive` | архивация (`{"archived": true}`) |
| PUT | `/habits/reorder` | порядок |
| DELETE | `/habits/:id` | удаление |

```json
POST /api/v1/habits
{
  "title": "Бассейн",
  "description": "Тренировка",
  "color": "#0EA5E9",
  "icon": "waves",
  "frequency": "custom",
  "weekdays": [2, 4, 6]
}
```

## Отметки

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/habits/:id/entries?from=2026-11-01&to=2026-11-13` | история |
| PUT | `/habits/:id/entries/:date` | отметить (идемпотентно) |
| DELETE | `/habits/:id/entries/:date` | снять отметку |

```json
PUT /api/v1/habits/<id>/entries/2026-11-13
{ "note": "Сделано утром" }
```

Ответ содержит отметку и актуальные агрегаты:

```json
{
  "entry": { "id": 12, "habitId": "...", "date": "2026-11-13", "note": "Сделано утром", "source": "manual" },
  "stats": { "currentStreak": 7, "longestStreak": 7, "totalDone": 52, "lastEntryDate": "2026-11-13", "planned": true }
}
```

## Статистика

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/stats/dashboard` | сводка главной панели + список на сегодня |
| GET | `/stats/habits/:id?period=week\|month` | статистика привычки по дням |
| GET | `/stats/calendar?month=2026-11` | календарь активности |
| GET | `/stats/activity?days=30` | динамика выполнения за N дней |

```json
GET /api/v1/stats/dashboard
{
  "today": "2026-11-13",
  "habits": { "active": 3, "plannedToday": 2, "doneToday": 1 },
  "streaks": { "best": 60, "totalCurrent": 76 },
  "week": { "from": "2026-11-09", "to": "2026-11-13", "planned": 12, "done": 11, "completionPct": 91.7 },
  "month": { "from": "2026-11-01", "to": "2026-11-13", "planned": 31, "done": 29, "completionPct": 93.5 },
  "totalDone": 131,
  "todayList": [{ "habitId": "...", "title": "Зарядка 15 минут", "color": "#22C55E", "icon": "activity", "planned": true, "done": true, "currentStreak": 60 }]
}
```

## Резервное копирование

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/backup/export` | скачать JSON (`Content-Disposition`, `X-Backup-Sha256`) |
| POST | `/backup/import` | импорт `{ "mode": "merge\\|replace", "data": { ... } }` |
| GET | `/backup/history` | журнал операций |

## Служебное

| Метод | Путь | Назначение |
|---|---|---|
| GET | `/api/health` | статус API и БД (вне `/v1`) |

## Лимиты и коды

- общий rate-limit: 300 запросов в минуту с IP;
- вход/регистрация: 20 попыток за 15 минут;
- пагинация: до 100 записей;
- импорт: до 200 привычек и 5000 отметок на привычку.
