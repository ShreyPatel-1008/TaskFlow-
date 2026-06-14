import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, CheckCircle2, UserPlus, AlertCircle } from 'lucide-react';

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
                else if (status === 400) setError('This invite has already been accepted.');
                else setError('Something went wrong. Please check your link.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvite();
    }, [token]);

    const handleAccept = async () => {
        if (!isAuthenticated) {
            navigate(`/login?redirect=/invite/${token}`);
            return;
        }

        setAccepting(true);
        try {
            const response = await API.post(`/invites/${token}/accept`);
            
            // Fetch workspace access and switch locally before navigation.
            // This prevents reloading the page on the used invite token.
            const switchResponse = await API.post(`/workspaces/${response.data.workspaceId}/switch`);
            const newWs = switchResponse.data.workspace;
            newWs.role = switchResponse.data.role;
            localStorage.setItem('activeWorkspace', JSON.stringify(newWs));

            window.location.href = '/';
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to join workspace';
            setError(message);
        } finally {
            setAccepting(false);
        }
    };

    if (loading) return (
        <div className="auth-layout-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="auth-container" style={{ display: 'flex', justifyContent: 'center' }}>
                <div className="spinner" />
            </div>
        </div>
    );

    if (error) return (
        <div className="auth-layout-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                <AlertCircle size={48} style={{ color: 'var(--color-danger)', margin: '0 auto 16px' }} />
                <h2 style={{ margin: '0 0 8px', fontSize: '1.375rem' }}>
                    {error === 'This invite has already been accepted.' ? 'Already Joined!' : 'Invite Error'}
                </h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                    {error === 'This invite has already been accepted.'
                        ? 'You have already joined this workspace. You can close this window or continue to your dashboard.'
                        : error}
                </p>
                <button onClick={() => navigate('/')} className="btn btn-primary" style={{ width: '100%' }}>
                    Go to Dashboard
                </button>
            </div>
        </div>
        </div>
    );

    return (
        <div className="auth-layout-wrapper" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div className="auth-container">
                <div className="auth-card" style={{ textAlign: 'center' }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '20px',
                    background: 'var(--color-info-bg)', color: 'var(--color-info)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', transform: 'rotate(3deg)',
                    transition: 'transform var(--transition-fast)'
                }}>
                    <UserPlus size={36} />
                </div>
                
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px' }}>Collaboration Awaits!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' }}>
                    <strong>{inviteData.inviterName}</strong> has invited you to join
                    <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}> "{inviteData.workspaceName}"</span>.
                </p>

                <div style={{
                    background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)',
                    padding: '14px 16px', marginBottom: '24px',
                    display: 'flex', alignItems: 'flex-start', gap: '10px', textAlign: 'left'
                }}>
                    <CheckCircle2 size={18} style={{ color: 'var(--color-info)', flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-info)', margin: 0 }}>
                        Joining will give you access to all tasks and shared resources within this workspace.
                    </p>
                </div>

                <button 
                    onClick={handleAccept}
                    disabled={accepting}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                >
                    {accepting ? 'Joining Workspace...' : isAuthenticated ? 'Accept & Join Team' : 'Sign in to Accept Invite'}
                </button>
                {!isAuthenticated && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                        Don't have an account?{' '}
                        <span
                            style={{ color: 'var(--accent-primary)', fontWeight: 700, cursor: 'pointer' }}
                            onClick={() => navigate(`/register?redirect=/invite/${token}`)}
                        >
                            Register here
                        </span>
                    </p>
                )}
            </div>
        </div>
        </div>
    );
};

export default AcceptInvite;
