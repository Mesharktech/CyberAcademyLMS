import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Shield, Cpu, Save, X } from 'lucide-react';

interface LinuxLabViewProps {
    onComplete: (passed: boolean) => void;
}

import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface TerminalLine {
    type: 'input' | 'output' | 'system';
    text: string;
}

export const LinuxLabView: React.FC<LinuxLabViewProps> = ({ onComplete }) => {
    const { user } = useAuth();
    const username = user?.username || 'root';
    const hostname = 'sherkacademy';
    const [lines, setLines] = useState<TerminalLine[]>([
        { type: 'system', text: 'Initializing secure container environment...' },
        { type: 'system', text: 'Connecting to Live Core (ssh user@academy.local)' },
        { type: 'system', text: 'Authentication successful. Type "help" or run standard bash commands.' }
    ]);
    const [input, setInput] = useState('');
    const [currentCwd, setCurrentCwd] = useState(''); // Empty defaults to backend sandbox
    const [nanoMode, setNanoMode] = useState(false);
    const [nanoFile, setNanoFile] = useState('');
    const [nanoContent, setNanoContent] = useState('');

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [lines]);

    const processCommand = async (cmd: string) => {
        const trimmed = cmd.trim();
        if (!trimmed) return;

        setLines(prev => [...prev, { type: 'input', text: `${username}@${hostname}:${currentCwd || '~'}$ ${cmd}` }]);

        const args = trimmed.split(' ');
        const baseCmd = args[0].toLowerCase();

        // Check clear locally
        if (baseCmd === 'clear') {
            setLines([]);
            return;
        }

        // Implement Nano interception
        if (baseCmd === 'nano') {
            const TARGET_FILE = args[1];
            if (!TARGET_FILE) {
                setLines(prev => [...prev, { type: 'output', text: 'nano: missing filename' }]);
                return;
            }

            try {
                // Fetch existing content if the file exists
                const res = await api.post('/labs/read', { filename: TARGET_FILE, cwd: currentCwd });
                setNanoContent(res.data.content || '');
            } catch (error) {
                // If it fails (e.g. permission denied or new file), default to empty
                setNanoContent('');
            }

            setNanoFile(TARGET_FILE);
            setNanoMode(true);
            return;
        }

        // Live API integration
        try {
            const res = await api.post('/labs/execute', { command: trimmed, cwd: currentCwd });
            const { output, cwd } = res.data;

            if (cwd) {
                setCurrentCwd(cwd);
            }

            if (output) {
                // Split lines to fit terminal view
                const outputLines = output.split('\n');
                outputLines.forEach((line: string) => {
                    if (line.trim()) {
                        setLines(prev => [...prev, { type: 'output', text: line }]);
                    }
                });
            }

            // Evaluate local win conditions for the module's flag (if any text contains the flag)
            if (output && output.includes("ME5H4RK_M4ST3R_K3Y")) {
                setLines(prev => [...prev, { type: 'system', text: '[+] FLAG FOUND. MODULE COMPLETE.' }]);
                if (onComplete) onComplete(true);
            }

        } catch (error: any) {
            let errorMsg = error.message;
            if (error.response) {
                errorMsg = `Server responded with ${error.response.status}: ${JSON.stringify(error.response.data)}`;
            } else if (error.request) {
                errorMsg = 'No response received from server. Check CORS or server status.';
            }
            setLines(prev => [...prev, { type: 'output', text: `bash: command failed or connection error - ${errorMsg}` }]);
        }
    };

    const saveNanoFile = async () => {
        try {
            await api.post('/labs/write', {
                filename: nanoFile,
                content: nanoContent,
                cwd: currentCwd
            });
            setNanoMode(false);
            setLines(prev => [...prev, { type: 'system', text: `[+] Saved ${nanoFile}` }]);
        } catch (error) {
            setNanoMode(false);
            setLines(prev => [...prev, { type: 'output', text: `nano: Failed to save ${nanoFile}. Permission denied or backend error.` }]);
        }
    };

    const cancelNano = () => {
        setNanoMode(false);
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        processCommand(input);
        setInput('');
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-5xl mx-auto rounded-xl overflow-hidden glass-premium border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.8)] font-mono animate-in fade-in zoom-in-95 duration-500">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1a1b26] border-b border-white/10">
                <div className="flex items-center gap-2">
                    <div className="flex space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="ml-4 text-xs text-gray-400 flex items-center gap-2">
                        <Terminal size={14} className="text-cyan-400" />
                        operative@academy-vpn:~
                    </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-purple-400/50">
                    <Shield size={14} /> SECURE SHELL
                </div>
            </div>

            {/* Terminal Body or Nano Mode */}
            {nanoMode ? (
                <div className="flex-grow flex flex-col bg-[#1e1e2e] text-[#cdd6f4] font-mono absolute inset-0 z-50 rounded-xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="bg-[#181825] py-2 px-4 flex justify-between items-center border-b border-[#313244] text-xs">
                        <span>GNU nano 6.2</span>
                        <span>File: {nanoFile || 'New Buffer'}</span>
                        <div className="flex gap-4">
                            <button onClick={saveNanoFile} className="flex items-center gap-1 hover:text-green-400 transition-colors"><Save size={14} /> Save (Ctrl+S)</button>
                            <button onClick={cancelNano} className="flex items-center gap-1 hover:text-red-400 transition-colors"><X size={14} /> Exit (Ctrl+X)</button>
                        </div>
                    </div>
                    <textarea
                        autoFocus
                        value={nanoContent}
                        onChange={(e) => setNanoContent(e.target.value)}
                        className="flex-grow bg-transparent border-none outline-none resize-none p-4 custom-scrollbar"
                        spellCheck={false}
                        onKeyDown={(e) => {
                            if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveNanoFile(); }
                            if (e.ctrlKey && e.key === 'x') { e.preventDefault(); cancelNano(); }
                        }}
                    />
                    <div className="bg-[#181825] py-2 px-4 flex gap-6 text-[10px] text-[#a6adc8] border-t border-[#313244]">
                        <span>^S Save</span>
                        <span>^X Exit</span>
                        <span>^C Cancel</span>
                    </div>
                </div>
            ) : (
                <div
                    className="flex-grow bg-[#0a0a0f] p-6 overflow-y-auto custom-scrollbar text-[#a9b1d6] text-sm relative"
                    onClick={() => inputRef.current?.focus()}
                >
                    {/* Intro Art */}
                    <pre className="text-cyan-400/80 text-[10px] sm:text-xs leading-tight mb-6">
                        {`   _____ __  __   __ __     __     __
  / ___/ / / /   / // /_ __/ /__  / /_
  \\__ \\ / /_/ /   // // / / / / / / / /
 ___/ // __  /   // // /_/ / / / / / / 
/____//_/ /_/   //_//____/_//_/ /_/_/  `}
                    </pre>

                    <div className="space-y-1 mb-4">
                        {lines.map((line, i) => (
                            <div key={i} className={`
                                ${line.type === 'system' ? 'text-purple-400/80 italic' :
                                    line.type === 'input' ? 'text-cyan-400 font-bold' :
                                        'text-[#9ece6a]'}
                            `}>
                                {line.text}
                            </div>
                        ))}
                    </div>

                    <form onSubmit={onSubmit} className="flex items-center gap-2 text-cyan-400 font-bold">
                        <span className="whitespace-nowrap">{username}@{hostname}:<span className="text-purple-400">{currentCwd || '~'}</span>$</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-grow bg-transparent border-none outline-none text-[#a9b1d6] font-normal w-full"
                            autoFocus
                            spellCheck={false}
                            autoComplete="off"
                        />
                    </form>
                    <div ref={bottomRef} className="h-4" />
                </div>
            )}

            {/* Terminal Footer Info */}
            <div className="bg-[#1a1b26] border-t border-white/5 py-2 px-4 flex justify-between items-center text-[10px] text-gray-500">
                <div className="flex items-center gap-2 text-cyan-400/50">
                    <Cpu size={12} className="animate-pulse" /> Node: thm-eu-west-1
                </div>
                <div>Find the secret flag to complete this lab.</div>
            </div>
        </div >
    );
};
