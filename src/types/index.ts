export type UserRole = "student" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  thumbnail_url: string | null;
  price: number;
  discount_price: number | null;
  currency: string;
  instructor_name: string | null;
  duration: string | null;
  level: string | null;
  language: string | null;
  status: "draft" | "published" | "archived";
  allow_pdf_download: boolean;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content_type: "pdf" | "html_app" | "video" | "text" | "quiz";
  position: number;
  duration: string | null;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: "active" | "cancelled" | "refunded" | "expired";
}
