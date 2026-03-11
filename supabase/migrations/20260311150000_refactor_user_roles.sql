begin;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'app_role'
  ) then
    create type public.app_role as enum (
      'super_admin',
      'organization_admin',
      'organization_solicitor'
    );
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid null references public.organizations(id) on delete cascade,
  role public.app_role not null,
  email text null,
  full_name text null,
  phone text null,
  is_active boolean not null default true,
  invited_by_user_id uuid null references auth.users(id) on delete set null,
  constraint user_roles_scope_chk check (
    (role = 'super_admin' and organization_id is null)
    or
    (role in ('organization_admin', 'organization_solicitor') and organization_id is not null)
  )
);

create table if not exists public.donor_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  created_at timestamptz not null default now(),
  donor_id uuid not null references public.donors(id) on delete cascade,
  fiscal_year_id uuid not null references public.fiscal_years(id) on delete cascade,
  user_role_id uuid not null references public.user_roles(id) on delete cascade,
  is_primary boolean not null default false
);

insert into public.user_roles (
  id,
  created_at,
  updated_at,
  user_id,
  organization_id,
  role,
  email,
  full_name,
  phone,
  is_active
)
select
  om.id,
  om.created_at,
  om.updated_at,
  om.user_id,
  om.organization_id,
  case
    when om.role in ('owner', 'admin') then 'organization_admin'::public.app_role
    else 'organization_solicitor'::public.app_role
  end,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email),
  u.phone,
  true
from public.org_members om
left join auth.users u on u.id = om.user_id
where not exists (
  select 1
  from public.user_roles ur
  where ur.id = om.id
);

insert into public.user_roles (
  id,
  created_at,
  updated_at,
  user_id,
  organization_id,
  role,
  email,
  full_name,
  phone,
  is_active
)
select
  s.id,
  s.created_at,
  s.updated_at,
  s.user_id,
  s.organization_id,
  'organization_solicitor'::public.app_role,
  case
    when u.email like '%@placeholder.invalid' then null
    else coalesce(s.email, u.email)
  end,
  coalesce(s.name, u.raw_user_meta_data ->> 'full_name', u.email),
  coalesce(s.phone, u.phone),
  s.is_active
from public.solicitors s
left join auth.users u on u.id = s.user_id
where s.user_id is not null
  and not exists (
    select 1
    from public.user_roles ur
    where ur.organization_id = s.organization_id
      and ur.user_id = s.user_id
  );

insert into public.user_roles (
  created_at,
  updated_at,
  user_id,
  organization_id,
  role,
  email,
  full_name,
  phone,
  is_active
)
select
  sa.created_at,
  coalesce(u.updated_at, sa.created_at),
  u.id,
  null,
  'super_admin'::public.app_role,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.email),
  u.phone,
  true
from public.super_admins sa
join auth.users u on lower(u.email) = lower(sa.email)
where not exists (
  select 1
  from public.user_roles ur
  where ur.user_id = u.id
    and ur.role = 'super_admin'::public.app_role
);

create unique index if not exists user_roles_super_admin_uidx
  on public.user_roles (user_id)
  where role = 'super_admin'::public.app_role;

create unique index if not exists user_roles_org_uidx
  on public.user_roles (user_id, organization_id)
  where organization_id is not null;

create index if not exists user_roles_org_idx
  on public.user_roles (organization_id);

create index if not exists user_roles_user_idx
  on public.user_roles (user_id);

insert into public.donor_assignments (
  id,
  created_at,
  donor_id,
  fiscal_year_id,
  user_role_id,
  is_primary
)
select
  dsa.id,
  dsa.created_at,
  dsa.donor_id,
  dsa.fiscal_year_id,
  dsa.solicitor_id,
  dsa.is_primary
from public.donor_solicitor_assignments dsa
where exists (
  select 1
  from public.user_roles ur
  where ur.id = dsa.solicitor_id
)
and not exists (
  select 1
  from public.donor_assignments da
  where da.id = dsa.id
);

create unique index if not exists donor_assignments_unique_idx
  on public.donor_assignments (donor_id, fiscal_year_id, user_role_id);

create index if not exists donor_assignments_donor_idx
  on public.donor_assignments (donor_id);

create index if not exists donor_assignments_user_role_idx
  on public.donor_assignments (user_role_id);

alter table public.org_invites
  alter column role drop default;

alter table public.org_invites
  alter column role type public.app_role
  using (
    case
      when role::text in ('owner', 'admin') then 'organization_admin'
      else 'organization_solicitor'
    end
  )::public.app_role;

alter table public.org_invites
  alter column role set default 'organization_solicitor'::public.app_role;

alter table public.moves
  drop constraint if exists moves_assigned_to_fkey;

alter table public.moves
  add constraint moves_assigned_to_fkey
  foreign key (assigned_to)
  references public.user_roles(id)
  on delete set null;

drop function if exists public.create_org_invite(uuid, text, public.org_role);
drop function if exists public.accept_org_invite(text);
drop function if exists public.get_org_members_with_emails(uuid);

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $function$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'super_admin'::public.app_role
      and ur.is_active = true
  );
$function$;

create or replace function public.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $function$
  select public.is_super_admin() or exists (
    select 1
    from public.user_roles ur
    where ur.organization_id = org_id
      and ur.user_id = auth.uid()
      and ur.is_active = true
  );
$function$;

create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $function$
  select public.is_super_admin() or exists (
    select 1
    from public.user_roles ur
    where ur.organization_id = org_id
      and ur.user_id = auth.uid()
      and ur.is_active = true
      and ur.role = 'organization_admin'::public.app_role
  );
$function$;

create or replace function public.create_organization(name text, slug text)
returns public.organizations
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  new_org organizations%rowtype;
  current_email text;
  current_full_name text;
  current_phone text;
begin
  if not is_super_admin() then
    raise exception 'Not authorized';
  end if;

  insert into public.organizations (name, slug)
  values (name, slug)
  returning * into new_org;

  if auth.uid() is not null then
    select
      email,
      coalesce(raw_user_meta_data ->> 'full_name', email),
      phone
    into
      current_email,
      current_full_name,
      current_phone
    from auth.users
    where id = auth.uid();

    insert into user_roles (
      user_id,
      organization_id,
      role,
      email,
      full_name,
      phone,
      is_active
    )
    values (
      auth.uid(),
      new_org.id,
      'organization_admin'::app_role,
      current_email,
      current_full_name,
      current_phone,
      true
    )
    on conflict (user_id, organization_id) where organization_id is not null
    do update set
      role = excluded.role,
      email = excluded.email,
      full_name = excluded.full_name,
      phone = excluded.phone,
      is_active = true,
      updated_at = now();
  end if;

  return new_org;
end;
$function$;

create or replace function public.create_org_invite(
  p_organization_id uuid,
  p_email text,
  p_role public.app_role
)
returns public.org_invites
language plpgsql
security definer
set search_path = public, auth, extensions
as $function$
declare
  invite org_invites%rowtype;
begin
  if p_role = 'super_admin'::app_role then
    raise exception 'Super admins cannot be invited per organization';
  end if;

  if not is_org_admin(p_organization_id) then
    raise exception 'Not authorized';
  end if;

  insert into org_invites (
    organization_id,
    created_by,
    email,
    role,
    token,
    expires_at
  )
  values (
    p_organization_id,
    auth.uid(),
    lower(trim(p_email)),
    p_role,
    encode(extensions.gen_random_bytes(32), 'hex'),
    now() + interval '7 days'
  )
  returning * into invite;

  return invite;
end;
$function$;

create or replace function public.accept_org_invite(p_token text)
returns public.user_roles
language plpgsql
security definer
set search_path = public, auth
as $function$
declare
  invite org_invites%rowtype;
  member user_roles%rowtype;
  current_email text;
  current_full_name text;
  current_phone text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select
    email,
    coalesce(raw_user_meta_data ->> 'full_name', email),
    phone
  into
    current_email,
    current_full_name,
    current_phone
  from auth.users
  where id = auth.uid();

  select *
  into invite
  from org_invites
  where token = p_token;

  if invite.id is null then
    raise exception 'Invite not found';
  end if;

  if invite.accepted_at is not null then
    raise exception 'Invite already accepted';
  end if;

  if invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  if lower(coalesce(current_email, '')) <> lower(invite.email) then
    raise exception 'Signed in email does not match invite';
  end if;

  insert into user_roles (
    user_id,
    organization_id,
    role,
    email,
    full_name,
    phone,
    is_active,
    invited_by_user_id
  )
  values (
    auth.uid(),
    invite.organization_id,
    invite.role,
    current_email,
    current_full_name,
    current_phone,
    true,
    invite.created_by
  )
  on conflict (user_id, organization_id) where organization_id is not null
  do update set
    role = excluded.role,
    email = excluded.email,
    full_name = excluded.full_name,
    phone = excluded.phone,
    is_active = true,
    invited_by_user_id = excluded.invited_by_user_id,
    updated_at = now()
  returning * into member;

  update org_invites
  set accepted_at = now()
  where id = invite.id;

  return member;
end;
$function$;

create or replace function public.get_org_members_with_emails(p_organization_id uuid)
returns table(
  id uuid,
  organization_id uuid,
  user_id uuid,
  role public.app_role,
  created_at timestamptz,
  updated_at timestamptz,
  email text,
  full_name text,
  phone text,
  is_active boolean
)
language sql
stable
security definer
set search_path = public, auth
as $function$
  select
    ur.id,
    ur.organization_id,
    ur.user_id,
    ur.role,
    ur.created_at,
    ur.updated_at,
    ur.email,
    ur.full_name,
    ur.phone,
    ur.is_active
  from user_roles ur
  where ur.organization_id = p_organization_id
    and is_org_member(p_organization_id)
  order by ur.created_at asc;
$function$;

create or replace view public.v_moves_dashboard as
select
  m.id,
  m.organization_id,
  m.donor_id,
  m.due_date,
  m.completed_at,
  m.is_completed,
  m.month,
  m.notes,
  m.name as move_name,
  d.name as donor_name,
  coalesce(d.primary_phone, d.mobile_phone, d.home_phone) as donor_phone,
  coalesce(ur.full_name, ur.email) as assigned_to_name,
  case
    when m.is_completed then 'completed'
    when m.due_date is not null and m.due_date < current_date then 'overdue'
    else 'pending'
  end as status
from public.moves m
join public.donors d on d.id = m.donor_id
left join public.user_roles ur on ur.id = m.assigned_to;

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
  sfy.title,
  sfy.letter_signature,
  sfy.letter_signature_title,
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
left join public.solicitor_fiscal_years sfy on sfy.solicitor_id = ur.id and sfy.fiscal_year_id = cf.id
left join solicitor_moves sm on sm.user_role_id = ur.id
left join solicitor_donors sd on sd.user_role_id = ur.id and sd.fiscal_year_id = cf.id
left join solicitor_need sn on sn.user_role_id = ur.id and sn.fiscal_year_id = cf.id
where ur.role in ('organization_admin'::public.app_role, 'organization_solicitor'::public.app_role);

create or replace view public.v_donor_summary as
with current_fy as (
  select distinct on (fy.organization_id)
    fy.id,
    fy.organization_id,
    fy.label
  from public.fiscal_years fy
  where fy.is_current = true
  order by fy.organization_id, fy.start_date desc, fy.created_at desc
),
move_totals as (
  select
    m.donor_id,
    count(*) filter (where not m.is_completed) as moves_scheduled,
    count(*) filter (where m.is_completed) as moves_completed
  from public.moves m
  group by m.donor_id
),
primary_solicitor as (
  select distinct on (da.donor_id, da.fiscal_year_id)
    da.donor_id,
    da.fiscal_year_id,
    coalesce(ur.full_name, ur.email, 'Unknown user') as solicitor_name
  from public.donor_assignments da
  join public.user_roles ur on ur.id = da.user_role_id
  order by da.donor_id, da.fiscal_year_id, da.is_primary desc, da.created_at
)
select
  d.id,
  d.organization_id,
  d.name,
  d.first_name,
  d.last_name,
  d.email,
  d.mobile_phone,
  d.city,
  d.state,
  d.generosity_score,
  d.wealth_capacity,
  d.ask_goal,
  ds.capacity_score,
  ds.hunch,
  ds.is_current_donor,
  ds.recent_major_donation,
  ds.major_donation_amount,
  ds.is_past_donor,
  ds.five_years_in_row,
  ds.long_term_commitment,
  ds.recent_1000_donation,
  ds.is_parent,
  ds.is_grandparent,
  ds.is_alumni,
  ds.is_board_member,
  ds.donor_fund_foundation,
  (
    coalesce(ds.is_current_donor, 0) +
    coalesce(ds.is_past_donor, 0) +
    coalesce(ds.long_term_commitment, 0) +
    coalesce(ds.recent_major_donation, 0) +
    coalesce(ds.recent_1000_donation, 0) +
    coalesce(ds.is_board_member, 0) +
    coalesce(ds.capacity_score, 0) +
    coalesce(ds.hunch, 0)
  ) as prospect_subtotal,
  (
    coalesce(ds.is_current_donor, 0) +
    coalesce(ds.is_past_donor, 0) +
    coalesce(ds.long_term_commitment, 0) +
    coalesce(ds.recent_major_donation, 0) +
    coalesce(ds.recent_1000_donation, 0) +
    coalesce(ds.is_board_member, 0) +
    coalesce(ds.capacity_score, 0) +
    coalesce(ds.hunch, 0)
  ) as total_score,
  coalesce(
    d.moves_needed_override,
    greatest(
      1,
      ceil((
        coalesce(ds.is_current_donor, 0) +
        coalesce(ds.is_past_donor, 0) +
        coalesce(ds.long_term_commitment, 0) +
        coalesce(ds.recent_major_donation, 0) +
        coalesce(ds.recent_1000_donation, 0) +
        coalesce(ds.is_board_member, 0) +
        coalesce(ds.capacity_score, 0) +
        coalesce(ds.hunch, 0)
      )::numeric / 10.0)::integer
    )
  ) as moves_needed,
  coalesce(mt.moves_scheduled, 0::bigint) as moves_scheduled,
  coalesce(mt.moves_completed, 0::bigint) as moves_completed,
  cf.label as fiscal_year_label,
  ps.solicitor_name
from public.donors d
left join current_fy cf on cf.organization_id = d.organization_id
left join public.donor_scores ds on ds.donor_id = d.id and ds.fiscal_year_id = cf.id
left join move_totals mt on mt.donor_id = d.id
left join primary_solicitor ps on ps.donor_id = d.id and ps.fiscal_year_id = cf.id;

alter table public.user_roles enable row level security;
alter table public.donor_assignments enable row level security;

drop policy if exists user_roles_select on public.user_roles;
drop policy if exists user_roles_insert on public.user_roles;
drop policy if exists user_roles_update on public.user_roles;
drop policy if exists user_roles_delete on public.user_roles;

create policy user_roles_select
  on public.user_roles
  for select
  using (
    public.is_super_admin()
    or (organization_id is not null and public.is_org_member(organization_id))
  );

create policy user_roles_insert
  on public.user_roles
  for insert
  with check (
    public.is_super_admin()
    or (organization_id is not null and public.is_org_admin(organization_id))
  );

create policy user_roles_update
  on public.user_roles
  for update
  using (
    public.is_super_admin()
    or (organization_id is not null and public.is_org_admin(organization_id))
  )
  with check (
    public.is_super_admin()
    or (organization_id is not null and public.is_org_admin(organization_id))
  );

create policy user_roles_delete
  on public.user_roles
  for delete
  using (
    public.is_super_admin()
    or (organization_id is not null and public.is_org_admin(organization_id))
  );

drop policy if exists donor_assignments_all on public.donor_assignments;

create policy donor_assignments_all
  on public.donor_assignments
  for all
  using (
    public.is_super_admin()
    or exists (
      select 1
      from public.donors d
      where d.id = donor_assignments.donor_id
        and public.is_org_member(d.organization_id)
    )
  )
  with check (
    public.is_super_admin()
    or exists (
      select 1
      from public.donors d
      where d.id = donor_assignments.donor_id
        and public.is_org_admin(d.organization_id)
    )
  );

commit;
