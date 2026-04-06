import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useInvites } from '../../hooks/useInvites';
import { usePermission } from '../../hooks/usePermission';
import PermissionGate from '../../components/PermissionGate';
import RoleBadge from '../../components/RoleBadge';
import InviteModal from '../../components/workspaces/InviteModal';
import { UserPlus, Shield, User as UserIcon, Trash2, Clock, Mail, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const Members = () => {
    const { activeWorkspace } = useWorkspace();
    const { user: currentUser } = useAuth();
    const { invites, inviteMember, revokeInvite, loading: invitesLoading } = useInvites(activeWorkspace?._id);
    const { can, role: myRole } = usePermission();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const fetchMembers = async () => {
        if (!activeWorkspace) return;
        try {
            const response = await API.get(`/workspaces/${activeWorkspace._id}/members`);
            setMembers(response.data);
        } catch (error) {
            // 403 = removed from workspace while it was active
            if (error.response?.status === 403) {
                toast.error('You no longer have access to this workspace');
                window.location.href = '/';
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [activeWorkspace]);

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Are you sure you want to remove this member?')) return;
        try {
            await API.delete(`/workspaces/${activeWorkspace._id}/members/${userId}`);
            setMembers(members.filter(m => m.userId._id !== userId));
            toast.success('Member removed');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await API.patch(
                `/workspaces/${activeWorkspace._id}/members/${userId}`,
                { role: newRole }
            );
            setMembers(members.map(m =>
                m.userId._id === userId ? { ...m, role: newRole } : m
            ));
            toast.success('Role updated');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to change role');
        }
    };

    const isOwner = (member) => activeWorkspace?.ownerId === member.userId._id;
    const isMe = (member) => currentUser?._id === member.userId._id;

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div className="spinner" />
        </div>
    );

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Team Members</h1>
                    <p style={{ color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        Manage who has access to <strong>{activeWorkspace?.name}</strong>
                    </p>
                </div>
                <PermissionGate action="inviteMembers">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <UserPlus size={18} />
                        Invite Member
                    </button>
                </PermissionGate>
            </div>

            {/* Current Members */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserIcon size={18} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontWeight: 700 }}>Active Members</span>
                    <span style={{ marginLeft: '8px', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{members.length}</span>
                </div>

                {members.map((member) => (
                    <div
                        key={member._id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 20px',
                            borderBottom: '1px solid var(--border-light)',
                            background: isMe(member) ? 'var(--bg-input)' : 'transparent',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: 'var(--bg-input)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontWeight: 700, fontSize: '14px',
                            }}>
                                {member.userId.avatar
                                    ? <img src={member.userId.avatar} style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} />
                                    : member.userId.name?.charAt(0).toUpperCase()
                                }
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {member.userId.name}
                                    {isMe(member) && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(you)</span>}
                                    {isOwner(member) && <span style={{ fontSize: '10px', background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>OWNER</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{member.userId.email}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Role display or dropdown (admin only) */}
                            <PermissionGate
                                action="changeRoles"
                                fallback={<RoleBadge role={member.role} />}
                            >
                                {isOwner(member) ? (
                                    <RoleBadge role={member.role} />
                                ) : (
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleRoleChange(member.userId._id, e.target.value)}
                                        style={{
                                            padding: '4px 8px', borderRadius: '6px', fontSize: '12px',
                                            fontWeight: 600, border: '1px solid var(--border-light)',
                                            background: 'var(--bg-input)', cursor: 'pointer',
                                        }}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="member">Member</option>
                                        <option value="viewer">Viewer</option>
                                    </select>
                                )}
                            </PermissionGate>

                            {/* Remove button — admin only, can't remove self or owner */}
                            <PermissionGate action="removeMembers">
                                {!isMe(member) && !isOwner(member) && (
                                    <button
                                        onClick={() => handleRemoveMember(member.userId._id)}
                                        className="btn btn-ghost btn-icon btn-sm"
                                        style={{ color: 'var(--color-danger)' }}
                                        title="Remove member"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </PermissionGate>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pending Invites */}
            <PermissionGate action="inviteMembers">
                {invites.length > 0 && (
                    <div className="card">
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={18} style={{ color: '#f59e0b' }} />
                            <span style={{ fontWeight: 700 }}>Pending Invitations</span>
                        </div>

                        {invites.map((invite) => (
                            <div key={invite._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Mail size={18} style={{ color: '#f59e0b' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{invite.invitedEmail}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            Sent {new Date(invite.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <RoleBadge role={invite.role} size="xs" />
                                    <button
                                        onClick={() => revokeInvite(invite.token)}
                                        style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
                                    >
                                        Revoke
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PermissionGate>

            <InviteModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                onInvite={inviteMember}
            />
        </div>
    );
};

export default Members;
