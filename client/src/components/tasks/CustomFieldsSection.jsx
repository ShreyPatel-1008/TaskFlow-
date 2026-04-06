import React, { useState, useEffect, useRef, useCallback } from 'react';
import API from '../../utils/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Settings2 } from 'lucide-react';

const CustomFieldsSection = ({ taskId, taskCustomFields = [], onUpdate }) => {
  const { activeWorkspace } = useWorkspace();
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const debounceTimers = useRef({});

  // Fetch workspace custom field definitions
  useEffect(() => {
    if (!activeWorkspace?._id) return;
    const fetchFields = async () => {
      try {
        const res = await API.get(`/workspaces/${activeWorkspace._id}/custom-fields`);
        setFields(res.data);
      } catch (err) {
        console.error('Failed to fetch custom fields:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFields();
  }, [activeWorkspace?._id]);

  // Initialize values from task data
  useEffect(() => {
    const map = {};
    (taskCustomFields || []).forEach(cf => {
      if (cf.fieldId) map[cf.fieldId.toString ? cf.fieldId.toString() : cf.fieldId] = cf.value;
    });
    setValues(map);
  }, [taskCustomFields]);

  const saveField = useCallback(async (fieldId, value) => {
    try {
      await API.patch(`/tasks/${taskId}/custom-fields`, {
        fields: [{ fieldId, value }]
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to save custom field:', err);
    }
  }, [taskId, onUpdate]);

  const handleChange = useCallback((fieldId, value) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));

    // Debounce save
    if (debounceTimers.current[fieldId]) {
      clearTimeout(debounceTimers.current[fieldId]);
    }
    debounceTimers.current[fieldId] = setTimeout(() => {
      saveField(fieldId, value);
    }, 500);
  }, [saveField]);

  if (loading) {
    return (
      <div className="pf-section">
        <div className="pf-section-header"><Settings2 size={14} /> Custom Fields</div>
        <div className="pf-loading">Loading...</div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="pf-section">
        <div className="pf-section-header"><Settings2 size={14} /> Custom Fields</div>
        <p className="pf-empty">No custom fields yet — add them in Workspace Settings</p>
      </div>
    );
  }

  return (
    <div className="pf-section">
      <div className="pf-section-header"><Settings2 size={14} /> Custom Fields</div>
      <div className="pf-fields-grid">
        {fields.map(field => {
          const val = values[field._id] ?? field.defaultValue ?? '';
          return (
            <div key={field._id} className="pf-field-row">
              <label className="pf-field-label">
                {field.name}
                {field.required && <span className="pf-required">*</span>}
              </label>
              {field.type === 'text' && (
                <input
                  type="text"
                  className="pf-input"
                  value={val || ''}
                  onChange={e => handleChange(field._id, e.target.value)}
                  placeholder={`Enter ${field.name}`}
                />
              )}
              {field.type === 'number' && (
                <input
                  type="number"
                  className="pf-input"
                  value={val ?? ''}
                  onChange={e => handleChange(field._id, e.target.value ? Number(e.target.value) : null)}
                />
              )}
              {field.type === 'select' && (
                <select
                  className="pf-input"
                  value={val || ''}
                  onChange={e => handleChange(field._id, e.target.value)}
                >
                  <option value="">Select...</option>
                  {(field.options || []).map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {field.type === 'date' && (
                <input
                  type="date"
                  className="pf-input"
                  value={val ? val.split('T')[0] : ''}
                  onChange={e => handleChange(field._id, e.target.value)}
                />
              )}
              {field.type === 'checkbox' && (
                <label className="pf-checkbox-wrap">
                  <input
                    type="checkbox"
                    checked={!!val}
                    onChange={e => handleChange(field._id, e.target.checked)}
                  />
                  <span className="pf-checkbox-label">{val ? 'Yes' : 'No'}</span>
                </label>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomFieldsSection;
