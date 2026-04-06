import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { useAuth } from './AuthContext';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Load active workspace from localStorage on initial boot
  useEffect(() => {
    const saved = localStorage.getItem('activeWorkspace');
    if (saved) {
      try {
        setActiveWorkspace(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved workspace", e);
      }
    }
  }, []);

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
      
      // If no active workspace or current active is not in the list, set to first available
      const saved = localStorage.getItem('activeWorkspace');
      const savedObj = saved ? JSON.parse(saved) : null;
      
      if (response.data.length > 0) {
        const stillExists = savedObj && response.data.find(w => w._id === savedObj._id);
        if (!activeWorkspace || !stillExists) {
          const defaultWs = response.data[0];
          setActiveWorkspace(defaultWs);
          localStorage.setItem('activeWorkspace', JSON.stringify(defaultWs));
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (id) => {
    try {
      const response = await API.post(`/workspaces/${id}/switch`);
      const newWs = response.data.workspace;
      newWs.role = response.data.role;
      
      setActiveWorkspace(newWs);
      localStorage.setItem('activeWorkspace', JSON.stringify(newWs));
      
      // Clear task states by reloading or custom event
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
