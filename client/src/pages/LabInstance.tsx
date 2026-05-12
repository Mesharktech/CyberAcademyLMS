import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Terminal, ExternalLink, Clock, Zap, StopCircle,
    RefreshCw, CheckCircle, AlertTriangle, Flag, ChevronLeft
} from 'lucide-react';

interface Instance {
    id: string;
    challengeId: string;
    liveUrl: string | null;
    uniqueFlag: string;
    status: 'STARTING' | 'RUNNING' | 'STOPPED' | 'EXPIRED' | 'FAILED';
    expiresAt: string;
    createdAt: string;
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    hint?: string;
}

function timeLeft(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
}

const STATUS_COLORS: Record<string, string> = {
    STARTING: 'text-yellow-400',
    RUNNING:  'text-green-400',
    STOPPED:  'text-gray-400',
    EXPIRED:  'text-red-400',
    FAILED:   'text-red-500'
};

const STATUS_LABELS: Record<string, string> = {
    STARTING: 'Launching container...',
    RUNNING:  'Instance live',
    STOPPED:  'Stopped',
    EXPIRED:  'Expired',
    FAILED:   'Deployment failed'
};

export const LabInstance: React.FC = () => {
    const { challengeId } = useParams<{ challengeId: string }>();
    const navigate = useNavigate();
    const [instance, setInstance] = useState<Instance | null>(null);
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [timer, setTimer] = useState('');
    const [flag, setFlag] = useState('');
    const [submitMsg, setSubmitMsg] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [stopping, setStopping] = useState(false);
    const [hintRevealed, setHintRevealed] = useState(false);

    const fetchInstance = useCallback(async () => {
        if (!challengeId) return;
        try {
            const [instRes, challRes] = await Promise.all([
                api.get(`/challenges/${challengeId}/instance`),
                api.get(`/challenges`).then(r => r.data.find((c: Challenge) => c.id === challengeId))
            ]);
            setInstance(instRes.data);
            setChallenge(challRes || null);
        } catch {
            navigate('/challenges');
        }
    }, [challengeId, navigate]);

    useEffect(() => { fetchInstance(); }, [fetchInstance]);

    // Poll while STARTING
    useEffect(() => {
        if (instance?.status !== 'STARTING') return;
        const interval = setInterval(fetchInstance, 4000);
        return () => clearInterval(interval);
    }, [instance?.status, fetchInstance]);

    // Countdown timer
    useEffect(() => {
        if (!instance?.expiresAt) return;
        const interval = setInterval(() => setTimer(timeLeft(instance.expiresAt)), 1000);
        return () => clearInterval(interval);
    }, [instance?.expiresAt]);

    const stopInstance = async () => {
        if (!challengeId || stopping) return;
        setStopping(true);
        try {
            await api.delete(`/challenges/${challengeId}/instance`);
            navigate('/challenges');
        } catch {
            setStopping(false);
        }
    };

    const submitFlag = async () => {
        if (!flag.trim() || !challengeId) return;
        try {
            const { data } = await api.post(`/challenges/${challengeId}/submit`, { flag: flag.trim() });
            if (data.correct) {
                setSubmitSuccess(true);
                setSubmitMsg(`+${data.points || 0} XP — Flag captured! Well done, operative.`);
            } else {
                setSubmitMsg('Wrong flag. Keep hacking.');
            }
        } catch {
            setSubmitMsg('Submission failed.');
        }
    };

    if (!instance) {
        return (
            <div className="min-h-screen bg-[#05010f] flex items-center justify-center">
                <div className="text-cyan-400 animate-pulse font-mono">Connecting to instance...</div>
            </div>
        );
    }

    const isRunning = instance.status === 'RUNNING';

    return (
        <div className="min-h-screen bg-[#05010f] text-white font-mono p-4 md:p-8">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => navigate('/challenges')}
                        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm">
                        <ChevronLeft size={16} /> Back
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-cyan-400">{challenge?.title || 'Live Lab'}</h1>
                        <p className="text-gray-500 text-xs mt-0.5">{challenge?.category} · {challenge?.difficulty} · {challenge?.points} pts</p>
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${STATUS_COLORS[instance.status]}`}>
                        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                        {STATUS_LABELS[instance.status]}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Timer */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <Clock size={20} className="text-yellow-400 flex-shrink-0" />
                        <div>
                            <p className="text-gray-400 text-xs">Time remaining</p>
                            <p className="text-white font-bold">{timer || '—'}</p>
                        </div>
                    </div>
                    {/* Points */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <Zap size={20} className="text-cyan-400 flex-shrink-0" />
                        <div>
                            <p className="text-gray-400 text-xs">Reward</p>
                            <p className="text-white font-bold">{challenge?.points} XP</p>
                        </div>
                    </div>
                    {/* Container URL */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <Terminal size={20} className="text-purple-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-400 text-xs">Target URL</p>
                            {isRunning && instance.liveUrl ? (
                                <a href={instance.liveUrl} target="_blank" rel="noopener noreferrer"
                                    className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 truncate">
                                    {instance.liveUrl.replace('https://', '')}
                                    <ExternalLink size={10} />
                                </a>
                            ) : (
                                <p className="text-gray-500 text-xs">Waiting for container...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scenario */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                    <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Mission Brief</h2>
                    <p className="text-gray-300 text-sm leading-relaxed">{challenge?.description}</p>

                    {challenge?.hint && (
                        <div className="mt-4">
                            {hintRevealed ? (
                                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-yellow-300 text-sm">
                                    <span className="text-yellow-500 font-semibold">HINT: </span>{challenge.hint}
                                </div>
                            ) : (
                                <button onClick={() => setHintRevealed(true)}
                                    className="text-yellow-500/60 hover:text-yellow-400 text-xs transition-colors">
                                    ⚠ Reveal hint (−10% score)
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Starting state */}
                {instance.status === 'STARTING' && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-4 flex items-center gap-4">
                        <RefreshCw size={20} className="text-yellow-400 animate-spin flex-shrink-0" />
                        <div>
                            <p className="text-yellow-300 font-semibold text-sm">Container spinning up on Fly.io</p>
                            <p className="text-gray-400 text-xs mt-0.5">Pulling Python image, installing Flask, booting your target... ~30 seconds</p>
                        </div>
                    </div>
                )}

                {/* Failed state */}
                {instance.status === 'FAILED' && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 mb-4 flex items-center gap-4">
                        <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                        <div>
                            <p className="text-red-300 font-semibold text-sm">Deployment failed</p>
                            <p className="text-gray-400 text-xs mt-0.5">Check Fly.io credentials or try launching again.</p>
                        </div>
                    </div>
                )}

                {/* Open target button */}
                {isRunning && instance.liveUrl && (
                    <a href={instance.liveUrl} target="_blank" rel="noopener noreferrer"
                        className="block w-full mb-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-semibold text-center transition-all flex items-center justify-center gap-2">
                        <ExternalLink size={16} /> Open Target in Browser
                    </a>
                )}

                {/* Flag submission */}
                {!submitSuccess && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
                        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Flag size={14} className="text-cyan-400" /> Submit Flag
                        </h2>
                        <div className="flex gap-3">
                            <input
                                value={flag}
                                onChange={e => setFlag(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && submitFlag()}
                                placeholder="SHERK{...}"
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50"
                            />
                            <button onClick={submitFlag}
                                className="px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors">
                                Submit
                            </button>
                        </div>
                        {submitMsg && (
                            <p className="mt-2 text-sm text-red-400">{submitMsg}</p>
                        )}
                    </div>
                )}

                {submitSuccess && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-5 mb-4 flex items-center gap-4">
                        <CheckCircle size={24} className="text-green-400 flex-shrink-0" />
                        <div>
                            <p className="text-green-300 font-bold">{submitMsg}</p>
                            <p className="text-gray-400 text-xs mt-0.5">Your solve has been recorded on the leaderboard.</p>
                        </div>
                    </div>
                )}

                {/* Stop instance */}
                <button onClick={stopInstance} disabled={stopping}
                    className="w-full py-3 rounded-2xl border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    <StopCircle size={14} />
                    {stopping ? 'Stopping...' : 'Terminate Instance'}
                </button>
                <p className="text-center text-gray-600 text-xs mt-2">Container auto-destroys when time expires</p>
            </div>
        </div>
    );
};

export default LabInstance;
