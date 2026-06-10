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
        <div className="pf-modal-overlay" onClick={onClose}>
            <div className="pf-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                <div className="pf-modal-header">
                    <h3>Invite Team Member</h3>
                    <button className="pf-modal-close" onClick={onClose}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit} className="pf-modal-body">
                    <div className="pf-field-row">
                        <label className="pf-field-label">Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{
                                position: 'absolute', left: '12px', top: '50%',
                                transform: 'translateY(-50%)', color: 'var(--text-muted)'
                            }} />
                            <input
                                autoFocus
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pf-input"
                                style={{ paddingLeft: '36px' }}
                                placeholder="name@company.com"
                                required
                            />
                        </div>
                    </div>

                    <div className="pf-field-row">
                        <label className="pf-field-label">Role</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setRole('member')}
                                className={`pf-type-btn${role === 'member' ? ' active' : ''}`}
                                style={{ flexDirection: 'column', padding: '14px', gap: '4px' }}
                            >
                                <UserIcon size={18} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Member</div>
                                    <div style={{ fontSize: '0.6875rem', opacity: 0.7 }}>Can edit tasks</div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('admin')}
                                className={`pf-type-btn${role === 'admin' ? ' active' : ''}`}
                                style={{ flexDirection: 'column', padding: '14px', gap: '4px' }}
                            >
                                <Shield size={18} />
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Admin</div>
                                    <div style={{ fontSize: '0.6875rem', opacity: 0.7 }}>Can invite/remove</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="pf-save-btn secondary"
                            style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="pf-save-btn"
                            style={{ flex: 1, textAlign: 'center', justifyContent: 'center' }}
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
