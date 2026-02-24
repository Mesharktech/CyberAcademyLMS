import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User, Terminal, Settings } from 'lucide-react';
import { GlobalChatWidget } from './GlobalChatWidget';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };


    return (
        <div className="min-h-screen text-gray-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
            <nav className="glass-premium sticky top-0 z-50 px-8 py-5 flex justify-between items-center border-b border-white/5 mx-4 mt-4 rounded-2xl">
                <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => navigate('/')}>
                    <div className="relative">
                        <Shield className="text-cyan-400 w-8 h-8 group-hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-all animate-pulse-slow" />
                        <div className="absolute inset-0 bg-cyan-500 opacity-20 blur-xl rounded-full"></div>
                    </div>
                    <span className="text-2xl font-bold tracking-widest text-white font-orbitron transition-all">
                        SHERK<span className="text-gradient-primary">ACADEMY</span>
                    </span>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="hidden md:flex items-center space-x-6">
                        <Link
                            to="/"
                            className={`text-sm font-semibold tracking-wider font-orbitron transition-all duration-300 ${location.pathname === '/' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] border-b-2 border-cyan-400 pb-1' : 'text-gray-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}
                        >
                            Dashboard
                        </Link>
                        <Link to="/courses" className={`text-sm font-semibold tracking-wider font-orbitron transition-all duration-300 ${location.pathname === '/courses' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] border-b-2 border-cyan-400 pb-1' : 'text-gray-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}>COURSES</Link>
                        <Link to="/labs" className={`text-sm font-semibold tracking-wider font-orbitron transition-all duration-300 flex items-center gap-1 ${location.pathname === '/labs' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] border-b-2 border-cyan-400 pb-1' : 'text-gray-400 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'}`}>
                            <Terminal size={14} /> LABS
                        </Link>
                        {user?.role === 'ADMIN' && (
                            <Link to="/admin" className={`text-sm font-semibold tracking-wider font-orbitron transition-all duration-300 flex items-center gap-1 ${location.pathname.startsWith('/admin') ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] border-b-2 border-yellow-400 pb-1' : 'text-gray-400 hover:text-yellow-300 hover:drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'}`}>
                                <Settings size={14} /> ADMIN
                            </Link>
                        )}
                    </div>

                    {user ? (
                        <div className="flex items-center space-x-6 border-l border-white/10 pl-6">
                            <span className="text-gray-300 flex items-center gap-2 font-mono text-xs border border-white/10 px-4 py-2 rounded-full bg-black/40 shadow-inner">
                                <User size={14} className="text-purple-400" /> {user.username}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-red-400/80 hover:text-red-400 transition-colors text-sm font-bold tracking-wider"
                            >
                                <LogOut size={16} /> <span className="hidden sm:inline">DISCONNECT</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-x-6 flex items-center">
                            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm tracking-widest font-medium uppercase">Login</Link>
                            <Link to="/register" className="premium-button">
                                INITIALIZE
                            </Link>
                        </div>
                    )}
                </div>
            </nav>
            <main className="p-8 max-w-[1400px] mx-auto mt-6 animate-float" style={{ animationDuration: '10s' }}>
                <Outlet />
            </main>
            <GlobalChatWidget />
        </div>
    );
};
