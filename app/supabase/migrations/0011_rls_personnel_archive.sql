-- Désactiver RLS sur personnel_archive (lecture seule, données archivées)
-- Le service_role (REST API) contourne le RLS de toute façon
ALTER TABLE personnel_archive DISABLE ROW LEVEL SECURITY;
