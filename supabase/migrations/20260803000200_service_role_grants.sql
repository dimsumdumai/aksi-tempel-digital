grant usage on schema public to service_role;
grant select, insert, update, delete on public.app_users, public.app_sessions, public.arrears, public.sightings to service_role;
grant usage, select on all sequences in schema public to service_role;
