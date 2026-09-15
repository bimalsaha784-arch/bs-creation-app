import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { Layout } from "./components/Layout";
import { ProtectedRoute, AdminRoute } from "./components/RouteGuards";

import { Home } from "./pages/Home";
import { Courses } from "./pages/Courses";
import { CourseDetail } from "./pages/CourseDetail";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { Learn } from "./pages/Learn";
import { About, Contact, FAQ, PrivacyPolicy, Terms, RefundPolicy } from "./pages/StaticPages";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminCourses } from "./pages/admin/AdminCourses";
import { AdminCourseCreate } from "./pages/admin/AdminCourseCreate";
import { AdminCourseEdit } from "./pages/admin/AdminCourseEdit";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:courseSlug" element={<CourseDetail />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />

            {/* Student (protected) */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/learn/:courseId" element={<ProtectedRoute><Learn /></ProtectedRoute>} />

            {/* Admin (protected) */}
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
            <Route path="/admin/courses/create" element={<AdminRoute><AdminCourseCreate /></AdminRoute>} />
            <Route path="/admin/courses/:id/edit" element={<AdminRoute><AdminCourseEdit /></AdminRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
