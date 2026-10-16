import { useLayoutEffect } from 'react';
import { MOCK_STUDENTS, MOCK_ADMINS } from './types';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './store';
import Login from './pages/Login';
import StudentLayout from './layouts/StudentLayout';
import AdminLayout from './layouts/AdminLayout';
import StudentChat from './pages/student/Chat';
import StudentNotices from './pages/student/Notices';
import StudentTickets from './pages/student/MyTickets';
import AdminDashboard from './pages/admin/Dashboard';
import AdminKnowledge from './pages/admin/Knowledge';
import AdminNotices from './pages/admin/Notices';
import AdminTickets from './pages/admin/Tickets';
import AdminSettings from './pages/admin/Settings';

/** 路由守卫：未选身份访问内页时跳回登录页（第 10 节第 1 步） */
function RequireAuth({ children, role }: { children: React.ReactNode; role?: 'student' | 'admin' }) {
  const currentUser = useStore((s) => s.currentUser);
  if (!currentUser) return <Navigate to="/login" replace />;
  if (role && currentUser.role !== role) {
    // 学生访问管理端（或反之）→ 回到自己一侧
    return <Navigate to={currentUser.role === 'student' ? '/student/chat' : '/admin/dashboard'} replace />;
  }
  return <>{children}</>;
}

export default function AppRoutes() {
  const location = useLocation();
  const currentUser = useStore((state) => state.currentUser);
  const requested = [...MOCK_STUDENTS, ...MOCK_ADMINS].find((user) => user.id === new URLSearchParams(location.search).get('as'));
  // 同页粘贴直达链接也必须优先切换身份，不能先被内页守卫重定向。
  useLayoutEffect(() => { if (requested && requested.id !== currentUser?.id) useStore.getState().login(requested); }, [requested, currentUser?.id]);
  if (requested && requested.id !== currentUser?.id) return null;
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/student"
        element={
          <RequireAuth role="student">
            <StudentLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="chat" replace />} />
        <Route path="chat" element={<StudentChat />} />
        <Route path="notices" element={<StudentNotices />} />
        <Route path="tickets" element={<StudentTickets />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="knowledge" element={<AdminKnowledge />} />
        <Route path="notices" element={<AdminNotices />} />
        <Route path="tickets" element={<AdminTickets />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
