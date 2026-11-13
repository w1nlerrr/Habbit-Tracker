# Резервное копирование и восстановление

> Документ для раздела **УП ПМ04** «сопровождение программного обеспечения,
> резервное копирование и восстановление данных».

## 1. Уровни резервного копирования

| Уровень | Что копируется | Инструмент | Кто использует |
|---|---|---|---|
| Пользовательский экспорт | привычки, расписание, отметки одного пользователя | `GET /api/v1/backup/export` и UI «Настройки» | пользователь |
| Логическая копия БД | вся база целиком (все пользователи, роли объектов) | `pg_dump -Fc` + `scripts/backup.ps1` | администратор |
| Физическое восстановление | замена содержимого БД | `pg_restore --clean` + `scripts/restore.ps1` | администратор |

Пользовательский экспорт в JSON хранится в формате:

```json
{
  "format": "habit-tracker-backup",
  "version": 1,
  "exportedAt": "2026-11-13T20:00:00.000Z",
  "habits": [
    {
      "title": "Зарядка 15 минут",
      "frequency": "daily",
      "startDate": "2026-09-15",
      "weekdays": [1, 2, 3, 4, 5, 6, 7],
      "entries": [{ "date": "2026-11-13", "note": null, "source": "manual" }]
    }
  ]
}
```

## 2. Регламент (RPO / RTO)

| Показатель | Значение для учебного стенда |
|---|---|
| **RPO** (допустимая потеря данных) | не более 24 часов — ежедневная копия |
| **RTO** (время восстановления) | ≤ 5 минут — восстановление из дампа |
| Срок хранения | 14 дней (`BACKUP_KEEP_DAYS`) |
| Место хранения | `data/backups` (вне веб-каталога), рекомендуется внешний диск |

## 3. Пользовательский экспорт (UI)

1. Войти в приложение → **Настройки** → блок «Резервное копирование».
2. «Скачать резервную копию» — браузер сохраняет `habit-tracker-backup-ГГГГ-ММ-ДД.json`.
3. Импорт: «Импортировать из файла» → файл проверяется Zod-схемой →
   выбор режима:
   - **merge** — добавить привычки, названия которых ещё не существуют;
   - **replace** — удалить текущие данные и восстановить из файла.
4. Каждая операция фиксируется в таблице `backup_jobs` (тип, статус, размер, SHA-256, время).

Статистика при импорте **пересчитывается заново** доменными функциями — данным из файла
в части `stats` не доверяем.

## 4. Логическая копия БД

```powershell
cd D:\Tracker
powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
```

Что делает скрипт:
1. читает параметры подключения из `.env` (роль `ht_owner`);
2. выполняет `pg_dump -Fc` в `data/backups/habit_tracker-ГГГГММДД-ЧЧММСС.dump`;
3. вычисляет SHA-256 и сохраняет рядом файл `.sha256`;
4. удаляет копии старше `BACKUP_KEEP_DAYS` дней (ротация).

Пример вывода:

```text
Creating backup: D:\Tracker\data\backups\habit_tracker-20261113-232537.dump
Backup created: habit_tracker-20261113-232537.dump (0.05 MB)
SHA-256: 91a3e01c8685285e5d1c4876117d89c4599516d87bc6b5d99f34d7a1e6e58f32
Done.
```

## 5. Восстановление БД

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 `
  -File data\backups\habit_tracker-20261113-232537.dump
```

1. Скрипт проверяет SHA-256 по файлу `.sha256` — при несовпадении восстановление прерывается.
2. Запрашивает подтверждение (или используйте `-Force`).
3. Выполняет `pg_restore --clean --if-exists --no-owner --no-privileges`.
4. Выполняет smoke-check: количество пользователей и привычек.

Фактический результат проверки:

```text
Checksum verified: 91a3e01c8685285e5d1c4876117d89c4599516d87bc6b5d99f34d7a1e6e58f32
Restoring from: D:\Tracker\data\backups\habit_tracker-20261113-232537.dump
Running smoke check...
2
3
Restore completed successfully.
```

После восстановления API продолжает работать: `GET /api/v1/stats/dashboard` возвращает
те же значения (`active=3`, `totalDone=133`, `best=60`), так как права роли `ht_app`
восстанавливаются через `ALTER DEFAULT PRIVILEGES`.

## 6. Автоматизация по расписанию

Регистрация задачи в Планировщике Windows (запуск от имени пользователя, ежедневно в 03:00):

```powershell
schtasks /Create /TN "HabitTrackerBackup" /SC DAILY /ST 03:00 ^
  /TR "powershell.exe -ExecutionPolicy Bypass -File D:\Tracker\scripts\backup.ps1"
```

Проверка: `schtasks /Query /TN "HabitTrackerBackup" /V /FO LIST`.

## 7. Проверка целостности

| Проверка | Команда |
|---|---|
| контрольная сумма файла | `Get-FileHash data\backups\<файл>.dump -Algorithm SHA256` |
| целостность дампа | `pg_restore --list <файл> > $null` (без ошибок) |
| данные после восстановления | `psql -c "select count(*) from habits; select count(*) from habit_entries;"` |
| работоспособность API | `GET /api/health` → `status: ok` |

## 8. Хранение и защита копий

- файлы копий лежат **вне** каталога статики (`data/backups`, не раздаётся Caddy);
- доступ к каталогу ограничивается ACL (см. `docs/04-security-hardening.md`);
- для продакшена: шифрование копий (AES-256 / BitLocker), вынос на отдельный носитель;
- пароли БД хранятся только в `.env`, который исключён из git.

## 9. Действия при инциденте

1. Остановить API (`pm2 stop habit-tracker-api`).
2. Выбрать последнюю корректную копию, проверить SHA-256.
3. Запустить `restore.ps1`.
4. Проверить smoke-check и `GET /api/health`.
5. Запустить API, зафиксировать инцидент в журнале (таблица `backup_jobs` + `audit_log`).
