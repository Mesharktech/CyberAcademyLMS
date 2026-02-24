import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { BookOpen, Terminal, Cpu } from 'lucide-react';

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
}

export const Courses: React.FC = () => {
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
                    {courses.map((course) => (
                        <Link
                            to={`/courses/${course.slug}`}
                            key={course.id}
                            className="group glass-premium rounded-2xl p-8 hover:border-cyan-500/50 hover:shadow-[0_10px_40px_rgba(0,240,255,0.15)] transition-all duration-500 hover:-translate-y-2 relative overflow-hidden flex flex-col h-[320px]"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:text-purple-400 transition-all duration-500 transform group-hover:scale-110">
                                <Cpu size={120} />
                            </div>

                            <div className="mb-6 relative z-10">
                                <span className="text-[10px] font-mono tracking-widest uppercase border border-cyan-400/30 text-cyan-400 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.1)_inset]">
                                    {course.instructor.username === 'admin' ? 'OFFICIAL CURRICULUM' : 'COMMUNITY'}
                                </span>
                                {course.enrolled ? (
                                    <span className="text-[10px] font-mono tracking-widest uppercase bg-purple-500/20 text-purple-400 px-3 py-1.5 rounded-full font-bold">
                                        ENROLLED
                                    </span>
                                ) : Number(course.price) > 0 ? (
                                    <span className="text-[10px] font-mono tracking-widest uppercase bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-full font-bold">
                                        ${Number(course.price).toFixed(2)}
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-mono tracking-widest uppercase bg-green-500/20 text-green-400 px-3 py-1.5 rounded-full font-bold">
                                        FREE
                                    </span>
                                )}
                            </div>

                            <h3 className="text-2xl font-bold text-gray-100 mb-3 font-orbitron group-hover:text-white transition-colors line-clamp-2 relative z-10">
                                {course.title}
                            </h3>

                            <p className="text-gray-400 text-sm mb-6 flex-grow line-clamp-3 leading-relaxed relative z-10 group-hover:text-gray-300 transition-colors">
                                {course.description || "No briefing available for this operation."}
                            </p>

                            <div className="flex items-center justify-between border-t border-white/5 pt-5 mt-auto relative z-10">
                                <div className="flex items-center gap-3 text-gray-500 text-xs font-mono tracking-widest">
                                    <BookOpen size={16} className="text-purple-400/70" />
                                    <span>TEXT MODULE</span>
                                </div>
                                <div className="text-cyan-400 text-xs font-bold uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-300 flex items-center gap-2">
                                    INITIALIZE <Terminal size={14} className="animate-pulse-slow" />
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-cyan-400 via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};
