-- Migration: Add configurable goal auto-archive preference to user_profile
-- NULL = Off; 30 / 60 / 90 = days after completed_at before lazy auto-archive
-- Default 90 for existing and new rows.

ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS goal_auto_archive_days INTEGER DEFAULT 90;

ALTER TABLE user_profile
DROP CONSTRAINT IF EXISTS user_profile_goal_auto_archive_days_check;

ALTER TABLE user_profile
ADD CONSTRAINT user_profile_goal_auto_archive_days_check
CHECK (
  goal_auto_archive_days IS NULL
  OR goal_auto_archive_days IN (30, 60, 90)
);

COMMENT ON COLUMN user_profile.goal_auto_archive_days IS
  'Days after goal completion before lazy auto-archive; NULL disables; allowed 30/60/90; default 90';
