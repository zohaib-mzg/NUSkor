export type Role = "admin" | "ta" | "student";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  created_at: string;
}

export interface Student {
  id: string;
  registration_no: string | null;
  program: string | null;
  semester: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  is_archived: boolean;
  created_by: string | null;
  created_at: string;
  sections?: CourseSection[] | null;
}

export interface CourseSection {
  id: string;
  course_id: string;
  section_code: string;
  semester: string | null;
  academic_year: string | null;
  status: "active" | "archived";
  created_by: string | null;
  created_at: string;
  course?: { code: string; title: string } | null;
}

export interface SectionTa {
  id: string;
  section_id: string;
  ta_id: string;
  assigned_at: string;
  ta?: Profile | null;
}

export interface Enrollment {
  id: string;
  student_id: string;
  section_id: string;
  invited_by: string | null;
  created_at: string;
  section?: (CourseSection & { course?: { code: string; title: string } }) | null;
  profiles?: { email?: string; full_name?: string } | null;
}

export type AssessmentType =
  | "quiz"
  | "assignment"
  | "midterm"
  | "project"
  | "final"
  | "other";

export interface Assessment {
  id: string;
  section_id: string;
  title: string;
  type: AssessmentType;
  total_marks: number;
  weightage: number;
  release_date: string | null;
  status: "draft" | "published" | "archived";
  created_by: string | null;
  created_at: string;
  section?: (CourseSection & { course?: { code: string; title: string } }) | null;
}

export interface Mark {
  id: string;
  student_id: string;
  assessment_id: string;
  obtained: number;
  updated_by: string | null;
  updated_at: string;
  assessment?: Assessment | null;
}

export interface EvaluationPeriod {
  id: string;
  section_id: string;
  title: string;
  starts_on: string;
  ends_on: string;
  is_closed: boolean;
  created_by: string | null;
  created_at: string;
  section?: (CourseSection & { course?: { code: string; title: string } }) | null;
}

export interface EvaluationSlot {
  id: string;
  evaluation_period_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_open: boolean;
  created_at: string;
}

export interface SlotWithBookings {
  slot_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_open: boolean;
  booked: number;
}

export type BookingStatus = "confirmed" | "pending" | "cancelled";

export interface Booking {
  id: string;
  student_id: string;
  evaluation_period_id: string;
  slot_id: string;
  status: BookingStatus;
  created_at: string;
  evaluation_slots?: EvaluationSlot | null;
  evaluation_periods?: EvaluationPeriod | null;
  students?: {
    registration_no?: string | null;
    profiles?: { email?: string; full_name?: string };
  } | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  section_id: string | null;
  status: "draft" | "published" | "archived";
  created_by: string | null;
  created_at: string;
  published_at: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  profiles?: { full_name?: string } | null;
  section?: (CourseSection & { course?: { code: string; title: string } }) | null;
}

export type NotificationType =
  | "announcement"
  | "marks_released"
  | "evaluation_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "important_update";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  related_id: string | null;
  announcement_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  announcement?: Announcement | null;
}

export interface PushSubscriptionRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  user_id: string;
  announcements: boolean;
  marks_released: boolean;
  evaluation_updates: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotifyPayload {
  title: string;
  message: string;
  url: string;
}

export interface NotifyResult {
  created: number;
  recipients: string[];
  payload: NotifyPayload | null;
}

export interface TaApplication {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  requested_at: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

export interface StudentInvite {
  id: string;
  token: string;
  section_id: string;
  created_by_ta: string;
  created_at: string;
  expires_at: string;
  max_uses: number | null;
  used_count: number;
  accepted_at: string | null;
  accepted_by: string | null;
  status: "active" | "inactive" | "accepted" | "revoked";
  section?: (CourseSection & { course?: { code: string; title: string } }) | null;
}

export interface InviteDetails {
  section_id: string;
  section_code: string;
  course_code: string;
  course_title: string;
  ta_name: string | null;
  created_at: string;
}

export interface JoinSectionResult {
  section_id: string;
  already_enrolled: boolean;
}

export interface LeaderboardEntry {
  registration_no: string | null;
  total: number;
  obtained?: number;
  total_marks?: number;
  percent: number;
  rank: number;
}

export interface AssessmentStats {
  avg_marks: number | null;
  min_marks: number | null;
  max_marks: number | null;
  total_students: number | null;
}

export interface StudentWithEnrollment {
  student: Student;
  sections: { id: string; section_code: string; course: { code: string; title: string } }[];
}