import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    PlusCircle, Edit2, Trash2, Eye, EyeOff, ChevronDown, ChevronUp,
    BookOpen, Layers, Users, X, Save, AlertTriangle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────
interface Module {
    id: string; title: string; type: 'TEXT' | 'VIDEO' | 'QUIZ' | 'LAB';
    orderIndex: number; content?: string; videoUrl?: string;
}
interface Course {
    id: string; title: string; slug: string; description?: string;
    thumbnailUrl?: string; price: number; isPublished: boolean;
    createdAt: string; instructor: { username: string };
    modules: Module[];
}

const MODULE_TYPES = ['TEXT', 'VIDEO', 'QUIZ', 'LAB'] as const;

// ─── Stat Card ────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) => (
    <div className={`rounded-2xl bg-white/5 border border-white/10 p-6 flex items-center gap-4 hover:bg-white/10 transition-all duration-300`}>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
            <Icon size={22} className="text-white" />
        </div>
        <div>
            <p className="text-gray-400 text-sm">{label}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
        </div>
    </div>
);

// ─── Empty Modal Form State ───────────────────────────────────
type ModuleType = 'TEXT' | 'VIDEO' | 'QUIZ' | 'LAB';

const emptyCourse = () => ({ title: '', slug: '', description: '', thumbnailUrl: '', price: 0 });
const emptyModule = (courseId: string, orderIndex: number): { courseId: string; title: string; type: ModuleType; content: string; videoUrl: string; orderIndex: number } => ({
    courseId, title: '', type: 'TEXT', content: '', videoUrl: '', orderIndex
});

// ─── Main Admin Dashboard ─────────────────────────────────────
const AdminDashboard: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Course modal state
    const [courseModal, setCourseModal] = useState<'create' | 'edit' | null>(null);
    const [courseForm, setCourseForm] = useState(emptyCourse());
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);

    // Module modal state
    const [moduleModal, setModuleModal] = useState<'create' | 'edit' | null>(null);
    const [moduleForm, setModuleForm] = useState<ReturnType<typeof emptyModule> | null>(null);
    const [editingModuleId, setEditingModuleId] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'course' | 'module'; id: string } | null>(null);

    const fetchCourses = async () => {
        try {
            const res = await api.get('/courses/admin/all');
            setCourses(res.data);
        } catch {
            setError('Failed to load courses. Make sure you are logged in as ADMIN.');
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchCourses(); }, []);

    const totalModules = courses.reduce((s, c) => s + c.modules.length, 0);

    // ─── Course Actions ───────────────────────────────────────
    const openCreateCourse = () => { setCourseForm(emptyCourse()); setCourseModal('create'); };
    const openEditCourse = (c: Course) => {
        setCourseForm({ title: c.title, slug: c.slug, description: c.description || '', thumbnailUrl: c.thumbnailUrl || '', price: c.price });
        setEditingCourseId(c.id);
        setCourseModal('edit');
    };

    const saveCourse = async () => {
        setSaving(true);
        try {
            if (courseModal === 'create') {
                await api.post('/courses', courseForm);
            } else if (editingCourseId) {
                await api.put(`/courses/${editingCourseId}`, courseForm);
            }
            setCourseModal(null);
            await fetchCourses();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to save course');
        } finally { setSaving(false); }
    };

    const togglePublish = async (course: Course) => {
        try {
            await api.patch(`/courses/${course.id}/publish`);
            await fetchCourses();
        } catch { setError('Failed to toggle publish status'); }
    };

    const confirmDeleteCourse = (id: string) => setConfirmDelete({ type: 'course', id });
    const doDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'course') {
                await api.delete(`/courses/${confirmDelete.id}`);
            } else {
                await api.delete(`/courses/modules/${confirmDelete.id}`);
            }
            setConfirmDelete(null);
            await fetchCourses();
        } catch { setError('Failed to delete item'); }
    };

    // ─── Module Actions ───────────────────────────────────────
    const openCreateModule = (courseId: string, currentCount: number) => {
        setModuleForm(emptyModule(courseId, currentCount));
        setEditingModuleId(null);
        setModuleModal('create');
    };
    const openEditModule = (courseId: string, m: Module) => {
        setModuleForm({ courseId, title: m.title, type: m.type, content: m.content || '', videoUrl: m.videoUrl || '', orderIndex: m.orderIndex });
        setEditingModuleId(m.id);
        setModuleModal('edit');
    };

    const saveModule = async () => {
        if (!moduleForm) return;
        setSaving(true);
        try {
            if (moduleModal === 'create') {
                await api.post(`/courses/${moduleForm.courseId}/modules`, moduleForm);
            } else if (editingModuleId) {
                await api.put(`/courses/modules/${editingModuleId}`, moduleForm);
            }
            setModuleModal(null);
            await fetchCourses();
        } catch (e: any) {
            setError(e.response?.data?.error || 'Failed to save module');
        } finally { setSaving(false); }
    };

    // ─── Render ───────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#05010f] text-white p-6 md:p-10 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        Academy Control Center
                    </h1>
                    <p className="text-gray-400 mt-1">Manage courses, modules, and content</p>
                </div>
                <button
                    onClick={openCreateCourse}
                    className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg hover:shadow-cyan-500/25"
                >
                    <PlusCircle size={16} /> New Course
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                    <AlertTriangle size={16} />
                    <span className="text-sm">{error}</span>
                    <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                <StatCard icon={BookOpen} label="Total Courses" value={courses.length} color="from-cyan-500 to-blue-600" />
                <StatCard icon={Layers} label="Total Modules" value={totalModules} color="from-purple-500 to-pink-600" />
                <StatCard icon={Users} label="Published" value={courses.filter(c => c.isPublished).length} color="from-green-500 to-emerald-600" />
            </div>

            {/* Courses Table */}
            {loading ? (
                <div className="text-center text-gray-400 py-20 animate-pulse">Loading courses...</div>
            ) : courses.length === 0 ? (
                <div className="text-center text-gray-500 py-20">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                    <p>No courses yet. Click <strong className="text-cyan-400">+ New Course</strong> to create your first one!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {courses.map(course => (
                        <div key={course.id} className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden hover:border-cyan-500/30 transition-all duration-300">
                            {/* Course Row */}
                            <div className="flex items-center gap-4 p-5">
                                <div className="flex-grow min-w-0">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-semibold text-white truncate">{course.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${course.isPublished ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                            {course.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mt-0.5">
                                        {course.modules.length} module{course.modules.length !== 1 ? 's' : ''} · by {course.instructor.username} · ${Number(course.price).toFixed(2)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Expand modules */}
                                    <button
                                        onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                                        className="p-2 text-gray-400 hover:text-cyan-400 transition-colors rounded-lg hover:bg-white/5"
                                        title="Manage modules"
                                    >
                                        {expandedCourse === course.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    {/* Publish toggle */}
                                    <button
                                        onClick={() => togglePublish(course)}
                                        className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${course.isPublished ? 'text-green-400 hover:text-yellow-400' : 'text-gray-400 hover:text-green-400'}`}
                                        title={course.isPublished ? 'Unpublish' : 'Publish'}
                                    >
                                        {course.isPublished ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    {/* Edit */}
                                    <button
                                        onClick={() => openEditCourse(course)}
                                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-lg hover:bg-white/5"
                                        title="Edit course"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    {/* Delete */}
                                    <button
                                        onClick={() => confirmDeleteCourse(course.id)}
                                        className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                                        title="Delete course"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Module Manager (expandable) */}
                            {expandedCourse === course.id && (
                                <div className="border-t border-white/10 p-5 bg-black/20">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Modules</h4>
                                        <button
                                            onClick={() => openCreateModule(course.id, course.modules.length)}
                                            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg transition-all"
                                        >
                                            <PlusCircle size={12} /> Add Module
                                        </button>
                                    </div>

                                    {course.modules.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No modules yet. Add your first one!</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {course.modules.map((m) => (
                                                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all group">
                                                    <span className="text-xs text-gray-500 w-5 text-center">{m.orderIndex + 1}</span>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.type === 'TEXT' ? 'bg-blue-500/20 text-blue-400' :
                                                        m.type === 'VIDEO' ? 'bg-red-500/20 text-red-400' :
                                                            m.type === 'QUIZ' ? 'bg-yellow-500/20 text-yellow-400' :
                                                                'bg-purple-500/20 text-purple-400'
                                                        }`}>{m.type}</span>
                                                    <span className="flex-grow text-sm text-gray-200 truncate">{m.title}</span>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => openEditModule(course.id, m)} className="p-1.5 text-gray-400 hover:text-blue-400 rounded"><Edit2 size={13} /></button>
                                                        <button onClick={() => setConfirmDelete({ type: 'module', id: m.id })} className="p-1.5 text-gray-400 hover:text-red-400 rounded"><Trash2 size={13} /></button>
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

            {/* ─── Course Modal ─────────────────────────────── */}
            {courseModal && (
                <Modal title={courseModal === 'create' ? 'New Course' : 'Edit Course'} onClose={() => setCourseModal(null)}>
                    <div className="space-y-4">
                        <FormField label="Title *" value={courseForm.title} onChange={v => setCourseForm(f => ({ ...f, title: v }))} placeholder="e.g. Web Application Hacking" />
                        <FormField label="Slug *" value={courseForm.slug} onChange={v => setCourseForm(f => ({ ...f, slug: v }))} placeholder="e.g. web-app-hacking" />
                        <FormField label="Description" value={courseForm.description} onChange={v => setCourseForm(f => ({ ...f, description: v }))} placeholder="What will students learn?" textarea />
                        <FormField label="Thumbnail URL" value={courseForm.thumbnailUrl} onChange={v => setCourseForm(f => ({ ...f, thumbnailUrl: v }))} placeholder="https://..." />
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Price (USD)</label>
                            <input
                                type="number" min={0} step={0.01}
                                value={courseForm.price}
                                onChange={e => setCourseForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                            />
                        </div>
                        <button
                            onClick={saveCourse} disabled={saving || !courseForm.title || !courseForm.slug}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-all"
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save Course'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ─── Module Modal ─────────────────────────────── */}
            {moduleModal && moduleForm && (
                <Modal title={moduleModal === 'create' ? 'New Module' : 'Edit Module'} onClose={() => setModuleModal(null)}>
                    <div className="space-y-4">
                        <FormField label="Title *" value={moduleForm.title} onChange={v => setModuleForm(f => f ? { ...f, title: v } : f)} placeholder="e.g. Introduction to SQL Injection" />
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Type</label>
                            <div className="flex gap-2 flex-wrap">
                                {MODULE_TYPES.map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setModuleForm(f => f ? { ...f, type: t } : f)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${moduleForm.type === t ? 'bg-cyan-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >{t}</button>
                                ))}
                            </div>
                        </div>
                        {moduleForm.type === 'TEXT' && (
                            <FormField label="Content (Markdown)" value={moduleForm.content || ''} onChange={v => setModuleForm(f => f ? { ...f, content: v } : f)} placeholder="# Lesson content here..." textarea rows={10} />
                        )}
                        {moduleForm.type === 'VIDEO' && (
                            <FormField label="Video URL" value={moduleForm.videoUrl || ''} onChange={v => setModuleForm(f => f ? { ...f, videoUrl: v } : f)} placeholder="https://youtube.com/..." />
                        )}
                        {(moduleForm.type === 'QUIZ' || moduleForm.type === 'LAB') && (
                            <FormField label="Content / Instructions (Markdown)" value={moduleForm.content || ''} onChange={v => setModuleForm(f => f ? { ...f, content: v } : f)} placeholder="# Instructions..." textarea rows={8} />
                        )}
                        <button
                            onClick={saveModule} disabled={saving || !moduleForm.title}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-all"
                        >
                            <Save size={16} /> {saving ? 'Saving...' : 'Save Module'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ─── Delete Confirmation ───────────────────────── */}
            {confirmDelete && (
                <Modal title="Confirm Delete" onClose={() => setConfirmDelete(null)}>
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
                            <AlertTriangle size={28} className="text-red-400" />
                        </div>
                        <p className="text-gray-300">Are you sure you want to delete this {confirmDelete.type}? <span className="text-red-400 font-semibold">This action cannot be undone.</span></p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                            <button onClick={doDelete} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 transition-colors font-semibold">Delete</button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

// ─── Reusable sub-components ───────────────────────────────────
const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">{title}</h2>
                <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"><X size={16} /></button>
            </div>
            <div className="p-6">{children}</div>
        </div>
    </div>
);

const FormField: React.FC<{
    label: string; value: string; onChange: (v: string) => void;
    placeholder?: string; textarea?: boolean; rows?: number;
}> = ({ label, value, onChange, placeholder, textarea, rows = 4 }) => (
    <div>
        <label className="block text-sm text-gray-400 mb-1">{label}</label>
        {textarea ? (
            <textarea
                value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} rows={rows}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 resize-y transition-colors placeholder:text-gray-600 font-mono text-sm"
            />
        ) : (
            <input
                type="text" value={value} onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-600"
            />
        )}
    </div>
);

export default AdminDashboard;
