import { useState, useEffect } from 'react';
import API from '../utils/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { TrendingUp, Calendar, Target, ChevronLeft, ChevronRight } from 'lucide-react';

const STATUS_COLORS = { COMPLETED: '#00b894', IN_PROGRESS: '#fdcb6e', NOT_STARTED: '#ff6b6b' };
const STATUS_LABELS = { COMPLETED: 'Completed', IN_PROGRESS: 'In Progress', NOT_STARTED: 'Not Started' };

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            borderRadius: '10px', padding: '10px 14px',
            boxShadow: 'var(--shadow-md)', fontSize: '0.875rem'
        }}>
            <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, fontSize: '0.75rem' }}>{p.name}: {p.value}</p>
            ))}
        </div>
    );
};

const Analytics = () => {
    const [weekly, setWeekly] = useState(null);
    const [monthly, setMonthly] = useState(null);
    const [heatmap, setHeatmap] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selMonth, setSelMonth] = useState(new Date().getMonth());
    const [selYear, setSelYear] = useState(new Date().getFullYear());

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [w, m, h] = await Promise.all([
                    API.get('/analytics/weekly'),
                    API.get('/analytics/monthly', { params: { month: selMonth, year: selYear } }),
                    API.get('/analytics/heatmap')
                ]);
                setWeekly(w.data); setMonthly(m.data); setHeatmap(h.data);
            } catch (err) { console.error(err); }
            finally { setLoading(false); }
        };
        fetchAll();
    }, [selMonth, selYear]);

    const navMonth = (dir) => {
        let nm = selMonth + dir, ny = selYear;
        if (nm > 11) { nm = 0; ny++; } if (nm < 0) { nm = 11; ny--; }
        setSelMonth(nm); setSelYear(ny);
    };

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const buildHeatmap = () => {
        if (!heatmap?.heatmapData) return [];
        const days = [], start = new Date(heatmap.startDate), end = new Date(heatmap.endDate), cur = new Date(start);
        while (cur <= end) {
            const ds = cur.toISOString().split('T')[0], c = heatmap.heatmapData[ds] || 0;
            let l = 0; if (c >= 5) l = 4; else if (c >= 3) l = 3; else if (c >= 2) l = 2; else if (c >= 1) l = 1;
            days.push({ date: ds, count: c, level: l }); cur.setDate(cur.getDate() + 1);
        }
        return days;
    };

    const hDays = buildHeatmap();
    const hWeeks = []; for (let i = 0; i < hDays.length; i += 7) hWeeks.push(hDays.slice(i, i + 7));

    if (loading) return <div className="page-container"><div className="loading-spinner"><div className="spinner" /></div></div>;

    const msd = monthly?.statusDistribution?.map(s => ({
        name: STATUS_LABELS[s._id] || s._id, value: s.count, color: STATUS_COLORS[s._id] || '#6c5ce7'
    })) || [];

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Analytics</h1>
                    <p className="page-header-subtitle">
                        Understand how your work is trending over time
                    </p>
                </div>
                <div className="badge badge-purple">
                    Live · Last sync from TaskFlow API
                </div>
            </div>

            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="stat-card purple"><div className="stat-card-header"><span className="stat-card-label">Weekly Score</span><Target size={18} style={{ color: 'var(--accent-primary-light)' }} /></div><div className="stat-card-value">{weekly?.productivityScore || 0}%</div></div>
                <div className="stat-card green"><div className="stat-card-header"><span className="stat-card-label">Week Completed</span><TrendingUp size={18} style={{ color: 'var(--color-success)' }} /></div><div className="stat-card-value">{weekly?.weekCompleted || 0}</div></div>
                <div className="stat-card blue"><div className="stat-card-header"><span className="stat-card-label">Week Total</span><Target size={18} style={{ color: 'var(--color-info)' }} /></div><div className="stat-card-value">{weekly?.weekTotal || 0}</div></div>
                <div className="stat-card orange"><div className="stat-card-header"><span className="stat-card-label">Monthly Score</span><Calendar size={18} style={{ color: 'var(--color-warning)' }} /></div><div className="stat-card-value">{monthly?.productivityScore || 0}%</div></div>
            </div>

            {/* Weekly section */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginTop: 'var(--space-8)', marginBottom: 'var(--space-3)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Weekly overview</h2>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    How this week compares to your recent activity
                </span>
            </div>

            <div className="charts-grid">
                <div className="chart-card"><div className="chart-card-header"><h3 className="chart-card-title">Completed vs Total</h3></div>
                    <ResponsiveContainer width="100%" height={300}><BarChart data={weekly?.weeklyData || []}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /><XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} /><YAxis stroke="var(--text-muted)" fontSize={12} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="completed" fill="#00b894" name="Completed" radius={[4, 4, 0, 0]} /><Bar dataKey="total" fill="#6c5ce7" name="Total" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                </div>
                <div className="chart-card"><div className="chart-card-header"><h3 className="chart-card-title">Weekly Trend</h3></div>
                    <ResponsiveContainer width="100%" height={300}><LineChart data={weekly?.weeklyData || []}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /><XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} /><YAxis stroke="var(--text-muted)" fontSize={12} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="completed" stroke="#6c5ce7" strokeWidth={3} dot={{ r: 5, fill: '#6c5ce7' }} name="Completed" /><Line type="monotone" dataKey="total" stroke="#00cec9" strokeWidth={2} dot={{ r: 4, fill: '#00cec9' }} strokeDasharray="5 5" name="Total" /></LineChart></ResponsiveContainer>
                </div>
            </div>



            {/* Monthly section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'var(--space-8)', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Monthly trends</h2>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        Zoom out to see longer-term patterns in your work
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => navMonth(-1)}><ChevronLeft size={18} /></button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, minWidth: 140, textAlign: 'center' }}>{months[selMonth]} {selYear}</span>
                    <button className="btn btn-ghost btn-icon" onClick={() => navMonth(1)}><ChevronRight size={18} /></button>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-card"><div className="chart-card-header"><h3 className="chart-card-title">Monthly Productivity</h3></div>
                    <ResponsiveContainer width="100%" height={300}><AreaChart data={monthly?.monthlyData || []}><defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6c5ce7" stopOpacity={0.3} /><stop offset="95%" stopColor="#6c5ce7" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" /><XAxis dataKey="day" stroke="var(--text-muted)" fontSize={12} /><YAxis stroke="var(--text-muted)" fontSize={12} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="completed" stroke="#6c5ce7" fill="url(#mg)" strokeWidth={2} name="Completed" /></AreaChart></ResponsiveContainer>
                </div>
                <div className="chart-card"><div className="chart-card-header"><h3 className="chart-card-title">Status Breakdown</h3></div>
                    {msd.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={msd} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" paddingAngle={4} stroke="none">{msd.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><Legend verticalAlign="bottom" formatter={v => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{v}</span>} /><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer>
                    ) : <div className="empty-state" style={{ padding: '2rem' }}><p className="empty-state-text">No data for this month</p></div>}
                </div>
            </div>

            <div className="chart-card" style={{ marginTop: '1.5rem' }}>
                <div className="chart-card-header"><h3 className="chart-card-title">✅ Task Completion Heatmap</h3><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tasks completed · Last 12 months</span></div>
                <div className="heatmap-container"><div className="heatmap-grid">
                    {hWeeks.map((w, wi) => <div key={wi} className="heatmap-column">{w.map((d, di) => <div key={di} className={`heatmap-cell level-${d.level}`} title={`${d.date}: ${d.count} tasks`} />)}</div>)}
                </div>
                    <div className="heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map(l => <div key={l} className={`heatmap-cell level-${l}`} style={{ display: 'inline-block' }} />)}<span>More</span></div></div>
            </div>
        </div>
    );
};

export default Analytics;
