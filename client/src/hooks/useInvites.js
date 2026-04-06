import { useState, useEffect } from 'react';
import API from '../utils/api';
import toast from 'react-hot-toast';

export const useInvites = (workspaceId) => {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchInvites = async () => {
        if (!workspaceId) return;
        setLoading(true);
        try {
            const response = await API.get(`/invites/workspace/${workspaceId}`);
            setInvites(response.data);
        } catch (error) {
            console.error('Failed to fetch invites:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvites();
    }, [workspaceId]);

    const inviteMember = async (email, role) => {
        try {
            const response = await API.post('/invites', { email, role });
            setInvites([response.data, ...invites]);
            toast.success(`Invite sent to ${email}`);
            return response.data;
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to send invite';
            toast.error(message);
            throw error;
        }
    };

    const revokeInvite = async (token) => {
        try {
            await API.patch(`/invites/${token}/revoke`);
            setInvites(invites.filter(i => i.token !== token));
            toast.success('Invite revoked');
        } catch (error) {
            toast.error('Failed to revoke invite');
        }
    };

    return { invites, loading, inviteMember, revokeInvite, refresh: fetchInvites };
};
