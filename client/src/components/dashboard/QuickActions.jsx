import React from 'react';
import { useNavigate } from 'react-router-dom';
import PermissionGate from '../PermissionGate';
import { Plus, UserPlus, ClipboardList, LayoutList } from 'lucide-react';

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="dash-quick-actions">
      <PermissionGate action="createTask">
        <button className="dash-qa-btn" onClick={() => navigate('/tasks?action=create')}>
          <Plus size={16} /> Create Task
        </button>
      </PermissionGate>

      <PermissionGate action="inviteMembers">
        <button className="dash-qa-btn" onClick={() => navigate('/members?action=invite')}>
          <UserPlus size={16} /> Invite Member
        </button>
      </PermissionGate>

      <button className="dash-qa-btn" onClick={() => navigate('/tasks?assignee=me')}>
        <ClipboardList size={16} /> My Tasks
      </button>

      <PermissionGate action="editTask" fallback={
        <button className="dash-qa-btn" onClick={() => navigate('/tasks?assignee=me')}>
          <LayoutList size={16} /> My Tasks
        </button>
      }>
        <button className="dash-qa-btn" onClick={() => navigate('/tasks')}>
          <LayoutList size={16} /> View All Tasks
        </button>
      </PermissionGate>
    </div>
  );
};

export default QuickActions;
