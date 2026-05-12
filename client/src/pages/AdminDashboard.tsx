import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import {
    PlusCircle, Edit2, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
    BookOpen, Layers, Users, X, Save, AlertTriangle, BarChart2,
    Cpu, Upload, CheckCircle, RefreshCw, TrendingUp,
    DollarSign, Award, Activity, FileText, Search, Shield,
    Flag, Bell, HeartPulse, UserCheck, UserX, RotateCcw,
    ToggleLeft, ToggleRight, Megaphone, Database, Server,
    GraduationCap
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Module { id: string; title: string; type: 'TEXT'|'VIDEO'|'QUIZ'|'LAB'; orderIndex: number; content?: string; videoUrl?: string; xpReward?: number; requiredRank?: number; }
interface Course { id: string; title: string; slug: string; description?: string; thumbnailUrl?: string; price: number; isPublished: boolean; createdAt: string; instructor: { username: string }; modules: Module[]; }
interface Analytics { users: { total: number; newThisMonth: number; newThisWeek: number }; courses: { total: number; published: number; modules: number }; enrollments: { total: number; revenue: number }; completions: number; topCourses: { id: string; title: string; enrollments: number; isPublished: boolean }[]; recentUsers: UserRecord[]; }
interface UserRecord { id: string; username: string; email: string; role: string; xp: number; rank: number; isActive: boolean; isEmailVerified: boolean; createdAt: string; }
interface Challenge { id: string; title: string; description: string; category: string; difficulty: string; points: number; hint?: string; isActive: boolean; solveCount: number; _count?: { solves: number }; }
interface Announcement { id: string; title: string; content: string; type: string; isActive: boolean; createdAt: string; }
interface Enrollment { id: string; userId: string; courseId: string; paymentMethod: string; amountPaid: number; status: string; createdAt: string; user: { id: string; username: string; email: string }; course: { id: string; title: string; price: number }; }
interface HealthData { status: string; db: string; uptime: number; memory: { used: number; total: number }; counts: { totalUsers: number; activeUsers: number; bannedUsers: number; totalCourses: number; totalModules: number; totalEnrollments: number; totalChallenges: number; totalSolves: number; totalProgress: number }; recentSignups: { username: string; createdAt: string; role: string }[]; }
interface GeneratedModule { title: string; description: string; objectives: string[]; content: string; quiz: { question: string; options: string[]; correctAnswer: number; explanation: string }[]; estimatedMinutes: number; difficulty: string; suggestedPrice: number; pricingTier: string; }
interface AuthenticityReport { originalityScore: number; accuracyScore: number; qualityScore: number; overallScore: number; approved: boolean; verdict: string; flags: string[]; improvements: string[]; summary: string; }

// ─── Constants ─────────────────────────────────────────────────────────────────
const MODULE_TYPES = ['TEXT', 'VIDEO', 'QUIZ', 'LAB'] as const;
type ModuleType = typeof MODULE_TYPES[number];
type Tab = 'overview'|'challenges'|'users'|'announcements'|'enrollments'|'analytics'|'ai-generator'|'health';

const RANK_LABELS: Record<number, string> = { 1:'Trainee', 2:'Operative', 3:'Specialist', 4:'Ghost', 5:'APT' };
const DIFFICULTY_COLORS: Record<string, string> = { EASY:'text-green-400 bg-green-500/10', MEDIUM:'text-yellow-400 bg-yellow-500/10', HARD:'text-orange-400 bg-orange-500/10', INSANE:'text-red-400 bg-red-500/10' };
const ANN_COLORS: Record<string, string> = { INFO:'text-blue-400 bg-blue-500/10 border-blue-500/30', WARNING:'text-yellow-400 bg-yellow-500/10 border-yellow-500/30', CRITICAL:'text-red-400 bg-red-500/10 border-red-500/30', SUCCESS:'text-green-400 bg-green-500/10 border-green-500/30' };
const CATEGORIES = ['WEB','LINUX','WINDOWS','NETWORK','CRYPTO','FORENSICS','OSINT','MALWARE','REVERSE','MISC'];

const emptyCourse = () => ({ title:'', slug:'', description:'', thumbnailUrl:'', price:0 });
const emptyModule = (courseId: string, orderIndex: number) => ({ courseId, title:'', type:'TEXT' as ModuleType, content:'', videoUrl:'', orderIndex, xpReward:50, requiredRank:1 });
const emptyChallenge = () => ({ title:'', description:'', category:'WEB', difficulty:'MEDIUM', points:100, flag:'', hint:'' });

// ─── Shared UI ─────────────────────────────────────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }> = ({ title, onClose, children, wide }) => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className={`bg-[#0d0d1a] border border-white/10 rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-[90vh] overflow-y-auto shadow-2xl`}>
            <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const Field: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; rows?: number }> = ({ label, value, onChange, placeholder, textarea, rows = 4 }) => (
    <div>
        <label className="block text-sm text-gray-400 mb-1">{label}</label>
        {textarea
            ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 resize-y text-sm font-mono placeholder:text-gray-600" />
            : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 text-sm placeholder:text-gray-600" />
        }
    </div>
);

const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string|number; sub?: string; color: string }) => (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex items-center gap-4 hover:bg-white/8 transition-all">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} flex-shrink-0`}><Icon size={18} className="text-white" /></div>
        <div className="min-w-0"><p className="text-gray-400 text-xs truncate">{label}</p><p className="text-2xl font-bold text-white">{value}</p>{sub && <p className="text-gray-500 text-xs">{sub}</p>}</div>
    </div>
);

const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div><div className="flex justify-between text-xs mb-1"><span className="text-gray-400">{label}</span><span className="text-white font-semibold">{score}%</span></div><div className="h-1.5 bg-white/10 rounded-full"><div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${score}%` }} /></div></div>
);

const Err = ({ msg, onClose }: { msg: string; onClose: () => void }) => (
    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 mb-4">
        <AlertTriangle size={15} /><span className="text-sm flex-grow">{msg}</span><button onClick={onClose}><X size={13} /></button>
    </div>
);

// ─── TAB 1: OVERVIEW ──────────────────────────────────────────────────────────
const OverviewTab: React.FC<{ courses: Course[]; onRefresh: () => void }> = ({ courses, onRefresh }) => {
    const [expanded, setExpanded] = useState<string|null>(null);
    const [err, setErr] = useState('');
    const [courseModal, setCourseModal] = useState<'create'|'edit'|null>(null);
    const [courseForm, setCourseForm] = useState(emptyCourse());
    const [editingCourseId, setEditingCourseId] = useState<string|null>(null);
    const [moduleModal, setModuleModal] = useState<'create'|'edit'|null>(null);
    const [moduleForm, setModuleForm] = useState<ReturnType<typeof emptyModule>|null>(null);
    const [editingModuleId, setEditingModuleId] = useState<string|null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDel, setConfirmDel] = useState<{ type:'course'|'module'; id:string }|null>(null);

    const totalModules = courses.reduce((s, c) => s + c.modules.length, 0);

    const saveCourse = async () => {
        setSaving(true);
        try {
            if (courseModal === 'create') await api.post('/courses', courseForm);
            else if (editingCourseId) await api.put(`/courses/${editingCourseId}`, courseForm);
            setCourseModal(null); onRefresh();
        } catch (e: any) { setErr(e.response?.data?.error || 'Failed to save course'); }
        finally { setSaving(false); }
    };

    const togglePublish = async (c: Course) => {
        try { await api.patch(`/courses/${c.id}/publish`); onRefresh(); }
        catch { setErr('Failed to toggle publish'); }
    };

    const doDelete = async () => {
        if (!confirmDel) return;
        try {
            if (confirmDel.type === 'course') await api.delete(`/courses/${confirmDel.id}`);
            else await api.delete(`/courses/modules/${confirmDel.id}`);
            setConfirmDel(null); onRefresh();
        } catch { setErr('Failed to delete'); }
    };

    const saveModule = async () => {
        if (!moduleForm) return;
        setSaving(true);
        try {
            if (moduleModal === 'create') await api.post(`/courses/${moduleForm.courseId}/modules`, moduleForm);
            else if (editingModuleId) await api.put(`/courses/modules/${editingModuleId}`, moduleForm);
            setModuleModal(null); onRefresh();
        } catch (e: any) { setErr(e.response?.data?.error || 'Failed to save module'); }
        finally { setSaving(false); }
    };

    return (
        <div>
            {err && <Err msg={err} onClose={() => setErr('')} />}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
                <div className="grid grid-cols-3 gap-4 flex-grow">
                    <StatCard icon={BookOpen} label="Total Courses" value={courses.length} color="from-cyan-500 to-blue-600" />
                    <StatCard icon={Layers} label="Total Modules" value={totalModules} color="from-purple-500 to-pink-600" />
                    <StatCard icon={Eye} label="Published" value={courses.filter(c => c.isPublished).length} color="from-green-500 to-emerald-600" />
                </div>
                <button onClick={() => { setCourseForm(emptyCourse()); setCourseModal('create'); }} className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all">
                    <PlusCircle size={15} /> New Course
                </button>
            </div>

            {courses.length === 0 ? (
                <div className="text-center text-gray-500 py-20"><BookOpen size={48} className="mx-auto mb-4 opacity-20" /><p>No courses yet.</p></div>
            ) : (
                <div className="space-y-3">
                    {courses.map(course => (
                        <div key={course.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all">
                            <div className="flex items-center gap-4 p-5">
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-semibold text-white truncate">{course.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${course.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{course.isPublished ? 'Published' : 'Draft'}</span>
                                    </div>
                                    <p className="text-gray-400 text-sm mt-0.5">{course.modules.length} module{course.modules.length !== 1 ? 's' : ''} · by {course.instructor.username} · ${Number(course.price).toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => setExpanded(expanded === course.id ? null : course.id)} className="p-2 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-white/5">{expanded === course.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                                    <button onClick={() => togglePublish(course)} className={`p-2 rounded-lg hover:bg-white/5 ${course.isPublished ? 'text-green-400 hover:text-yellow-400' : 'text-gray-400 hover:text-green-400'}`}>{course.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                                    <button onClick={() => { setCourseForm({ title:course.title, slug:course.slug, description:course.description||'', thumbnailUrl:course.thumbnailUrl||'', price:course.price }); setEditingCourseId(course.id); setCourseModal('edit'); }} className="p-2 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-white/5"><Edit2 size={16} /></button>
                                    <button onClick={() => setConfirmDel({ type:'course', id:course.id })} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/5"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            {expanded === course.id && (
                                <div className="border-t border-white/10 p-5 bg-black/20">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Modules</h4>
                                        <button onClick={() => { setModuleForm(emptyModule(course.id, course.modules.length)); setEditingModuleId(null); setModuleModal('create'); }} className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg transition-all"><PlusCircle size={12} /> Add Module</button>
                                    </div>
                                    {course.modules.length === 0 ? <p className="text-gray-500 text-sm">No modules yet.</p> : (
                                        <div className="space-y-2">
                                            {course.modules.map(m => (
                                                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 group">
                                                    <span className="text-xs text-gray-500 w-5 text-center">{m.orderIndex + 1}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.type === 'TEXT' ? 'bg-blue-500/20 text-blue-400' : m.type === 'VIDEO' ? 'bg-red-500/20 text-red-400' : m.type === 'QUIZ' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-purple-500/20 text-purple-400'}`}>{m.type}</span>
                                                    <span className="flex-grow text-sm text-gray-200 truncate">{m.title}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setModuleForm({ courseId:course.id, title:m.title, type:m.type, content:m.content||'', videoUrl:m.videoUrl||'', orderIndex:m.orderIndex, xpReward:m.xpReward||50, requiredRank:m.requiredRank||1 }); setEditingModuleId(m.id); setModuleModal('edit'); }} className="p-1.5 text-gray-400 hover:text-blue-400 rounded"><Edit2 size={13} /></button>
                                                        <button onClick={() => setConfirmDel({ type:'module', id:m.id })} className="p-1.5 text-gray-400 hover:text-red-400 rounded"><Trash2 size={13} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {courseModal && (
                <Modal title={courseModal === 'create' ? 'New Course' : 'Edit Course'} onClose={() => setCourseModal(null)}>
                    <div className="space-y-4">
                        <Field label="Title *" value={courseForm.title} onChange={v => setCourseForm(f => ({ ...f, title:v }))} placeholder="e.g. Web Application Hacking" />
                        <Field label="Slug *" value={courseForm.slug} onChange={v => setCourseForm(f => ({ ...f, slug:v }))} placeholder="e.g. web-app-hacking" />
                        <Field label="Description" value={courseForm.description} onChange={v => setCourseForm(f => ({ ...f, description:v }))} placeholder="What will students learn?" textarea />
                        <Field label="Thumbnail URL" value={courseForm.thumbnailUrl} onChange={v => setCourseForm(f => ({ ...f, thumbnailUrl:v }))} placeholder="https://..." />
                        <div><label className="block text-sm text-gray-400 mb-1">Price (USD)</label><input type="number" min={0} step={0.01} value={courseForm.price} onChange={e => setCourseForm(f => ({ ...f, price:parseFloat(e.target.value)||0 }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50" /></div>
                        <button onClick={saveCourse} disabled={saving || !courseForm.title || !courseForm.slug} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 py-3 rounded-xl font-semibold transition-all"><Save size={15} /> {saving ? 'Saving...' : 'Save Course'}</button>
                    </div>
                </Modal>
            )}

            {moduleModal && moduleForm && (
                <Modal title={moduleModal === 'create' ? 'New Module' : 'Edit Module'} onClose={() => setModuleModal(null)}>
                    <div className="space-y-4">
                        <Field label="Title *" value={moduleForm.title} onChange={v => setModuleForm(f => f ? { ...f, title:v } : f)} placeholder="e.g. Introduction to SQL Injection" />
                        <div><label className="block text-sm text-gray-400 mb-1">Type</label><div className="flex gap-2 flex-wrap">{MODULE_TYPES.map(t => <button key={t} onClick={() => setModuleForm(f => f ? { ...f, type:t } : f)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${moduleForm.type === t ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>)}</div></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm text-gray-400 mb-1">XP Reward</label><input type="number" min={0} value={moduleForm.xpReward} onChange={e => setModuleForm(f => f ? { ...f, xpReward:parseInt(e.target.value)||0 } : f)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50" /></div>
                            <div><label className="block text-sm text-gray-400 mb-1">Required Rank</label><input type="number" min={1} max={5} value={moduleForm.requiredRank} onChange={e => setModuleForm(f => f ? { ...f, requiredRank:parseInt(e.target.value)||1 } : f)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50" /></div>
                        </div>
                        {moduleForm.type === 'TEXT' && <Field label="Content (Markdown)" value={moduleForm.content||''} onChange={v => setModuleForm(f => f ? { ...f, content:v } : f)} placeholder="# Lesson content..." textarea rows={10} />}
                        {moduleForm.type === 'VIDEO' && <Field label="Video URL" value={moduleForm.videoUrl||''} onChange={v => setModuleForm(f => f ? { ...f, videoUrl:v } : f)} placeholder="https://youtube.com/..." />}
                        {(moduleForm.type === 'QUIZ' || moduleForm.type === 'LAB') && <Field label="Content / Instructions" value={moduleForm.content||''} onChange={v => setModuleForm(f => f ? { ...f, content:v } : f)} textarea rows={8} />}
                        <button onClick={saveModule} disabled={saving || !moduleForm.title} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 py-3 rounded-xl font-semibold transition-all"><Save size={15} /> {saving ? 'Saving...' : 'Save Module'}</button>
                    </div>
                </Modal>
            )}

            {confirmDel && (
                <Modal title="Confirm Delete" onClose={() => setConfirmDel(null)}>
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={28} className="text-red-400" /></div>
                        <p className="text-gray-300">Delete this {confirmDel.type}? <span className="text-red-400 font-semibold">Cannot be undone.</span></p>
                        <div className="flex gap-3"><button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10">Cancel</button><button onClick={doDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 font-semibold">Delete</button></div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── TAB 2: CHALLENGES ────────────────────────────────────────────────────────
const ChallengesTab: React.FC = () => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [modal, setModal] = useState<'create'|'edit'|'ai'|null>(null);
    const [form, setForm] = useState(emptyChallenge());
    const [editId, setEditId] = useState<string|null>(null);
    const [saving, setSaving] = useState(false);
    const [lastFlag, setLastFlag] = useState('');
    const [aiForm, setAiForm] = useState({ topic:'', difficulty:'MEDIUM', category:'WEB' });
    const [confirmDel, setConfirmDel] = useState<string|null>(null);

    const fetch = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/challenges/admin/all'); setChallenges(r.data); }
        catch { setErr('Failed to load challenges'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetch(); }, [fetch]);

    const save = async () => {
        setSaving(true);
        try {
            if (modal === 'create') await api.post('/challenges', form);
            else if (editId) await api.put(`/challenges/${editId}`, form);
            setModal(null); setLastFlag(''); await fetch();
        } catch (e: any) { setErr(e.response?.data?.error || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const aiGenerate = async () => {
        if (!aiForm.topic.trim()) { setErr('Enter a topic'); return; }
        setSaving(true);
        try {
            const r = await api.post('/challenges/ai-generate', aiForm);
            setLastFlag(r.data.plainFlag);
            setModal(null); await fetch();
        } catch (e: any) { setErr(e.response?.data?.error || 'AI generation failed'); }
        finally { setSaving(false); }
    };

    const toggle = async (id: string) => {
        try { await api.patch(`/challenges/${id}/toggle`); await fetch(); }
        catch { setErr('Failed to toggle'); }
    };

    const del = async () => {
        if (!confirmDel) return;
        try { await api.delete(`/challenges/${confirmDel}`); setConfirmDel(null); await fetch(); }
        catch { setErr('Failed to delete'); }
    };

    return (
        <div>
            {err && <Err msg={err} onClose={() => setErr('')} />}
            {lastFlag && (
                <div className="mb-4 flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400">
                    <Flag size={15} /><div><p className="text-xs font-semibold mb-0.5">Challenge created! Save this flag — it won't be shown again:</p><p className="font-mono font-bold">{lastFlag}</p></div>
                    <button onClick={() => setLastFlag('')} className="ml-auto"><X size={13} /></button>
                </div>
            )}

            <div className="flex gap-3 mb-6 flex-wrap">
                <button onClick={() => { setForm(emptyChallenge()); setEditId(null); setModal('create'); }} className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"><PlusCircle size={15} /> New Challenge</button>
                <button onClick={() => setModal('ai')} className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"><Cpu size={15} /> AI Generate</button>
                <span className="ml-auto text-gray-400 text-sm self-center">{challenges.length} challenge{challenges.length !== 1 ? 's' : ''} · {challenges.filter(c => c.isActive).length} active</span>
            </div>

            {loading ? <div className="text-center text-gray-400 py-20 animate-pulse">Loading...</div> : (
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-white/5 border-b border-white/10"><th className="text-left p-4 text-gray-400 text-xs uppercase tracking-wider">Challenge</th><th className="text-left p-4 text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell">Category</th><th className="text-left p-4 text-gray-400 text-xs uppercase tracking-wider">Difficulty</th><th className="text-right p-4 text-gray-400 text-xs uppercase tracking-wider">Pts</th><th className="text-right p-4 text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell">Solves</th><th className="text-right p-4 text-gray-400 text-xs uppercase tracking-wider">Actions</th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                            {challenges.map(c => (
                                <tr key={c.id} className={`hover:bg-white/5 transition-colors ${!c.isActive ? 'opacity-40' : ''}`}>
                                    <td className="p-4"><p className="text-white font-medium truncate max-w-[200px]">{c.title}</p></td>
                                    <td className="p-4 hidden md:table-cell"><span className="text-xs text-gray-400">{c.category}</span></td>
                                    <td className="p-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${DIFFICULTY_COLORS[c.difficulty] || 'text-gray-400 bg-white/5'}`}>{c.difficulty}</span></td>
                                    <td className="p-4 text-right text-cyan-400 font-semibold">{c.points}</td>
                                    <td className="p-4 text-right text-gray-400 hidden md:table-cell">{c._count?.solves ?? c.solveCount}</td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => toggle(c.id)} className={`p-1.5 rounded transition-colors ${c.isActive ? 'text-green-400 hover:text-gray-400' : 'text-gray-600 hover:text-green-400'}`} title={c.isActive ? 'Deactivate' : 'Activate'}>{c.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}</button>
                                            <button onClick={() => { setForm({ title:c.title, description:c.description, category:c.category, difficulty:c.difficulty, points:c.points, flag:'', hint:c.hint||'' }); setEditId(c.id); setModal('edit'); }} className="p-1.5 text-gray-400 hover:text-blue-400 rounded"><Edit2 size={14} /></button>
                                            <button onClick={() => setConfirmDel(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded"><Trash2 size={14} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(modal === 'create' || modal === 'edit') && (
                <Modal title={modal === 'create' ? 'New Challenge' : 'Edit Challenge'} onClose={() => setModal(null)} wide>
                    <div className="space-y-4">
                        <Field label="Title *" value={form.title} onChange={v => setForm(f => ({ ...f, title:v }))} placeholder="e.g. Broken JWT" />
                        <Field label="Description *" value={form.description} onChange={v => setForm(f => ({ ...f, description:v }))} placeholder="Full challenge scenario. Embed the flag naturally in the text..." textarea rows={8} />
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm text-gray-400 mb-1">Category</label><select value={form.category} onChange={e => setForm(f => ({ ...f, category:e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50">{CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0d0d1a]">{c}</option>)}</select></div>
                            <div><label className="block text-sm text-gray-400 mb-1">Difficulty</label><select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty:e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50">{['EASY','MEDIUM','HARD','INSANE'].map(d => <option key={d} value={d} className="bg-[#0d0d1a]">{d}</option>)}</select></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm text-gray-400 mb-1">Points</label><input type="number" min={10} value={form.points} onChange={e => setForm(f => ({ ...f, points:parseInt(e.target.value)||100 }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50" /></div>
                            <Field label={modal === 'edit' ? 'New Flag (leave blank to keep)' : 'Flag * (SHERK{...})'} value={form.flag} onChange={v => setForm(f => ({ ...f, flag:v }))} placeholder="SHERK{...}" />
                        </div>
                        <Field label="Hint (optional)" value={form.hint} onChange={v => setForm(f => ({ ...f, hint:v }))} placeholder="A subtle nudge..." />
                        <button onClick={save} disabled={saving || !form.title || !form.description || (modal === 'create' && !form.flag)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 py-3 rounded-xl font-semibold transition-all"><Save size={15} /> {saving ? 'Saving...' : 'Save Challenge'}</button>
                    </div>
                </Modal>
            )}

            {modal === 'ai' && (
                <Modal title="AI Challenge Generator" onClose={() => setModal(null)}>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm"><Cpu size={14} /> AI will generate a complete challenge including flag from your topic.</div>
                        <Field label="Topic *" value={aiForm.topic} onChange={v => setAiForm(f => ({ ...f, topic:v }))} placeholder="e.g. SQL injection in login forms, JWT manipulation, OSINT on LinkedIn..." />
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm text-gray-400 mb-1">Category</label><select value={aiForm.category} onChange={e => setAiForm(f => ({ ...f, category:e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50">{CATEGORIES.map(c => <option key={c} value={c} className="bg-[#0d0d1a]">{c}</option>)}</select></div>
                            <div><label className="block text-sm text-gray-400 mb-1">Difficulty</label><select value={aiForm.difficulty} onChange={e => setAiForm(f => ({ ...f, difficulty:e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50">{['EASY','MEDIUM','HARD','INSANE'].map(d => <option key={d} value={d} className="bg-[#0d0d1a]">{d}</option>)}</select></div>
                        </div>
                        <button onClick={aiGenerate} disabled={saving || !aiForm.topic.trim()} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-600 disabled:opacity-50 py-3 rounded-xl font-semibold transition-all">{saving ? <><RefreshCw size={15} className="animate-spin" /> Generating...</> : <><Cpu size={15} /> Generate & Save</>}</button>
                    </div>
                </Modal>
            )}

            {confirmDel && (
                <Modal title="Delete Challenge" onClose={() => setConfirmDel(null)}>
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={28} className="text-red-400" /></div>
                        <p className="text-gray-300">Delete this challenge and all its solves? <span className="text-red-400 font-semibold">Cannot be undone.</span></p>
                        <div className="flex gap-3"><button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl bg-white/5">Cancel</button><button onClick={del} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 font-semibold">Delete</button></div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── TAB 3: USERS ─────────────────────────────────────────────────────────────
const UsersTab: React.FC<{ courses: Course[] }> = ({ courses }) => {
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [enrollModal, setEnrollModal] = useState<UserRecord|null>(null);
    const [enrollCourseId, setEnrollCourseId] = useState('');
    const [saving, setSaving] = useState(false);
    const [resetConfirm, setResetConfirm] = useState<UserRecord|null>(null);

    const fetchUsers = useCallback(async (p: number, q: string) => {
        setLoading(true);
        try { const r = await api.get('/courses/admin/users', { params:{ page:p, search:q } }); setUsers(r.data.users); setTotal(r.data.total); setPages(r.data.pages); }
        catch { setErr('Failed to load users'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchUsers(page, search); }, [fetchUsers, page, search]);

    const changeRole = async (userId: string, role: string) => {
        try { await api.patch(`/admin/users/${userId}/role`, { role }); await fetchUsers(page, search); }
        catch { setErr('Failed to change role'); }
    };

    const toggleBan = async (userId: string) => {
        try { await api.patch(`/admin/users/${userId}/ban`); await fetchUsers(page, search); }
        catch { setErr('Failed to toggle ban'); }
    };

    const resetXP = async () => {
        if (!resetConfirm) return;
        try { await api.post(`/admin/users/${resetConfirm.id}/reset-xp`); setResetConfirm(null); await fetchUsers(page, search); }
        catch { setErr('Failed to reset XP'); }
    };

    const manualEnroll = async () => {
        if (!enrollModal || !enrollCourseId) return;
        setSaving(true);
        try { await api.post('/admin/enrollments', { userId:enrollModal.id, courseId:enrollCourseId }); setEnrollModal(null); }
        catch (e: any) { setErr(e.response?.data?.error || 'Failed to enroll'); }
        finally { setSaving(false); }
    };

    const roleBadge = (role: string) => role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : role === 'INSTRUCTOR' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400';

    return (
        <div>
            {err && <Err msg={err} onClose={() => setErr('')} />}
            <div className="flex items-center gap-3 mb-6">
                <div className="relative flex-grow">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by username or email..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-600" />
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">{total} user{total !== 1 ? 's' : ''}</span>
            </div>

            {loading ? <div className="text-center text-gray-400 py-20 animate-pulse">Loading...</div> : (
                <div className="space-y-2">
                    {users.map(u => (
                        <div key={u.id} className={`rounded-2xl border p-4 flex items-center gap-4 flex-wrap transition-all ${!u.isActive ? 'bg-red-500/5 border-red-500/20 opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">{u.username[0].toUpperCase()}</div>
                            <div className="min-w-0 flex-grow">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-white">{u.username}</span>
                                    {!u.isActive && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 rounded font-bold">BANNED</span>}
                                </div>
                                <p className="text-gray-500 text-xs truncate">{u.email} · {u.xp.toLocaleString()} XP · {RANK_LABELS[u.rank]}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                                {/* Role selector */}
                                <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className={`text-xs font-bold px-2 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer ${roleBadge(u.role)}`} style={{ background:'transparent' }}>
                                    <option value="LEARNER" className="bg-[#0d0d1a] text-white">LEARNER</option>
                                    <option value="INSTRUCTOR" className="bg-[#0d0d1a] text-white">INSTRUCTOR</option>
                                    <option value="ADMIN" className="bg-[#0d0d1a] text-white">ADMIN</option>
                                </select>
                                {/* Enroll */}
                                <button onClick={() => { setEnrollModal(u); setEnrollCourseId(courses[0]?.id || ''); }} title="Manual Enroll" className="p-1.5 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-white/10 transition-colors"><GraduationCap size={15} /></button>
                                {/* Reset XP */}
                                <button onClick={() => setResetConfirm(u)} title="Reset XP" className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-white/10 transition-colors"><RotateCcw size={15} /></button>
                                {/* Ban toggle */}
                                <button onClick={() => toggleBan(u.id)} title={u.isActive ? 'Ban User' : 'Unban User'} className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${u.isActive ? 'text-gray-400 hover:text-red-400' : 'text-red-400 hover:text-green-400'}`}>{u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-sm">Prev</button>
                    <span className="text-gray-400 text-sm">{page} / {pages}</span>
                    <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-sm">Next</button>
                </div>
            )}

            {enrollModal && (
                <Modal title={`Enroll ${enrollModal.username}`} onClose={() => setEnrollModal(null)}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Give <span className="text-white font-semibold">{enrollModal.username}</span> free access to a course.</p>
                        <div><label className="block text-sm text-gray-400 mb-1">Course</label>
                            <select value={enrollCourseId} onChange={e => setEnrollCourseId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50">
                                {courses.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d1a]">{c.title}</option>)}
                            </select>
                        </div>
                        {courses.length === 0 && <p className="text-amber-400 text-sm">No courses yet.</p>}
                        <button onClick={manualEnroll} disabled={saving || !enrollCourseId} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 py-3 rounded-xl font-semibold transition-all"><GraduationCap size={15} /> {saving ? 'Enrolling...' : 'Enroll for Free'}</button>
                    </div>
                </Modal>
            )}

            {resetConfirm && (
                <Modal title="Reset XP" onClose={() => setResetConfirm(null)}>
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center"><AlertTriangle size={28} className="text-amber-400" /></div>
                        <p className="text-gray-300">Reset all XP and rank for <span className="text-white font-semibold">{resetConfirm.username}</span>?</p>
                        <div className="flex gap-3"><button onClick={() => setResetConfirm(null)} className="flex-1 py-2.5 rounded-xl bg-white/5">Cancel</button><button onClick={resetXP} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 font-semibold">Reset</button></div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── TAB 4: ANNOUNCEMENTS ─────────────────────────────────────────────────────
const AnnouncementsTab: React.FC = () => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [form, setForm] = useState({ title:'', content:'', type:'INFO' });
    const [saving, setSaving] = useState(false);

    const fetchAnns = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/admin/announcements'); setAnnouncements(r.data); }
        catch { setErr('Failed to load announcements'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAnns(); }, [fetchAnns]);

    const create = async () => {
        if (!form.title || !form.content) { setErr('Title and content required'); return; }
        setSaving(true);
        try { await api.post('/admin/announcements', form); setForm({ title:'', content:'', type:'INFO' }); await fetchAnns(); }
        catch { setErr('Failed to create announcement'); }
        finally { setSaving(false); }
    };

    const toggle = async (id: string) => {
        try { await api.patch(`/admin/announcements/${id}`); await fetchAnns(); }
        catch { setErr('Failed to toggle'); }
    };

    const del = async (id: string) => {
        try { await api.delete(`/admin/announcements/${id}`); await fetchAnns(); }
        catch { setErr('Failed to delete'); }
    };

    const typeIcon = (t: string) => t === 'CRITICAL' ? <AlertTriangle size={14} /> : t === 'WARNING' ? <Bell size={14} /> : t === 'SUCCESS' ? <CheckCircle size={14} /> : <Megaphone size={14} />;

    return (
        <div className="space-y-6">
            {err && <Err msg={err} onClose={() => setErr('')} />}

            {/* Create form */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2"><Megaphone size={14} /> Broadcast Announcement</h3>
                <Field label="Title *" value={form.title} onChange={v => setForm(f => ({ ...f, title:v }))} placeholder="e.g. New challenge added, Maintenance tonight..." />
                <Field label="Content *" value={form.content} onChange={v => setForm(f => ({ ...f, content:v }))} placeholder="Full message to all users..." textarea rows={3} />
                <div className="flex gap-3">
                    <div className="flex-grow"><label className="block text-sm text-gray-400 mb-1">Type</label>
                        <div className="flex gap-2">{['INFO','WARNING','CRITICAL','SUCCESS'].map(t => <button key={t} onClick={() => setForm(f => ({ ...f, type:t }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.type === t ? ANN_COLORS[t] : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>{t}</button>)}</div>
                    </div>
                    <button onClick={create} disabled={saving || !form.title || !form.content} className="self-end flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"><Megaphone size={14} /> {saving ? 'Sending...' : 'Broadcast'}</button>
                </div>
            </div>

            {/* List */}
            {loading ? <div className="text-center text-gray-400 py-10 animate-pulse">Loading...</div> : announcements.length === 0 ? (
                <div className="text-center text-gray-500 py-10"><Megaphone size={32} className="mx-auto mb-3 opacity-20" /><p>No announcements yet.</p></div>
            ) : (
                <div className="space-y-3">
                    {announcements.map(a => (
                        <div key={a.id} className={`rounded-2xl border p-4 flex items-start gap-4 transition-all ${!a.isActive ? 'opacity-40' : ''} ${ANN_COLORS[a.type]}`}>
                            <div className="mt-0.5 flex-shrink-0">{typeIcon(a.type)}</div>
                            <div className="flex-grow min-w-0">
                                <p className="font-semibold text-white">{a.title}</p>
                                <p className="text-sm opacity-80 mt-0.5">{a.content}</p>
                                <p className="text-xs opacity-50 mt-1">{new Date(a.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{a.isActive ? 'LIVE' : 'OFF'}</span>
                                <button onClick={() => toggle(a.id)} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">{a.isActive ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                <button onClick={() => del(a.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/10"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── TAB 5: ENROLLMENTS ───────────────────────────────────────────────────────
const EnrollmentsTab: React.FC<{ courses: Course[] }> = ({ courses }) => {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');
    const [manualForm, setManualForm] = useState({ userId:'', courseId:'' });
    const [saving, setSaving] = useState(false);
    const [confirmDel, setConfirmDel] = useState<string|null>(null);

    const fetchEnrollments = useCallback(async (p: number, q: string) => {
        setLoading(true);
        try { const r = await api.get('/admin/enrollments', { params:{ page:p, search:q } }); setEnrollments(r.data.enrollments); setTotal(r.data.total); setPages(r.data.pages); }
        catch { setErr('Failed to load enrollments'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchEnrollments(page, search); }, [fetchEnrollments, page, search]);

    const manualEnroll = async () => {
        if (!manualForm.userId || !manualForm.courseId) { setErr('User ID and course are required'); return; }
        setSaving(true);
        try { await api.post('/admin/enrollments', manualForm); setManualForm({ userId:'', courseId:'' }); await fetchEnrollments(page, search); }
        catch (e: any) { setErr(e.response?.data?.error || 'Failed to enroll'); }
        finally { setSaving(false); }
    };

    const remove = async () => {
        if (!confirmDel) return;
        try { await api.delete(`/admin/enrollments/${confirmDel}`); setConfirmDel(null); await fetchEnrollments(page, search); }
        catch { setErr('Failed to remove enrollment'); }
    };

    const methodBadge = (m: string) => m === 'MPESA' ? 'text-green-400 bg-green-500/10' : m === 'PAYPAL' ? 'text-blue-400 bg-blue-500/10' : 'text-gray-400 bg-white/5';

    return (
        <div className="space-y-6">
            {err && <Err msg={err} onClose={() => setErr('')} />}

            {/* Manual enroll */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><GraduationCap size={14} /> Manual Enroll</h3>
                <div className="flex gap-3 flex-wrap">
                    <div className="flex-grow min-w-40"><label className="block text-xs text-gray-500 mb-1">User ID</label><input type="text" value={manualForm.userId} onChange={e => setManualForm(f => ({ ...f, userId:e.target.value }))} placeholder="Paste user ID..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 font-mono placeholder:text-gray-600" /></div>
                    <div className="flex-grow min-w-40"><label className="block text-xs text-gray-500 mb-1">Course</label>
                        <select value={manualForm.courseId} onChange={e => setManualForm(f => ({ ...f, courseId:e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50">
                            <option value="" className="bg-[#0d0d1a]">Select course...</option>
                            {courses.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d1a]">{c.title}</option>)}
                        </select>
                    </div>
                    <button onClick={manualEnroll} disabled={saving} className="self-end flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 px-4 py-2 rounded-xl font-semibold text-sm transition-all"><GraduationCap size={14} /> {saving ? '...' : 'Enroll'}</button>
                </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-grow"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by user or course..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50 placeholder:text-gray-600" /></div>
                <span className="text-gray-400 text-sm flex-shrink-0">{total} enrollment{total !== 1 ? 's' : ''}</span>
            </div>

            {loading ? <div className="text-center text-gray-400 py-10 animate-pulse">Loading...</div> : enrollments.length === 0 ? (
                <div className="text-center text-gray-500 py-10"><GraduationCap size={32} className="mx-auto mb-3 opacity-20" /><p>No enrollments found.</p></div>
            ) : (
                <div className="rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead><tr className="bg-white/5 border-b border-white/10"><th className="text-left p-4 text-gray-400 text-xs uppercase tracking-wider">User</th><th className="text-left p-4 text-gray-400 text-xs uppercase tracking-wider hidden md:table-cell">Course</th><th className="text-left p-4 text-gray-400 text-xs uppercase tracking-wider hidden lg:table-cell">Method</th><th className="text-right p-4 text-gray-400 text-xs uppercase tracking-wider hidden lg:table-cell">Paid</th><th className="text-right p-4 text-gray-400 text-xs uppercase tracking-wider">Action</th></tr></thead>
                        <tbody className="divide-y divide-white/5">
                            {enrollments.map(e => (
                                <tr key={e.id} className="hover:bg-white/5">
                                    <td className="p-4"><p className="text-white font-medium">{e.user.username}</p><p className="text-gray-500 text-xs">{e.user.email}</p></td>
                                    <td className="p-4 hidden md:table-cell text-gray-300 text-sm">{e.course.title}</td>
                                    <td className="p-4 hidden lg:table-cell"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodBadge(e.paymentMethod)}`}>{e.paymentMethod}</span></td>
                                    <td className="p-4 text-right hidden lg:table-cell text-gray-300">{Number(e.amountPaid) > 0 ? `$${Number(e.amountPaid).toFixed(2)}` : 'Free'}</td>
                                    <td className="p-4 text-right"><button onClick={() => setConfirmDel(e.id)} className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-white/10"><Trash2 size={14} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-sm">Prev</button>
                    <span className="text-gray-400 text-sm">{page} / {pages}</span>
                    <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 text-sm">Next</button>
                </div>
            )}

            {confirmDel && (
                <Modal title="Remove Enrollment" onClose={() => setConfirmDel(null)}>
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center"><AlertTriangle size={28} className="text-red-400" /></div>
                        <p className="text-gray-300">Remove this enrollment? The user will lose access.</p>
                        <div className="flex gap-3"><button onClick={() => setConfirmDel(null)} className="flex-1 py-2.5 rounded-xl bg-white/5">Cancel</button><button onClick={remove} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 font-semibold">Remove</button></div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── TAB 6: ANALYTICS ────────────────────────────────────────────────────────
const AnalyticsTab: React.FC = () => {
    const [data, setData] = useState<Analytics|null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    useEffect(() => {
        api.get('/courses/admin/analytics')
            .then(r => setData(r.data))
            .catch(() => setErr('Failed to load analytics'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center text-gray-400 py-20 animate-pulse">Loading analytics...</div>;
    if (!data) return <div className="text-red-400 text-center py-10">{err}</div>;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Users} label="Total Users" value={data.users.total} sub={`+${data.users.newThisWeek} this week`} color="from-cyan-500 to-blue-600" />
                <StatCard icon={BookOpen} label="Published Courses" value={data.courses.published} sub={`${data.courses.total} total`} color="from-purple-500 to-pink-600" />
                <StatCard icon={TrendingUp} label="Enrollments" value={data.enrollments.total} color="from-amber-500 to-orange-600" />
                <StatCard icon={DollarSign} label="Revenue (KES)" value={data.enrollments.revenue.toLocaleString()} color="from-green-500 to-emerald-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={Activity} label="Completions" value={data.completions} color="from-teal-500 to-cyan-600" />
                <StatCard icon={Layers} label="Total Modules" value={data.courses.modules} color="from-indigo-500 to-purple-600" />
                <StatCard icon={Users} label="New This Month" value={data.users.newThisMonth} color="from-pink-500 to-rose-600" />
                <StatCard icon={Award} label="Avg XP/User" value={data.users.total > 0 ? Math.round(data.completions * 50 / data.users.total) : 0} color="from-yellow-500 to-amber-600" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingUp size={13} /> Top Courses by Enrollment</h3>
                    {data.topCourses.length === 0 ? <p className="text-gray-500 text-sm">No enrollments yet.</p> : (
                        <div className="space-y-3">{data.topCourses.map((c, i) => (
                            <div key={c.id} className="flex items-center gap-3">
                                <span className="text-xs text-gray-600 w-4">{i+1}</span>
                                <div className="flex-grow min-w-0">
                                    <p className="text-sm text-white truncate">{c.title}</p>
                                    <div className="h-1 bg-white/10 rounded-full mt-1"><div className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full" style={{ width:`${Math.min(100,(c.enrollments/(data.topCourses[0]?.enrollments||1))*100)}%` }} /></div>
                                </div>
                                <span className="text-sm font-bold text-cyan-400 flex-shrink-0">{c.enrollments}</span>
                            </div>
                        ))}</div>
                    )}
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                    <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2"><Users size={13} /> Recent Signups</h3>
                    <div className="space-y-2">{data.recentUsers.map(u => (
                        <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{u.username[0].toUpperCase()}</div>
                            <div className="min-w-0 flex-grow"><p className="text-sm text-white truncate">{u.username}</p><p className="text-xs text-gray-500">{u.email}</p></div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${u.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : u.role === 'INSTRUCTOR' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{u.role}</span>
                        </div>
                    ))}</div>
                </div>
            </div>
        </div>
    );
};

// ─── TAB 7: AI GENERATOR ─────────────────────────────────────────────────────
const AIGeneratorTab: React.FC<{ courses: Course[] }> = ({ courses }) => {
    const [file, setFile] = useState<File|null>(null);
    const [dragging, setDragging] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ generated: GeneratedModule; review: AuthenticityReport; pageCount: number; wordCount: number }|null>(null);
    const [err, setErr] = useState('');
    const [saveModal, setSaveModal] = useState(false);
    const [saveCourseId, setSaveCourseId] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedOk, setSavedOk] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const generate = async () => {
        if (!file) return;
        setLoading(true); setResult(null); setErr(''); setSavedOk(false);
        try {
            const form = new FormData(); form.append('pdf', file);
            const r = await api.post('/ai/generate-from-pdf', form, { headers:{ 'Content-Type':'multipart/form-data' } });
            setResult(r.data);
        } catch (e: any) { setErr(e.response?.data?.error || 'Generation failed. Is GROQ_API_KEY set?'); }
        finally { setLoading(false); }
    };

    const saveModule = async () => {
        if (!result || !saveCourseId) return;
        setSaving(true);
        try { await api.post('/ai/save-module', { courseId:saveCourseId, title:result.generated.title, content:result.generated.content, xpReward:100, requiredRank:1 }); setSaveModal(false); setSavedOk(true); }
        catch (e: any) { setErr(e.response?.data?.error || 'Failed to save'); }
        finally { setSaving(false); }
    };

    const verdictColor = result ? (result.review.verdict === 'APPROVED' ? 'text-green-400 bg-green-500/10 border-green-500/30' : result.review.verdict === 'NEEDS_REVISION' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30') : '';

    return (
        <div className="space-y-6">
            {err && <Err msg={err} onClose={() => setErr('')} />}
            {savedOk && <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-xl p-3"><CheckCircle size={14} /> Module saved to course.</div>}

            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4"><div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-600"><Cpu size={17} className="text-white" /></div><div><p className="font-semibold text-white">PDF → Course Module</p><p className="text-xs text-gray-400">Two AI agents: Generator + Authenticity Reviewer</p></div></div>
                <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); else setErr('PDF only'); }} onClick={() => fileRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-cyan-400 bg-cyan-500/10' : file ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}>
                    <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
                    {file ? <div><FileText size={32} className="mx-auto mb-3 text-green-400" /><p className="text-white font-semibold">{file.name}</p><p className="text-gray-400 text-sm mt-1">{(file.size/1024).toFixed(1)} KB · Click to change</p></div> : <div><Upload size={32} className="mx-auto mb-3 text-gray-500" /><p className="text-gray-300 font-semibold">Drop PDF or click to browse</p><p className="text-gray-500 text-sm mt-1">Max 50MB</p></div>}
                </div>
                <button onClick={generate} disabled={!file || loading} className="mt-4 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-cyan-600 disabled:opacity-50 py-3 rounded-xl font-semibold transition-all">{loading ? <><RefreshCw size={15} className="animate-spin" /> Two agents working...</> : <><Cpu size={15} /> Generate Module</>}</button>
            </div>

            {result && (
                <div className="space-y-4">
                    <div className={`rounded-2xl border p-5 ${verdictColor}`}>
                        <div className="flex items-center justify-between mb-4"><div className="flex items-center gap-2"><Shield size={15} /><span className="font-semibold text-sm">Authenticity Report</span></div><span className={`px-3 py-1 rounded-full text-xs font-bold border ${verdictColor}`}>{result.review.verdict}</span></div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <ScoreBar label="Originality" score={result.review.originalityScore} color="from-cyan-400 to-blue-500" />
                            <ScoreBar label="Accuracy" score={result.review.accuracyScore} color="from-purple-400 to-pink-500" />
                            <ScoreBar label="Quality" score={result.review.qualityScore} color="from-green-400 to-emerald-500" />
                        </div>
                        <p className="text-sm opacity-80">{result.review.summary}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{result.generated.title}</h3>
                                <p className="text-gray-400 text-sm mt-1">{result.generated.description}</p>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">{result.generated.difficulty}</span>
                                    <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">{result.generated.estimatedMinutes} min</span>
                                    <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full">{result.generated.quiz?.length||0} quiz questions</span>
                                    <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">{result.pageCount} pages</span>
                                </div>
                            </div>
                            <button onClick={() => { setSaveCourseId(courses[0]?.id||''); setSaveModal(true); }} disabled={result.review.verdict === 'REJECTED'} className="flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-40 px-4 py-2 rounded-xl text-sm font-semibold transition-all"><Save size={13} /> Save to Course</button>
                        </div>
                        <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Content Preview</p><div className="bg-black/30 rounded-xl p-4 font-mono text-xs text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap border border-white/5">{result.generated.content?.substring(0,800)}{result.generated.content?.length > 800 ? '\n\n...[truncated]' : ''}</div></div>
                    </div>
                </div>
            )}

            {saveModal && result && (
                <Modal title="Save to Course" onClose={() => setSaveModal(false)}>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-400">Add <span className="text-white font-semibold">"{result.generated.title}"</span> to:</p>
                        <div><label className="block text-sm text-gray-400 mb-1">Course</label><select value={saveCourseId} onChange={e => setSaveCourseId(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50">{courses.map(c => <option key={c.id} value={c.id} className="bg-[#0d0d1a]">{c.title} ({c.modules.length} modules)</option>)}</select></div>
                        {courses.length === 0 && <p className="text-amber-400 text-sm">Create a course first in the Overview tab.</p>}
                        <button onClick={saveModule} disabled={saving || !saveCourseId} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 disabled:opacity-50 py-3 rounded-xl font-semibold"><Save size={15} /> {saving ? 'Saving...' : 'Save Module'}</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── TAB 8: HEALTH ────────────────────────────────────────────────────────────
const HealthTab: React.FC = () => {
    const [data, setData] = useState<HealthData|null>(null);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    const fetchHealth = useCallback(async () => {
        setLoading(true);
        try { const r = await api.get('/admin/health'); setData(r.data); }
        catch { setErr('Health check failed'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchHealth(); }, [fetchHealth]);

    const formatUptime = (s: number) => { const h = Math.floor(s/3600); const m = Math.floor((s%3600)/60); return `${h}h ${m}m`; };

    if (loading) return <div className="text-center text-gray-400 py-20 animate-pulse">Running diagnostics...</div>;
    if (!data) return <div className="text-red-400 text-center py-10">{err}</div>;

    const memPct = Math.round((data.memory.used / data.memory.total) * 100);

    return (
        <div className="space-y-6">
            {/* Status row */}
            <div className="grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-white/5 border border-green-500/20 p-5">
                    <div className="flex items-center gap-3 mb-2"><div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" /><span className="text-xs font-bold text-green-400 uppercase tracking-wider">Server</span></div>
                    <p className="text-white font-semibold capitalize">{data.status}</p>
                    <p className="text-gray-500 text-xs mt-0.5">Uptime: {formatUptime(data.uptime)}</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-green-500/20 p-5">
                    <div className="flex items-center gap-3 mb-2"><Database size={12} className="text-cyan-400" /><span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Database</span></div>
                    <p className="text-white font-semibold capitalize">{data.db}</p>
                    <p className="text-gray-500 text-xs mt-0.5">PostgreSQL · Prisma ORM</p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                    <div className="flex items-center gap-3 mb-2"><Server size={12} className="text-purple-400" /><span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Memory</span></div>
                    <p className="text-white font-semibold">{data.memory.used} MB <span className="text-gray-500 text-sm">/ {data.memory.total} MB</span></p>
                    <div className="h-1.5 bg-white/10 rounded-full mt-2"><div className={`h-full rounded-full transition-all ${memPct > 80 ? 'bg-red-400' : memPct > 60 ? 'bg-yellow-400' : 'bg-green-400'}`} style={{ width:`${memPct}%` }} /></div>
                </div>
            </div>

            {/* Count grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <StatCard icon={Users} label="Total Users" value={data.counts.totalUsers} sub={`${data.counts.bannedUsers} banned`} color="from-cyan-500 to-blue-600" />
                <StatCard icon={BookOpen} label="Courses" value={data.counts.totalCourses} sub={`${data.counts.totalModules} modules`} color="from-purple-500 to-pink-600" />
                <StatCard icon={Flag} label="Challenges" value={data.counts.totalChallenges} sub={`${data.counts.totalSolves} solves`} color="from-amber-500 to-orange-600" />
                <StatCard icon={GraduationCap} label="Enrollments" value={data.counts.totalEnrollments} color="from-green-500 to-emerald-600" />
                <StatCard icon={CheckCircle} label="Module Completions" value={data.counts.totalProgress} color="from-teal-500 to-cyan-600" />
                <StatCard icon={UserCheck} label="Active Users" value={data.counts.activeUsers} color="from-indigo-500 to-purple-600" />
            </div>

            {/* Recent signups */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Recent Signups</h3>
                    <button onClick={fetchHealth} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"><RefreshCw size={12} /> Refresh</button>
                </div>
                <div className="space-y-2">
                    {data.recentSignups.map((u, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">{u.username[0].toUpperCase()}</div>
                            <span className="text-sm text-white flex-grow">{u.username}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${u.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{u.role}</span>
                            <span className="text-xs text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState('');

    const fetchCourses = useCallback(async () => {
        try { const r = await api.get('/courses/admin/all'); setCourses(r.data); }
        catch { setErr('Failed to load courses. Ensure you are logged in as ADMIN.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const tabs: { id: Tab; label: string; icon: any }[] = [
        { id:'overview',      label:'Courses',       icon:BookOpen    },
        { id:'challenges',    label:'Challenges',    icon:Flag        },
        { id:'users',         label:'Users',         icon:Users       },
        { id:'announcements', label:'Announce',      icon:Megaphone   },
        { id:'enrollments',   label:'Enrollments',   icon:GraduationCap },
        { id:'analytics',     label:'Analytics',     icon:BarChart2   },
        { id:'ai-generator',  label:'AI Generator',  icon:Cpu         },
        { id:'health',        label:'Health',        icon:HeartPulse  },
    ];

    return (
        <div className="min-h-screen bg-[#05010f] text-white p-4 md:p-8 font-sans">
            <div className="mb-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Sherk Academy — Control Room</h1>
                <p className="text-gray-500 text-sm mt-0.5">Full platform management · Never touch code again</p>
            </div>

            {err && <Err msg={err} onClose={() => setErr('')} />}

            {/* Tab Bar */}
            <div className="flex gap-1 mb-8 bg-white/5 border border-white/10 rounded-2xl p-1.5 flex-wrap">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-1 justify-center min-w-[80px] ${activeTab === tab.id ? 'bg-gradient-to-r from-cyan-500/20 to-purple-600/20 text-white border border-cyan-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                            <Icon size={13} /><span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {loading && activeTab === 'overview' ? (
                <div className="text-center text-gray-400 py-20 animate-pulse">Loading...</div>
            ) : (
                <>
                    {activeTab === 'overview'      && <OverviewTab courses={courses} onRefresh={fetchCourses} />}
                    {activeTab === 'challenges'    && <ChallengesTab />}
                    {activeTab === 'users'         && <UsersTab courses={courses} />}
                    {activeTab === 'announcements' && <AnnouncementsTab />}
                    {activeTab === 'enrollments'   && <EnrollmentsTab courses={courses} />}
                    {activeTab === 'analytics'     && <AnalyticsTab />}
                    {activeTab === 'ai-generator'  && <AIGeneratorTab courses={courses} />}
                    {activeTab === 'health'        && <HealthTab />}
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
