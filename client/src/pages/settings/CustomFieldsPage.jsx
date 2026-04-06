import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import PermissionGate from '../../components/PermissionGate';
import CustomFieldModal from '../../components/CustomFieldModal';
import { Plus, Edit2, Trash2, Type, Hash, List, Calendar, ToggleLeft, GripVertical } from 'lucide-react';
import '../../styles/powerFeatures.css';

const TYPE_ICONS = {
  text: Type, number: Hash, select: List, date: Calendar, checkbox: ToggleLeft
};

const CustomFieldsPage = () => {
  const { activeWorkspace } = useWorkspace();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editField, setEditField] = useState(null);

  const fetchFields = async () => {
    if (!activeWorkspace?._id) return;
    try {
      const res = await API.get(`/workspaces/${activeWorkspace._id}/custom-fields`);
      setFields(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFields(); }, [activeWorkspace?._id]);

  const handleCreate = async (data) => {
    await API.post(`/workspaces/${activeWorkspace._id}/custom-fields`, data);
    fetchFields();
  };

  const handleUpdate = async (data) => {
    await API.patch(`/workspaces/${activeWorkspace._id}/custom-fields/${editField._id}`, data);
    setEditField(null);
    fetchFields();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this field? Values will be removed from all tasks.')) return;
    try {
      const res = await API.delete(`/workspaces/${activeWorkspace._id}/custom-fields/${id}`);
      alert(`Field deleted. ${res.data.affectedTasks} task(s) updated.`);
      fetchFields();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Custom Fields</h1>
          <p className="page-header-subtitle">Define custom data fields for tasks in this workspace</p>
        </div>
        <PermissionGate action="inviteMembers">
          <button className="pf-save-btn" onClick={() => { setEditField(null); setShowModal(true); }}>
            <Plus size={16} /> Add Field
          </button>
        </PermissionGate>
      </div>

      {loading ? (
        <div className="pf-loading">Loading custom fields...</div>
      ) : fields.length === 0 ? (
        <div className="pf-empty-page">
          <Type size={48} strokeWidth={1} />
          <h2>No custom fields yet</h2>
          <p>Custom fields let you track extra data on tasks — like Sprint, Priority Score, or Deal Size.</p>
          <PermissionGate action="inviteMembers">
            <button className="pf-save-btn" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Create First Field
            </button>
          </PermissionGate>
        </div>
      ) : (
        <div className="pf-fields-list">
          {fields.map((field, idx) => {
            const Icon = TYPE_ICONS[field.type] || Type;
            return (
              <div key={field._id} className="pf-field-card">
                <div className="pf-field-card-grip"><GripVertical size={14} /></div>
                <div className="pf-field-card-icon"><Icon size={16} /></div>
                <div className="pf-field-card-info">
                  <div className="pf-field-card-name">
                    {field.name}
                    {field.required && <span className="pf-required">*</span>}
                  </div>
                  <div className="pf-field-card-meta">
                    <span className="pf-type-badge">{field.type}</span>
                    {field.type === 'select' && field.options?.length > 0 && (
                      <span className="pf-options-preview">
                        {field.options.slice(0, 3).join(', ')}
                        {field.options.length > 3 && ` +${field.options.length - 3}`}
                      </span>
                    )}
                  </div>
                </div>
                <PermissionGate action="inviteMembers">
                  <div className="pf-field-card-actions">
                    <button onClick={() => { setEditField(field); setShowModal(true); }} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(field._id)} title="Delete" className="danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </PermissionGate>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <CustomFieldModal
          field={editField}
          onSave={editField ? handleUpdate : handleCreate}
          onClose={() => { setShowModal(false); setEditField(null); }}
        />
      )}
    </div>
  );
};

export default CustomFieldsPage;
