import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

export const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const res = await api.post('/auth/register', { email, password, username, firstName, lastName });
            if (res.data.requiresVerification) {
                setSuccess(res.data.message);
            } else {
                // Fallback for legacy flow
                const loginRes = await api.post('/auth/login', { email, password });
                login(loginRes.data.token, loginRes.data.user);
                navigate('/');
            }
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { error?: string } } };
                setError(axiosError.response?.data?.error || 'Registration failed');
            } else {
                setError('Registration failed');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-black text-gray-200 font-sans selection:bg-hackon-red selection:text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-hackon-red opacity-5 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-hackon-green opacity-5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="glass-panel p-8 rounded-xl w-full max-w-md border border-white/5 relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white/5 p-4 rounded-full mb-4 border border-white/10">
                        <UserPlus className="text-hackon-red w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white font-orbitron tracking-wide">NEW OPERATIVE</h2>
                    <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest text-xs">Clearance Request</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-6 text-xs font-mono text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded mb-6 text-sm font-mono text-center">
                        {success}
                        <div className="mt-4">
                            <Link to="/login" className="premium-button inline-block text-xs py-2 px-4 shadow-lg shadow-hackon-green/20">PROCEED TO LOGIN</Link>
                        </div>
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wider">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-hackon-green transition-colors text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wider">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-hackon-green transition-colors text-sm"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wider">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-hackon-green transition-colors text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wider">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-hackon-green transition-colors text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-xs mb-1 uppercase tracking-wider">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-hackon-green transition-colors text-sm"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="hackon-button w-full py-3 mt-4 rounded font-bold shadow-lg shadow-red-900/20"
                        >
                            SUBMIT APPLICATION
                        </button>
                    </form>
                )}

                <p className="text-center mt-6 text-gray-500 text-xs font-mono">
                    Already authenticated? <Link to="/login" className="text-hackon-green hover:text-white transition-colors">ACCESS TERMINAL</Link>
                </p>
            </div>
        </div>
    );
};
