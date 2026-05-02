import React, { useState, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Dashboard    = lazy(() => import('@/components/Dashboard'));
const NotebookView = lazy(() => import('@/components/NotebookView'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

type AppView = 'dashboard' | 'notebook';

const AuthenticatedApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleOpenNotebook = (notebookId: string, entryId?: string) => {
    setSelectedNotebookId(notebookId);
    setSelectedEntryId(entryId || null);
    setCurrentView('notebook');
  };

  const handleBackToDashboard = () => {
    setSelectedNotebookId(null);
    setSelectedEntryId(null);
    setCurrentView('dashboard');
  };

  return (
    <Suspense fallback={<PageLoader />}>
      {currentView === 'notebook' && selectedNotebookId
        ? <NotebookView 
            notebookId={selectedNotebookId}
            entryId={selectedEntryId || undefined}
            onBack={handleBackToDashboard} 
          />
        : <Dashboard onOpenNotebook={handleOpenNotebook} />
      }
    </Suspense>
  );
};

const Index = () => {
  return <AuthenticatedApp />;
};

export default Index;