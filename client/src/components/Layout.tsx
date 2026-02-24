import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, User, Terminal, Settings, Menu, X } from 'lucide-react';
import { GlobalChatWidget } from './GlobalChatWidget';

export const Layout: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        setMobileMenuOpen(false);
        navigate('/login');
    };


    return (
        <div className="min-h-screen text-gray-200 font-sans selection:bg-cyan-500/30 selection:text-cyan-100 overflow-x-hidden w-full">
            <nav className="glass-premium sticky top-0 z-50 px-4 sm:px-8 py-3 sm:py-5 flex justify-between items-center border-b border-white/5 mx-2 sm:mx-4 mt-2 sm:mt-4 rounded-xl sm:rounded-2xl">
                <div className="flex items-center space-x-2 sm:space-x-4 group cursor-pointer" onClick={() => navigate('/')}>
                    <div className="relative">
                        <Shield className="text-cyan-400 w-8 h-8 group-hover:drop-shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-all animate-pulse-slow" />
                        <div className="absolute inset-0 bg-cyan-500 opacity-20 blur-xl rounded-full"></div>
                    </div>
                    <span className="text-lg sm:text-2xl font-bold tracking-widest text-white font-orbitron transition-all truncate">
                        SHERK<span className="text-gradient-primary">ACADEMY</span>
                    </span>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-8">
                    {/* Desktop Navigation */}
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
                        <div className="hidden md:flex items-center space-x-6 border-l border-white/10 pl-6">
                            <span className="text-gray-300 flex items-center gap-2 font-mono text-xs border border-white/10 px-4 py-2 rounded-full bg-black/40 shadow-inner">
                                <User size={14} className="text-purple-400" /> {user.username}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-red-400/80 hover:text-red-400 transition-colors text-sm font-bold tracking-wider"
                            >
                                <LogOut size={16} /> DISCONNECT
                            </button>
                        </div>
                    ) : (
                        <div className="hidden md:flex space-x-6 items-center">
                            <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm tracking-widest font-medium uppercase">Login</Link>
                            <Link to="/register" className="premium-button">
                                INITIALIZE
                            </Link>
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <button
                        className="md:hidden p-2 text-gray-300 hover:text-cyan-400 transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Dropdown Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-x-2 sm:inset-x-4 top-[80px] sm:top-[100px] z-40 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.8)] flex flex-col gap-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col gap-4">
                        <Link onClick={() => setMobileMenuOpen(false)} to="/" className={`text-base font-semibold tracking-wider font-orbitron transition-all ${location.pathname === '/' ? 'text-cyan-400' : 'text-gray-400'}`}>DASHBOARD</Link>
                        <Link onClick={() => setMobileMenuOpen(false)} to="/courses" className={`text-base font-semibold tracking-wider font-orbitron transition-all ${location.pathname === '/courses' ? 'text-cyan-400' : 'text-gray-400'}`}>COURSES</Link>
                        <Link onClick={() => setMobileMenuOpen(false)} to="/labs" className={`text-base font-semibold tracking-wider font-orbitron transition-all flex items-center gap-2 ${location.pathname === '/labs' ? 'text-cyan-400' : 'text-gray-400'}`}>
                            <Terminal size={16} /> LABS
                        </Link>
                        {user?.role === 'ADMIN' && (
                            <Link onClick={() => setMobileMenuOpen(false)} to="/admin" className={`text-base font-semibold tracking-wider font-orbitron transition-all flex items-center gap-2 ${location.pathname.startsWith('/admin') ? 'text-yellow-400' : 'text-gray-400'}`}>
                                <Settings size={16} /> ADMIN
                            </Link>
                        )}
                    </div>

                    <div className="h-px w-full bg-white/10" />

                    {user ? (
                        <div className="flex flex-col gap-4">
                            <span className="text-gray-300 flex items-center gap-2 font-mono text-sm">
                                <User size={16} className="text-purple-400" /> {user.username}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-red-400/80 hover:text-red-400 transition-colors text-sm font-bold tracking-wider"
                            >
                                <LogOut size={16} /> DISCONNECT
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <Link onClick={() => setMobileMenuOpen(false)} to="/login" className="text-gray-400 font-semibold tracking-widest text-sm uppercase">Login</Link>
                            <Link onClick={() => setMobileMenuOpen(false)} to="/register" className="premium-button text-center">INITIALIZE</Link>
                        </div>
                    )}
                </div>
            )}
            <main className="p-4 sm:p-8 max-w-[1400px] mx-auto mt-4 sm:mt-6 animate-float" style={{ animationDuration: '10s' }}>
                <Outlet />
            </main>
            <GlobalChatWidget />
        </div>
    );
};
