-- =========================================================
-- NUSkor migration v2.17 — deletion integrity fixes
--
-- 1. course_sections.created_by FK was missed in v2.16 and
--    remained ON DELETE NO ACTION, so deleting a TA who owns
--    sections failed outright (dashboard auth-user deletion).
-- 2. delete_account() left the auth.users row behind: the old
--    session stayed valid and re-signin attached to a ghost
--    user with no profile -> blank/stuck state. Now the auth
--    entry is removed too (cascades sessions/tokens/profile).
-- 3. Deleting a TA anywhere (dashboard included) now behaves
--    like revoke_ta: their authored announcements and owned
--    sections are removed first via BEFORE DELETE trigger,
--    letting every cascade fire.
-- =========================================================

-- ---------- 1. MISSED FK ----------
alter table public.course_sections
  drop constraint if exists course_sections_created_by_fkey;
alter table public.course_sections
  add constraint course_sections_created_by_fkey
  foreign key (created_by) references public.profiles(id)
  on delete set null;

-- ---------- 2. DELETE_ACCOUNT removes the auth user ----------
create or replace function public.delete_account()
returns void
language plpgsql security definer
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Owned teaching content disappears entirely (the profiles
  -- DELETE trigger below would do this too; explicit here so the
  -- intent is obvious and order-independent).
  delete from course_sections where created_by = uid;
  delete from announcements where created_by = uid;

  -- Student-side data.
  delete from marks where student_id = uid;
  delete from enrollments where student_id = uid;
  delete from bookings where student_id = uid;
  delete from user_notification_settings where user_id = uid;
  delete from notifications where user_id = uid;
  delete from push_subscriptions where user_id = uid;
  delete from section_tas where ta_id = uid;
  delete from student_invites where created_by_ta = uid;
  delete from ta_applications where user_id = uid;

  -- Catalog rows they created survive without attribution
  -- (courses.created_by etc. are ON DELETE SET NULL).
  delete from profiles where id = uid;

  -- Remove the auth entry LAST: cascades sessions, refresh tokens
  -- and identities, instantly invalidating every signed-in device.
  -- Re-signup goes through handle_new_user as a brand-new user.
  delete from auth.users where id = uid;
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- ---------- 3. PROFILE DELETE = REVOKE_TA SEMANTICS ----------
-- Keeps dashboard/auth-admin deletions consistent with the app:
-- a deleted TA takes their sections and announcements with them.
create or replace function public.handle_profile_delete()
returns trigger
language plpgsql security definer
as $$
begin
  if old.role = 'ta' then
    delete from announcements where created_by = old.id;
    -- Cascades to assessments -> marks, enrollments, invites,
    -- evaluation periods -> slots -> bookings, section_tas,
    -- section announcements.
    delete from course_sections where created_by = old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists trg_profiles_delete_cleanup on public.profiles;
create trigger trg_profiles_delete_cleanup
  before delete on public.profiles
  for each row execute function public.handle_profile_delete();

-- =========================================================
-- END v2.17
-- =========================================================
