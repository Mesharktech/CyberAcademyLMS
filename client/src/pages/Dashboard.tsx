import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { BookOpen, Terminal, Activity, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Course {
    id: string;
    title: string;
    description: string;
    slug: string;
    difficulty: string;
    modules: any[];
    progress?: number;
}

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState({
        activeOps: 0,
        fieldTime: 0,
        globalRank: 99,
        latestIntel: [] as { title: string, date: string }[],
        xp: 0,
        rank: 1
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, statsRes] = await Promise.all([
                    api.get('/courses/my-enrollments'),
                    api.get('/users/dashboard-stats')
                ]);
                setCourses(coursesRes.data);
                setStats(prev => ({ ...prev, ...statsRes.data }));
            } catch (err: unknown) {
                console.error('Failed to load dashboard data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const rankTitles: Record<number, string> = {
        0: 'GUEST',
        1: 'TRAINEE',
        2: 'OPERATIVE',
        3: 'SPECIALIST',
        4: 'GHOST',
        5: 'SYSTEM ADMIN'
    };

    const getRankTitle = () => {
        if (user?.role === 'ADMIN') return 'SYSTEM ADMIN';
        return rankTitles[stats.rank] || 'TRAINEE';
    };

    const getNextRankXp = () => {
        if (stats.xp < 100) return 100;
        if (stats.xp < 1000) return 1000;
        if (stats.xp < 5000) return 5000;
        if (stats.xp < 15000) return 15000;
        return 15000; // Max level
    };

    const nextXp = getNextRankXp();
    const currentXp = stats.xp;
    const rankProgress = user?.role === 'ADMIN' ? 100 : Math.min(100, Math.round((currentXp / nextXp) * 100));

    return (
        <div className="space-y-10 animate-in fade-in duration-1000">
            {/* Header Section */}
            <div className="relative rounded-3xl p-10 overflow-hidden glass-premium cyber-border">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3 animate-pulse-slow"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/3 animate-pulse-slow"></div>

                <div className="relative z-10">
                    <h1 className="text-5xl font-bold text-white mb-4 font-sans tracking-tight">
                        Welcome back, <span className="text-gradient-primary">{user?.username}</span>
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6 mt-6">
                        <p className="text-gray-400 flex items-center gap-4 text-lg font-light">
                            Level: <span className={`font-mono tracking-widest font-bold ${user?.role === 'ADMIN' ? 'text-red-500' : 'text-cyan-400'}`}>{getRankTitle()}</span>
                        </p>

                        {user?.role !== 'ADMIN' && (
                            <div className="flex-grow max-w-md bg-black/40 p-3 rounded-xl border border-white/5 shadow-[0_4px_20px_rgba(0,0,0,0.5)_inset]">
                                <div className="flex justify-between text-xs font-mono tracking-widest mb-2">
                                    <span className="text-purple-400">XP {currentXp}</span>
                                    <span className="text-gray-500">NEXT RANK: {nextXp}</span>
                                </div>
                                <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-1000 ease-out"
                                        style={{ width: `${rankProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}

                        <p className="text-gray-400 flex items-center gap-4 text-lg font-light sm:ml-auto">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(0,240,255,0.8)] hidden sm:block"></span>
                            Role: <span className="text-gray-300 uppercase tracking-widest text-xs border border-white/10 bg-white/5 px-3 py-1 rounded-full">{user?.role}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Main Content: Learning Path */}
                <div className="lg:col-span-2 space-y-12">

                    {/* Active Operations */}
                    <div className="space-y-8">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-semibold text-white flex items-center gap-3 font-orbitron tracking-wide">
                                <Terminal size={24} className="text-cyan-400" /> Active Operations
                            </h2>
                        </div>

                        {loading ? (
                            <div className="space-y-6">
                                {[1, 2].map(i => (
                                    <div key={i} className="h-32 glass-premium rounded-2xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : courses.filter(c => (c.progress || 0) < 100).length > 0 ? (
                            <div className="space-y-6">
                                {courses.filter(c => (c.progress || 0) < 100).map((course) => {
                                    const progress = course.progress || 0;
                                    return (
                                        <div key={course.id} className="group relative glass-premium hover:border-cyan-500/50 p-8 rounded-2xl transition-all duration-500">
                                            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                                                <div className="p-5 rounded-2xl bg-black/60 border border-white/5 group-hover:border-cyan-500/50 transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] group-hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                                                    <ShieldCheck size={32} className={`transition-all duration-500 ${progress > 0 ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]' : 'text-gray-600'}`} />
                                                </div>

                                                <div className="flex-grow text-center md:text-left">
                                                    <h3 className="text-xl font-bold text-gray-200 mb-2 group-hover:text-white transition-colors">{course.title}</h3>
                                                    <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-gray-500 font-mono tracking-widest">
                                                        <span className="text-purple-400/80">{course.difficulty}</span>
                                                        <span>•</span>
                                                        <span>{course.modules?.length || 0} MODULES</span>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="mt-5 h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-1000 ease-out relative"
                                                            style={{ width: `${progress}%` }}
                                                        >
                                                            <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between mt-2 font-mono tracking-widest">
                                                        <span className="text-[10px] text-gray-500 uppercase">Synchronization</span>
                                                        <span className="text-[10px] text-cyan-400">{progress}%</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 md:mt-0">
                                                    <Link
                                                        to={`/courses/${course.slug}`}
                                                        className="premium-button block text-center"
                                                    >
                                                        {course.progress && course.progress > 0 ? 'RESUME' : 'INITIATE'}
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-12 text-center text-gray-500 glass-premium rounded-2xl border-dashed border-white/10 font-mono tracking-widest">
                                [ NO ACTIVE MISSIONS ASSIGNED ]
                            </div>
                        )}
                    </div>

                    {/* Completed Operations */}
                    {!loading && courses.filter(c => (c.progress || 0) === 100).length > 0 && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-semibold text-gray-400 flex items-center gap-3 font-orbitron tracking-wide">
                                    <ShieldCheck size={20} className="text-green-500" /> Completed Operations
                                </h2>
                            </div>
                            <div className="space-y-4">
                                {courses.filter(c => (c.progress || 0) === 100).map((course) => (
                                    <div key={course.id} className="group relative glass-premium opacity-70 hover:opacity-100 p-6 rounded-2xl transition-all duration-300">
                                        <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                                            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                                                <ShieldCheck size={24} className="text-green-500" />
                                            </div>

                                            <div className="flex-grow text-center md:text-left">
                                                <h3 className="text-lg font-bold text-gray-300 mb-1 group-hover:text-white transition-colors">{course.title}</h3>
                                                <div className="flex justify-center md:justify-start gap-4 text-xs text-green-500/70 font-mono tracking-widest">
                                                    <span>100% SYNCHRONIZED</span>
                                                    <span>•</span>
                                                    <span>{course.modules?.length || 0} MODULES</span>
                                                </div>
                                            </div>

                                            <div className="mt-4 md:mt-0">
                                                <Link
                                                    to={`/courses/${course.slug}`}
                                                    className="px-6 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-bold tracking-widest text-xs transition-all uppercase block text-center shadow-none"
                                                >
                                                    REVIEW
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar: Stats & Quick Links */}
                <div className="space-y-10">
                    {/* Stats Card */}
                    <div className="glass-premium p-8 rounded-2xl">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-3 font-orbitron">
                            <Activity size={18} className="text-purple-400" /> Operator Metrics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 bg-black/40 rounded-xl border border-white/5 text-center group hover:border-purple-500/30 transition-colors">
                                <div className="text-3xl font-bold text-white mb-2 font-orbitron">Top {stats.globalRank}%</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Global Rank</div>
                            </div>
                            <div className="p-5 bg-black/40 rounded-xl border border-white/5 text-center group hover:border-cyan-500/30 transition-colors">
                                <div className="text-3xl font-bold text-cyan-400 mb-2 font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">{stats.activeOps}</div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest">Active Ops</div>
                            </div>
                            <div className="p-5 bg-black/40 rounded-xl border border-white/5 text-center col-span-2 group hover:border-white/20 transition-colors">
                                <div className="text-3xl font-bold text-white mb-2 font-orbitron">{stats.fieldTime}H</div>
                                <div className="text-[10px] text-gray-500 flex items-center justify-center gap-2 uppercase tracking-widest">
                                    <Clock size={12} className="text-purple-400" /> Total Field Time
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommended Resources */}
                    <div className="relative glass-premium p-8 rounded-2xl overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-2xl rounded-full"></div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-3 font-orbitron relative z-10">
                            <BookOpen size={18} className="text-cyan-400" /> Latest Intel
                        </h3>
                        <div className="space-y-5 relative z-10">
                            {stats.latestIntel.length > 0 ? stats.latestIntel.map((item, i) => (
                                <div key={i} className="flex justify-between items-start group cursor-pointer border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                    <span className="text-sm text-gray-300 group-hover:text-cyan-400 transition-colors line-clamp-1 pr-4">{item.title}</span>
                                    <span className="text-xs text-purple-400/60 font-mono whitespace-nowrap">{item.date}</span>
                                </div>
                            )) : (
                                <div className="text-[10px] text-gray-600 font-mono tracking-widest text-center mt-4">NO RECENT INTEL</div>
                            )}
                        </div>
                        <Link to="/courses" className="mt-8 flex items-center gap-2 text-xs text-cyan-400 font-bold hover:text-white transition-colors uppercase tracking-widest relative z-10">
                            ACCESS DATABANKS <ArrowRight size={14} className="animate-pulse-slow" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
