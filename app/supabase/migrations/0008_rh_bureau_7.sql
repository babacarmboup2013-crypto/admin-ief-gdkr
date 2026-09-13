-- Migration 0008 : étendre is_rh() pour que le bureau 7 (RH) ait les mêmes droits que super/chef
-- Le bureau RH gère et administre tout le personnel

CREATE OR REPLACE FUNCTION public.is_rh()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.auth_role() IN ('super_admin', 'chef_admin')
         OR public.auth_bureau() = 7;
$$;
