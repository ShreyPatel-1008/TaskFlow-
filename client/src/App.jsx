import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TaskProvider } from './context/TaskContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Analytics from './pages/Analytics';
import CalendarView from './pages/CalendarView';
import Notes from './pages/Notes';
import AcceptInvite from './pages/AcceptInvite';
import Members from './pages/settings/Members';
import CustomFieldsPage from './pages/settings/CustomFieldsPage';
import RecurringTasksPage from './pages/settings/RecurringTasksPage';
import React from 'react';

// This component prevents access to the app if no workspace is selected/available
const WorkspaceGate = () => {
  const { activeWorkspace, loading, workspaces, createWorkspace } = useWorkspace();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [creating, setCreating] = React.useState(false);
  
  if (authLoading || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (isAuthenticated && !activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Get Started!</h1>
          <p className="text-gray-600 mb-8">You haven't joined a workspace yet. Create one to start managing your team.</p>
          
          <div className="space-y-4">
             <input 
               id="new-workspace-name"
               type="text" 
               disabled={creating}
               className="w-full p-3 border rounded-xl"
               placeholder="Workspace Name (e.g. Acme Corp)"
               onKeyDown={async (e) => {
                 if (e.key === 'Enter' && e.target.value.trim() && !creating) {
                   setCreating(true);
                   try {
                     await createWorkspace(e.target.value.trim());
                   } catch (err) {
                     alert("Failed to create workspace");
                     setCreating(false);
                   }
                 }
               }}
             />
             <p className="text-xs text-gray-400">{creating ? 'Creating...' : 'Press Enter to create and continue'}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return <Outlet />;
};

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <TaskProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/invite/:token" element={<AcceptInvite />} />
                <Route element={<Layout />}>
                  <Route element={<WorkspaceGate />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/calendar" element={<CalendarView />} />
                    <Route path="/notes" element={<Notes />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/settings/custom-fields" element={<CustomFieldsPage />} />
                    <Route path="/settings/recurring-tasks" element={<RecurringTasksPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </TaskProvider>
          </WorkspaceProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
