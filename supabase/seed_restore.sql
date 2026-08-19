-- =========================================================
-- NUSkor — DEMO DATA RESTORE
-- Rebuilds profiles/students/course data after rows were
-- manually deleted. Idempotent: safe to run multiple times.
-- Run in the Supabase SQL Editor (postgres role, RLS bypassed).
-- =========================================================

-- ---------- 1. RESTORE MISSING PROFILES ----------
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  case when lower(u.email) = 'l242530@lhr.nu.edu.pk' then 'admin' else 'student' end
from auth.users u
on conflict (id) do nothing;

-- ---------- 2. RESTORE STUDENT ROWS ----------
insert into public.students (id, registration_no, program, semester)
select p.id,
       null,
       'BSCS', 'Fall 2026'
from public.profiles p
where p.role = 'student'
on conflict (id) do nothing;

-- ---------- 3. ENSURE A SECTION FOR EVERY COURSE ----------
insert into public.course_sections (course_id, section_code, semester, academic_year, status, created_by)
select c.id, 'A', 'Fall 2026', '2026', 'active', a.id
from public.courses c
left join public.profiles a on a.email = 'l242530@lhr.nu.edu.pk'
where not exists (
  select 1 from public.course_sections s where s.course_id = c.id
);

-- ---------- 4. ENROLL ALL STUDENTS IN THE FIRST SECTION ----------
insert into public.enrollments (student_id, section_id)
select s.id, sec.id
from public.students s
cross join public.course_sections sec
where sec.section_code = 'A'
  and not exists (
    select 1 from public.enrollments e
    where e.student_id = s.id and e.section_id = sec.id
  );

-- ---------- 5. DEMO ASSESSMENTS ----------
insert into public.assessments (section_id, title, type, total_marks, weightage, release_date, status, created_by)
select sec.id, v.title, v.type, v.total_marks, v.weightage, v.release_date, 'published', a.id
from public.course_sections sec
left join public.profiles a on a.email = 'l242530@lhr.nu.edu.pk'
cross join (values
  ('Quiz 1',          'quiz',       10, 10, current_date - interval '10 days'),
  ('Assignment 1',    'assignment', 15, 15, current_date - interval '5 days'),
  ('Midterm',         'midterm',    30, 30, current_date - interval '1 day'),
  ('Project',         'project',    20, 20, null),
  ('Final',           'final',      25, 25, null)
) as v(title, type, total_marks, weightage, release_date)
where not exists (
  select 1 from public.assessments x
  where x.section_id = sec.id and x.title = v.title
);

-- ---------- 6. DEMO MARKS (for both students) ----------
insert into public.marks (student_id, assessment_id, obtained, updated_by, updated_at)
select st.id, asm.id, v.obtained, a.id, now()
from public.students st
join public.profiles p on p.id = st.id
join public.assessments asm on asm.title in ('Quiz 1', 'Assignment 1', 'Midterm')
left join public.profiles a on a.email = 'l242530@lhr.nu.edu.pk'
cross join (values
  ('l242558@lhr.nu.edu.pk', 'Quiz 1',        8),
  ('l242558@lhr.nu.edu.pk', 'Assignment 1',  13),
  ('l242558@lhr.nu.edu.pk', 'Midterm',       25),
  ('l242610@lhr.nu.edu.pk', 'Quiz 1',        7),
  ('l242610@lhr.nu.edu.pk', 'Assignment 1',  14),
  ('l242610@lhr.nu.edu.pk', 'Midterm',       26)
) as v(email, title, obtained)
where p.email = v.email and asm.title = v.title
  and not exists (
    select 1 from public.marks m
    where m.student_id = st.id and m.assessment_id = asm.id
  );

-- ---------- 7. DEMO EVALUATION PERIOD + SLOTS ----------
insert into public.evaluation_periods (section_id, title, starts_on, ends_on, is_closed, created_by)
select sec.id, 'Midterm Evaluation - Section ' || sec.section_code,
       current_date + 2, current_date + 7, false, a.id
from public.course_sections sec
left join public.profiles a on a.email = 'l242530@lhr.nu.edu.pk'
where not exists (
  select 1 from public.evaluation_periods e where e.section_id = sec.id
);

insert into public.evaluation_slots (evaluation_period_id, slot_date, start_time, end_time, capacity, is_open)
select e.id, e.starts_on + s.offset_days, s.start_time, s.end_time, 4, true
from public.evaluation_periods e
cross join (values
  (0, '09:00'::time, '11:00'::time),
  (1, '11:00'::time, '13:00'::time),
  (2, '14:00'::time, '16:00'::time)
) as s(offset_days, start_time, end_time)
where not exists (
  select 1 from public.evaluation_slots sl where sl.evaluation_period_id = e.id
);

-- ---------- 8. DEMO ANNOUNCEMENT + NOTIFICATIONS ----------
insert into public.announcements (title, body, section_id, status, created_by, published_at)
select 'Welcome to CS101 Section A', 'This is a test announcement. Marks for Quiz 1 have been released.',
       sec.id, 'published', a.id, now()
from public.course_sections sec
left join public.profiles a on a.email = 'l242530@lhr.nu.edu.pk'
where not exists (
  select 1 from public.announcements x where x.title = 'Welcome to CS101 Section A'
);

insert into public.notifications (user_id, announcement_id, title, message)
select p.id, ann.id, ann.title, ann.body
from public.announcements ann
join public.course_sections sec on sec.id = ann.section_id
join public.enrollments e on e.section_id = sec.id
join public.profiles p on p.id = e.student_id
on conflict (user_id, announcement_id) do nothing;

-- ---------- 9. PENDING TA APPLICATION FOR l242610 ----------
insert into public.ta_applications (email, full_name, user_id, requested_at, status)
select p.email, p.full_name, p.id, now(), 'pending'
from public.profiles p
where p.email = 'l242610@lhr.nu.edu.pk'
  and not exists (
    select 1 from public.ta_applications t
    where t.user_id = p.id and t.status = 'pending'
  );

-- ---------- 10. VERIFY ----------
select 'profiles' as tbl, count(*) from public.profiles
union all select 'students', count(*) from public.students
union all select 'courses', count(*) from public.courses
union all select 'course_sections', count(*) from public.course_sections
union all select 'enrollments', count(*) from public.enrollments
union all select 'assessments', count(*) from public.assessments
union all select 'marks', count(*) from public.marks
union all select 'evaluation_periods', count(*) from public.evaluation_periods
union all select 'evaluation_slots', count(*) from public.evaluation_slots
union all select 'announcements', count(*) from public.announcements
union all select 'notifications', count(*) from public.notifications
union all select 'ta_applications', count(*) from public.ta_applications;