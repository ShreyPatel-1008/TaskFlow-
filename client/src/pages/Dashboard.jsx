import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useDashboard } from '../hooks/useDashboard';
import MetricCards from '../components/dashboard/MetricCards';
import TrendChart from '../components/dashboard/TrendChart';
import MemberBreakdown from '../components/dashboard/MemberBreakdown';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import QuickActions from '../components/dashboard/QuickActions';
import { RefreshCw } from 'lucide-react';
import '../styles/dashboard.css';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const Dashboard = () => {
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();
  const {
    metrics, trend, members, unassignedCount,
    activity, generatedAt, loading, error, refresh
  } = useDashboard();

  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 600);
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="dash-page">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <h1 className="dash-greeting">{getGreeting()}, {firstName}</h1>
          <p className="dash-workspace-name">{activeWorkspace?.name || 'Dashboard'}</p>
        </div>
        <button
          className={`dash-refresh-btn${refreshing ? ' spinning' : ''}`}
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh dashboard"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="dash-error">
          <p>{error}</p>
          <button onClick={handleRefresh}>Try again</button>
        </div>
      )}

      {/* Metric Cards */}
      <MetricCards
        metrics={metrics}
        memberCount={members?.length || 0}
        loading={loading}
      />

      {/* Quick Actions */}
      <QuickActions />

      {/* Main Grid: Trend + Members */}
      <div className="dash-main-grid">
        <TrendChart trend={trend} loading={loading} />
        <MemberBreakdown
          members={members}
          unassignedCount={unassignedCount}
          loading={loading}
        />
      </div>

      {/* Activity Feed - Full Width */}
      <ActivityFeed
        activity={activity}
        generatedAt={generatedAt}
        loading={loading}
      />
    </div>
  );
};

export default Dashboard;
