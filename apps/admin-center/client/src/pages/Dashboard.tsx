import { createResource, createSignal, onMount, onCleanup, Show, For, type JSX } from 'solid-js';
import { dashboard, subscribeDashboard } from '../lib/api';
import type {
  ApiResponse,
  DashboardStats,
  KingdomDistribution,
  ClassDistribution,
  LevelDistribution,
  AuditLogEntry,
  GameServer,
} from '@tenos/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0';
  return n.toLocaleString();
}

function formatGold(n: number | undefined | null): string {
  if (n == null) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAction(action: string): string {
  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const colors = {
  bg0: '#0f1117',
  bg1: '#161b22',
  bg2: '#1c2128',
  bg3: '#21262d',
  text: '#e6edf3',
  textMuted: '#8b949e',
  blue: '#58a6ff',
  green: '#3fb950',
  red: '#f85149',
  yellow: '#d29922',
} as const;

const cardStyle: JSX.CSSProperties = {
  'background-color': colors.bg1,
  'border-radius': '12px',
  border: `1px solid ${colors.bg3}`,
  padding: '24px',
  overflow: 'hidden',
};

const cardHeaderStyle: JSX.CSSProperties = {
  'font-size': '14px',
  'font-weight': '600',
  'text-transform': 'uppercase',
  'letter-spacing': '0.05em',
  color: colors.textMuted,
  'margin-bottom': '20px',
  'padding-bottom': '12px',
  'border-bottom': `1px solid ${colors.bg3}`,
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard(props: { label: string; value: string; color?: string; icon: string }) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: '20px',
        display: 'flex',
        'align-items': 'center',
        gap: '16px',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          'border-radius': '10px',
          'background-color': colors.bg2,
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'font-size': '22px',
          'flex-shrink': '0',
        }}
      >
        {props.icon}
      </div>
      <div style={{ 'min-width': '0' }}>
        <div
          style={{
            'font-size': '12px',
            'font-weight': '500',
            color: colors.textMuted,
            'text-transform': 'uppercase',
            'letter-spacing': '0.05em',
            'margin-bottom': '4px',
            'white-space': 'nowrap',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
          }}
        >
          {props.label}
        </div>
        <div
          style={{
            'font-size': '26px',
            'font-weight': '700',
            color: props.color ?? colors.text,
            'line-height': '1.1',
          }}
        >
          {props.value}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / Error states
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
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
      Loading...
    </div>
  );
}

function ErrorMessage(props: { message: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        'flex-direction': 'column',
        'align-items': 'center',
        'justify-content': 'center',
        padding: '40px 20px',
        color: colors.red,
        'font-size': '14px',
        gap: '12px',
        'text-align': 'center',
      }}
    >
      <span style={{ 'font-size': '28px' }}>!</span>
      <span>{props.message}</span>
      <Show when={props.onRetry}>
        <button
          onClick={props.onRetry}
          style={{
            background: colors.bg3,
            border: 'none',
            color: colors.text,
            padding: '8px 16px',
            'border-radius': '6px',
            cursor: 'pointer',
            'font-size': '13px',
          }}
        >
          Retry
        </button>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Server Card
// ---------------------------------------------------------------------------

function ServerCard(props: { server: GameServer }) {
  const statusColors: Record<string, string> = {
    online: colors.green,
    offline: colors.red,
    maintenance: colors.yellow,
    starting: colors.yellow,
    stopping: colors.yellow,
  };

  const statusColor = () => statusColors[props.server.status] ?? colors.textMuted;

  function usageBar(label: string, value: number, color: string) {
    const clamped = Math.min(100, Math.max(0, value));
    return (
      <div style={{ 'margin-top': '8px' }}>
        <div
          style={{
            display: 'flex',
            'justify-content': 'space-between',
            'font-size': '11px',
            color: colors.textMuted,
            'margin-bottom': '4px',
          }}
        >
          <span>{label}</span>
          <span>{clamped.toFixed(1)}%</span>
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
              'background-color': color,
              'border-radius': '3px',
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...cardStyle, padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          'margin-bottom': '14px',
        }}
      >
        <span style={{ 'font-weight': '600', 'font-size': '15px', color: colors.text }}>
          {props.server.name}
        </span>
        <span
          style={{
            'font-size': '11px',
            'font-weight': '600',
            'text-transform': 'uppercase',
            padding: '3px 10px',
            'border-radius': '12px',
            'background-color': `${statusColor()}20`,
            color: statusColor(),
            'letter-spacing': '0.04em',
          }}
        >
          {props.server.status}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          'align-items': 'baseline',
          gap: '6px',
          'font-size': '13px',
          color: colors.textMuted,
          'margin-bottom': '4px',
        }}
      >
        <span style={{ 'font-size': '22px', 'font-weight': '700', color: colors.text }}>
          {formatNumber(props.server.currentPlayers)}
        </span>
        <span>/ {formatNumber(props.server.maxPlayers)} players</span>
      </div>
      {usageBar('CPU', props.server.cpuUsage, props.server.cpuUsage > 80 ? colors.red : colors.blue)}
      {usageBar(
        'Memory',
        props.server.memoryUsage,
        props.server.memoryUsage > 80 ? colors.red : colors.green,
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Distribution Bar
// ---------------------------------------------------------------------------

function DistributionBar(props: {
  label: string;
  count: number;
  percentage: number;
  color: string;
  maxPercentage: number;
}) {
  const barWidth = () => (props.maxPercentage > 0 ? (props.percentage / props.maxPercentage) * 100 : 0);

  return (
    <div style={{ 'margin-bottom': '14px' }}>
      <div
        style={{
          display: 'flex',
          'justify-content': 'space-between',
          'font-size': '13px',
          'margin-bottom': '6px',
        }}
      >
        <span style={{ color: colors.text, 'font-weight': '500' }}>{props.label}</span>
        <span style={{ color: colors.textMuted }}>
          {formatNumber(props.count)} ({props.percentage.toFixed(1)}%)
        </span>
      </div>
      <div
        style={{
          height: '10px',
          'background-color': colors.bg3,
          'border-radius': '5px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${barWidth()}%`,
            'background-color': props.color,
            'border-radius': '5px',
            transition: 'width 0.6s ease',
          }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level Distribution Chart (vertical bars)
// ---------------------------------------------------------------------------

function LevelChart(props: { data: LevelDistribution[] }) {
  const maxCount = () => Math.max(...props.data.map((d) => d.count), 1);

  return (
    <div
      style={{
        display: 'flex',
        'align-items': 'flex-end',
        gap: '6px',
        height: '140px',
        'padding-top': '10px',
      }}
    >
      <For each={props.data}>
        {(bucket) => {
          const heightPct = () => (bucket.count / maxCount()) * 100;
          return (
            <div
              style={{
                flex: '1',
                display: 'flex',
                'flex-direction': 'column',
                'align-items': 'center',
                height: '100%',
                'justify-content': 'flex-end',
              }}
            >
              <span
                style={{
                  'font-size': '10px',
                  color: colors.textMuted,
                  'margin-bottom': '4px',
                }}
              >
                {formatNumber(bucket.count)}
              </span>
              <div
                style={{
                  width: '100%',
                  'max-width': '36px',
                  height: `${Math.max(heightPct(), 2)}%`,
                  'background-color': colors.blue,
                  'border-radius': '4px 4px 0 0',
                  'min-height': '4px',
                  transition: 'height 0.6s ease',
                }}
              />
              <span
                style={{
                  'font-size': '10px',
                  color: colors.textMuted,
                  'margin-top': '6px',
                  'text-align': 'center',
                  'line-height': '1.2',
                  'white-space': 'nowrap',
                }}
              >
                {bucket.range}
              </span>
            </div>
          );
        }}
      </For>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  // Fetch all dashboard data in parallel
  const [stats, { refetch: refetchStats }] = createResource(() =>
    dashboard.stats().then((r: ApiResponse<DashboardStats>) => r.data),
  );
  const [serverOverview, { refetch: refetchServers }] = createResource(() =>
    dashboard.serverOverview().then((r: ApiResponse<GameServer[]>) => r.data),
  );
  const [kingdomDist] = createResource(() =>
    dashboard.kingdomDistribution().then((r: ApiResponse<KingdomDistribution[]>) => r.data),
  );
  const [classDist] = createResource(() =>
    dashboard.classDistribution().then((r: ApiResponse<ClassDistribution[]>) => r.data),
  );
  const [levelDist] = createResource(() =>
    dashboard.levelDistribution().then((r: ApiResponse<LevelDistribution[]>) => r.data),
  );
  const [recentActivity, { refetch: refetchActivity }] = createResource(() =>
    dashboard.recentActivity(10).then((r: ApiResponse<AuditLogEntry[]>) => r.data),
  );

  // Kingdom colors
  const kingdomColors: Record<string, string> = {
    Shinsoo: '#58a6ff',
    Chunjo: '#f85149',
    Jinno: '#3fb950',
  };

  // Class colors
  const classColors: Record<string, string> = {
    warrior: '#f85149',
    assassin: '#d29922',
    shaman: '#58a6ff',
    sorcerer: '#a371f7',
  };

  // Auto-refresh: poll stats every 30 seconds
  const [autoRefresh, setAutoRefresh] = createSignal(true);
  const [lastUpdated, setLastUpdated] = createSignal<string>(new Date().toLocaleTimeString());
  let refreshInterval: ReturnType<typeof setInterval> | undefined;

  onMount(() => {
    refreshInterval = setInterval(() => {
      if (autoRefresh()) {
        refetchStats();
        refetchServers();
        refetchActivity();
        setLastUpdated(new Date().toLocaleTimeString());
      }
    }, 30_000);
  });

  onCleanup(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });

  function handleRefreshAll() {
    refetchStats();
    refetchServers();
    refetchActivity();
    setLastUpdated(new Date().toLocaleTimeString());
  }

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
            'margin-bottom': '32px',
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
              Dashboard
            </h1>
            <p style={{ margin: '0', 'font-size': '14px', color: colors.textMuted }}>
              Server overview and real-time statistics
            </p>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
            <span style={{ 'font-size': '12px', color: colors.textMuted }}>
              Updated {lastUpdated()}
            </span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh())}
              style={{
                background: autoRefresh() ? '#0d2818' : colors.bg2,
                border: `1px solid ${autoRefresh() ? colors.green : colors.bg3}`,
                color: autoRefresh() ? colors.green : colors.textMuted,
                padding: '8px 14px',
                'border-radius': '6px',
                cursor: 'pointer',
                'font-size': '12px',
              }}
            >
              {autoRefresh() ? '\u25CF Live' : '\u25CB Paused'}
            </button>
            <button
              onClick={handleRefreshAll}
              style={{
                background: colors.bg2,
                border: `1px solid ${colors.bg3}`,
                color: colors.text,
                padding: '10px 20px',
                'border-radius': '8px',
                cursor: 'pointer',
                'font-size': '13px',
                'font-weight': '500',
                transition: 'background-color 0.2s ease',
              }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <Show when={!stats.loading} fallback={<LoadingSpinner />}>
          <Show
            when={!stats.error}
            fallback={
              <ErrorMessage
                message={`Failed to load statistics: ${stats.error}`}
                onRetry={refetchStats}
              />
            }
          >
            <div
              style={{
                display: 'grid',
                'grid-template-columns': 'repeat(4, 1fr)',
                gap: '16px',
                'margin-bottom': '28px',
              }}
            >
              <StatCard
                icon=">"
                label="Online Players"
                value={formatNumber(stats()?.onlinePlayers)}
                color={colors.green}
              />
              <StatCard
                icon="@"
                label="Total Accounts"
                value={formatNumber(stats()?.totalAccounts)}
              />
              <StatCard
                icon="#"
                label="Total Characters"
                value={formatNumber(stats()?.totalCharacters)}
              />
              <StatCard
                icon="*"
                label="Servers Online"
                value={`${stats()?.serversOnline ?? 0} / ${stats()?.serverCount ?? 0}`}
                color={(stats()?.serversOnline ?? 0) > 0 ? colors.green : colors.red}
              />
              <StatCard
                icon="X"
                label="Active Bans"
                value={formatNumber(stats()?.activeBans)}
                color={colors.red}
              />
              <StatCard
                icon="+"
                label="New Accounts Today"
                value={formatNumber(stats()?.newAccountsToday)}
                color={colors.blue}
              />
              <StatCard
                icon="^"
                label="Peak Players Today"
                value={formatNumber(stats()?.peakPlayersToday)}
                color={colors.yellow}
              />
              <StatCard
                icon="$"
                label="Gold in Circulation"
                value={formatGold(stats()?.totalGoldInCirculation)}
                color={colors.yellow}
              />
            </div>
          </Show>
        </Show>

        {/* Server Overview */}
        <div style={{ ...cardStyle, 'margin-bottom': '28px' }}>
          <div style={cardHeaderStyle}>Server Overview</div>
          <Show when={!serverOverview.loading} fallback={<LoadingSpinner />}>
            <Show
              when={!serverOverview.error}
              fallback={
                <ErrorMessage
                  message={`Failed to load server data: ${serverOverview.error}`}
                  onRetry={refetchServers}
                />
              }
            >
              <Show
                when={(serverOverview() ?? []).length > 0}
                fallback={
                  <div
                    style={{
                      'text-align': 'center',
                      color: colors.textMuted,
                      padding: '24px',
                      'font-size': '14px',
                    }}
                  >
                    No servers configured.
                  </div>
                }
              >
                <div
                  style={{
                    display: 'grid',
                    'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '16px',
                  }}
                >
                  <For each={serverOverview() ?? []}>
                    {(server) => <ServerCard server={server} />}
                  </For>
                </div>
              </Show>
            </Show>
          </Show>
        </div>

        {/* Distribution Charts Row */}
        <div
          style={{
            display: 'grid',
            'grid-template-columns': 'repeat(3, 1fr)',
            gap: '16px',
            'margin-bottom': '28px',
          }}
        >
          {/* Kingdom Distribution */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>Kingdom Distribution</div>
            <Show when={!kingdomDist.loading} fallback={<LoadingSpinner />}>
              <Show
                when={!kingdomDist.error}
                fallback={<ErrorMessage message="Failed to load kingdom data" />}
              >
                {(() => {
                  const data = () => kingdomDist() ?? [];
                  const maxPct = () => Math.max(...data().map((d) => d.percentage), 1);
                  return (
                    <For each={data()}>
                      {(item) => (
                        <DistributionBar
                          label={item.name}
                          count={item.count}
                          percentage={item.percentage}
                          color={kingdomColors[item.name] ?? colors.blue}
                          maxPercentage={maxPct()}
                        />
                      )}
                    </For>
                  );
                })()}
              </Show>
            </Show>
          </div>

          {/* Class Distribution */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>Class Distribution</div>
            <Show when={!classDist.loading} fallback={<LoadingSpinner />}>
              <Show
                when={!classDist.error}
                fallback={<ErrorMessage message="Failed to load class data" />}
              >
                {(() => {
                  const data = () => classDist() ?? [];
                  const maxPct = () => Math.max(...data().map((d) => d.percentage), 1);
                  return (
                    <For each={data()}>
                      {(item) => (
                        <DistributionBar
                          label={item.characterClass.charAt(0).toUpperCase() + item.characterClass.slice(1)}
                          count={item.count}
                          percentage={item.percentage}
                          color={classColors[item.characterClass] ?? colors.blue}
                          maxPercentage={maxPct()}
                        />
                      )}
                    </For>
                  );
                })()}
              </Show>
            </Show>
          </div>

          {/* Level Distribution */}
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>Level Distribution</div>
            <Show when={!levelDist.loading} fallback={<LoadingSpinner />}>
              <Show
                when={!levelDist.error}
                fallback={<ErrorMessage message="Failed to load level data" />}
              >
                <Show
                  when={(levelDist() ?? []).length > 0}
                  fallback={
                    <div style={{ color: colors.textMuted, 'font-size': '13px', 'text-align': 'center', padding: '20px' }}>
                      No data available
                    </div>
                  }
                >
                  <LevelChart data={levelDist()!} />
                </Show>
              </Show>
            </Show>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Recent Activity</div>
          <Show when={!recentActivity.loading} fallback={<LoadingSpinner />}>
            <Show
              when={!recentActivity.error}
              fallback={
                <ErrorMessage
                  message={`Failed to load activity: ${recentActivity.error}`}
                  onRetry={refetchActivity}
                />
              }
            >
              <Show
                when={(recentActivity() ?? []).length > 0}
                fallback={
                  <div
                    style={{
                      'text-align': 'center',
                      color: colors.textMuted,
                      padding: '24px',
                      'font-size': '14px',
                    }}
                  >
                    No recent activity recorded.
                  </div>
                }
              >
                <div style={{ overflow: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      'border-collapse': 'collapse',
                      'font-size': '13px',
                    }}
                  >
                    <thead>
                      <tr>
                        <For each={['Action', 'Actor', 'Target', 'Timestamp']}>
                          {(header) => (
                            <th
                              style={{
                                'text-align': 'left',
                                padding: '10px 16px',
                                color: colors.textMuted,
                                'font-weight': '600',
                                'font-size': '11px',
                                'text-transform': 'uppercase',
                                'letter-spacing': '0.06em',
                                'border-bottom': `1px solid ${colors.bg3}`,
                                'white-space': 'nowrap',
                              }}
                            >
                              {header}
                            </th>
                          )}
                        </For>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={recentActivity() ?? []}>
                        {(entry) => (
                          <tr>
                            <td
                              style={{
                                padding: '10px 16px',
                                'border-bottom': `1px solid ${colors.bg2}`,
                                color: colors.text,
                                'white-space': 'nowrap',
                              }}
                            >
                              <span
                                style={{
                                  'background-color': colors.bg2,
                                  padding: '3px 10px',
                                  'border-radius': '6px',
                                  'font-size': '12px',
                                  'font-weight': '500',
                                }}
                              >
                                {formatAction(entry.action)}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '10px 16px',
                                'border-bottom': `1px solid ${colors.bg2}`,
                                color: colors.blue,
                                'font-weight': '500',
                              }}
                            >
                              {entry.actorUsername}
                            </td>
                            <td
                              style={{
                                padding: '10px 16px',
                                'border-bottom': `1px solid ${colors.bg2}`,
                                color: colors.textMuted,
                              }}
                            >
                              {entry.targetType
                                ? `${entry.targetType} ${entry.targetId ?? ''}`
                                : '--'}
                            </td>
                            <td
                              style={{
                                padding: '10px 16px',
                                'border-bottom': `1px solid ${colors.bg2}`,
                                color: colors.textMuted,
                                'white-space': 'nowrap',
                              }}
                            >
                              {formatTimestamp(entry.createdAt)}
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}
