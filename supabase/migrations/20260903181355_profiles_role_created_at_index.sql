-- Supports FarmiersTab's paginated admin list: WHERE role = 'farmer'
-- ORDER BY created_at DESC, id DESC LIMIT 50, keyset-paginated from there.
create index if not exists idx_profiles_role_created_at on public.profiles (role, created_at desc, id desc);
