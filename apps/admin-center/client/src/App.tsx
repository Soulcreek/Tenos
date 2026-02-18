import { onMount, Show } from 'solid-js';
import { Router, Route } from '@solidjs/router';
import { authStore } from './stores/auth';
import Layout from './components/layout/Layout';
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function App() {
  onMount(() => {
    authStore.checkAuth();
  });

  return (
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
  );
}
