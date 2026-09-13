-- ============================================================
-- IEF ADMIN - Nettoyage des doublons bureaux / ecoles
-- À exécuter dans le SQL Editor (rôle postgres) AVANT de relancer 0007
-- si celui-ci a échoué avec « more than one row returned by a subquery ».
-- Garde l'id minimum, re-pointe toutes les tables qui référencent.
-- ============================================================

begin;

-- --- ecoles : garder min(id), re-pointer personnel ---
do $$
declare
  r record;
  n bigint;
begin
  for r in
    select nom, min(id) as keep
    from public.ecoles
    where nom is not null
    group by nom
    having count(*) > 1
  loop
    update public.personnel p
      set ecole_id = r.keep
      where p.ecole_id in (
        select id from public.ecoles e where e.nom = r.nom and e.id <> r.keep
      );
    delete from public.ecoles e
      where e.nom = r.nom and e.id <> r.keep;
    get diagnostics n = row_count;
    raise notice 'ecoles % : garde id=% (% doublons supprimés)', r.nom, r.keep, n;
  end loop;
end $$;

-- --- bureaux : garder min(id), re-pointer TOUTES les tables référentes ---
do $$
declare
  r record;
  col record;
  uid bigint;
  n bigint;
begin
  for r in
    select nom, min(id) as keep
    from public.bureaux
    where nom is not null
    group by nom
    having count(*) > 1
  loop
    for col in
      select c.table_name, c.column_name
      from information_schema.columns c
      where c.table_schema = 'public' and c.column_name = 'bureau_id'
    loop
      execute format(
        'update public.%I p set bureau_id = %L where p.bureau_id in (select id from public.bureaux b where b.nom = %L and b.id <> %L)',
        col.table_name, r.keep, r.nom, r.keep
      );
      get diagnostics n = row_count;
      if n > 0 then
        raise notice 'bureaux %.% : % lignes re-pointées vers %', col.table_name, col.column_name, n, r.keep;
      end if;
    end loop;
    delete from public.bureaux b where b.nom = r.nom and b.id <> r.keep;
    raise notice 'bureaux % : garde id=%', r.nom, r.keep;
  end loop;
end $$;

commit;

-- --- Contrôle : aucune ligne, sinon il reste des doublons ---
select nom, count(*) from public.bureaux where nom is not null group by nom having count(*) > 1;
select nom, count(*) from public.ecoles  where nom is not null group by nom having count(*) > 1;