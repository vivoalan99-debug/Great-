import React, { useEffect, useState, Component, ErrorInfo } from 'react';
import { useStore } from './store/useStore';
import { Loader2, AlertTriangle } from 'lucide-react';

import { MainLayout } from './components/layout/MainLayout';
import { DashboardView } from './components/views/DashboardView';
import { ExpensesView } from './components/views/ExpensesView';
import { MortgageView } from './components/views/MortgageView';
import { SimulationView } from './components/views/SimulationView';

class ErrorBoundary extends Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("UI Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-xl shadow-xl border border-rose-100 max-w-md w-full text-center">
             <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
             </div>
             <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
             <p className="text-slate-500 text-sm mb-6">The simulation engine encountered an unexpected state. Please check your inputs or refresh the page.</p>
             <pre className="text-xs bg-slate-100 p-3 rounded text-left overflow-auto max-h-32 mb-6 text-rose-700">
                {this.state.error?.message}
             </pre>
             <button 
                onClick={() => window.location.reload()}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors w-full"
             >
                Reload Application
             </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { loadInitialData, isInitialized, simulationResult } = useStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  useEffect(() => {
    loadInitialData();
  }, []);

  if (!isInitialized) {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-4">
              <Loader2 className="animate-spin text-blue-500" size={48} />
              <div className="text-sm font-medium animate-pulse">Initializing Financial Engine...</div>
          </div>
      );
  }

  const renderContent = () => {
      // Safety check for simulation result in render
      if (!simulationResult) return null;

      switch(activeTab) {
          case 'dashboard': return <DashboardView />;
          case 'expenses': return <ExpensesView />;
          case 'mortgage': return <MortgageView />;
          case 'simulation': return <SimulationView />;
          default: return <DashboardView />;
      }
  };

  return (
      <ErrorBoundary>
        <MainLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {renderContent()}
        </MainLayout>
      </ErrorBoundary>
  );
}