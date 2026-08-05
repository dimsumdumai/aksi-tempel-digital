create extension if not exists pgcrypto;

-- Drop old tables if they exist (fresh schema with super_admin role + position column)
drop table if exists public.sightings cascade;
drop table if exists public.arrears cascade;
drop table if exists public.app_sessions cascade;
drop table if exists public.app_users cascade;

create table public.app_users (
  username text primary key,
  name text not null,
  position text default '',
  role text not null check (role in ('super_admin','admin','user')),
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.app_sessions (
  token_hash text primary key,
  username text not null references public.app_users(username) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.arrears (
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

create table public.sightings (
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

grant usage on schema public to service_role;
grant select, insert, update, delete on public.app_users, public.app_sessions, public.arrears, public.sightings to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vehicle-evidence','vehicle-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=5242880;

-- User accounts
INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('andi.raharja', 'Andi Raharja', 'Kabag Operasional', 'admin', '$2b$10$/AlxHgO1Z1YTBnRjrDm5lOC3Xy9IjepJsodcXbKkONtGGkvTBERc.', true) ON CONFLICT (username) DO UPDATE SET name='Andi Raharja', position='Kabag Operasional', role='admin', password_hash='$2b$10$/AlxHgO1Z1YTBnRjrDm5lOC3Xy9IjepJsodcXbKkONtGGkvTBERc.', active=true;
INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('dimas.andaru', 'Dimas Andaru', 'PJ Samsat Pekanbaru Kota', 'super_admin', '$2b$10$/AlxHgO1Z1YTBnRjrDm5lO2Q6vf7x8O5qOACw4EI0YHlJ7K0ZUjgO', true) ON CONFLICT (username) DO UPDATE SET name='Dimas Andaru', position='PJ Samsat Pekanbaru Kota', role='super_admin', password_hash='$2b$10$/AlxHgO1Z1YTBnRjrDm5lO2Q6vf7x8O5qOACw4EI0YHlJ7K0ZUjgO', active=true;
INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('hamzah.arridho', 'Hamzah Arridho', 'Kasubag SW', 'admin', '$2b$10$/AlxHgO1Z1YTBnRjrDm5lOTuL71c.q35Xrkhz9XpQRt8uMCCjsjnC', true) ON CONFLICT (username) DO UPDATE SET name='Hamzah Arridho', position='Kasubag SW', role='admin', password_hash='$2b$10$/AlxHgO1Z1YTBnRjrDm5lOTuL71c.q35Xrkhz9XpQRt8uMCCjsjnC', active=true;
INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('siti.izriskiah', 'Siti Izriskiah', 'PJ Samsat Pekanbaru Selatan', 'user', '$2b$10$/AlxHgO1Z1YTBnRjrDm5lOgkIfKB4QbI0/Ar9ThLWFNWvKJ4/XX/K', true) ON CONFLICT (username) DO UPDATE SET name='Siti Izriskiah', position='PJ Samsat Pekanbaru Selatan', role='user', password_hash='$2b$10$/AlxHgO1Z1YTBnRjrDm5lOgkIfKB4QbI0/Ar9ThLWFNWvKJ4/XX/K', active=true;
INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('imelda.kusumastuti', 'Imelda Kusumastuti', 'PA Samsat Rumbai', 'user', '$2b$10$/AlxHgO1Z1YTBnRjrDm5lOxe8Y9RbY/qRz1x8MmTmwpUvnUProTsa', true) ON CONFLICT (username) DO UPDATE SET name='Imelda Kusumastuti', position='PA Samsat Rumbai', role='user', password_hash='$2b$10$/AlxHgO1Z1YTBnRjrDm5lOxe8Y9RbY/qRz1x8MmTmwpUvnUProTsa', active=true;
INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('rahmalina', 'Rahmalina', 'Staff Adm. Tk. I Samsat Panam', 'user', '$2b$10$/AlxHgO1Z1YTBnRjrDm5lOhyfDqC1CBSNhefrj7RDw91X1DWKN9bq', true) ON CONFLICT (username) DO UPDATE SET name='Rahmalina', position='Staff Adm. Tk. I Samsat Panam', role='user', password_hash='$2b$10$/AlxHgO1Z1YTBnRjrDm5lOhyfDqC1CBSNhefrj7RDw91X1DWKN9bq', active=true;
INSERT INTO public.app_users (username, name, position, role, password_hash, active) VALUES ('luisi.handayani', 'Luisi Handayani', 'Staff SW & Humas', 'admin', '$2b$10$/AlxHgO1Z1YTBnRjrDm5lOx4r/9g3WeqgdR0lg93qK7h4lbIMrvui', true) ON CONFLICT (username) DO UPDATE SET name='Luisi Handayani', position='Staff SW & Humas', role='admin', password_hash='$2b$10$/AlxHgO1Z1YTBnRjrDm5lOx4r/9g3WeqgdR0lg93qK7h4lbIMrvui', active=true;
