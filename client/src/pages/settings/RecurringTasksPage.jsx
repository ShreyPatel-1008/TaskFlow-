import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { format, formatDistanceToNow } from 'date-fns';
import { Repeat, Play, Pause, Clock } from 'lucide-react';
import '../../styles/powerFeatures.css';

const RecurringTasksPage = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = async () => {
    try {
      const res = await API.get('/tasks?includeTemplates=true&status=all');
      // Filter to only templates
      const all = Array.isArray(res.data) ? res.data : (res.data.tasks || []);
      setTemplates(all.filter(t => t.isTemplate));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const handleDisable = async (taskId) => {
    if (!confirm('Disable recurrence for this task?')) return;
    try {
      await API.delete(`/tasks/${taskId}/recurrence`);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const freqLabel = (t) => {
    const r = t.recurrence;
    if (!r) return '';
    const intLabel = r.interval > 1 ? `Every ${r.interval} ` : 'Every ';
    if (r.frequency === 'daily') return intLabel + (r.interval > 1 ? 'days' : 'day');
    if (r.frequency === 'weekly') return intLabel + (r.interval > 1 ? 'weeks' : 'week');
    if (r.frequency === 'monthly') return intLabel + (r.interval > 1 ? 'months' : 'month');
    return '';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Recurring Tasks</h1>
          <p className="page-header-subtitle">Manage recurring task templates in this workspace</p>
        </div>
      </div>

      {loading ? (
        <div className="pf-loading">Loading recurring tasks...</div>
      ) : templates.length === 0 ? (
        <div className="pf-empty-page">
          <Repeat size={48} strokeWidth={1} />
          <h2>No recurring tasks</h2>
          <p>Set up recurrence on any task to have it automatically repeat on a schedule.</p>
        </div>
      ) : (
        <div className="pf-recurring-list">
          {templates.map(t => {
            const r = t.recurrence || {};
            let nextRun = '', lastRun = '';
            try { if (r.nextRunAt) nextRun = format(new Date(r.nextRunAt), 'EEE, d MMM yyyy'); } catch (e) {}
            try { if (r.lastRunAt) lastRun = formatDistanceToNow(new Date(r.lastRunAt), { addSuffix: true }); } catch (e) {}

            return (
              <div key={t._id} className="pf-recurring-card">
                <div className="pf-recurring-icon"><Repeat size={18} /></div>
                <div className="pf-recurring-info">
                  <div className="pf-recurring-title">{t.title}</div>
                  <div className="pf-recurring-meta">
                    <span className="pf-type-badge">{freqLabel(t)}</span>
                    {nextRun && <span><Clock size={11} /> Next: {nextRun}</span>}
                    {lastRun && <span>Last: {lastRun}</span>}
                  </div>
                </div>
                <div className="pf-recurring-actions">
                  <button className="pf-att-btn danger" onClick={() => handleDisable(t._id)} title="Disable recurrence">
                    <Pause size={14} /> Disable
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecurringTasksPage;
