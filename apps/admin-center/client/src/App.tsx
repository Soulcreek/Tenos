import { onMount, Show, ErrorBoundary } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { authStore } from './stores/auth';
import Layout from './components/layout/Layout';
import ToastContainer from './components/shared/ToastContainer';
import { toastStore } from './stores/toast';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import PlayersPage from './pages/Players';
import PlayerDetailPage from './pages/PlayerDetail';
import CharactersPage from './pages/Characters';
import CharacterDetailPage from './pages/CharacterDetail';
import ServersPage from './pages/Servers';
import ToolsPage from './pages/Tools';
import ConfigPage from './pages/Config';
import LogsPage from './pages/Logs';

function LoadingSpinner() {
  return (
    <div
      style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        height: '100vh',
        width: '100vw',
        background: '#0f1117',
      }}
    >
      <div
        style={{
          display: 'flex',
          'flex-direction': 'column',
          'align-items': 'center',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #1c2128',
            'border-top-color': '#58a6ff',
            'border-radius': '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ color: '#8b949e', 'font-size': '14px' }}>Loading...</span>
      </div>
    </div>
  );
}

function GlobalErrorFallback(props: { error: Error; reset: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        height: '100vh',
        width: '100vw',
        background: '#0f1117',
      }}
    >
      <div
        style={{
          background: '#161b22',
          border: '1px solid #f85149',
          'border-radius': '12px',
          padding: '32px',
          'max-width': '480px',
          'text-align': 'center',
        }}
      >
        <div style={{ 'font-size': '48px', 'margin-bottom': '16px' }}>{'\u26A0'}</div>
        <h2 style={{ color: '#f85149', margin: '0 0 8px', 'font-size': '20px' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#8b949e', margin: '0 0 16px', 'font-size': '14px' }}>
          {props.error.message}
        </p>
        <button
          onClick={props.reset}
          style={{
            padding: '8px 24px',
            background: '#58a6ff',
            color: '#fff',
            border: 'none',
            'border-radius': '6px',
            cursor: 'pointer',
            'font-size': '14px',
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function App() {
  onMount(() => {
    authStore.checkAuth();
  });

  return (
    <ErrorBoundary fallback={(err, reset) => <GlobalErrorFallback error={err} reset={reset} />}>
      {/* Global CSS animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        * { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #0f1117; }
        ::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #484f58; }
      `}</style>

      <ToastContainer />

      <Show when={!authStore.isLoading()} fallback={<LoadingSpinner />}>
        <Router>
          <Route path="/login" component={LoginPage} />
          <Route path="/" component={Layout}>
            <Route path="/" component={DashboardPage} />
            <Route path="/players" component={PlayersPage} />
            <Route path="/players/:id" component={PlayerDetailPage} />
            <Route path="/characters" component={CharactersPage} />
            <Route path="/characters/:id" component={CharacterDetailPage} />
            <Route path="/servers" component={ServersPage} />
            <Route path="/tools" component={ToolsPage} />
            <Route path="/config" component={ConfigPage} />
            <Route path="/logs" component={LogsPage} />
          </Route>
        </Router>
      </Show>
    </ErrorBoundary>
  );
}
