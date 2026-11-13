-- ─────────────────────────────────────────────────────────────────────────
--  Объекты БД, которые не выражаются в Prisma Schema:
--  CHECK-ограничения, частичные индексы, триггеры, представления, права.
--  Демонстрация раздела «проектирование и защита БД» (ПМ11 / ПП ПМ11).
-- ─────────────────────────────────────────────────────────────────────────

-- 1. Ограничения целостности на уровне БД ────────────────────────────────
ALTER TABLE users
  ADD CONSTRAINT chk_users_display_name
  CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 80);

ALTER TABLE habits
  ADD CONSTRAINT chk_habits_title
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 120);

ALTER TABLE habits
  ADD CONSTRAINT chk_habits_color
  CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE habits
  ADD CONSTRAINT chk_habits_description
  CHECK (description IS NULL OR char_length(description) <= 1000);

ALTER TABLE habit_entries
  ADD CONSTRAINT chk_entries_note
  CHECK (note IS NULL OR char_length(note) <= 500);

ALTER TABLE habit_entries
  ADD CONSTRAINT chk_entries_source
  CHECK (source IN ('manual', 'import'));

ALTER TABLE habit_schedule_days
  ADD CONSTRAINT chk_schedule_weekday
  CHECK (weekday BETWEEN 1 AND 7);

ALTER TABLE habit_stats
  ADD CONSTRAINT chk_stats_non_negative
  CHECK (current_streak >= 0 AND longest_streak >= 0 AND total_done >= 0);

ALTER TABLE sessions
  ADD CONSTRAINT chk_sessions_expires_after_created
  CHECK (expires_at > created_at);

ALTER TABLE backup_jobs
  ADD CONSTRAINT chk_backup_size_non_negative
  CHECK (size_bytes IS NULL OR size_bytes >= 0);

-- 2. Частичные индексы ───────────────────────────────────────────────────
-- Нельзя иметь две АКТИВНЫЕ привычки с одинаковым названием у одного пользователя.
CREATE UNIQUE INDEX ux_habits_active_title
  ON habits (user_id, lower(title))
  WHERE archived_at IS NULL;

-- Быстрая выборка активных привычек в порядке отображения.
CREATE INDEX ix_habits_active_sort
  ON habits (user_id, sort_order)
  WHERE archived_at IS NULL;

-- 3. Автообновление updated_at ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_touch_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_habits_touch_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

-- 4. Аудит изменений привычек ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_habit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_entity_id text;
  v_user_id   uuid;
  v_action    text;
  v_payload   jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id::text;
    v_user_id   := OLD.user_id;
    v_action    := 'habit.deleted';
    v_payload   := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id::text;
    v_user_id   := NEW.user_id;
    v_action    := 'habit.updated';
    v_payload   := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  ELSE
    v_entity_id := NEW.id::text;
    v_user_id   := NEW.user_id;
    v_action    := 'habit.created';
    v_payload   := to_jsonb(NEW);
  END IF;

  -- Пользователь мог быть удалён каскадом — тогда ссылку обнуляем.
  IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id) THEN
    v_user_id := NULL;
  END IF;

  INSERT INTO audit_log (user_id, action, entity, entity_id, payload)
  VALUES (v_user_id, v_action, 'habit', v_entity_id, v_payload);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_habits_audit
  AFTER INSERT OR UPDATE OR DELETE ON habits
  FOR EACH ROW EXECUTE FUNCTION fn_audit_habit();

-- 5. Проверка отметок на уровне БД ───────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_validate_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_habit_user uuid;
  v_start_date date;
BEGIN
  SELECT user_id, start_date
    INTO v_habit_user, v_start_date
  FROM habits
  WHERE id = NEW.habit_id;

  IF v_habit_user IS NULL THEN
    RAISE EXCEPTION 'Привычка % не найдена', NEW.habit_id USING ERRCODE = '23503';
  END IF;

  IF v_habit_user <> NEW.user_id THEN
    RAISE EXCEPTION 'Отметка не может принадлежать другому пользователю'
      USING ERRCODE = '42501';
  END IF;

  -- Допускаем сутки запаса: приложение считает «сегодня» в часовом поясе
  -- пользователя, а CURRENT_DATE — в часовом поясе сервера (UTC).
  IF NEW.entry_date > CURRENT_DATE + 1 THEN
    RAISE EXCEPTION 'Нельзя отметить выполнение в будущем: %', NEW.entry_date
      USING ERRCODE = '22007';
  END IF;

  IF NEW.entry_date < v_start_date THEN
    RAISE EXCEPTION 'Дата отметки (%) раньше начала привычки (%)', NEW.entry_date, v_start_date
      USING ERRCODE = '22007';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entries_validate
  BEFORE INSERT OR UPDATE ON habit_entries
  FOR EACH ROW EXECUTE FUNCTION fn_validate_entry();

-- 6. Неизменяемость «личности» отметки ───────────────────────────────────
CREATE OR REPLACE FUNCTION fn_entry_immutable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.habit_id <> OLD.habit_id OR NEW.entry_date <> OLD.entry_date THEN
    RAISE EXCEPTION 'Нельзя изменить привычку или дату существующей отметки'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_entries_immutable
  BEFORE UPDATE OF habit_id, entry_date ON habit_entries
  FOR EACH ROW EXECUTE FUNCTION fn_entry_immutable();

-- 7. Представления для отчётности ────────────────────────────────────────
CREATE OR REPLACE VIEW v_habit_daily_status AS
WITH habit_bounds AS (
  SELECT id AS habit_id, user_id, start_date
  FROM habits
),
days AS (
  SELECT b.habit_id,
         b.user_id,
         d::date AS day
  FROM habit_bounds b
  CROSS JOIN LATERAL generate_series(b.start_date, CURRENT_DATE, interval '1 day') AS d
)
SELECT d.habit_id,
       d.user_id,
       d.day,
       EXTRACT(ISODOW FROM d.day)::int AS weekday,
       EXISTS (
         SELECT 1
         FROM habit_schedule_days s
         WHERE s.habit_id = d.habit_id
           AND s.weekday = EXTRACT(ISODOW FROM d.day)::int
       ) AS planned,
       EXISTS (
         SELECT 1
         FROM habit_entries e
         WHERE e.habit_id = d.habit_id
           AND e.entry_date = d.day
       ) AS done
FROM days d;

COMMENT ON VIEW v_habit_daily_status IS
  'План/факт по каждой привычке на каждый календарный день';

CREATE OR REPLACE VIEW v_habit_week_stats AS
SELECT habit_id,
       user_id,
       date_trunc('week', day)::date AS week_start,
       count(*) FILTER (WHERE planned) AS planned_days,
       count(*) FILTER (WHERE planned AND done) AS done_days,
       round(
         100.0 * count(*) FILTER (WHERE planned AND done)
         / NULLIF(count(*) FILTER (WHERE planned), 0),
         1
       ) AS completion_pct
FROM v_habit_daily_status
GROUP BY habit_id, user_id, date_trunc('week', day);

COMMENT ON VIEW v_habit_week_stats IS
  'Недельная статистика выполнения: план, факт, процент';

CREATE OR REPLACE VIEW v_habit_month_stats AS
SELECT habit_id,
       user_id,
       date_trunc('month', day)::date AS month_start,
       count(*) FILTER (WHERE planned) AS planned_days,
       count(*) FILTER (WHERE planned AND done) AS done_days,
       round(
         100.0 * count(*) FILTER (WHERE planned AND done)
         / NULLIF(count(*) FILTER (WHERE planned), 0),
         1
       ) AS completion_pct
FROM v_habit_daily_status
GROUP BY habit_id, user_id, date_trunc('month', day);

COMMENT ON VIEW v_habit_month_stats IS
  'Месячная статистика выполнения: план, факт, процент';

CREATE OR REPLACE VIEW v_user_day_totals AS
SELECT user_id,
       day,
       count(*) AS habits_total,
       count(*) FILTER (WHERE planned) AS planned_count,
       count(*) FILTER (WHERE planned AND done) AS done_count
FROM v_habit_daily_status
GROUP BY user_id, day;

COMMENT ON VIEW v_user_day_totals IS
  'Сводка по дням для календаря активности (heatmap)';

CREATE OR REPLACE VIEW v_habit_overview AS
SELECT h.id AS habit_id,
       h.user_id,
       h.title,
       h.color,
       h.frequency,
       h.start_date,
       COALESCE(s.current_streak, 0) AS current_streak,
       COALESCE(s.longest_streak, 0) AS longest_streak,
       COALESCE(s.total_done, 0) AS total_done,
       s.last_entry_date,
       (SELECT count(*) FROM habit_schedule_days sd WHERE sd.habit_id = h.id) AS planned_days_per_week
FROM habits h
LEFT JOIN habit_stats s ON s.habit_id = h.id
WHERE h.archived_at IS NULL;

COMMENT ON VIEW v_habit_overview IS
  'Активные привычки с текущими агрегатами (для отчётного контура)';

-- 8. Права на представления ──────────────────────────────────────────────
GRANT SELECT ON
  v_habit_daily_status,
  v_habit_week_stats,
  v_habit_month_stats,
  v_user_day_totals,
  v_habit_overview
TO ht_readonly;

GRANT SELECT ON
  v_habit_daily_status,
  v_habit_week_stats,
  v_habit_month_stats,
  v_user_day_totals,
  v_habit_overview
TO ht_app;

COMMENT ON TABLE habits IS 'Привычки пользователей (мягкая архивация через archived_at)';
COMMENT ON TABLE habit_entries IS 'Ежедневные отметки о выполнении: одна запись на привычку в календарный день';
COMMENT ON TABLE habit_stats IS 'Кэш агрегатов (серии, всего выполнений); пересчитывается сервисом';
COMMENT ON TABLE audit_log IS 'Журнал действий пользователей и изменений привычек';
COMMENT ON TABLE backup_jobs IS 'Журнал резервного копирования и восстановления';

