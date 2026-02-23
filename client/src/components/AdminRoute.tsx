import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#05010f]">
            <div className="text-cyan-400 animate-pulse font-mono">Verifying credentials...</div>
        </div>
    );

    if (!user || user.role !== 'ADMIN') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

export default AdminRoute;
