import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Terminal, Lock } from 'lucide-react';

interface Course {
    id: string;
    title: string;
    slug: string;
    description: string;
    price: number;
    instructor: {
        username: string;
    };
    modules: any[];
    enrolled?: boolean;
    requiredRank: number;
}

export const Courses: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const res = await api.get('/courses');
                setCourses(res.data);
            } catch (err: unknown) {
                console.error('Failed to fetch courses', err);
            } finally {
                setLoading(false);
            }
        };
        fetchCourses();
    }, []);

    return (
        <div className="space-y-12 animate-in fade-in duration-1000">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/5 pb-8 relative">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -translate-y-1/2"></div>
                <div className="relative z-10 space-y-4">
                    <h1 className="text-5xl font-bold text-white font-orbitron tracking-wide">
                        DATABANKS & <span className="text-gradient-primary">MODULES</span>
                    </h1>
                    <p className="text-gray-400 font-mono text-sm max-w-2xl leading-relaxed">
                        Access premium operational databases and theoretical frameworks. High-level security clearance verification required for advanced curriculum navigation.
                    </p>
                </div>
                <div className="hidden md:block text-right relative z-10 mt-6 md:mt-0 glass-premium px-6 py-4 rounded-xl border border-white/5">
                    <div className="text-4xl font-bold text-cyan-400 font-orbitron drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">
                        {courses.length.toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Available Streams</div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-[300px] glass-premium rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                    {courses.map((course) => {
                        const userRank = user?.rank || (user?.role === 'ADMIN' ? 99 : 1);
                        const isLocked = userRank < (course.requiredRank || 1);

                        return (
                            <Link
                                to={isLocked ? '#' : (!user ? '/register' : `/courses/${course.slug}`)}
                                key={course.id}
                                className={`group glass-premium rounded-2xl p-8 transition-all duration-500 relative overflow-hidden flex flex-col h-[320px] 
                                    ${isLocked ? 'opacity-50 cursor-not-allowed grayscale-[50%]' : 'hover:border-cyan-500/50 hover:shadow-[0_10px_40px_rgba(0,240,255,0.15)] hover:-translate-y-2'}`}
                                onClick={(e) => isLocked && e.preventDefault()}
                            >
                                <div className="absolute top-0 right-0 p-4 transform transition-all duration-500 group-hover:scale-105">
                                    {isLocked ? (
                                        <Lock size={120} className="opacity-5 text-gray-500" />
                                    ) : course.enrolled ? (
                                        <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-xl text-xs font-bold tracking-widest backdrop-blur-md shadow-[0_0_15px_rgba(0,255,100,0.15)] flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                            ENROLLED
                                        </div>
                                    ) : (
                                        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
                                            {Number(course.price) > 0 ? (
                                                <span className="text-cyan-400 font-bold font-orbitron text-sm">${Number(course.price).toFixed(2)}</span>
                                            ) : (
                                                <span className="text-purple-400 font-bold tracking-widest text-xs uppercase">FREE</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-6 relative z-10 flex gap-2">
                                    <span className={`text-[10px] font-mono tracking-widest uppercase border border-current px-3 py-1.5 rounded-full shadow-[0_0_10px_currentColor_inset] ${isLocked ? 'text-red-400 border-red-400/30' : 'text-cyan-400 border-cyan-400/30'}`}>
                                        {isLocked ? `RANK ${course.requiredRank} REQUIRED` : (course.instructor.username === 'admin' ? 'OFFICIAL CURRICULUM' : 'COMMUNITY')}
                                    </span>
                                </div>

                                <h3 className={`text-2xl font-bold mb-3 font-orbitron line-clamp-2 relative z-10 transition-colors ${isLocked ? 'text-gray-500' : 'text-gray-100 group-hover:text-white'}`}>
                                    {course.title}
                                </h3>

                                <p className={`text-sm mb-6 flex-grow line-clamp-3 leading-relaxed relative z-10 transition-colors ${isLocked ? 'text-gray-600' : 'text-gray-400 group-hover:text-gray-300'}`}>
                                    {course.description || "No briefing available for this operation."}
                                </p>

                                <div className={`flex items-center justify-between border-t border-white/5 pt-5 mt-auto relative z-10 ${isLocked ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-3 text-gray-500 text-xs font-mono tracking-widest">
                                        <BookOpen size={16} className={isLocked ? 'text-gray-600' : 'text-purple-400/70'} />
                                        <span>TEXT MODULE</span>
                                    </div>
                                    <div className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-transform duration-300 ${isLocked ? 'text-red-500' : 'text-cyan-400 group-hover:translate-x-2'}`}>
                                        {isLocked ? 'ACCESS DENIED' : (!user ? 'INITIALIZE SYSTEM' : 'INITIALIZE')} {isLocked ? <Lock size={14} /> : <Terminal size={14} className="animate-pulse-slow" />}
                                    </div>
                                </div>

                                {!isLocked && <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
