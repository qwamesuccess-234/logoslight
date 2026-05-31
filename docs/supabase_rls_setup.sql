-- ═════════════════════════════════════════════════════════════════════════════
-- supabase_rls_FINAL_COMPLETE.sql
-- LogosLight Bible Study Platform
-- ─────────────────────────────────────────────────────────────────────────────
-- THIS IS THE ONE FILE TO RUN — it replaces ALL previous SQL files.
-- Run this in: Supabase Dashboard → SQL Editor → paste all → click Run
--
-- What this file does (in order):
--   1. Drops all old/broken policies to start clean
--   2. Enables RLS on every table
--   3. Creates all correct policies with performance optimization
--   4. Creates performance indexes
--   5. Fixes duplicate indexes
--   6. Verifies everything at the end
--
-- Safe to run multiple times — all DROP IF EXISTS prevents errors
-- ═════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Drop ALL existing policies (clean slate)
-- ─────────────────────────────────────────────────────────────────────────────

-- users
DROP POLICY IF EXISTS "Users read own profile"    ON public.users;
DROP POLICY IF EXISTS "Users update own profile"  ON public.users;

-- bookmarks
DROP POLICY IF EXISTS "Bookmarks owner access"    ON public.bookmarks;
DROP POLICY IF EXISTS "Bookmark owner access"     ON public.bookmarks;

-- reading_progress
DROP POLICY IF EXISTS "Reading progress owner access" ON public.reading_progress;

-- study_notes
DROP POLICY IF EXISTS "Notes owner only"          ON public.study_notes;

-- user_plan_progress
DROP POLICY IF EXISTS "Plan progress owner access" ON public.user_plan_progress;

-- reading_plans
DROP POLICY IF EXISTS "Plans public read"         ON public.reading_plans;
DROP POLICY IF EXISTS "Plans are public to authenticated users" ON public.reading_plans;

-- devotionals
DROP POLICY IF EXISTS "Devotionals public read"   ON public.devotionals;
DROP POLICY IF EXISTS "Devotionals are public to authenticated users" ON public.devotionals;

-- discussion_posts
DROP POLICY IF EXISTS "Posts public read"         ON public.discussion_posts;
DROP POLICY IF EXISTS "Posts are publicly readable" ON public.discussion_posts;
DROP POLICY IF EXISTS "Posts owner insert"        ON public.discussion_posts;
DROP POLICY IF EXISTS "Authors can create posts"  ON public.discussion_posts;
DROP POLICY IF EXISTS "Posts owner update"        ON public.discussion_posts;
DROP POLICY IF EXISTS "Authors can modify own posts" ON public.discussion_posts;
DROP POLICY IF EXISTS "Posts owner delete"        ON public.discussion_posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.discussion_posts;

-- comments
DROP POLICY IF EXISTS "Comments public read"      ON public.comments;
DROP POLICY IF EXISTS "Comments are publicly readable" ON public.comments;
DROP POLICY IF EXISTS "Comments owner insert"     ON public.comments;
DROP POLICY IF EXISTS "Authors can create comments" ON public.comments;
DROP POLICY IF EXISTS "Comments owner delete"     ON public.comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;

-- Django internal tables
DROP POLICY IF EXISTS "No public access to django_migrations"       ON public.django_migrations;
DROP POLICY IF EXISTS "No public access to django_content_type"     ON public.django_content_type;
DROP POLICY IF EXISTS "No public access to auth_group"              ON public.auth_group;
DROP POLICY IF EXISTS "No public access to auth_group_permissions"  ON public.auth_group_permissions;
DROP POLICY IF EXISTS "No public access to auth_permission"         ON public.auth_permission;
DROP POLICY IF EXISTS "No public access to users_groups"            ON public.users_groups;
DROP POLICY IF EXISTS "No public access to users_user_permissions"  ON public.users_user_permissions;
DROP POLICY IF EXISTS "No public access to django_admin_log"        ON public.django_admin_log;
DROP POLICY IF EXISTS "No public access to django_session"          ON public.django_session;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: Enable RLS on ALL tables
-- ─────────────────────────────────────────────────────────────────────────────

-- App tables
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devotionals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_posts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments             ENABLE ROW LEVEL SECURITY;

-- Django internal tables
ALTER TABLE public.django_migrations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.django_content_type      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_group               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_group_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_permission          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_groups             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_user_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.django_admin_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.django_session           ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Lock Django internal tables completely
-- USING (false) = no row ever passes = fully invisible via REST API
-- Django backend uses service role which bypasses RLS — unaffected
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "No public access to django_migrations"
  ON public.django_migrations FOR ALL USING (false);

CREATE POLICY "No public access to django_content_type"
  ON public.django_content_type FOR ALL USING (false);

CREATE POLICY "No public access to auth_group"
  ON public.auth_group FOR ALL USING (false);

CREATE POLICY "No public access to auth_group_permissions"
  ON public.auth_group_permissions FOR ALL USING (false);

CREATE POLICY "No public access to auth_permission"
  ON public.auth_permission FOR ALL USING (false);

CREATE POLICY "No public access to users_groups"
  ON public.users_groups FOR ALL USING (false);

CREATE POLICY "No public access to users_user_permissions"
  ON public.users_user_permissions FOR ALL USING (false);

CREATE POLICY "No public access to django_admin_log"
  ON public.django_admin_log FOR ALL USING (false);

CREATE POLICY "No public access to django_session"
  ON public.django_session FOR ALL USING (false);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 4: App table RLS policies
-- NOTE: All policies use (select current_setting(...)) — performance optimized
-- This runs the JWT check ONCE per query instead of once per row
-- ─────────────────────────────────────────────────────────────────────────────

-- ── users ────────────────────────────────────────────────────────────────────
-- Owner can read their own profile row only
CREATE POLICY "Users read own profile"
ON public.users FOR SELECT
USING (
  clerk_id = (
    select current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Owner can update their own profile row only
CREATE POLICY "Users update own profile"
ON public.users FOR UPDATE
USING (
  clerk_id = (
    select current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- ── bookmarks — owner only ───────────────────────────────────────────────────
CREATE POLICY "Bookmarks owner access"
ON public.bookmarks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = bookmarks.user_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- ── reading_progress — owner only ────────────────────────────────────────────
CREATE POLICY "Reading progress owner access"
ON public.reading_progress FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = reading_progress.user_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- ── study_notes — strictly private ───────────────────────────────────────────
-- Only the owner can ever see or touch their notes — nobody else
CREATE POLICY "Notes owner only"
ON public.study_notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = study_notes.user_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- ── user_plan_progress — owner only ──────────────────────────────────────────
CREATE POLICY "Plan progress owner access"
ON public.user_plan_progress FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_plan_progress.user_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- ── reading_plans — public read ───────────────────────────────────────────────
-- All authenticated users can browse plans — admin creates them via Django Admin
CREATE POLICY "Plans public read"
ON public.reading_plans FOR SELECT
USING (is_active = true);

-- ── devotionals — public read ─────────────────────────────────────────────────
-- All authenticated users can read devotional content
CREATE POLICY "Devotionals public read"
ON public.devotionals FOR SELECT
USING (true);

-- ── discussion_posts — public read, owner write ───────────────────────────────
-- All authenticated users can read posts
CREATE POLICY "Posts public read"
ON public.discussion_posts FOR SELECT
USING (true);

-- Only the author can create their own posts
CREATE POLICY "Posts owner insert"
ON public.discussion_posts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = discussion_posts.author_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- Only the author can edit their own posts
CREATE POLICY "Posts owner update"
ON public.discussion_posts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = discussion_posts.author_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- Only the author can delete their own posts
CREATE POLICY "Posts owner delete"
ON public.discussion_posts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = discussion_posts.author_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- ── comments — public read, owner write ───────────────────────────────────────
CREATE POLICY "Comments public read"
ON public.comments FOR SELECT
USING (true);

CREATE POLICY "Comments owner insert"
ON public.comments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = comments.author_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

CREATE POLICY "Comments owner delete"
ON public.comments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = comments.author_id
    AND u.clerk_id = (
      select current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 5: Performance indexes for RLS policy columns
-- Without indexes, RLS does a full table scan on every query (O(n))
-- With indexes, it is O(log n)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_clerk_id
  ON public.users(clerk_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id
  ON public.bookmarks(user_id);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_id
  ON public.reading_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_study_notes_user_id
  ON public.study_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_user_plan_progress_user_id
  ON public.user_plan_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_user_plan_progress_plan_id
  ON public.user_plan_progress(plan_id);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_author_id
  ON public.discussion_posts(author_id);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_created_at
  ON public.discussion_posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_id
  ON public.comments(post_id);

CREATE INDEX IF NOT EXISTS idx_comments_author_id
  ON public.comments(author_id);

CREATE INDEX IF NOT EXISTS idx_devotionals_plan_id
  ON public.devotionals(plan_id);

-- Covering indexes for unindexed foreign keys (fixes Supabase warnings)
CREATE INDEX IF NOT EXISTS idx_auth_group_perm_permission_id
  ON public.auth_group_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_django_admin_log_content_type_id
  ON public.django_admin_log(content_type_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 6: Remove duplicate and unused indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Duplicate on discussion_posts (keep our custom one, drop Django auto-generated)
DROP INDEX IF EXISTS public.discussion_posts_author_id_c79e9c11;

-- Unused indexes on Django internal tables (locked with RLS false — never queried)
DROP INDEX IF EXISTS public.auth_group_name_a6ea08ec_like;
DROP INDEX IF EXISTS public.users_clerk_id_2956da0b_like;
DROP INDEX IF EXISTS public.users_groups_user_id_f500bee5;
DROP INDEX IF EXISTS public.users_groups_group_id_2f3517aa;
DROP INDEX IF EXISTS public.users_user_permissions_user_id_92473840;
DROP INDEX IF EXISTS public.users_user_permissions_permission_id_6d08dcd2;
DROP INDEX IF EXISTS public.django_admin_log_content_type_id_c4bce8eb;
DROP INDEX IF EXISTS public.django_session_session_key_c0390e0f_like;
DROP INDEX IF EXISTS public.django_session_expire_date_a5c62663;

-- Unused auto-generated indexes replaced by our custom named ones above
DROP INDEX IF EXISTS public.study_notes_user_id_ed2f2257;
DROP INDEX IF EXISTS public.bookmarks_user_id_12990ce0;
DROP INDEX IF EXISTS public.reading_progress_user_id_1b1ab64a;
DROP INDEX IF EXISTS public.user_plan_progress_plan_id_82053f86;
DROP INDEX IF EXISTS public.user_plan_progress_user_id_598fb66b;
DROP INDEX IF EXISTS public.devotionals_plan_id_5d277e94;
DROP INDEX IF EXISTS public.comments_author_id_7a23bb5d;
DROP INDEX IF EXISTS public.comments_post_id_67cfce36;
DROP INDEX IF EXISTS public.discussion__created_3c6c3a_idx;

-- Users email index (low traffic app — not needed yet, re-add later if needed)
DROP INDEX IF EXISTS public.users_email_4b85f2_idx;


-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 7: Add Clerk JWKS URL to Supabase JWT settings
-- ─────────────────────────────────────────────────────────────────────────────
-- This cannot be done via SQL — do it manually:
-- Supabase Dashboard → Project Settings → API → JWT Settings
-- Add this URL in the JWKS field:
-- https://giving-husky-18.clerk.accounts.dev/.well-known/jwks.json


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION: Run this after everything above to confirm all is correct
-- Every table should show rls_enabled = true
-- ─────────────────────────────────────────────────────────────────────────────

SELECT
  tablename                           AS table_name,
  rowsecurity                         AS rls_enabled,
  CASE WHEN rowsecurity THEN '✅ Protected'
       ELSE '❌ NOT protected'
  END                                 AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;