import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../utils/api';
import { useWorkspace } from '../context/WorkspaceContext';

export const useDashboard = () => {
  const { activeWorkspace } = useWorkspace();
  const [metrics, setMetrics] = useState(null);
  const [trend, setTrend] = useState([]);
  const [members, setMembers] = useState([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [activity, setActivity] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollInterval = useRef(null);

  const fetchDashboard = useCallback(async (bustCache = false) => {
    try {
      setError(null);
      const url = bustCache ? '/dashboard?refresh=true' : '/dashboard';
      const res = await API.get(url);
      const d = res.data;

      setMetrics(d.metrics);
      setTrend(d.trend);
      setMembers(d.members);
      setUnassignedCount(d.unassignedCount || 0);
      setActivity(d.activity);
      setGeneratedAt(d.generatedAt);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    return fetchDashboard(true);
  }, [fetchDashboard]);

  // Fetch on mount + workspace change
  useEffect(() => {
    if (activeWorkspace?._id) {
      setLoading(true);
      fetchDashboard();
    }
  }, [activeWorkspace?._id, fetchDashboard]);

  // Auto-refresh every 60s, pause when tab is hidden
  useEffect(() => {
    const startPolling = () => {
      pollInterval.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchDashboard();
        }
      }, 60000);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboard();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchDashboard]);

  return {
    metrics,
    trend,
    members,
    unassignedCount,
    activity,
    generatedAt,
    loading,
    error,
    refresh
  };
};
