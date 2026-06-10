import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePermission } from '../../hooks/usePermission';
import RoleBadge from '../RoleBadge';
import { ChevronDown, Plus, Layout, Check, Settings } from 'lucide-react';
import { useRef, useEffect } from 'react';

const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const { can } = usePermission();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!showModal) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [showModal]);

    const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createWorkspace(newName);
    setNewName('');
    setShowModal(false);
    setIsOpen(false);
  };

    return (
        <div className="ws-switcher-wrap" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="ws-switcher-btn"
                aria-label="Switch Workspace"
            >
                <Layout size={16} className="ws-switcher-icon" />
                <span className="ws-switcher-name">
                    {activeWorkspace?.name || 'Select Workspace'}
                </span>
                <ChevronDown size={14} className={`ws-switcher-chevron ${isOpen ? 'open' : ''}`} />
            </button>

            {isOpen && (
                <div className="ws-dropdown">
                    <div className="ws-dropdown-header">
                        Workspaces
                    </div>
                    <div className="ws-dropdown-list">
                        {workspaces.map((ws) => (
                            <button
                                key={ws._id}
                                onClick={() => {
                                    switchWorkspace(ws._id);
                                    setIsOpen(false);
                                }}
                                className="ws-dropdown-item"
                            >
                                <div className="ws-item-left">
                                    <div className="ws-item-avatar">
                                        {ws.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="ws-item-info">
                                        <span className="ws-item-name">{ws.name}</span>
                                        <RoleBadge role={ws.role} size="xs" />
                                    </div>
                                </div>
                                {activeWorkspace?._id === ws._id && <Check size={16} className="ws-item-check" />}
                            </button>
                        ))}
                    </div>
                    
                    <div className="ws-dropdown-actions">
                        {can('manageWorkspace') && (
                            <button
                                onClick={() => { navigate('/members'); setIsOpen(false); }}
                                className="ws-action-btn"
                            >
                                <Settings size={14} />
                                <span>Manage Team</span>
                            </button>
                        )}
                        <button
                            onClick={() => { setShowModal(true); setIsOpen(false); }}
                            className="ws-action-btn ws-create-btn"
                        >
                            <Plus size={14} />
                            <span>Create Workspace</span>
                        </button>
                    </div>
                </div>
            )}

            {showModal && createPortal(
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal ws-create-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">New Workspace</h2>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="ws-create-name">
                                    Workspace name
                                </label>
                                <input
                                    id="ws-create-name"
                                    autoFocus
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="E.g. Engineering Team, Marketing"
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default WorkspaceSwitcher;
