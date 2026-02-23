import React, { useState } from 'react';
import { Terminal, Lock, ServerCrash, Cpu, Shield } from 'lucide-react';
import { LinuxLabView } from '../components/LinuxLabView';

export const Labs: React.FC = () => {
    const [labActive, setLabActive] = useState(false);
    const [labPassed, setLabPassed] = useState(false);

    return (
        <div className="min-h-[calc(100vh-80px)] w-full py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col pt-24 animate-in fade-in zoom-in-95 duration-700">
            {/* Header Section */}
            <div className="mb-12 border-b border-cyan-500/20 pb-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-10 animate-pulse-slow"></div>
                <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 cyber-border">
                        <Terminal size={32} className="text-cyan-400" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 font-orbitron tracking-wider">
                            LIVE OPERATIONS LAB
                        </h1>
                        <p className="text-gray-400 mt-2 text-sm sm:text-base max-w-2xl font-mono">
                            <span className="text-cyan-400 animate-pulse">&gt;_</span> Warning: This is a live execution environment connected to the Sherk Academy infrastructure. All commands are logged.
                        </p>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {!labActive && !labPassed ? (
                <div className="grid md:grid-cols-2 gap-8 items-center h-full">
                    <div className="space-y-6">
                        <div className="glass-premium p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <h2 className="text-2xl font-bold text-white font-orbitron mb-4 flex items-center gap-3">
                                <Lock className="text-purple-400" /> Objective: System Recon
                            </h2>
                            <p className="text-gray-300 mb-4 leading-relaxed">
                                Your mission is to gain a foothold on the remote system, explore the file system, and retrieve the hidden authentication flag.
                            </p>
                            <div className="bg-[#0a0f16] p-4 rounded-xl font-mono text-sm text-gray-400 border border-white/5">
                                <span className="text-green-400">Target:</span> academy-vpn.internal<br />
                                <span className="text-green-400">OS:</span> Linux (Ubuntu 22.04 LTS)<br />
                                <span className="text-green-400">Authorization:</span> Level 1 (Operative)<br />
                            </div>
                        </div>

                        <button
                            onClick={() => setLabActive(true)}
                            className="premium-button w-full sm:w-auto h-14 text-lg animate-cyber-border-anim group mx-auto md:mx-0 flex items-center justify-center gap-3"
                        >
                            INITIATE CONNECTION <ServerCrash size={20} className="group-hover:animate-bounce" />
                        </button>
                    </div>

                    <div className="hidden md:flex justify-center items-center opacity-40">
                        <div className="relative w-full aspect-square max-w-md">
                            <div className="absolute inset-0 border-[1px] border-cyan-500/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
                            <div className="absolute inset-4 border-[1px] border-purple-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                            <div className="absolute inset-8 border-[1px] border-blue-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
                            <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-cyan-400/50" />
                        </div>
                    </div>
                </div>
            ) : labPassed ? (
                <div className="flex flex-col items-center justify-center p-12 glass-premium rounded-2xl border border-green-500/30 text-center animate-in zoom-in-95 duration-500">
                    <Shield size={64} className="text-green-400 mb-6 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                    <h2 className="text-3xl font-black font-orbitron text-white mb-4 shadow-green-500/50 text-shadow-sm">MISSION ACCOMPLISHED</h2>
                    <p className="text-gray-300 text-lg mb-8 max-w-lg">
                        You have successfully navigated the system and extracted the flag. Your operative clearance has been recorded.
                    </p>
                    <button
                        onClick={() => { setLabActive(false); setLabPassed(false); }}
                        className="premium-button bg-black text-green-400 border-green-500/50 hover:bg-green-500/10"
                    >
                        RETURN TO BRIEFING
                    </button>
                </div>
            ) : (
                <div className="w-full h-full flex flex-col relative">
                    <button
                        onClick={() => setLabActive(false)}
                        className="absolute -top-10 right-0 text-sm font-mono text-gray-500 hover:text-red-400 transition-colors"
                    >
                        [ ABORT CONNECTION ]
                    </button>
                    <LinuxLabView onComplete={(passed) => setLabPassed(passed)} />
                </div>
            )}
        </div>
    );
};
