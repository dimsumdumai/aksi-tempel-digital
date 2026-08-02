create extension if not exists pgcrypto;

create table if not exists public.app_users (
  username text primary key,
  name text not null,
  role text not null check (role in ('admin','user')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  token_hash text primary key,
  username text not null references public.app_users(username) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.arrears (
  id uuid primary key default gen_random_uuid(),
  no_polisi text not null,
  nama_pemilik text,
  nomor_hp text,
  alamat text,
  jatuh_tempo text,
  jenis_kendaraan text,
  samsat_asal text,
  prioritas text,
  assigned_to text references public.app_users(username),
  assigned_by text references public.app_users(username),
  assigned_at timestamptz,
  imported_by text not null references public.app_users(username),
  imported_at timestamptz not null default now(),
  status text not null default 'Belum dibagikan'
);

create index if not exists arrears_assigned_to_idx on public.arrears(assigned_to);
create index if not exists arrears_plate_idx on public.arrears(no_polisi);

create table if not exists public.sightings (
  id uuid primary key,
  notice_id text unique not null,
  no_polisi text not null,
  created_by text not null references public.app_users(username),
  petugas_name text not null,
  lokasi text not null,
  captured_at timestamptz not null,
  status text not null default 'Belum Dihubungi',
  print_status text default 'Belum Dicetak',
  evidence_key text,
  vehicle_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sightings_created_by_idx on public.sightings(created_by);
create index if not exists sightings_plate_idx on public.sightings(no_polisi);
create index if not exists sightings_captured_at_idx on public.sightings(captured_at desc);

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
alter table public.arrears enable row level security;
alter table public.sightings enable row level security;

revoke all on public.app_users, public.app_sessions, public.arrears, public.sightings from anon, authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vehicle-evidence','vehicle-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880;
