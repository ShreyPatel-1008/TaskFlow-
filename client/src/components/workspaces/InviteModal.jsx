import React, { useState } from 'react';
import { X, Mail, Shield, User as UserIcon } from 'lucide-react';

const InviteModal = ({ isOpen, onClose, onInvite }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onInvite(email, role);
            setEmail('');
            onClose();
        } catch (err) {
            // Error toast handled in hook
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Invite Team Member</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 block">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                autoFocus
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 block">Role</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('member')}
                                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                    role === 'member' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 hover:border-gray-200 text-gray-600'
                                }`}
                            >
                                <UserIcon size={18} />
                                <div className="text-left">
                                    <div className="font-bold text-sm">Member</div>
                                    <div className="text-xs opacity-70">Can edit tasks</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('admin')}
                                className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                    role === 'admin' ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-100 hover:border-gray-200 text-gray-600'
                                }`}
                            >
                                <Shield size={18} />
                                <div className="text-left">
                                    <div className="font-bold text-sm">Admin</div>
                                    <div className="text-xs opacity-70">Can invite/remove</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-200"
                        >
                            {loading ? 'Sending...' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteModal;
