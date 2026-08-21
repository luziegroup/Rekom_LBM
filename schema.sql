-- ============================================================
-- SKEMA DATABASE: Recruitment CV Database
-- Didesain multi-tenant dari awal (organization_id di semua tabel)
-- supaya siap dikomersilkan tanpa migrasi besar nanti.
-- Target: Postgres / Supabase
-- ============================================================

-- 1. ORGANIZATIONS
-- Saat ini hanya akan ada 1 baris (organisasi Anda sendiri),
-- tapi struktur ini yang bikin migrasi ke multi-klien nanti mudah.
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 2. USERS
-- Terhubung ke auth.users bawaan Supabase.
-- Satu user bisa jadi anggota satu organisasi (role: owner/admin/recruiter).
create table org_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'admin', 'recruiter')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

-- 3. EMAIL CONNECTIONS
-- Menyimpan koneksi OAuth ke inbox (Gmail, dst).
-- PENTING: simpan refresh_token terenkripsi (pakai Supabase Vault
-- atau enkripsi aplikasi), jangan plaintext.
create table email_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null default 'gmail' check (provider in ('gmail', 'outlook')),
  email_address text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  sync_status text not null default 'pending' check (sync_status in ('pending', 'syncing', 'ok', 'error')),
  created_at timestamptz not null default now()
);

-- 4. POSITIONS (lowongan yang dibuka, opsional tapi berguna untuk matching)
create table positions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'closed', 'draft')),
  created_at timestamptz not null default now()
);

-- 5. CANDIDATES
-- Data hasil ekstraksi CV oleh AI.
create table candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  location text,
  years_experience numeric,
  current_title text,
  skills text[],          -- array skill, gampang di-filter/search
  education jsonb,        -- riwayat pendidikan terstruktur
  work_history jsonb,     -- riwayat kerja terstruktur
  summary text,           -- ringkasan singkat hasil generate AI
  raw_extracted jsonb,    -- output mentah JSON dari Claude, untuk audit/debug
  source text not null default 'email' check (source in ('email', 'manual', 'referral')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index untuk search cepat
create index idx_candidates_org on candidates(organization_id);
create index idx_candidates_skills on candidates using gin(skills);
create index idx_candidates_search on candidates using gin(
  to_tsvector('english', coalesce(full_name,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(current_title,''))
);

-- 6. CANDIDATE DOCUMENTS
-- File CV asli disimpan di Supabase Storage, tabel ini cuma nyimpan referensinya.
create table candidate_documents (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  file_name text not null,
  storage_path text not null,   -- path di Supabase Storage bucket
  file_type text,               -- pdf / docx
  source_email_id text,         -- Gmail message ID asal, untuk audit trail
  created_at timestamptz not null default now()
);

-- 7. APPLICATIONS
-- Menghubungkan kandidat ke posisi tertentu (kalau relevan)
create table applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  candidate_id uuid not null references candidates(id) on delete cascade,
  position_id uuid references positions(id) on delete set null,
  stage text not null default 'new' check (stage in ('new', 'screening', 'interviewing', 'offered', 'hired', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (WAJIB untuk multi-tenant)
-- Contoh policy dasar: user hanya bisa akses data organisasi tempat dia jadi member.
-- Aktifkan & sesuaikan sebelum go multi-tenant.
-- ============================================================
alter table candidates enable row level security;

create policy "org members can access their candidates"
  on candidates for all
  using (
    organization_id in (
      select organization_id from org_members where user_id = auth.uid()
    )
  );

-- Ulangi pola RLS yang sama untuk tabel: applications, positions,
-- candidate_documents, email_connections sebelum production multi-user.
