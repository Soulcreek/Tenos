import { type ParentProps, onMount, createEffect } from 'solid-js';
import { A, useNavigate, useLocation } from '@solidjs/router';
import { authStore } from '../../stores/auth';

// SVG icon components
function GridIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SwordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: GridIcon, end: true },
  { path: '/players', label: 'Players', icon: UsersIcon },
  { path: '/characters', label: 'Characters', icon: SwordIcon },
  { path: '/servers', label: 'Servers', icon: ServerIcon },
  { path: '/tools', label: 'Kombify Tools', icon: WrenchIcon },
  { path: '/config', label: 'Configuration', icon: SettingsIcon },
  { path: '/logs', label: 'Audit Logs', icon: ClipboardIcon },
];

export default function Layout(props: ParentProps) {
  const navigate = useNavigate();
  const location = useLocation();

  createEffect(() => {
    if (!authStore.isAuthenticated()) {
      navigate('/login', { replace: true });
    }
  });

  function isActive(path: string, end?: boolean): boolean {
    if (end) {
      return location.pathname === path;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  async function handleLogout() {
    await authStore.logout();
    navigate('/login', { replace: true });
  }

  const user = () => authStore.user();

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        background: '#0f1117',
        color: '#e6edf3',
        'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: '240px',
          'min-width': '240px',
          height: '100vh',
          background: '#161b22',
          'border-right': '1px solid #21262d',
          display: 'flex',
          'flex-direction': 'column',
          overflow: 'hidden',
        }}
      >
        {/* Logo / Title */}
        <div
          style={{
            padding: '20px 16px',
            'border-bottom': '1px solid #21262d',
            display: 'flex',
            'align-items': 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              'border-radius': '8px',
              background: 'linear-gradient(135deg, #58a6ff, #3fb950)',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              'font-weight': '700',
              'font-size': '16px',
              color: '#0f1117',
              'flex-shrink': '0',
            }}
          >
            T
          </div>
          <div>
            <div style={{ 'font-weight': '600', 'font-size': '15px', color: '#e6edf3' }}>
              Tenos
            </div>
            <div style={{ 'font-size': '11px', color: '#8b949e' }}>Admin Center</div>
          </div>
        </div>

        {/* Navigation */}
        <nav
          style={{
            flex: '1',
            'overflow-y': 'auto',
            padding: '8px',
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <A
                href={item.path}
                style={{
                  display: 'flex',
                  'align-items': 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  'border-radius': '6px',
                  'text-decoration': 'none',
                  'font-size': '14px',
                  'font-weight': '500',
                  'margin-bottom': '2px',
                  transition: 'background 0.15s, color 0.15s',
                  color: isActive(item.path, item.end) ? '#e6edf3' : '#8b949e',
                  background: isActive(item.path, item.end) ? '#1c2128' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.path, item.end)) {
                    e.currentTarget.style.background = '#1c2128';
                    e.currentTarget.style.color = '#e6edf3';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.path, item.end)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#8b949e';
                  }
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    'align-items': 'center',
                    color: isActive(item.path, item.end) ? '#58a6ff' : 'inherit',
                  }}
                >
                  <Icon />
                </span>
                {item.label}
              </A>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div
          style={{
            padding: '12px 16px',
            'border-top': '1px solid #21262d',
            'font-size': '12px',
            color: '#8b949e',
          }}
        >
          Tenos Admin v1.0
        </div>
      </aside>

      {/* Main Area */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          'flex-direction': 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <header
          style={{
            height: '56px',
            'min-height': '56px',
            background: '#161b22',
            'border-bottom': '1px solid #21262d',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'flex-end',
            padding: '0 24px',
            gap: '16px',
          }}
        >
          {/* User Info */}
          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '12px',
            }}
          >
            <div style={{ 'text-align': 'right' }}>
              <div style={{ 'font-size': '14px', 'font-weight': '500', color: '#e6edf3' }}>
                {user()?.username ?? 'Unknown'}
              </div>
              <div style={{ 'font-size': '11px', color: '#8b949e', 'text-transform': 'uppercase', 'letter-spacing': '0.5px' }}>
                {user()?.role ?? 'user'}
              </div>
            </div>

            {/* Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                'border-radius': '50%',
                background: '#1c2128',
                border: '2px solid #30363d',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '13px',
                'font-weight': '600',
                color: '#58a6ff',
              }}
            >
              {(user()?.username ?? 'U').charAt(0).toUpperCase()}
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                'align-items': 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid #30363d',
                'border-radius': '6px',
                color: '#8b949e',
                cursor: 'pointer',
                'font-size': '13px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#f85149';
                e.currentTarget.style.color = '#f85149';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#30363d';
                e.currentTarget.style.color = '#8b949e';
              }}
            >
              <LogoutIcon />
              Logout
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main
          style={{
            flex: '1',
            'overflow-y': 'auto',
            padding: '24px',
            background: '#0f1117',
          }}
        >
          {props.children}
        </main>
      </div>
    </div>
  );
}
