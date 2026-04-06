import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, CheckCircle2, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const AcceptInvite = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const [inviteData, setInviteData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        const fetchInvite = async () => {
            try {
                const response = await API.get(`/invites/${token}`);
                setInviteData(response.data);
            } catch (err) {
                const status = err.response?.status;
                if (status === 410) setError('This invite has expired.');
                else if (status === 404) setError('Invite not found.');
                else setError('Something went wrong. Please check your link.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvite();
    }, [token]);

    const handleAccept = async () => {
        if (!isAuthenticated) {
            // Save current URL for post-login redirect
            navigate(`/login?redirect=/invite/${token}`);
            return;
        }

        setAccepting(true);
        try {
            const response = await API.post(`/invites/${token}/accept`);
            toast.success(response.data.message);
            // Switch to the dynamic dashboard which will fetch the new workspace
            window.location.href = '/'; 
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to join workspace';
            toast.error(message);
            setError(message);
        } finally {
            setAccepting(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <RefreshCw className="animate-spin text-blue-600" size={32} />
        </div>
    );

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Error</h1>
                <p className="text-gray-600 mb-8">{error}</p>
                <button onClick={() => navigate('/')} className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200">
                    Go to Dashboard
                </button>
            </div>
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4 font-sans">
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border border-gray-100">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3 hover:rotate-0 transition-transform">
                    <UserPlus size={40} />
                </div>
                
                <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Collaboration Awaits!</h1>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                    <strong>{inviteData.inviterName}</strong> has invited you to join the team at <span className="text-blue-600 font-bold">"{inviteData.workspaceName}"</span>.
                </p>

                <div className="bg-blue-50 rounded-2xl p-4 mb-8 flex items-start text-left gap-3">
                    <CheckCircle2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
                    <p className="text-sm text-blue-800">
                        Joining will give you access to all tasks and shared resources within this workspace.
                    </p>
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-200 transform hover:-translate-y-0.5"
                    >
                        {accepting ? 'Joining Workspace...' : isAuthenticated ? 'Accept & Join Team' : 'Sign in to Accept Invite'}
                    </button>
                    {!isAuthenticated && (
                        <p className="text-xs text-gray-400">
                            Don't have an account? <span className="text-blue-600 font-bold cursor-pointer hover:underline" onClick={() => navigate(`/register?redirect=/invite/${token}`)}>Register here</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AcceptInvite;
