import React from 'react';

/**
 * Small coloured pill showing the user's workspace role.
 *
 * Colours:
 *   admin  → indigo/purple  (high privilege)
 *   member → emerald/green  (standard)
 *   viewer → slate/gray     (read-only)
 */
const ROLE_STYLES = {
    admin: {
        bg: '#ede9fe',
        text: '#6d28d9',
        label: 'Admin',
    },
    member: {
        bg: '#d1fae5',
        text: '#059669',
        label: 'Member',
    },
    viewer: {
        bg: '#f1f5f9',
        text: '#64748b',
        label: 'Viewer',
    },
};

const RoleBadge = ({ role, size = 'sm' }) => {
    const style = ROLE_STYLES[role] || ROLE_STYLES.viewer;

    const sizeMap = {
        xs: { fontSize: '10px', padding: '1px 6px' },
        sm: { fontSize: '11px', padding: '2px 8px' },
        md: { fontSize: '12px', padding: '3px 10px' },
    };
    const s = sizeMap[size] || sizeMap.sm;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '6px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                backgroundColor: style.bg,
                color: style.text,
                ...s,
            }}
        >
            {style.label}
        </span>
    );
};

export default RoleBadge;
