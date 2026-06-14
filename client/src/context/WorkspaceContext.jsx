import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext();

const readSavedWorkspaceId = () => {
  const saved = localStorage.getItem('activeWorkspace');
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return parsed?._id ? String(parsed._id) : null;
  } catch {
    localStorage.removeItem('activeWorkspace');
    return null;
  }
};

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    const saved = localStorage.getItem('activeWorkspace');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('activeWorkspace');
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Fetch workspaces when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setActiveWorkspace(null);
      localStorage.removeItem('activeWorkspace');
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await API.get('/workspaces/mine');
      setWorkspaces(response.data);

      if (response.data.length === 0) {
        setActiveWorkspace(null);
        localStorage.removeItem('activeWorkspace');
        return;
      }

      // Respect the workspace saved in localStorage (survives reload after switch).
      // Do NOT use activeWorkspace state here — it may still be null on first fetch.
      const savedId = readSavedWorkspaceId();
      const matched = savedId
        ? response.data.find((w) => String(w._id) === savedId)
        : null;
      const next = matched || response.data[0];

      setActiveWorkspace(next);
      localStorage.setItem('activeWorkspace', JSON.stringify(next));
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (id) => {
    try {
      const response = await API.post(`/workspaces/${id}/switch`);
      const workspace = response.data.workspace;
      const newWs = {
        ...workspace,
        _id: workspace._id,
        role: response.data.role,
      };

      setActiveWorkspace(newWs);
      localStorage.setItem('activeWorkspace', JSON.stringify(newWs));

      // Reload so task/dashboard state is cleared for the new workspace
      window.location.reload();
    } catch (error) {
      console.error('Error switching workspace:', error);
      throw error;
    }
  };

  const createWorkspace = async (name) => {
    try {
      const response = await API.post('/workspaces', { name });
      const newWs = response.data;
      setWorkspaces(prev => [...prev, newWs]);
      await switchWorkspace(newWs._id);
      return newWs;
    } catch (error) {
      console.error('Error creating workspace:', error);
      throw error;
    }
  };

  // Add x-workspace-id to every API request automatically
  useEffect(() => {
    const reqInterceptor = API.interceptors.request.use((config) => {
      if (activeWorkspace) {
        config.headers['x-workspace-id'] = activeWorkspace._id;
      }
      return config;
    });

    // Detect 403 on workspace-scoped requests → user was removed
    const resInterceptor = API.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (
          error.response?.status === 403 &&
          error.response?.data?.message === 'You are not a member of this workspace'
        ) {
          console.warn('Workspace access lost. Switching...');
          localStorage.removeItem('activeWorkspace');
          setActiveWorkspace(null);
          await fetchWorkspaces();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      API.interceptors.request.eject(reqInterceptor);
      API.interceptors.response.eject(resInterceptor);
    };
  }, [activeWorkspace]);

  return (
    <WorkspaceContext.Provider value={{
      workspaces,
      activeWorkspace,
      switchWorkspace,
      createWorkspace,
      loading,
      refreshWorkspaces: fetchWorkspaces
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
