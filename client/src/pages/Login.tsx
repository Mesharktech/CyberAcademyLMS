import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { auth, googleProvider } from '../services/firebase';
import { signInWithPopup } from 'firebase/auth';

export const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Check if user just verified their email
    const queryParams = new URLSearchParams(location.search);
    const isVerified = queryParams.get('verified') === 'true';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            login(response.data.token, response.data.user);
            setSuccess(`Welcome back, ${response.data.user.username}! Redirecting...`);
            setTimeout(() => navigate('/'), 1500);
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'response' in err) {
                const axiosError = err as { response?: { data?: { error?: string } } };
                setError(axiosError.response?.data?.error || 'Login failed');
            } else {
                setError('Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setError('');
            setSuccess('');
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            const response = await api.post('/auth/google', { idToken });
            login(response.data.token, response.data.user);

            setSuccess(`Welcome, ${response.data.user.username}! Redirecting...`);
            setTimeout(() => navigate('/'), 1500);
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
                        <Lock className="text-cyan-400 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white">Access Verification</h2>
                    <p className="text-gray-400 text-sm mt-1">Sherk Academy Secure Login</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4 text-sm text-center">
                        {success}
                    </div>
                )}

                {isVerified && !error && !success && (
                    <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4 text-sm text-center">
                        Identity verified successfully. You may now authenticate.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-400 text-sm mb-1">Email Address or Username</label>
                        <input
                            type="text"
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
                        className={`w-full text-white font-bold py-2 px-4 rounded transition-all transform ${isLoading
                                ? 'bg-gray-600 cursor-not-allowed opacity-70 animate-pulse'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-95'
                            }`}
                    >
                        {isLoading ? 'Authenticating...' : 'Authenticate'}
                    </button>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-800 text-gray-400">Or continue with</span>
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

                <p className="text-center mt-6 text-gray-500 text-sm">
                    New system user? <Link to="/register" className="text-cyan-400 hover:underline">Initialize Request</Link>
                </p>
            </div>
        </div>
    );
};
