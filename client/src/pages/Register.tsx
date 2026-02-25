import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';

export const Register: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showOTP, setShowOTP] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            const res = await api.post('/auth/register', { email, password, username, firstName, lastName });
            if (res.data.requiresVerification) {
                setSuccess(res.data.message);
                setShowOTP(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleOTPVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const res = await api.post('/auth/verify-email', { email, code: otpCode });
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { error?: string } } };
                setError(axiosError.response?.data?.error || 'Verification failed. Invalid or expired code.');
            } else {
                setError('Verification failed');
            }
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setError('');
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            const response = await api.post('/auth/google', { idToken });
            login(response.data.token, response.data.user);

            setSuccess(`Welcome, ${response.data.user.username}! Redirecting...`);
            setTimeout(() => navigate('/'), 400);
        } catch (err: any) {
            console.error("=============== FIREBASE SSO ERROR ===============");
            console.error("Raw Error Object:", err);
            console.error("Error Code:", err?.code);
            console.error("Error Message:", err?.message);
            console.error("==================================================");

            if (err?.code === 'auth/popup-closed-by-user') {
                setError('Google sign-in popup was closed before finishing.');
            } else if (err?.code === 'auth/cancelled-popup-request') {
                setError('Multiple popups requested. Please try again.');
            } else {
                setError(`Google connection failed: ${err?.message || 'Unknown error'}`);
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

                {success && !showOTP && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4 text-sm text-center">
                        {success}
                        <div className="mt-4">
                            <Link to="/login" className="w-full inline-block bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-4 rounded transition-all transform active:scale-95 text-center">
                                Proceed to Login
                            </Link>
                        </div>
                    </div>
                )}

                {showOTP && (
                    <div className="space-y-4 fade-in">
                        <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4 text-sm text-center animate-pulse">
                            Transmission successful. Check your inbox for the clearance code.
                        </div>
                        <form onSubmit={handleOTPVerification} className="space-y-4">
                            <div>
                                <label className="block text-gray-400 text-sm mb-2 text-center tracking-widest uppercase">6-Digit Clearance Code</label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                                    className="w-full bg-black/60 border border-purple-500/50 rounded-lg px-4 py-4 text-white text-center text-3xl tracking-[0.5em] focus:outline-none focus:border-cyan-400 transition-colors font-mono placeholder:text-gray-700"
                                    required
                                    placeholder="••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3 px-4 rounded transition-all transform active:scale-95 shadow-lg shadow-purple-500/20"
                            >
                                Verify Identity
                            </button>
                        </form>
                    </div>
                )}

                {!success && !showOTP && (
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
                            disabled={isLoading}
                            className={`w-full text-white font-bold py-2 px-4 rounded transition-all transform mt-4 ${isLoading
                                ? 'bg-gray-600 cursor-not-allowed opacity-70 animate-pulse'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95'
                                }`}
                        >
                            {isLoading ? 'Transmitting Data...' : 'Submit Application'}
                        </button>

                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-gray-800 text-gray-400">Or sign up with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-full flex items-center justify-center gap-2 bg-white text-gray-900 hover:bg-gray-100 font-bold py-2 px-4 rounded transition-all transform active:scale-95"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 24c2.87 0 5.28-.95 7.04-2.58l-3.57-2.77c-.95.64-2.17 1.02-3.47 1.02-2.67 0-4.93-1.8-5.74-4.22H2.57v2.86C4.43 21.99 7.95 24 12 24z" />
                                <path fill="#FBBC05" d="M6.26 15.45c-.21-.64-.32-1.32-.32-2.01s.11-1.37.32-2.01V8.58H2.57C1.84 10.04 1.43 11.68 1.43 13.44s.41 3.4 1.14 4.86l3.69-2.85z" />
                                <path fill="#EA4335" d="M12 4.75c1.56 0 2.96.54 4.06 1.58l3.05-3.04C17.28 1.45 14.87.5 12 .5 7.95.5 4.43 2.53 2.57 6.25l3.69 2.86C7.07 6.55 9.33 4.75 12 4.75z" />
                            </svg>
                            Google
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
