-- =========================================================
-- migration_v2.33.sql
-- Fix registration_no extraction: it was hardcoded to the
-- letter "L" (Lahore), so students on any other letter
-- (f250646@lhr.nu.edu.pk, i231234, ...) got NULL / "N/A".
--
-- A NUST reg no is 2-digit year + 1-letter campus/program
-- code + serial, canonicalised as "YY?-NNNN". The email
-- local part places the code BEFORE the year (f250646);
-- an already-canonical reg no places it AFTER (24L-2610).
-- Both shapes are now accepted for any A-Z code.
-- =========================================================

-- 1. Trigger: auto-fill on insert, for any code letter
create or replace function public.fill_reg_no_from_email()
returns trigger as $$
declare
  v_local text;
  v_arr text[];
begin
  if new.registration_no is null or new.registration_no = '' then
    select upper(regexp_replace(split_part(u.email, '@', 1), '[^0-9A-Za-z]', '', 'g'))
      into v_local
    from auth.users u where u.id = new.id;

    -- <code><YY><serial>, e.g. f250646 -> 25F-0646
    v_arr := regexp_match(v_local, '^([A-Z])([0-9]{2})([0-9]{3,})$');
    if v_arr is not null then
      new.registration_no := v_arr[2] || v_arr[1] || '-' || v_arr[3];
    else
      -- <YY><code><serial>, e.g. 242610l -> 24L-2610
      v_arr := regexp_match(v_local, '^([0-9]{2})([A-Z])([0-9]{3,})$');
      if v_arr is not null then
        new.registration_no := v_arr[1] || v_arr[2] || '-' || v_arr[3];
      end if;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_students_fill_regno on public.students;
create trigger trg_students_fill_regno
  before insert on public.students
  for each row execute procedure public.fill_reg_no_from_email();

-- 2. Backfill rows the "L"-only version skipped.
-- Only touches NULL / empty / placeholder / non-canonical
-- values; already-valid registration numbers are never
-- overwritten, so re-running is safe.

-- Shape A: local part is <code><YY><serial>  (f250646)
with norm as (
  select s2.id,
         upper(regexp_replace(split_part(u.email, '@', 1), '[^0-9A-Za-z]', '', 'g')) as loc
  from public.students s2
  join auth.users u on u.id = s2.id
), m as (
  select n.id, regexp_match(n.loc, '^([A-Z])([0-9]{2})([0-9]{3,})$') as arr
  from norm n
)
update public.students s
set registration_no = (m.arr)[2] || (m.arr)[1] || '-' || (m.arr)[3]
from m
where s.id = m.id
  and m.arr is not null
  and (
    s.registration_no is null
    or s.registration_no = ''
    or upper(s.registration_no) in ('N/A', 'NA', 'NONE', 'NULL', '-')
    or s.registration_no !~ '^[0-9]{2}[A-Z]-[0-9]{3,}$'
  );

-- Shape B: local part is <YY><code><serial>  (242610l)
with norm as (
  select s2.id,
         upper(regexp_replace(split_part(u.email, '@', 1), '[^0-9A-Za-z]', '', 'g')) as loc
  from public.students s2
  join auth.users u on u.id = s2.id
), m as (
  select n.id, regexp_match(n.loc, '^([0-9]{2})([A-Z])([0-9]{3,})$') as arr
  from norm n
)
update public.students s
set registration_no = (m.arr)[1] || (m.arr)[2] || '-' || (m.arr)[3]
from m
where s.id = m.id
  and m.arr is not null
  and (
    s.registration_no is null
    or s.registration_no = ''
    or upper(s.registration_no) in ('N/A', 'NA', 'NONE', 'NULL', '-')
    or s.registration_no !~ '^[0-9]{2}[A-Z]-[0-9]{3,}$'
  );

-- =========================================================
-- END v2.33
-- =========================================================
