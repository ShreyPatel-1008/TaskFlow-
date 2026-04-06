const WorkspaceMember = require('../models/WorkspaceMember');
const User = require('../models/User');

/**
 * Extract raw @mention handles from comment text.
 * Pure function — no DB access, independently testable.
 *
 * @param {string} text  - The comment body
 * @returns {string[]}   - Unique lowercase handles, e.g. ['shrey', 'alex']
 */
const extractMentionHandles = (text) => {
    if (!text) return [];
    const matches = text.match(/@(\w+)/g);
    if (!matches) return [];

    // Strip the @ prefix and deduplicate
    const handles = [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
    return handles;
};

/**
 * Resolve raw handles to actual user IDs within a workspace.
 * Async — requires DB lookup.
 *
 * Matches handles against workspace members by:
 *   1. User's first name (case-insensitive)
 *   2. User's full name with spaces removed (case-insensitive)
 *
 * Unresolved handles are silently skipped — never throws.
 *
 * @param {string[]}  handles      - Array of lowercase handles from extractMentionHandles
 * @param {string}    workspaceId  - The workspace to search within
 * @returns {Promise<string[]>}    - Array of resolved user ObjectId strings
 */
const resolveMentions = async (handles, workspaceId) => {
    if (!handles.length || !workspaceId) return [];

    try {
        // Get all members of this workspace with their User docs
        const members = await WorkspaceMember.find({ workspaceId })
            .populate('userId', 'name email');

        const resolvedIds = [];

        for (const handle of handles) {
            const match = members.find(m => {
                if (!m.userId || !m.userId.name) return false;
                const name = m.userId.name.toLowerCase();
                const firstName = name.split(' ')[0];
                const nameNoSpaces = name.replace(/\s+/g, '');

                return (
                    firstName === handle ||
                    nameNoSpaces === handle ||
                    name === handle
                );
            });

            if (match) {
                resolvedIds.push(match.userId._id.toString());
            }
        }

        // Deduplicate
        return [...new Set(resolvedIds)];
    } catch (error) {
        console.error('resolveMentions error:', error);
        return [];
    }
};

module.exports = { extractMentionHandles, resolveMentions };
