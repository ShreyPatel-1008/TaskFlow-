import React, { useState } from 'react';
import API from '../../utils/api';
import { Repeat, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const RecurrenceSettings = ({ task, onUpdate }) => {
  const rec = task?.recurrence || {};
  const [enabled, setEnabled] = useState(rec.enabled || false);
  const [frequency, setFrequency] = useState(rec.frequency || 'daily');
  const [interval, setInterval] = useState(rec.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(rec.daysOfWeek || []);
  const [dayOfMonth, setDayOfMonth] = useState(rec.dayOfMonth || 1);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day) => {
    setDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (enabled) {
        await API.patch(`/tasks/${task._id}/recurrence`, {
          frequency, interval, daysOfWeek, dayOfMonth
        });
      } else {
        await API.delete(`/tasks/${task._id}/recurrence`);
      }
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Recurrence save failed:', err);
      alert(err.response?.data?.message || 'Failed to save recurrence');
    } finally {
      setSaving(false);
    }
  };

  // Preview text
  let preview = '';
  if (enabled && rec.nextRunAt) {
    try {
      preview = `Next run: ${format(new Date(rec.nextRunAt), 'EEEE, d MMMM')}`;
    } catch (e) { preview = ''; }
  }

  return (
    <div className="pf-section">
      <div className="pf-section-header"><Repeat size={14} /> Recurrence</div>

      <label className="pf-toggle-row">
        <span>Repeat this task</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="pf-toggle"
        />
      </label>

      {enabled && (
        <div className="pf-recurrence-body">
          {/* Frequency */}
          <div className="pf-segmented">
            {['daily', 'weekly', 'monthly'].map(f => (
              <button
                key={f}
                className={`pf-seg-btn${frequency === f ? ' active' : ''}`}
                onClick={() => setFrequency(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Interval */}
          <div className="pf-field-row compact">
            <label className="pf-field-label">Every</label>
            <div className="pf-inline">
              <input
                type="number"
                className="pf-input small"
                min={1}
                max={30}
                value={interval}
                onChange={e => setInterval(Number(e.target.value) || 1)}
              />
              <span className="pf-field-label">{frequency === 'daily' ? 'day(s)' : frequency === 'weekly' ? 'week(s)' : 'month(s)'}</span>
            </div>
          </div>

          {/* Weekly: day picker */}
          {frequency === 'weekly' && (
            <div className="pf-days-picker">
              {DAYS.map((name, i) => (
                <button
                  key={i}
                  className={`pf-day-btn${daysOfWeek.includes(i) ? ' active' : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* Monthly: day of month */}
          {frequency === 'monthly' && (
            <div className="pf-field-row compact">
              <label className="pf-field-label">Day of month</label>
              <input
                type="number"
                className="pf-input small"
                min={1}
                max={31}
                value={dayOfMonth}
                onChange={e => setDayOfMonth(Number(e.target.value) || 1)}
              />
            </div>
          )}

          {/* Preview */}
          {preview && (
            <div className="pf-preview">
              <Calendar size={12} /> {preview}
            </div>
          )}

          <button
            className="pf-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Recurrence'}
          </button>
        </div>
      )}

      {!enabled && rec.enabled && (
        <button
          className="pf-save-btn secondary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Disable Recurrence'}
        </button>
      )}
    </div>
  );
};

export default RecurrenceSettings;
