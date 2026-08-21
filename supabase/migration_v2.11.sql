-- =========================================================
-- NUSkor — Migration v2.11
-- 1. PURGE: remove stray students/enrollments rows for
--    non-student accounts (TA/admin) so they can never appear
--    in marks, student lists, bookings or exports.
-- 2. GUARD: triggers reject any future students/enrollments
--    row whose profile role is not 'student'.
-- 3. MARKS GUARD: block writing marks for a non-student.
-- 4. BACKFILL registration_no from the university email
--    (l242610@lhr.nu.edu.pk -> 24L-2610). Never overwrites a
--    value that already parses to the canonical format.
-- Idempotent: safe to run repeatedly in the SQL Editor.
-- =========================================================

-- ---------- 1. PURGE NON-STUDENT ACCOUNTS ----------
delete from public.enrollments e
using public.students s, public.profiles p
where e.student_id = s.id and s.id = p.id and p.role <> 'student';

delete from public.bookings b
using public.students s, public.profiles p
where b.student_id = s.id and s.id = p.id and p.role <> 'student';

delete from public.marks m
using public.students s, public.profiles p
where m.student_id = s.id and s.id = p.id and p.role <> 'student';

delete from public.students s
using public.profiles p
where s.id = p.id and p.role <> 'student';

-- ---------- 2. GUARDS ----------
create or replace function public.assert_student_account()
returns trigger as $$
declare
  v_role text;
begin
  select role into v_role from public.profiles where id = coalesce(new.id, new.student_id);
  if coalesce(v_role, '') <> 'student' then
    -- Silently skip (returning NULL cancels the row) so legacy
    -- auto-register flows can never create TA/admin student rows.
    return null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_students_only_students on public.students;
create trigger trg_students_only_students
  before insert or update on public.students
  for each row execute procedure public.assert_student_account();

drop trigger if exists trg_enrollments_only_students on public.enrollments;
create trigger trg_enrollments_only_students
  before insert or update on public.enrollments
  for each row execute procedure public.assert_student_account();

create or replace function public.assert_marks_target_student()
returns trigger as $$
declare
  v_role text;
begin
  select p.role into v_role
  from public.students s join public.profiles p on p.id = s.id
  where s.id = new.student_id;
  if coalesce(v_role, '') <> 'student' then
    raise exception 'Marks can only be recorded for enrolled students';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_marks_only_students on public.marks;
create trigger trg_marks_only_students
  before insert or update on public.marks
  for each row execute procedure public.assert_marks_target_student();

-- Auto-fill registration_no whenever a student row is created
-- (covers join_section and every other signup path).
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
    v_arr := substring(v_local from '^L([0-9]{2})([0-9]{3,})$');
    if v_arr is not null then
      new.registration_no := v_arr[1] || 'L-' || v_arr[2];
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_students_fill_regno on public.students;
create trigger trg_students_fill_regno
  before insert on public.students
  for each row execute procedure public.fill_reg_no_from_email();

-- ---------- 3. BACKFILL REGISTRATION NO FROM EMAIL ----------
-- Canonical form: YYL-NNNN derived from local part l242610.
-- Only touches NULL / empty / non-canonical values; valid
-- values are never overwritten.
with norm as (
  select s2.id,
         upper(regexp_replace(split_part(u.email, '@', 1), '[^0-9A-Za-z]', '', 'g')) as loc
  from public.students s2
  join auth.users u on u.id = s2.id
)
update public.students s
set registration_no = (m.arr)[1] || 'L-' || (m.arr)[2]
from (
  select n.id, substring(n.loc from '^L([0-9]{2})([0-9]{3,})$') as arr
  from norm n
) m
where s.id = m.id
  and m.arr is not null
  and (
    s.registration_no is null
    or s.registration_no = ''
    or upper(s.registration_no) in ('N/A', 'NA', 'NONE', 'NULL', '-')
    or s.registration_no !~ '^[0-9]{2}L-[0-9]{3,}$'
  );

-- =========================================================
-- END v2.11
-- =========================================================
