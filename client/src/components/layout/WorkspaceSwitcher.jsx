import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePermission } from '../../hooks/usePermission';
import RoleBadge from '../RoleBadge';
import { ChevronDown, Plus, Layout, Check, Settings } from 'lucide-react';

const WorkspaceSwitcher = () => {
  const { workspaces, activeWorkspace, switchWorkspace, createWorkspace } = useWorkspace();
  const { can } = usePermission();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await createWorkspace(newName);
    setNewName('');
    setShowModal(false);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Layout className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-sm truncate max-w-[150px]">
          {activeWorkspace?.name || 'Select Workspace'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
              Workspaces
            </div>
            <div className="max-h-60 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => switchWorkspace(ws._id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                      {ws.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col items-start">
                      <span>{ws.name}</span>
                      <RoleBadge role={ws.role} size="xs" />
                    </div>
                  </div>
                  {activeWorkspace?._id === ws._id && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
            {can('manageWorkspace') && (
              <button
                onClick={() => { navigate('/members'); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 border-t border-gray-100"
              >
                <Settings className="w-4 h-4" />
                <span>Manage Team</span>
              </button>
            )}
            <button
              onClick={() => { setShowModal(true); setIsOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 border-t border-gray-100"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4">New Workspace</h2>
            <form onSubmit={handleCreate}>
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="E.g. Engineering Team, Marketing"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                required
              />
              <div className="flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSwitcher;
