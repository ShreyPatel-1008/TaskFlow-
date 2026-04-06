import React, { useState } from 'react';
import { X, Type, Hash, List, Calendar, ToggleLeft } from 'lucide-react';

const TYPE_OPTIONS = [
  { value: 'text', icon: Type, label: 'Text' },
  { value: 'number', icon: Hash, label: 'Number' },
  { value: 'select', icon: List, label: 'Select' },
  { value: 'date', icon: Calendar, label: 'Date' },
  { value: 'checkbox', icon: ToggleLeft, label: 'Checkbox' },
];

const CustomFieldModal = ({ field, onSave, onClose }) => {
  const isEdit = !!field;
  const [name, setName] = useState(field?.name || '');
  const [type, setType] = useState(field?.type || 'text');
  const [options, setOptions] = useState(field?.options || []);
  const [optionInput, setOptionInput] = useState('');
  const [defaultValue, setDefaultValue] = useState(field?.defaultValue ?? '');
  const [required, setRequired] = useState(field?.required || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addOption = () => {
    const trimmed = optionInput.trim();
    if (!trimmed || options.includes(trimmed)) return;
    setOptions([...options, trimmed]);
    setOptionInput('');
  };

  const removeOption = (opt) => {
    setOptions(options.filter(o => o !== opt));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required');
    if (type === 'select' && options.length < 2) return setError('Select must have at least 2 options');

    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        type,
        options: type === 'select' ? options : [],
        defaultValue: defaultValue || null,
        required
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf-modal-overlay" onClick={onClose}>
      <div className="pf-modal" onClick={e => e.stopPropagation()}>
        <div className="pf-modal-header">
          <h3>{isEdit ? 'Edit Field' : 'Add Custom Field'}</h3>
          <button className="pf-modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="pf-modal-body">
          {error && <div className="pf-error">{error}</div>}

          {/* Name */}
          <div className="pf-field-row">
            <label className="pf-field-label">Field Name</label>
            <input
              type="text"
              className="pf-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Sprint, Campaign, Deal Size"
              autoFocus
            />
          </div>

          {/* Type selector */}
          {!isEdit && (
            <div className="pf-field-row">
              <label className="pf-field-label">Type</label>
              <div className="pf-type-group">
                {TYPE_OPTIONS.map(({ value, icon: Icon, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={`pf-type-btn${type === value ? ' active' : ''}`}
                    onClick={() => setType(value)}
                  >
                    <Icon size={14} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Options (select only) */}
          {type === 'select' && (
            <div className="pf-field-row">
              <label className="pf-field-label">Options</label>
              <div className="pf-tags-input">
                {options.map(opt => (
                  <span key={opt} className="pf-tag">
                    {opt}
                    <button type="button" onClick={() => removeOption(opt)}><X size={10} /></button>
                  </span>
                ))}
                <input
                  type="text"
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                  placeholder="Type and press Enter"
                  className="pf-tags-inner-input"
                />
              </div>
            </div>
          )}

          {/* Default value */}
          <div className="pf-field-row">
            <label className="pf-field-label">Default Value</label>
            {type === 'checkbox' ? (
              <label className="pf-checkbox-wrap">
                <input type="checkbox" checked={!!defaultValue} onChange={e => setDefaultValue(e.target.checked)} />
                <span className="pf-checkbox-label">{defaultValue ? 'Checked' : 'Unchecked'}</span>
              </label>
            ) : type === 'date' ? (
              <input type="date" className="pf-input" value={defaultValue || ''} onChange={e => setDefaultValue(e.target.value)} />
            ) : type === 'select' ? (
              <select className="pf-input" value={defaultValue || ''} onChange={e => setDefaultValue(e.target.value)}>
                <option value="">None</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={type === 'number' ? 'number' : 'text'}
                className="pf-input"
                value={defaultValue || ''}
                onChange={e => setDefaultValue(type === 'number' ? Number(e.target.value) : e.target.value)}
              />
            )}
          </div>

          {/* Required toggle */}
          <label className="pf-toggle-row">
            <span>Required field</span>
            <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} className="pf-toggle" />
          </label>

          <button type="submit" className="pf-save-btn" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Field' : 'Create Field'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CustomFieldModal;
