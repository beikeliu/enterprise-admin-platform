import { lazy, Suspense } from 'react';
import { Spin } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '@/layouts/AdminLayout';
import { ProtectedRoute } from './ProtectedRoute';

const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const TicketsPage = lazy(() => import('@/features/tickets/TicketsPage').then((module) => ({ default: module.TicketsPage })));
const TicketDetailPage = lazy(() => import('@/features/tickets/TicketDetailPage').then((module) => ({ default: module.TicketDetailPage })));
const CreateTicketPage = lazy(() => import('@/features/tickets/CreateTicketPage').then((module) => ({ default: module.CreateTicketPage })));
const WorkflowTasksPage = lazy(() => import('@/features/workflow/WorkflowTasksPage').then((module) => ({ default: module.WorkflowTasksPage })));
const WorkflowKanbanPage = lazy(() => import('@/features/workflow/WorkflowKanbanPage').then((module) => ({ default: module.WorkflowKanbanPage })));
const WorkflowTemplatesPage = lazy(() => import('@/features/workflow/WorkflowTemplatesPage').then((module) => ({ default: module.WorkflowTemplatesPage })));
const UsersPage = lazy(() => import('@/features/system/UsersPage').then((module) => ({ default: module.UsersPage })));
const RolesPage = lazy(() => import('@/features/system/RolesPage').then((module) => ({ default: module.RolesPage })));
const MenusPage = lazy(() => import('@/features/system/MenusPage').then((module) => ({ default: module.MenusPage })));
const DepartmentsPage = lazy(() => import('@/features/system/DepartmentsPage').then((module) => ({ default: module.DepartmentsPage })));
const DictsPage = lazy(() => import('@/features/system/DictsPage').then((module) => ({ default: module.DictsPage })));
const FeatureFlagsPage = lazy(() => import('@/features/system/FeatureFlagsPage').then((module) => ({ default: module.FeatureFlagsPage })));
const AuditLogsPage = lazy(() => import('@/features/system/AuditLogsPage').then((module) => ({ default: module.AuditLogsPage })));
const SystemMonitorPage = lazy(() => import('@/features/system/SystemMonitorPage').then((module) => ({ default: module.SystemMonitorPage })));
const NotificationsPage = lazy(() => import('@/features/operations/NotificationsPage').then((module) => ({ default: module.NotificationsPage })));
const FilesPage = lazy(() => import('@/features/operations/FilesPage').then((module) => ({ default: module.FilesPage })));
const OperationsReportPage = lazy(() => import('@/features/operations/OperationsReportPage').then((module) => ({ default: module.OperationsReportPage })));

export function AppRouter() {
  const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

  return (
    <BrowserRouter basename={basename}>
      <Suspense fallback={<Spin fullscreen />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/new" element={<CreateTicketPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/workflow/tasks" element={<WorkflowTasksPage />} />
              <Route path="/workflow/kanban" element={<WorkflowKanbanPage />} />
              <Route path="/workflow/templates" element={<WorkflowTemplatesPage />} />
              <Route path="/system/users" element={<UsersPage />} />
              <Route path="/system/roles" element={<RolesPage />} />
              <Route path="/system/departments" element={<DepartmentsPage />} />
              <Route path="/system/menus" element={<MenusPage />} />
              <Route path="/config/dicts" element={<DictsPage />} />
              <Route path="/config/feature-flags" element={<FeatureFlagsPage />} />
              <Route path="/system/monitor" element={<SystemMonitorPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/files" element={<FilesPage />} />
              <Route path="/reports/operations" element={<OperationsReportPage />} />
              <Route path="/audit/logs" element={<AuditLogsPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
