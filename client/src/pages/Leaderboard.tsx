import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Trophy, Zap, Flag, BookOpen, Crown, Medal, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LeaderboardEntry {
    position: number;
    id: string;
    username: string;
    xp: number;
    rank: number;
    solves: number;
    completedModules: number;
    joinedAt: string;
}

const RANK_LABELS: Record<number, string> = {
    1: 'Trainee', 2: 'Operative', 3: 'Specialist', 4: 'Ghost', 5: 'APT'
};

const RANK_COLORS: Record<number, string> = {
    1: 'text-gray-400', 2: 'text-blue-400', 3: 'text-purple-400', 4: 'text-cyan-400', 5: 'text-yellow-400'
};

const PositionIcon: React.FC<{ position: number }> = ({ position }) => {
    if (position === 1) return <Crown size={18} className="text-yellow-400" />;
    if (position === 2) return <Medal size={18} className="text-gray-300" />;
    if (position === 3) return <Award size={18} className="text-amber-600" />;
    return <span className="text-gray-500 text-sm font-mono w-5 text-center">{position}</span>;
};

export const Leaderboard: React.FC = () => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/challenges/leaderboard')
            .then(r => setEntries(r.data))
            .catch(() => setError('Failed to load leaderboard'))
            .finally(() => setLoading(false));
    }, []);

    const myEntry = entries.find(e => e.id === user?.id);

    return (
        <div className="min-h-screen bg-[#05010f] text-white p-6 md:p-10 font-sans">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border border-yellow-500/20 mb-4">
                        <Trophy size={28} className="text-yellow-400" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-amber-400 bg-clip-text text-transparent">
                        Global Leaderboard
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm">Your rank is yours forever. Keep earning.</p>
                </div>

                {/* My rank callout */}
                {myEntry && (
                    <div className="mb-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {myEntry.username[0].toUpperCase()}
                        </div>
                        <div className="flex-grow">
                            <p className="text-white font-semibold">You are ranked <span className="text-cyan-400">#{myEntry.position}</span></p>
                            <p className="text-gray-400 text-sm">{myEntry.xp.toLocaleString()} XP · {myEntry.solves} flags · {RANK_LABELS[myEntry.rank]}</p>
                        </div>
                        <Zap size={16} className="text-cyan-400" />
                    </div>
                )}

                {error && <div className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl p-3">{error}</div>}

                {loading ? (
                    <div className="text-center text-gray-400 py-20 animate-pulse">Loading leaderboard...</div>
                ) : entries.length === 0 ? (
                    <div className="text-center text-gray-500 py-20">
                        <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No operatives ranked yet. Be the first.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Top 3 podium */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[entries[1], entries[0], entries[2]].filter(Boolean).map((e, i) => {
                                const podiumOrder = [2, 1, 3];
                                const pos = podiumOrder[i];
                                const heights = ['h-24', 'h-32', 'h-20'];
                                const isMe = e.id === user?.id;
                                return (
                                    <div key={e.id} className={`flex flex-col items-center justify-end ${heights[i]}`}>
                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg mb-2 ${isMe ? 'ring-2 ring-cyan-400' : ''}`}>
                                            {e.username[0].toUpperCase()}
                                        </div>
                                        <p className="text-white text-xs font-semibold truncate max-w-full px-1">{e.username}</p>
                                        <p className="text-gray-400 text-[10px]">{e.xp.toLocaleString()} XP</p>
                                        <div className={`w-full rounded-t-xl mt-2 flex items-center justify-center py-2 ${pos === 1 ? 'bg-yellow-500/20 border border-yellow-500/30' : pos === 2 ? 'bg-gray-400/10 border border-gray-400/20' : 'bg-amber-700/20 border border-amber-700/30'}`}>
                                            <PositionIcon position={pos} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Full table */}
                        <div className="rounded-2xl border border-white/10 overflow-hidden">
                            {entries.map(entry => {
                                const isMe = entry.id === user?.id;
                                return (
                                    <div key={entry.id}
                                        className={`flex items-center gap-4 px-5 py-4 border-b border-white/5 last:border-0 transition-colors ${isMe ? 'bg-cyan-500/10' : 'hover:bg-white/5'}`}>
                                        {/* Position */}
                                        <div className="w-7 flex-shrink-0 flex items-center justify-center">
                                            <PositionIcon position={entry.position} />
                                        </div>

                                        {/* Avatar */}
                                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${isMe ? 'ring-2 ring-cyan-400' : ''}`}>
                                            {entry.username[0].toUpperCase()}
                                        </div>

                                        {/* Name + rank */}
                                        <div className="flex-grow min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold text-sm ${isMe ? 'text-cyan-400' : 'text-white'}`}>
                                                    {entry.username}
                                                </span>
                                                {isMe && <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 rounded">YOU</span>}
                                            </div>
                                            <span className={`text-xs ${RANK_COLORS[entry.rank]}`}>
                                                {RANK_LABELS[entry.rank] || `Rank ${entry.rank}`}
                                            </span>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <div className="text-right hidden sm:block">
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <Flag size={11} className="text-cyan-400" />
                                                    <span>{entry.solves}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-gray-400">
                                                    <BookOpen size={11} className="text-purple-400" />
                                                    <span>{entry.completedModules}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white">{entry.xp.toLocaleString()}</p>
                                                <p className="text-[10px] text-gray-500">XP</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
