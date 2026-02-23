import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Play, Terminal, Lock, Medal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QuizView } from './QuizView';
import { LinuxLabView } from '../components/LinuxLabView';
import PaymentModal from '../components/PaymentModal';
import { generateCertificate } from '../utils/generateCertificate';

interface CourseData {
    id: string;
    title: string;
    description?: string;
    price?: number;
    modules: any[];
    instructor?: {
        username: string;
        firstName?: string;
        lastName?: string;
    };
}

export const CoursePlayer: React.FC = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { openChat } = useChat();
    const { user } = useAuth();
    const [course, setCourse] = useState<CourseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
    const [enrolled, setEnrolled] = useState<boolean | null>(null);
    const [showPayment, setShowPayment] = useState(false);

    const markAsComplete = async (moduleId: string) => {
        try {
            await api.post('/courses/progress', { moduleId, completed: true });
            setCompletedModules(prev => new Set(prev).add(moduleId));
        } catch (err) {
            console.error('Failed to save progress', err);
        }
    };

    const handleNext = async () => {
        if (!course) return;
        const currentModule = course.modules[currentModuleIndex];

        // Explicitly await progress completion before navigating or changing index
        if (currentModule) {
            // Lab and Quiz already mark via their onComplete callback, but in case they didn't, we can try to mark it here too if it's TEXT or VIDEO.
            if (currentModule.type === 'TEXT') {
                await markAsComplete(currentModule.id);
            }
        }

        if (currentModuleIndex < course.modules.length - 1) {
            setCurrentModuleIndex(prev => prev + 1);
        } else {
            navigate('/');
        }
    };

    useEffect(() => {
        const fetchCourse = async () => {
            try {
                const res = await api.get(`/courses/${slug}`);
                setCourse(res.data);
                if (res.data.completedModuleIds) {
                    setCompletedModules(new Set(res.data.completedModuleIds));
                }
            } catch (err: unknown) {
                console.error(err);
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Unknown error');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchCourse();
    }, [slug, navigate]);

    // Check enrollment for paid courses
    useEffect(() => {
        if (!course) return;
        const price = Number(course.price || 0);
        if (price === 0) {
            setEnrolled(true);
            return;
        }
        const checkEnrollment = async () => {
            try {
                const res = await api.get(`/payments/check/${course.id}`);
                setEnrolled(res.data.enrolled);
                if (!res.data.enrolled) setShowPayment(true);
            } catch {
                setEnrolled(false);
                setShowPayment(true);
            }
        };
        checkEnrollment();
    }, [course]);

    if (error) return (
        <div className="p-20 text-center relative z-10 glass-premium w-full max-w-2xl mx-auto rounded-3xl mt-20">
            <h2 className="text-purple-500 text-3xl font-orbitron font-bold">CRITICAL FAILURE</h2>
            <pre className="text-left bg-black/60 border border-white/5 p-6 mt-6 overflow-auto rounded-xl font-mono text-xs text-gray-400">{JSON.stringify(error, null, 2)}</pre>
            <p className="mt-6 text-gray-400 font-mono tracking-widest">AWAITING SYSTEM RESTORE...</p>
            <button onClick={() => navigate('/courses')} className="premium-button mt-8">ABORT</button>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-cyan-400 font-mono tracking-[0.2em] relative">
            <div className="absolute w-[300px] h-[300px] bg-cyan-500/10 blur-[50px] rounded-full animate-pulse-slow"></div>
            <Terminal size={48} className="animate-pulse mb-6 opacity-80" />
            <p className="animate-pulse">ESTABLISHING SECURE PROTOCOL...</p>
        </div>
    );

    if (!course) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center glass-premium rounded-3xl border border-white/5 mt-10">
            <div className="absolute w-[400px] h-[400px] bg-red-500/5 blur-[100px] rounded-full"></div>
            <h2 className="text-4xl text-red-500 font-orbitron mb-4 font-bold relative z-10 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">ACCESS DENIED</h2>
            <p className="text-gray-400 mb-8 font-mono tracking-widest relative z-10">THE REQUESTED NODE DOES NOT EXIST</p>
            <button onClick={() => navigate('/courses')} className="premium-button relative z-10">RETURN TO BASE</button>
        </div>
    );

    const coursePrice = Number(course.price || 0);

    // Paywall gate for paid courses
    if (enrolled === false && coursePrice > 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center relative">
                <div className="absolute w-[400px] h-[400px] bg-yellow-500/5 blur-[100px] rounded-full"></div>
                <div className="glass-premium rounded-3xl border border-yellow-500/20 p-12 max-w-lg relative z-10">
                    <Lock size={48} className="text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-3xl text-yellow-400 font-orbitron mb-3 font-bold">PREMIUM ACCESS</h2>
                    <p className="text-gray-400 mb-2">{course.title}</p>
                    <p className="text-4xl font-bold text-white font-orbitron my-6">
                        <span className="text-cyan-400">$</span>{coursePrice.toFixed(2)}
                    </p>
                    <p className="text-gray-500 text-sm mb-6">Unlock all {course.modules.length} modules with a one-time payment.</p>
                    <button
                        onClick={() => setShowPayment(true)}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-cyan-500/25"
                    >
                        Enroll Now
                    </button>
                    <button onClick={() => navigate('/courses')} className="mt-4 text-gray-500 hover:text-gray-300 text-sm transition-colors">
                        ← Back to Courses
                    </button>
                </div>
                {showPayment && (
                    <PaymentModal
                        courseId={course.id}
                        courseTitle={course.title}
                        price={coursePrice}
                        onClose={() => setShowPayment(false)}
                        onSuccess={() => { setEnrolled(true); setShowPayment(false); }}
                    />
                )}
            </div>
        );
    }

    const currentModule = course.modules[currentModuleIndex];

    if (!currentModule && course.modules.length === 0) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center glass-premium rounded-3xl mt-10">
            <h2 className="text-4xl text-purple-400 font-orbitron mb-4 font-bold">EMPTY DIRECTORY</h2>
            <p className="text-gray-400 mb-8 font-mono tracking-widest">AWAITING PAYLOAD INJECTION...</p>
            <button onClick={() => navigate('/courses')} className="premium-button">RETURN TO BASE</button>
        </div>
    );

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 animate-in fade-in duration-1000 relative">
            {/* Sidebar (Modules List) */}
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 relative z-10">
                <button
                    onClick={() => navigate('/courses')}
                    className="flex items-center gap-3 text-gray-400 hover:text-cyan-400 transition-colors text-xs font-bold tracking-widest uppercase font-mono"
                >
                    <ArrowLeft size={16} /> ABORT OPERATION
                </button>

                <div className="glass-premium flex-grow rounded-2xl overflow-hidden flex flex-col border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <div className="p-6 border-b border-white/5 bg-black/40 relative">
                        <h2 className="font-bold text-white font-orbitron text-sm tracking-widest">MODULE SEQUENCE</h2>
                        <div className="h-1 w-20 bg-gradient-to-r from-cyan-400 to-purple-500 mt-4 rounded-full"></div>
                    </div>
                    <div className="overflow-y-auto p-4 space-y-2 custom-scrollbar flex-grow bg-black/20">
                        {course.modules.map((mod, idx: number) => {
                            const isCompleted = completedModules.has(mod.id);
                            return (
                                <button
                                    key={mod.id}
                                    onClick={() => setCurrentModuleIndex(idx)}
                                    className={`w-full text-left p-4 rounded-xl text-sm flex items-center gap-4 transition-all duration-300 ${idx === currentModuleIndex
                                        ? 'bg-cyan-500/10 border border-cyan-400/50 text-white shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                                        : 'hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono border transition-colors ${idx === currentModuleIndex
                                        ? 'border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)_inset]'
                                        : isCompleted
                                            ? 'border-purple-500 text-purple-400 bg-purple-500/10 shadow-[0_0_10px_rgba(189,0,255,0.2)_inset]'
                                            : 'border-gray-700 text-gray-600 bg-black/40'
                                        }`}>
                                        {isCompleted ? '✓' : idx + 1}
                                    </div>
                                    <span className="line-clamp-2 font-medium leading-relaxed">{mod.title}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex flex-col min-h-0 relative">
                <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/3 translate-x-1/3"></div>
                <div className="glass-premium rounded-2xl flex-grow overflow-hidden flex flex-col border border-white/5 relative z-10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">

                    {/* Header */}
                    <div className="p-8 border-b border-white/5 bg-black/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent bg-[length:200%_100%] animate-cyber-border-anim opacity-50 z-0"></div>
                        <div className="relative z-10">
                            <h1 className="text-3xl font-bold text-white font-orbitron mb-3 drop-shadow-md">{currentModule?.title}</h1>
                            <p className="text-gray-400 text-xs flex items-center gap-3 tracking-widest font-mono uppercase">
                                <Terminal size={12} className="text-purple-400 animate-pulse-slow" />
                                {course.title}
                            </p>
                        </div>
                        <div className="flex gap-4 relative z-10">
                            {course.modules.length > 0 && completedModules.size === course.modules.length && (
                                <button
                                    onClick={() => {
                                        if (user && course) {
                                            generateCertificate({
                                                userName: user.username || user.email,
                                                courseName: course.title,
                                                completionDate: new Date(),
                                                instructorName: course.instructor?.username || 'System Administrator'
                                            });
                                        }
                                    }}
                                    className="px-5 py-2.5 rounded-lg border bg-purple-900/40 text-purple-400 border-purple-400 hover:bg-purple-800/60 font-bold tracking-widest text-xs flex items-center gap-3 transition-all duration-300 shadow-[0_0_20px_rgba(189,0,255,0.4)] animate-pulse"
                                >
                                    <Medal size={16} /> DOWNLOAD CERTIFICATE
                                </button>
                            )}
                            <button
                                onClick={openChat}
                                className="px-5 py-2.5 rounded-lg border bg-black/80 text-cyan-400 border-cyan-400/40 hover:bg-cyan-500/10 font-bold tracking-widest text-xs flex items-center gap-3 transition-all duration-300 shadow-[0_0_15px_rgba(0,240,255,0.1)_inset]"
                            >
                                <Terminal size={14} /> MESHARK PROTOCOL
                            </button>
                        </div>
                    </div>

                    {/* Content Viewer */}
                    <div className="flex-grow overflow-y-auto p-10 custom-scrollbar bg-black/40 relative z-10">
                        {currentModule?.type === 'QUIZ' ? (
                            <div className="max-w-4xl mx-auto">
                                <h2 className="text-3xl font-orbitron text-cyan-400 mb-8 border-b border-white/10 pb-4 drop-shadow-[0_0_5px_rgba(0,240,255,0.5)] flex items-center gap-4">
                                    <Terminal size={28} />
                                    Security Clearance Exam
                                </h2>
                                <QuizView
                                    content={currentModule.content || '[]'}
                                    onComplete={(passed) => {
                                        if (passed) {
                                            markAsComplete(currentModule.id);
                                        }
                                    }}
                                />
                            </div>
                        ) : currentModule?.type === 'LAB' ? (
                            <div className="w-full flex justify-center items-center h-full">
                                <LinuxLabView
                                    onComplete={(passed) => {
                                        if (passed) {
                                            markAsComplete(currentModule.id);
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="prose prose-invert lg:prose-lg prose-p:text-gray-300 prose-p:leading-relaxed prose-headings:font-orbitron prose-headings:text-gray-100 prose-headings:tracking-wide prose-a:text-purple-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-strong:font-bold prose-code:text-cyan-400 prose-pre:bg-[#0a0a0a] prose-pre:border prose-pre:border-white/10 prose-pre:shadow-[0_4px_20px_rgba(0,0,0,0.5)] max-w-4xl mx-auto">
                                {currentModule?.content ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {currentModule.content}
                                    </ReactMarkdown>
                                ) : (
                                    <div className="text-gray-500 font-mono tracking-widest text-center mt-20">DECRYPTION FAILED. PAYLOAD EMPTY.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer / Controls */}
                    <div className="p-6 border-t border-white/5 bg-black/60 flex justify-between items-center relative z-10">
                        <button
                            disabled={currentModuleIndex === 0}
                            onClick={() => setCurrentModuleIndex(prev => prev - 1)}
                            className="text-xs tracking-widest text-gray-400 font-bold hover:text-white disabled:opacity-20 disabled:hover:text-gray-400 transition-colors uppercase font-mono"
                        >
                            <ArrowLeft size={14} className="inline mr-2" />
                            Prev Vector
                        </button>
                        <button
                            onClick={handleNext}
                            className="premium-button text-xs py-3 px-8 tracking-widest flex items-center gap-3 bg-black/50"
                        >
                            {currentModuleIndex === course.modules.length - 1 ? 'FINALIZE PROTOCOL' : 'NEXT NODE'}
                            <Play size={14} fill="currentColor" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
