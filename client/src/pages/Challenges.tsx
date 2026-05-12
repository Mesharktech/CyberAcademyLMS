import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Flag, CheckCircle, ChevronDown, ChevronUp,
    Filter, Zap, Globe, Terminal, Wifi, Key, Search,
    Eye, FileSearch, Bug, Shuffle, AlertTriangle, X, Send, PlayCircle
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Challenge {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'INSANE';
    points: number;
    hint?: string;
    solveCount: number;
    solved: boolean;
    solvedAt?: string;
    isLive?: boolean;
    liveUrl?: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const DIFFICULTY_META = {
    EASY:   { color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30' },
    MEDIUM: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    HARD:   { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    INSANE: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    WEB:      <Globe size={14} />,
    LINUX:    <Terminal size={14} />,
    WINDOWS:  <Terminal size={14} />,
    NETWORK:  <Wifi size={14} />,
    CRYPTO:   <Key size={14} />,
    FORENSICS:<FileSearch size={14} />,
    OSINT:    <Search size={14} />,
    MALWARE:  <Bug size={14} />,
    REVERSE:  <Eye size={14} />,
    MISC:     <Shuffle size={14} />,
};

const CATEGORIES = ['ALL', 'WEB', 'LINUX', 'WINDOWS', 'NETWORK', 'CRYPTO', 'FORENSICS', 'OSINT', 'MALWARE', 'REVERSE', 'MISC'];
const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD', 'INSANE'];

// ─── Challenge Card ─────────────────────────────────────────────────────────────
const ChallengeCard: React.FC<{ challenge: Challenge; onSolve: (id: string) => void }> = ({ challenge, onSolve }) => {
    const navigate = useNavigate();
    const [expanded, setExpanded] = useState(false);
    const [flag, setFlag] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [launching, setLaunching] = useState(false);
    const [result, setResult] = useState<{ correct: boolean; message: string } | null>(null);
    const [showHint, setShowHint] = useState(false);

    const launchLab = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (launching) return;
        setLaunching(true);
        try {
            await api.post(`/challenges/${challenge.id}/launch`);
            navigate(`/lab/${challenge.id}`);
        } catch {
            setLaunching(false);
        }
    };

    const meta = DIFFICULTY_META[challenge.difficulty];

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!flag.trim() || submitting) return;
        setSubmitting(true);
        setResult(null);
        try {
            const res = await api.post(`/challenges/${challenge.id}/submit`, { flag: flag.trim() });
            setResult({ correct: res.data.correct, message: res.data.message });
            if (res.data.correct && !res.data.alreadySolved) {
                setTimeout(() => onSolve(challenge.id), 800);
            }
        } catch {
            setResult({ correct: false, message: 'Submission failed. Try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
            challenge.solved
                ? 'bg-green-500/5 border-green-500/20'
                : `bg-white/5 ${meta.border} hover:bg-white/8`
        }`}>
            {/* Card Header */}
            <div
                className="flex items-center gap-4 p-5 cursor-pointer select-none"
                onClick={() => setExpanded(e => !e)}
            >
                {/* Status icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    challenge.solved ? 'bg-green-500/20' : meta.bg
                }`}>
                    {challenge.solved
                        ? <CheckCircle size={16} className="text-green-400" />
                        : <Flag size={16} className={meta.color} />
                    }
                </div>

                {/* Title + meta */}
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white truncate">{challenge.title}</h3>
                        {challenge.solved && (
                            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">PWNED</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs font-semibold ${meta.color}`}>
                            {challenge.difficulty}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                            {CATEGORY_ICONS[challenge.category]}
                            {challenge.category}
                        </span>
                        <span className="text-xs text-gray-500">{challenge.solveCount} solve{challenge.solveCount !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Points */}
                <div className="flex-shrink-0 text-right">
                    <p className={`text-lg font-bold ${challenge.solved ? 'text-green-400' : 'text-cyan-400'}`}>
                        {challenge.points}
                    </p>
                    <p className="text-gray-500 text-[10px]">pts</p>
                </div>

                <div className="flex-shrink-0 text-gray-500">
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>

            {/* Expanded body */}
            {expanded && (
                <div className="border-t border-white/10 p-5 space-y-4 bg-black/20">
                    {/* Description */}
                    <div className="bg-black/30 rounded-xl p-4 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed border border-white/5">
                        {challenge.description}
                    </div>

                    {/* Hint */}
                    {challenge.hint && (
                        <div>
                            {showHint ? (
                                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-300 text-sm">
                                    <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                                    <span>{challenge.hint}</span>
                                </div>
                            ) : (
                                <button onClick={() => setShowHint(true)}
                                    className="text-xs text-amber-400/60 hover:text-amber-400 transition-colors flex items-center gap-1">
                                    <AlertTriangle size={11} /> Reveal hint (-10% points from score)
                                </button>
                            )}
                        </div>
                    )}

                    {/* Flag submission / Launch Lab */}
                    {challenge.solved ? (
                        <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                            <CheckCircle size={16} />
                            Captured {challenge.solvedAt ? `· ${new Date(challenge.solvedAt).toLocaleDateString()}` : ''}
                        </div>
                    ) : challenge.isLive ? (
                        <button onClick={launchLab} disabled={launching}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all w-full justify-center">
                            <PlayCircle size={15} />
                            {launching ? 'Launching container...' : 'Launch Live Lab'}
                        </button>
                    ) : (
                        <form onSubmit={submit} className="flex gap-2">
                            <div className="flex-grow relative">
                                <Flag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    value={flag}
                                    onChange={e => setFlag(e.target.value)}
                                    placeholder="SHERK{...}"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-600"
                                />
                            </div>
                            <button type="submit" disabled={submitting || !flag.trim()}
                                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2.5 rounded-xl font-semibold text-sm transition-all">
                                {submitting ? '...' : <><Send size={13} /> Submit</>}
                            </button>
                        </form>
                    )}

                    {/* Result */}
                    {result && (
                        <div className={`flex items-center gap-2 text-sm rounded-xl p-3 border ${
                            result.correct
                                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                            {result.correct ? <CheckCircle size={14} /> : <X size={14} />}
                            {result.message}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Main Challenges Page ───────────────────────────────────────────────────────
export const Challenges: React.FC = () => {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [category, setCategory] = useState('ALL');
    const [difficulty, setDifficulty] = useState('ALL');
    const [search, setSearch] = useState('');
    const [showSolved, setShowSolved] = useState(true);

    const fetchChallenges = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (category !== 'ALL') params.category = category;
            if (difficulty !== 'ALL') params.difficulty = difficulty;
            const res = await api.get('/challenges', { params });
            setChallenges(res.data);
        } catch {
            setError('Failed to load challenges. Make sure you are logged in.');
        } finally {
            setLoading(false);
        }
    }, [category, difficulty]);

    useEffect(() => { fetchChallenges(); }, [fetchChallenges]);

    const handleSolve = (id: string) => {
        setChallenges(prev => prev.map(c => c.id === id ? { ...c, solved: true } : c));
    };

    const filtered = challenges.filter(c => {
        if (!showSolved && c.solved) return false;
        if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const solvedCount = challenges.filter(c => c.solved).length;
    const totalPoints = challenges.filter(c => c.solved).reduce((s, c) => s + c.points, 0);

    return (
        <div className="min-h-screen bg-[#05010f] text-white p-6 md:p-10 font-sans">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                    Challenge Range
                </h1>
                <p className="text-gray-400 mt-1 text-sm">
                    Capture flags. Earn XP. Your progress never expires.
                </p>
            </div>

            {/* Stats bar */}
            {!loading && challenges.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                        <p className="text-2xl font-bold text-cyan-400">{solvedCount}<span className="text-gray-500 text-lg">/{challenges.length}</span></p>
                        <p className="text-gray-400 text-xs mt-1">Challenges Solved</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                        <p className="text-2xl font-bold text-purple-400">{totalPoints.toLocaleString()}</p>
                        <p className="text-gray-400 text-xs mt-1">Points Captured</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                        <p className="text-2xl font-bold text-green-400">
                            {challenges.length > 0 ? Math.round((solvedCount / challenges.length) * 100) : 0}%
                        </p>
                        <p className="text-gray-400 text-xs mt-1">Completion</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                {/* Search */}
                <div className="relative flex-grow min-w-48">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search challenges..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors placeholder:text-gray-600" />
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 flex-wrap">
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${category === c ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white'}`}>
                            {c === 'ALL' ? 'All' : c}
                        </button>
                    ))}
                </div>

                {/* Difficulty filter */}
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                    {DIFFICULTIES.map(d => (
                        <button key={d} onClick={() => setDifficulty(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${difficulty === d
                                ? d === 'EASY' ? 'bg-green-500/20 text-green-400'
                                    : d === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400'
                                        : d === 'HARD' ? 'bg-orange-500/20 text-orange-400'
                                            : d === 'INSANE' ? 'bg-red-500/20 text-red-400'
                                                : 'bg-cyan-500/20 text-cyan-400'
                                : 'text-gray-400 hover:text-white'
                            }`}>
                            {d === 'ALL' ? 'All' : d}
                        </button>
                    ))}
                </div>

                {/* Hide solved toggle */}
                <button onClick={() => setShowSolved(s => !s)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${showSolved ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                    <Filter size={12} /> {showSolved ? 'Hide Solved' : 'Show Solved'}
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400">
                    <AlertTriangle size={16} /><span className="text-sm">{error}</span>
                </div>
            )}

            {/* Challenge list */}
            {loading ? (
                <div className="text-center text-gray-400 py-20 animate-pulse">Loading challenges...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center text-gray-500 py-20">
                    <Flag size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-semibold text-gray-400">
                        {challenges.length === 0 ? 'No challenges yet — check back soon.' : 'No challenges match your filters.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Group by difficulty */}
                    {(['EASY', 'MEDIUM', 'HARD', 'INSANE'] as const).map(diff => {
                        const group = filtered.filter(c => c.difficulty === diff);
                        if (group.length === 0) return null;
                        const meta = DIFFICULTY_META[diff];
                        return (
                            <div key={diff}>
                                <div className="flex items-center gap-3 mb-3 mt-6 first:mt-0">
                                    <Zap size={13} className={meta.color} />
                                    <span className={`text-xs font-bold uppercase tracking-widest ${meta.color}`}>{diff}</span>
                                    <div className="flex-grow h-px bg-white/5" />
                                    <span className="text-xs text-gray-500">{group.filter(c => c.solved).length}/{group.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {group.map(c => (
                                        <ChallengeCard key={c.id} challenge={c} onSolve={handleSolve} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Challenges;
