import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout and pages imports
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import WorkflowList from './pages/WorkflowList';
import WorkflowEditor from './pages/WorkflowEditor';
import ApiRoutes from './pages/ApiRoutes';
import ApiKeys from './pages/ApiKeys';
import ExecutionLogs from './pages/ExecutionLogs';
import AiAssistant from './pages/AiAssistant';
import SystemStatus from './pages/SystemStatus';
import ApiTester from './pages/ApiTester';
import NodeGuide from './pages/NodeGuide';

import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';

// ProtectedRoute helper mapping
function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.accessToken);
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Landing and Auth */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<RegisterPage />} />

        {/* Protected Console Layout */}
        <Route 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workflows" element={<WorkflowList />} />
          <Route path="/workflows/:id" element={<WorkflowEditor />} />
          <Route path="/routes" element={<ApiRoutes />} />
          <Route path="/keys" element={<ApiKeys />} />
          <Route path="/logs" element={<ExecutionLogs />} />
          <Route path="/ai" element={<AiAssistant />} />
          <Route path="/status" element={<SystemStatus />} />
          <Route path="/tester" element={<ApiTester />} />
          <Route path="/guide" element={<NodeGuide />} />
        </Route>

        {/* Fallback redirects */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
