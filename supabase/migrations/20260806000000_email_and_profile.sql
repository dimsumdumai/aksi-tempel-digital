-- Add email columns for password recovery
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS email text default '';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS email_verified boolean not null default false;

-- Add email verification tokens table
create table if not exists public.email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  username text not null references public.app_users(username) on delete cascade,
  token_hash text not null,
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists evt_username_idx on public.email_verification_tokens(username);

-- Add password reset tokens table
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  username text not null references public.app_users(username) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists prt_username_idx on public.password_reset_tokens(username);

-- RLS for new tables
alter table public.email_verification_tokens enable row level security;
alter table public.password_reset_tokens enable row level security;
revoke all on public.email_verification_tokens, public.password_reset_tokens from anon, authenticated;
grant select, insert, update, delete on public.email_verification_tokens, public.password_reset_tokens to service_role;
