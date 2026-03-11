begin;

drop policy if exists solicitor_fiscal_years_all on public.solicitor_fiscal_years;

alter table if exists public.solicitor_fiscal_years
  drop constraint if exists solicitor_fiscal_years_solicitor_id_fkey;

alter table if exists public.solicitor_fiscal_years
  rename to user_role_fiscal_years;

alter table if exists public.user_role_fiscal_years
  rename column solicitor_id to user_role_id;

alter table if exists public.user_role_fiscal_years
  rename constraint solicitor_fiscal_years_fiscal_year_id_fkey to user_role_fiscal_years_fiscal_year_id_fkey;

alter table if exists public.user_role_fiscal_years
  add constraint user_role_fiscal_years_user_role_id_fkey
  foreign key (user_role_id)
  references public.user_roles(id)
  on delete cascade;

alter table public.user_role_fiscal_years enable row level security;

create policy user_role_fiscal_years_all
on public.user_role_fiscal_years
for all
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.user_roles ur
    where ur.id = user_role_fiscal_years.user_role_id
      and public.is_org_member(ur.organization_id)
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.user_roles ur
    where ur.id = user_role_fiscal_years.user_role_id
      and public.is_org_admin(ur.organization_id)
  )
);

create or replace view public.v_solicitor_summary as
with current_fy as (
  select distinct on (fy.organization_id)
    fy.id,
    fy.organization_id,
    fy.label
  from public.fiscal_years fy
  where fy.is_current = true
  order by fy.organization_id, fy.start_date desc, fy.created_at desc
),
solicitor_moves as (
  select
    m.assigned_to as user_role_id,
    count(*) filter (where not m.is_completed) as moves_scheduled,
    count(*) filter (where m.is_completed) as moves_completed
  from public.moves m
  where m.assigned_to is not null
  group by m.assigned_to
),
solicitor_donors as (
  select
    da.user_role_id,
    da.fiscal_year_id,
    count(distinct da.donor_id) as donor_count
  from public.donor_assignments da
  group by da.user_role_id, da.fiscal_year_id
),
solicitor_need as (
  select
    da.user_role_id,
    da.fiscal_year_id,
    sum(vds.moves_needed) as total_moves_needed
  from public.donor_assignments da
  join public.v_donor_summary vds on vds.id = da.donor_id
  group by da.user_role_id, da.fiscal_year_id
)
select
  ur.id,
  ur.organization_id,
  coalesce(ur.full_name, ur.email, 'Unknown user') as name,
  ur.email,
  ur.phone,
  ur.is_active,
  urfy.title,
  urfy.letter_signature,
  urfy.letter_signature_title,
  cf.label as fiscal_year_label,
  coalesce(sd.donor_count, 0::bigint) as donor_count,
  coalesce(sn.total_moves_needed, 0::bigint) as total_moves_needed,
  coalesce(sm.moves_scheduled, 0::bigint) as moves_scheduled,
  coalesce(sm.moves_completed, 0::bigint) as moves_completed,
  case
    when coalesce(sn.total_moves_needed, 0::bigint) = 0 then 0::numeric
    else round((coalesce(sm.moves_completed, 0::bigint)::numeric / nullif(sn.total_moves_needed, 0)::numeric) * 100::numeric, 2)
  end as completion_percentage
from public.user_roles ur
left join current_fy cf on cf.organization_id = ur.organization_id
left join public.user_role_fiscal_years urfy on urfy.user_role_id = ur.id and urfy.fiscal_year_id = cf.id
left join solicitor_moves sm on sm.user_role_id = ur.id
left join solicitor_donors sd on sd.user_role_id = ur.id and sd.fiscal_year_id = cf.id
left join solicitor_need sn on sn.user_role_id = ur.id and sn.fiscal_year_id = cf.id
where ur.role in ('organization_admin'::public.app_role, 'organization_solicitor'::public.app_role);

drop table if exists public.donor_solicitor_assignments;
drop table if exists public.solicitors;
drop table if exists public.org_members;
drop table if exists public.super_admins;

drop type if exists public.org_role;

commit;
