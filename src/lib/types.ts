export type Role = "student" | "admin";

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
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  created_at: string;
  course?: Course | null;
}

export type AssessmentType = "quiz" | "assignment" | "midterm" | "project" | "other";

export interface Assessment {
  id: string;
  course_id: string;
  title: string;
  type: AssessmentType;
  total_marks: number;
  created_by: string | null;
  created_at: string;
  course?: { code: string; title: string } | null;
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
  course_id: string;
  title: string;
  starts_on: string;
  ends_on: string;
  is_closed: boolean;
  created_by: string | null;
  created_at: string;
  course?: { code: string; title: string } | null;
}

export interface EvaluationSlot {
  id: string;
  evaluation_period_id: string;
  slot_date: string;
  slot_time: string;
  capacity: number;
  is_open: boolean;
  created_at: string;
}

export interface SlotWithBookings {
  slot_id: string;
  slot_date: string;
  slot_time: string;
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
  students?: { profiles?: { email?: string; full_name?: string }[] }[] | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  profiles?: { full_name?: string } | null;
}

export interface LeaderboardEntry {
  registration_no: string | null;
  total: number;
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
  courses: { code: string; title: string }[];
}