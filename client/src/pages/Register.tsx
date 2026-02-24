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
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl border border-gray-700 w-full max-w-md">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-gray-700 p-3 rounded-full mb-3">
                        <UserPlus className="text-cyan-400 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">New Operative</h2>
                    <p className="text-gray-400 text-sm mt-1">Clearance Request</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4 text-sm text-center">
                        {success}
                        <div className="mt-4">
                            <Link to="/login" className="w-full inline-block bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded transition-all transform active:scale-95 text-center">
                                Proceed to Login
                            </Link>
                        </div>
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-400 text-sm mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded transition-all transform active:scale-95 mt-4"
                        >
                            Submit Application
                        </button>
                    </form>
                )}

                <p className="text-center mt-6 text-gray-500 text-sm">
                    Already have an account? <Link to="/login" className="text-cyan-400 hover:underline">Login here</Link>
                </p>
            </div>
        </div>
    );
};
