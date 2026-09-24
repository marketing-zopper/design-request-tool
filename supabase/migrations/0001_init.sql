-- Design Request Tool — core schema
-- Run in the Supabase SQL editor, or via `supabase db push` / the CLI migration runner.

create extension if not exists "pgcrypto";

-- ============================================================
-- 1. stakeholders
-- ============================================================
create table if not exists stakeholders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. request_batches
-- ============================================================
create table if not exists request_batches (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  requester_email text not null,
  team text not null,
  stakeholder_id uuid references stakeholders (id),
  custom_stakeholder_name text,
  custom_stakeholder_email text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. design_requests
-- ============================================================
create table if not exists design_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text unique not null,
  batch_id uuid not null references request_batches (id) on delete cascade,
  design_type text not null,
  custom_design_type text,
  quantity integer not null default 1,
  deadline date,
  dimensions text,
  co_branding boolean not null default false,
  partner_name text,
  content_requirement text,
  reference_link text,
  additional_notes text,
  status text not null default 'pending_requirement_approval'
    check (status in (
      'pending_requirement_approval',
      'approved',
      'in_design',
      'ready_for_review',
      'changes_requested',
      'completed',
      'rejected'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists design_requests_batch_id_idx on design_requests (batch_id);
create index if not exists design_requests_status_idx on design_requests (status);

-- Request code generation: a dedicated sequence + trigger keeps "DR-1001" style
-- codes race-safe under concurrent submissions (a client-side "select max + 1"
-- can double-assign a code when two people submit at the same moment).
create sequence if not exists design_request_code_seq start 1001;

create or replace function set_design_request_code()
returns trigger as $$
begin
  if new.request_code is null or new.request_code = '' then
    new.request_code := 'DR-' || nextval('design_request_code_seq');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_design_request_code on design_requests;
create trigger trg_set_design_request_code
  before insert on design_requests
  for each row
  execute function set_design_request_code();

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_design_requests_updated_at on design_requests;
create trigger trg_design_requests_updated_at
  before update on design_requests
  for each row
  execute function set_updated_at();

-- ============================================================
-- 4. attachments
-- ============================================================
create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references design_requests (id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_url text,
  file_type text,
  category text not null check (category in ('reference', 'brand_asset', 'final_design')),
  created_at timestamptz not null default now()
);

create index if not exists attachments_request_id_idx on attachments (request_id);

-- ============================================================
-- 5. approvals
-- ============================================================
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references design_requests (id) on delete cascade,
  approval_type text not null check (approval_type in ('requirement', 'final_design')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'changes_requested')),
  stakeholder_name text,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists approvals_request_id_idx on approvals (request_id);

drop trigger if exists trg_approvals_updated_at on approvals;
create trigger trg_approvals_updated_at
  before update on approvals
  for each row
  execute function set_updated_at();
