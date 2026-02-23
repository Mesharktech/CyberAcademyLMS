import React, { useState } from 'react';
import { CreditCard, Smartphone, X, Check, Loader, DollarSign, ShieldCheck } from 'lucide-react';
import api from '../services/api';

interface PaymentModalProps {
    courseId: string;
    courseTitle: string;
    price: number;
    onClose: () => void;
    onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ courseId, courseTitle, price, onClose, onSuccess }) => {
    const [tab, setTab] = useState<'paypal' | 'mpesa'>('paypal');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handlePayPal = async () => {
        setProcessing(true);
        setError('');
        try {
            // Step 1: Create PayPal order
            const createRes = await api.post('/payments/paypal/create', { courseId });
            const orderId = createRes.data.orderId;

            // Step 2: Capture (in production, user would approve on PayPal first)
            const captureRes = await api.post('/payments/paypal/capture', { courseId, orderId });

            if (captureRes.data.success) {
                setSuccess(true);
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'PayPal payment failed');
        } finally { setProcessing(false); }
    };

    const handleMpesa = async () => {
        if (!phone || phone.length < 9) {
            setError('Please enter a valid phone number');
            return;
        }
        setProcessing(true);
        setError('');
        try {
            const res = await api.post('/payments/mpesa/stkpush', { courseId, phoneNumber: phone });
            if (res.data.success) {
                setSuccess(true);
                setTimeout(() => onSuccess(), 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'M-Pesa payment failed');
        } finally { setProcessing(false); }
    };

    if (success) {
        return (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0d0d1a] border border-green-500/30 rounded-2xl p-10 max-w-md w-full text-center shadow-[0_0_80px_rgba(0,255,100,0.15)]">
                    <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-bounce">
                        <Check size={40} className="text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-400 font-orbitron mb-2">Payment Successful!</h2>
                    <p className="text-gray-400">You now have full access to <strong className="text-white">{courseTitle}</strong></p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 px-6 py-5 border-b border-white/10 flex justify-between items-start">
                    <div>
                        <h2 className="text-lg font-bold text-white font-orbitron">Enroll Now</h2>
                        <p className="text-gray-400 text-sm mt-1 line-clamp-1">{courseTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <X size={16} />
                    </button>
                </div>

                {/* Price */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Total Amount</span>
                    <span className="text-3xl font-bold text-white font-orbitron">
                        <span className="text-cyan-400">$</span>{price.toFixed(2)}
                    </span>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setTab('paypal')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === 'paypal' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <CreditCard size={16} /> PayPal
                    </button>
                    <button
                        onClick={() => setTab('mpesa')}
                        className={`flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${tab === 'mpesa' ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Smartphone size={16} /> M-Pesa
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mx-6 mt-4 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        {error}
                    </div>
                )}

                {/* Tab Content */}
                <div className="p-6 space-y-4">
                    {tab === 'paypal' && (
                        <>
                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                                <DollarSign className="mx-auto mb-2 text-cyan-400" size={32} />
                                <p className="text-gray-400 text-sm">Pay securely with PayPal. You'll be charged <strong className="text-white">${price.toFixed(2)}</strong>.</p>
                            </div>
                            <button
                                onClick={handlePayPal}
                                disabled={processing}
                                className="w-full py-3.5 rounded-xl bg-[#0070ba] hover:bg-[#003087] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-[#0070ba]/25"
                            >
                                {processing ? <Loader size={16} className="animate-spin" /> : <CreditCard size={16} />}
                                {processing ? 'Processing...' : `Pay $${price.toFixed(2)} with PayPal`}
                            </button>
                        </>
                    )}

                    {tab === 'mpesa' && (
                        <>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">M-Pesa Phone Number</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+254</span>
                                    <input
                                        type="tel"
                                        placeholder="7XX XXX XXX"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-14 pr-4 py-3 text-white focus:outline-none focus:border-green-500/50 transition-colors placeholder:text-gray-600"
                                    />
                                </div>
                            </div>
                            <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/10 text-center">
                                <p className="text-gray-400 text-xs">An STK push prompt will be sent to your phone. Enter PIN to confirm KES {Math.ceil(price * 130)} payment.</p>
                            </div>
                            <button
                                onClick={handleMpesa}
                                disabled={processing}
                                className="w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-green-600/25"
                            >
                                {processing ? <Loader size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                                {processing ? 'Sending STK Push...' : `Pay KES ${Math.ceil(price * 130)} via M-Pesa`}
                            </button>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 text-center">
                    <p className="text-gray-600 text-[10px] uppercase tracking-wider">🔒 Secured by Sherk Academy</p>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
