# Публикация проекта на GitHub

> Перед публикацией убедитесь, что в репозиторий не попадают секреты:
> `.env`, `node_modules`, `data/`, `ops/logs`, сгенерированный Prisma Client
> уже перечислены в `.gitignore`.

## 1. Проверка перед публикацией

```powershell
git status --short          # должно быть пусто
git log --oneline -5        # история коммитов
git ls-files | Select-String "\.env$"   # не должно ничего найти
```

## 2. Вариант A — GitHub CLI (рекомендуется)

```powershell
winget install --id GitHub.cli -e --source winget
gh auth login                # вход через браузер
gh repo create habit-tracker --private --source=. --remote=origin --push
```

Для публичного репозитория используйте `--public` вместо `--private`.

## 3. Вариант B — вручную

1. Создайте пустой репозиторий на github.com (без README и .gitignore).
2. Выполните:

```powershell
git remote add origin https://github.com/<ЛОГИН>/habit-tracker.git
git branch -M main
git push -u origin main
```

При запросе пароля укажите **Personal Access Token** (Settings → Developer settings →
Personal access tokens → Tokens (classic), права `repo`).

## 4. Релиз

```powershell
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "Habit Tracker v1.0.0" --notes "Первая версия трекера привычек"
```

## 5. Что делает человек, скачавший проект

1. Устанавливает Node.js 24+ и PostgreSQL 16+.
2. Клонирует репозиторий:
   ```powershell
   git clone https://github.com/<ЛОГИН>/habit-tracker.git
   cd habit-tracker
   ```
3. Запускает `start.bat` — дальнейшая настройка автоматическая
   (см. `docs/04-deployment.md`).

## 6. Непрерывная интеграция

Файл `.github/workflows/ci.yml` запускает на каждый push и pull request:

1. `npm ci` — установка зависимостей;
2. `prisma generate` — генерация клиента;
3. `npm run typecheck` — проверка типов;
4. `npm test` — 28 unit-тестов доменной логики;
5. `npm run build` — сборка всех пакетов.

Результат виден на вкладке **Actions** репозитория.
