import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format, parseISO, isValid } from 'date-fns';
import { TrendingUp } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const date = parseISO(label);
  const dateStr = isValid(date) ? format(date, 'EEE, MMM d') : label;
  return (
    <div className="dash-chart-tooltip">
      <p className="dash-chart-tooltip-date">{dateStr}</p>
      <p className="dash-chart-tooltip-val">{payload[0].value} tasks completed</p>
    </div>
  );
};

const TrendChart = ({ trend = [], loading }) => {
  const allZero = trend.every(d => d.count === 0);

  if (loading) {
    return (
      <div className="dash-card dash-trend-card">
        <div className="dash-card-header">
          <h3><TrendingUp className="inline-icon" /> Completion trend</h3>
        </div>
        <div className="dash-chart-skeleton">
          <div className="skeleton-bar w-full h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="dash-card dash-trend-card">
      <div className="dash-card-header">
        <h3><TrendingUp className="inline-icon" /> Completion trend — last 14 days</h3>
      </div>

      {allZero ? (
        <div className="dash-empty-state">
          <TrendingUp className="dash-empty-icon" />
          <p className="dash-empty-title">No completions yet</p>
          <p className="dash-empty-sub">Start completing tasks to see your progress</p>
        </div>
      ) : (
        <div className="dash-chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(val) => {
                  const d = parseISO(val);
                  if (!isValid(d)) return val;
                  const day = format(d, 'EEE');
                  return ['Mon', 'Wed', 'Fri'].includes(day) ? day : '';
                }}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--text-muted, #9ca3af)' }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--text-muted, #9ca3af)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="var(--color-primary, #3b82f6)"
                strokeWidth={2.5}
                fill="url(#trendFill)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
