-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query).

-- ============================================================
-- registrations: contains guardian emails and security-answer
-- hashes. This is deliberately locked down — no policies are
-- created, so with RLS enabled, the anon/authenticated roles the
-- browser uses get ZERO access. Only the service_role key (used
-- inside Netlify Functions, never shipped to the browser) can
-- read or write this table.
-- ============================================================
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  age int not null,
  age_band text not null,
  guardian_email text not null,
  personal_email text,
  username text not null unique,
  security_question text not null,
  security_answer_hash text not null,
  security_answer_salt text not null,
  formats text[] not null,
  length text not null,
  hobbies text[] default '{}',
  topics text[] not null,
  personality text not null,
  mood text not null,
  admired text,
  skip_list text,
  reset_code text,
  reset_code_expires_at timestamptz,
  created_at timestamptz default now()
);

alter table registrations enable row level security;
-- Intentionally no policies here — see comment above.

-- ============================================================
-- sessions: issued on successful login, used to prove "this
-- request came from a logged-in member" when asking for a file.
-- Only the service_role key (inside Netlify Functions) touches
-- this table — no public policies, same reasoning as registrations.
-- ============================================================
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references registrations(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

alter table sessions enable row level security;
-- Intentionally no policies here — see comment above.

-- ============================================================
-- books: the public catalogue. Reading is public (not sensitive),
-- but writing now happens ONLY through the admin-gated Netlify
-- functions (books-add.js, books-seed.js), which use the service
-- role key. That's why there's no public insert policy below —
-- the anon key can read this table but can no longer write to it
-- directly, closing the "anyone can add books" gap.
-- ============================================================
create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  page_count int,
  description text,
  formats jsonb not null,
  age_bands text[] not null,
  topics text[] not null,
  personality text,
  moods text[] default '{}',
  hobbies text[] default '{}',
  ebook_file_name text,
  ebook_file_size_kb int,
  ebook_file_path text,
  audiobook_file_name text,
  audiobook_file_size_kb int,
  audiobook_file_path text,
  created_at timestamptz default now()
);

alter table books enable row level security;

create policy "public can read books" on books
  for select using (true);

-- No insert policy on purpose: writes go through the admin-gated
-- functions only. If you already ran an earlier version of this
-- schema, bring it up to date with:
--   drop policy if exists "public can add books" on books;
--   alter table books drop column if exists ebook_file_url;
--   alter table books drop column if exists audiobook_file_url;
--   alter table books add column if not exists ebook_file_path text;
--   alter table books add column if not exists audiobook_file_path text;
--   alter table books add column if not exists hobbies text[] default '{}';
-- Then also flip the "book-files" bucket from Public to Private in
-- Storage settings — file access is now gated per-request instead
-- of via a permanent public URL. See README section 5.
