-- ─────────────────────────────────────────────────────────────────────────
--  Роли и права базы данных (принцип наименьших привилегий)
--  Выполняется суперпользователем: psql -U postgres -f sql/00_roles.sql
--  Пароли передаются через переменные psql, в файле их нет.
-- ─────────────────────────────────────────────────────────────────────────
\set ON_ERROR_STOP on

-- 1. Роли БД ──────────────────────────────────────────────────────────────
SELECT format('CREATE ROLE ht_owner LOGIN PASSWORD %L', :'owner_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ht_owner')
\gexec

SELECT format('CREATE ROLE ht_app LOGIN PASSWORD %L', :'app_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ht_app')
\gexec

SELECT format('CREATE ROLE ht_readonly LOGIN PASSWORD %L', :'readonly_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ht_readonly')
\gexec

SELECT format('CREATE ROLE ht_backup LOGIN PASSWORD %L', :'backup_pass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ht_backup')
\gexec

SELECT format('ALTER ROLE ht_owner WITH LOGIN PASSWORD %L', :'owner_pass')
\gexec
SELECT format('ALTER ROLE ht_app WITH LOGIN PASSWORD %L', :'app_pass')
\gexec
SELECT format('ALTER ROLE ht_readonly WITH LOGIN PASSWORD %L', :'readonly_pass')
\gexec
SELECT format('ALTER ROLE ht_backup WITH LOGIN PASSWORD %L', :'backup_pass')
\gexec

-- Владельцу схемы нужна возможность создавать теневую БД для prisma migrate dev.
-- В промышленной эксплуатации это отдельная задача администратора БД.
ALTER ROLE ht_owner CREATEDB;

-- 2. База данных ──────────────────────────────────────────────────────────
SELECT format('CREATE DATABASE habit_tracker OWNER ht_owner ENCODING %L TEMPLATE template0', 'UTF8')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'habit_tracker')
\gexec

\connect habit_tracker

ALTER DATABASE habit_tracker SET timezone TO 'UTC';
REVOKE ALL ON DATABASE habit_tracker FROM PUBLIC;
GRANT CONNECT ON DATABASE habit_tracker TO ht_owner, ht_app, ht_readonly, ht_backup;

-- 3. Схема public ──────────────────────────────────────────────────────────
ALTER SCHEMA public OWNER TO ht_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ht_app, ht_readonly, ht_backup;

-- 4. Права по умолчанию для объектов, создаваемых владельцем (миграции) ────
ALTER DEFAULT PRIVILEGES FOR ROLE ht_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ht_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ht_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ht_app;
ALTER DEFAULT PRIVILEGES FOR ROLE ht_owner IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO ht_app;

-- 5. Роль резервного копирования: только чтение данных ─────────────────────
GRANT pg_read_all_data TO ht_backup;

-- 6. Проверка результата ──────────────────────────────────────────────────
\echo '── Роли базы данных ──'
SELECT rolname, rolcanlogin, rolsuper
FROM pg_roles
WHERE rolname LIKE 'ht_%'
ORDER BY rolname;
