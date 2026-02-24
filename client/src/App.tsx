import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Courses } from './pages/Courses';
import { CoursePlayer } from './pages/CoursePlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Labs } from './pages/Labs';
import AdminDashboard from './pages/AdminDashboard';
import AdminRoute from './components/AdminRoute';

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-hackon-green font-mono">INITIALIZING...</div>;
  return user ? <>{children}</> : <Navigate to="/register" />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChatProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="courses" element={<Courses />} />
                <Route path="courses/:slug" element={<PrivateRoute><CoursePlayer /></PrivateRoute>} />
                <Route path="labs" element={<PrivateRoute><Labs /></PrivateRoute>} />
                <Route path="admin" element={<PrivateRoute><AdminRoute><AdminDashboard /></AdminRoute></PrivateRoute>} />
              </Route>
            </Routes>
          </Router>
        </ChatProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
