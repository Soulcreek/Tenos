import { createSignal, createEffect, Show, For, onMount, onCleanup } from 'solid-js';
import { servers } from '../lib/api';
import { authStore } from '../stores/auth';
import { toastStore } from '../stores/toast';
import type { ApiResponse, GameServer, ZoneInfo } from '@tenos/shared';

// ---------------------------------------------------------------------------
// Colors & Shared Styles
// ---------------------------------------------------------------------------

const colors = {
  bg0: '#0f1117',
  bg1: '#161b22',
  bg2: '#1c2128',
  bg3: '#21262d',
  border: '#30363d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  blue: '#58a6ff',
  green: '#3fb950',
  red: '#f85149',
  yellow: '#d29922',
  orange: '#db6d28',
} as const;

const statusColorMap: Record<string, string> = {
  online: colors.green,
  offline: colors.red,
  maintenance: colors.yellow,
  starting: colors.blue,
  stopping: colors.orange,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);
  return parts.join(' ');
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 'just now';
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function usageColor(percentage: number): string {
  if (percentage >= 80) return colors.red;
  if (percentage >= 50) return colors.yellow;
  return colors.green;
}

// ---------------------------------------------------------------------------
// Confirmation Dialog
// ---------------------------------------------------------------------------

function ConfirmDialog(props: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        'background-color': 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'z-index': '1000',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
    >
      <div
        style={{
          'background-color': colors.bg1,
          border: `1px solid ${colors.border}`,
          'border-radius': '12px',
          padding: '24px',
          'min-width': '360px',
          'max-width': '480px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            'font-size': '18px',
            'font-weight': '600',
            color: colors.text,
          }}
        >
          {props.title}
        </h3>
        <p
          style={{
            margin: '0 0 24px 0',
            'font-size': '14px',
            color: colors.textMuted,
            'line-height': '1.5',
          }}
        >
          {props.message}
        </p>
        <div
          style={{
            display: 'flex',
            'justify-content': 'flex-end',
            gap: '12px',
          }}
        >
          <button
            onClick={props.onCancel}
            style={{
              padding: '8px 20px',
              background: colors.bg3,
              border: `1px solid ${colors.border}`,
              'border-radius': '6px',
              color: colors.text,
              'font-size': '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={props.onConfirm}
            style={{
              padding: '8px 20px',
              background: props.confirmColor,
              border: 'none',
              'border-radius': '6px',
              color: '#ffffff',
              'font-size': '14px',
              'font-weight': '600',
              cursor: 'pointer',
            }}
          >
            {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Server Card
// ---------------------------------------------------------------------------

function ServerCard(props: {
  server: GameServer;
  onAction: (serverId: string, action: string) => void;
  actionLoading: () => string | null;
}) {
  const [zonesExpanded, setZonesExpanded] = createSignal(false);

  const statusColor = () => statusColorMap[props.server.status] ?? colors.textMuted;
  const isOnline = () => props.server.status === 'online';
  const isOffline = () => props.server.status === 'offline';
  const isLoading = () => props.actionLoading() === props.server.id;
  const playerPercent = () =>
    props.server.maxPlayers > 0
      ? Math.min(100, (props.server.currentPlayers / props.server.maxPlayers) * 100)
      : 0;

  function renderUsageBar(label: string, value: number) {
    const clamped = Math.min(100, Math.max(0, value));
    const barColor = usageColor(clamped);
    return (
      <div style={{ 'margin-bottom': '10px' }}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'font-size': '12px',
            color: colors.textMuted,
            'margin-bottom': '4px',
          }}
        >
          <span>{label}</span>
          <span style={{ color: barColor, 'font-weight': '600' }}>{clamped.toFixed(1)}%</span>
        </div>
        <div
          style={{
            height: '6px',
            'background-color': colors.bg3,
            'border-radius': '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${clamped}%`,
              'background-color': barColor,
              'border-radius': '3px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        'background-color': colors.bg1,
        'border-radius': '12px',
        border: `1px solid ${colors.border}`,
        padding: '20px',
        display: 'flex',
        'flex-direction': 'column',
        gap: '4px',
      }}
    >
      {/* Server Name & Status */}
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          'margin-bottom': '12px',
        }}
      >
        <span
          style={{
            'font-size': '18px',
            'font-weight': '700',
            color: colors.text,
          }}
        >
          {props.server.name}
        </span>
        <span
          style={{
            'font-size': '11px',
            'font-weight': '600',
            'text-transform': 'uppercase',
            padding: '4px 12px',
            'border-radius': '12px',
            'background-color': `${statusColor()}20`,
            color: statusColor(),
            'letter-spacing': '0.04em',
          }}
        >
          {props.server.status}
        </span>
      </div>

      {/* Version */}
      <div
        style={{
          'font-size': '12px',
          color: colors.textMuted,
          'margin-bottom': '12px',
        }}
      >
        Version: <span style={{ color: colors.text, 'font-weight': '500' }}>{props.server.version}</span>
      </div>

      {/* Player Count */}
      <div style={{ 'margin-bottom': '14px' }}>
        <div
          style={{
            display: 'flex',
            'align-items': 'baseline',
            gap: '6px',
            'margin-bottom': '6px',
          }}
        >
          <span
            style={{
              'font-size': '22px',
              'font-weight': '700',
              color: colors.text,
            }}
          >
            {props.server.currentPlayers}
          </span>
          <span style={{ 'font-size': '13px', color: colors.textMuted }}>
            / {props.server.maxPlayers} players
          </span>
        </div>
        <div
          style={{
            height: '6px',
            'background-color': colors.bg3,
            'border-radius': '3px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${playerPercent()}%`,
              'background-color': colors.blue,
              'border-radius': '3px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* CPU & Memory Usage */}
      {renderUsageBar('CPU Usage', props.server.cpuUsage)}
      {renderUsageBar('Memory Usage', props.server.memoryUsage)}

      {/* Uptime & Last Heartbeat */}
      <div
        style={{
          display: 'flex',
          'justify-content': 'space-between',
          'font-size': '12px',
          color: colors.textMuted,
          'margin-bottom': '4px',
          'padding-top': '4px',
          'border-top': `1px solid ${colors.bg3}`,
        }}
      >
        <span>
          Uptime: <span style={{ color: colors.text }}>{formatUptime(props.server.uptime)}</span>
        </span>
        <span>
          Heartbeat: <span style={{ color: colors.text }}>{formatRelativeTime(props.server.lastHeartbeat)}</span>
        </span>
      </div>

      {/* Zone List - Collapsible */}
      <Show when={props.server.zones && props.server.zones.length > 0}>
        <div style={{ 'margin-top': '8px' }}>
          <button
            onClick={() => setZonesExpanded(!zonesExpanded())}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              padding: '8px 0',
              color: colors.blue,
              'font-size': '13px',
              'font-weight': '500',
              cursor: 'pointer',
              display: 'flex',
              'align-items': 'center',
              gap: '6px',
              'text-align': 'left',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                transition: 'transform 0.2s ease',
                transform: zonesExpanded() ? 'rotate(90deg)' : 'rotate(0deg)',
              }}
            >
              &#9654;
            </span>
            Zones ({props.server.zones.length})
          </button>
          <Show when={zonesExpanded()}>
            <div
              style={{
                'background-color': colors.bg2,
                'border-radius': '8px',
                padding: '4px 0',
                'margin-top': '4px',
              }}
            >
              <For each={props.server.zones}>
                {(zone: ZoneInfo) => (
                  <div
                    style={{
                      display: 'flex',
                      'justify-content': 'space-between',
                      'align-items': 'center',
                      padding: '8px 12px',
                      'font-size': '12px',
                      'border-bottom': `1px solid ${colors.bg3}`,
                    }}
                  >
                    <span style={{ color: colors.text, 'font-weight': '500' }}>
                      {zone.name}
                    </span>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ color: colors.textMuted }}>
                        <span style={{ color: colors.blue }}>{zone.playerCount}</span> players
                      </span>
                      <span style={{ color: colors.textMuted }}>
                        <span style={{ color: colors.yellow }}>{zone.monsterCount}</span> monsters
                      </span>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>

      {/* Action Buttons (Admin only) */}
      <Show when={authStore.isAdmin()}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            'margin-top': '12px',
            'padding-top': '12px',
            'border-top': `1px solid ${colors.bg3}`,
            'flex-wrap': 'wrap',
          }}
        >
          <Show when={isLoading()}>
            <div
              style={{
                display: 'flex',
                'align-items': 'center',
                gap: '8px',
                color: colors.textMuted,
                'font-size': '13px',
                width: '100%',
                'justify-content': 'center',
                padding: '6px 0',
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  border: `2px solid ${colors.bg3}`,
                  'border-top-color': colors.blue,
                  'border-radius': '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              Executing action...
            </div>
          </Show>
          <Show when={!isLoading()}>
            <Show when={isOffline()}>
              <button
                onClick={() => props.onAction(props.server.id, 'start')}
                style={{
                  flex: '1',
                  padding: '8px 12px',
                  background: colors.green,
                  border: 'none',
                  'border-radius': '6px',
                  color: '#ffffff',
                  'font-size': '13px',
                  'font-weight': '600',
                  cursor: 'pointer',
                  'min-width': '70px',
                }}
              >
                Start
              </button>
            </Show>
            <Show when={isOnline()}>
              <button
                onClick={() => props.onAction(props.server.id, 'stop')}
                style={{
                  flex: '1',
                  padding: '8px 12px',
                  background: colors.red,
                  border: 'none',
                  'border-radius': '6px',
                  color: '#ffffff',
                  'font-size': '13px',
                  'font-weight': '600',
                  cursor: 'pointer',
                  'min-width': '70px',
                }}
              >
                Stop
              </button>
              <button
                onClick={() => props.onAction(props.server.id, 'restart')}
                style={{
                  flex: '1',
                  padding: '8px 12px',
                  background: colors.yellow,
                  border: 'none',
                  'border-radius': '6px',
                  color: '#ffffff',
                  'font-size': '13px',
                  'font-weight': '600',
                  cursor: 'pointer',
                  'min-width': '70px',
                }}
              >
                Restart
              </button>
              <button
                onClick={() => props.onAction(props.server.id, 'maintenance')}
                style={{
                  flex: '1',
                  padding: '8px 12px',
                  background: colors.orange,
                  border: 'none',
                  'border-radius': '6px',
                  color: '#ffffff',
                  'font-size': '13px',
                  'font-weight': '600',
                  cursor: 'pointer',
                  'min-width': '70px',
                }}
              >
                Maintenance
              </button>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Servers Page
// ---------------------------------------------------------------------------

export default function Servers() {
  const [serverList, setServerList] = createSignal<GameServer[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [actionLoading, setActionLoading] = createSignal<string | null>(null);
  const [confirmAction, setConfirmAction] = createSignal<{
    serverId: string;
    action: string;
    serverName: string;
  } | null>(null);

  // Aggregate stats
  const totalServers = () => serverList().length;
  const serversOnline = () => serverList().filter((s) => s.status === 'online').length;
  const totalPlayers = () => serverList().reduce((sum, s) => sum + s.currentPlayers, 0);

  async function fetchServers() {
    setLoading(true);
    setError(null);
    try {
      const res = await servers.list();
      setServerList(res.data ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  }

  const [autoRefresh, setAutoRefresh] = createSignal(true);
  let refreshInterval: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    fetchServers();
    refreshInterval = setInterval(() => {
      if (autoRefresh()) fetchServers();
    }, 15_000); // Refresh every 15 seconds
  });

  onCleanup(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });

  function handleActionRequest(serverId: string, action: string) {
    const server = serverList().find((s) => s.id === serverId);
    if (!server) return;
    setConfirmAction({ serverId, action, serverName: server.name });
  }

  async function executeAction() {
    const pending = confirmAction();
    if (!pending) return;
    setConfirmAction(null);
    setActionLoading(pending.serverId);

    try {
      const actionMap: Record<string, (id: string) => Promise<any>> = {
        start: servers.start,
        stop: servers.stop,
        restart: servers.restart,
        maintenance: servers.maintenance,
      };
      const fn = actionMap[pending.action];
      if (fn) {
        await fn(pending.serverId);
      }
      toastStore.success(`Server "${pending.serverName}" — ${pending.action} command sent`);
      // Refresh the server list after a successful action
      await fetchServers();
    } catch (err: any) {
      toastStore.error(err.message ?? `Failed to ${pending.action} server`);
      setError(err.message ?? `Failed to ${pending.action} server`);
    } finally {
      setActionLoading(null);
    }
  }

  const confirmActionLabels: Record<string, { title: string; message: (name: string) => string; label: string; color: string }> = {
    start: {
      title: 'Start Server',
      message: (name) => `Are you sure you want to start "${name}"?`,
      label: 'Start',
      color: colors.green,
    },
    stop: {
      title: 'Stop Server',
      message: (name) => `Are you sure you want to stop "${name}"? All connected players will be disconnected.`,
      label: 'Stop',
      color: colors.red,
    },
    restart: {
      title: 'Restart Server',
      message: (name) => `Are you sure you want to restart "${name}"? All connected players will be temporarily disconnected.`,
      label: 'Restart',
      color: colors.yellow,
    },
    maintenance: {
      title: 'Maintenance Mode',
      message: (name) => `Are you sure you want to put "${name}" into maintenance mode? New connections will be refused.`,
      label: 'Maintenance',
      color: colors.orange,
    },
  };

  return (
    <div style={{ 'min-height': '100vh', 'background-color': colors.bg0, color: colors.text }}>
      {/* Spinner animation keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div
        style={{
          'max-width': '1400px',
          margin: '0 auto',
          padding: '32px 24px',
        }}
      >
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
            'margin-bottom': '24px',
          }}
        >
          <div>
            <h1
              style={{
                'font-size': '28px',
                'font-weight': '700',
                margin: '0 0 4px 0',
                color: colors.text,
              }}
            >
              Server Management
            </h1>
            <p style={{ margin: '0', 'font-size': '14px', color: colors.textMuted }}>
              Monitor and manage game servers
            </p>
          </div>
          <button
            onClick={fetchServers}
            disabled={loading()}
            style={{
              background: colors.bg2,
              border: `1px solid ${colors.border}`,
              color: colors.text,
              padding: '10px 20px',
              'border-radius': '8px',
              cursor: loading() ? 'not-allowed' : 'pointer',
              'font-size': '13px',
              'font-weight': '500',
              opacity: loading() ? '0.6' : '1',
              transition: 'background-color 0.2s ease',
            }}
          >
            Refresh
          </button>
        </div>

        {/* Aggregate Stats Bar */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            'margin-bottom': '24px',
            'flex-wrap': 'wrap',
          }}
        >
          <div
            style={{
              'background-color': colors.bg1,
              'border-radius': '10px',
              border: `1px solid ${colors.border}`,
              padding: '16px 24px',
              flex: '1',
              'min-width': '180px',
              display: 'flex',
              'align-items': 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                'border-radius': '8px',
                'background-color': `${colors.blue}20`,
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '18px',
                color: colors.blue,
                'font-weight': '700',
              }}
            >
              #
            </div>
            <div>
              <div style={{ 'font-size': '11px', 'text-transform': 'uppercase', 'letter-spacing': '0.05em', color: colors.textMuted, 'margin-bottom': '2px' }}>
                Total Servers
              </div>
              <div style={{ 'font-size': '22px', 'font-weight': '700', color: colors.text }}>
                {totalServers()}
              </div>
            </div>
          </div>

          <div
            style={{
              'background-color': colors.bg1,
              'border-radius': '10px',
              border: `1px solid ${colors.border}`,
              padding: '16px 24px',
              flex: '1',
              'min-width': '180px',
              display: 'flex',
              'align-items': 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                'border-radius': '8px',
                'background-color': `${colors.green}20`,
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '18px',
                color: colors.green,
                'font-weight': '700',
              }}
            >
              &gt;
            </div>
            <div>
              <div style={{ 'font-size': '11px', 'text-transform': 'uppercase', 'letter-spacing': '0.05em', color: colors.textMuted, 'margin-bottom': '2px' }}>
                Servers Online
              </div>
              <div style={{ 'font-size': '22px', 'font-weight': '700', color: serversOnline() > 0 ? colors.green : colors.red }}>
                {serversOnline()} / {totalServers()}
              </div>
            </div>
          </div>

          <div
            style={{
              'background-color': colors.bg1,
              'border-radius': '10px',
              border: `1px solid ${colors.border}`,
              padding: '16px 24px',
              flex: '1',
              'min-width': '180px',
              display: 'flex',
              'align-items': 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                'border-radius': '8px',
                'background-color': `${colors.yellow}20`,
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                'font-size': '18px',
                color: colors.yellow,
                'font-weight': '700',
              }}
            >
              @
            </div>
            <div>
              <div style={{ 'font-size': '11px', 'text-transform': 'uppercase', 'letter-spacing': '0.05em', color: colors.textMuted, 'margin-bottom': '2px' }}>
                Total Players
              </div>
              <div style={{ 'font-size': '22px', 'font-weight': '700', color: colors.text }}>
                {totalPlayers().toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <Show when={error()}>
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(248, 81, 73, 0.1)',
              border: '1px solid rgba(248, 81, 73, 0.4)',
              'border-radius': '8px',
              color: colors.red,
              'font-size': '14px',
              'margin-bottom': '20px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'space-between',
            }}
          >
            <span>{error()}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: colors.red,
                cursor: 'pointer',
                'font-size': '18px',
                padding: '0 4px',
                'line-height': '1',
              }}
            >
              x
            </button>
          </div>
        </Show>

        {/* Loading State */}
        <Show when={loading()}>
          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              padding: '60px 0',
              color: colors.textMuted,
              'font-size': '14px',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '20px',
                height: '20px',
                border: `2px solid ${colors.bg3}`,
                'border-top-color': colors.blue,
                'border-radius': '50%',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            Loading servers...
          </div>
        </Show>

        {/* Server Cards Grid */}
        <Show when={!loading()}>
          <Show
            when={serverList().length > 0}
            fallback={
              <div
                style={{
                  'text-align': 'center',
                  color: colors.textMuted,
                  padding: '60px 20px',
                  'font-size': '14px',
                  'background-color': colors.bg1,
                  'border-radius': '12px',
                  border: `1px solid ${colors.border}`,
                }}
              >
                No servers found.
              </div>
            }
          >
            <div
              style={{
                display: 'grid',
                'grid-template-columns': 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '16px',
              }}
            >
              <For each={serverList()}>
                {(server) => (
                  <ServerCard
                    server={server}
                    onAction={handleActionRequest}
                    actionLoading={actionLoading}
                  />
                )}
              </For>
            </div>
          </Show>
        </Show>
      </div>

      {/* Confirmation Dialog */}
      <Show when={confirmAction()}>
        {(action) => {
          const config = confirmActionLabels[action().action];
          return (
            <Show when={config}>
              <ConfirmDialog
                title={config!.title}
                message={config!.message(action().serverName)}
                confirmLabel={config!.label}
                confirmColor={config!.color}
                onConfirm={executeAction}
                onCancel={() => setConfirmAction(null)}
              />
            </Show>
          );
        }}
      </Show>
    </div>
  );
}
