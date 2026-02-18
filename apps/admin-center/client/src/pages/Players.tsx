import { createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { players, downloadCsv } from '../lib/api';
import { toastStore } from '../stores/toast';

const PAGE_SIZE = 20;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const roleBadgeColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'rgba(88, 166, 255, 0.15)', text: '#58a6ff' },
  gm: { bg: 'rgba(210, 153, 34, 0.15)', text: '#d29922' },
  player: { bg: 'rgba(139, 148, 158, 0.15)', text: '#8b949e' },
};

const statusColors = {
  banned: { bg: 'rgba(248, 81, 73, 0.15)', text: '#f85149' },
  active: { bg: 'rgba(63, 185, 80, 0.15)', text: '#3fb950' },
};

export default function Players() {
  const navigate = useNavigate();

  const [search, setSearch] = createSignal('');
  const [roleFilter, setRoleFilter] = createSignal('');
  const [bannedFilter, setBannedFilter] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [data, setData] = createSignal<any[]>([]);
  const [pagination, setPagination] = createSignal({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  async function fetchPlayers() {
    setLoading(true);
    setError(null);
    try {
      const res = await players.list({
        page: page(),
        pageSize: PAGE_SIZE,
        search: search() || undefined,
        role: roleFilter() || undefined,
        banned: bannedFilter() || undefined,
      });
      setData(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load players');
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    fetchPlayers();
  });

  createEffect(() => {
    // Re-fetch when page changes (tracked reactively)
    page();
    fetchPlayers();
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    setPage(1);
    fetchPlayers();
  }

  function handleFilterChange() {
    setPage(1);
    fetchPlayers();
  }

  return (
    <div style={{ padding: '24px', "max-width": '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ "margin-bottom": '24px', display: 'flex', 'justify-content': 'space-between', 'align-items': 'flex-start' }}>
        <div>
          <h1 style={{
            margin: '0 0 4px 0',
            "font-size": '24px',
            "font-weight": '600',
            color: '#e6edf3',
          }}>
            Player Management
          </h1>
          <p style={{ margin: 0, color: '#8b949e', "font-size": '14px' }}>
            Search, view, and manage player accounts
          </p>
        </div>
        <button
          onClick={() => {
            const data = playerList();
            if (data && data.length > 0) {
              downloadCsv(
                data.map((p: any) => ({
                  username: p.username,
                  email: p.email,
                  role: p.role,
                  banned: p.isBanned ? 'Yes' : 'No',
                  lastLogin: p.lastLogin ?? 'Never',
                  createdAt: p.createdAt,
                })),
                `players-export-${new Date().toISOString().slice(0, 10)}.csv`,
              );
              toastStore.success('Player data exported');
            } else {
              toastStore.warn('No data to export');
            }
          }}
          style={{
            background: '#21262d',
            border: '1px solid #30363d',
            color: '#e6edf3',
            padding: '8px 16px',
            'border-radius': '6px',
            cursor: 'pointer',
            'font-size': '13px',
            'white-space': 'nowrap',
          }}
        >
          Export CSV
        </button>
      </div>

      {/* Search & Filter Bar */}
      <form
        onSubmit={handleSearch}
        style={{
          display: 'flex',
          gap: '12px',
          "align-items": 'center',
          "flex-wrap": 'wrap',
          padding: '16px',
          background: '#161b22',
          "border-radius": '8px',
          border: '1px solid #30363d',
          "margin-bottom": '16px',
        }}
      >
        <input
          type="text"
          placeholder="Search by username or email..."
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          style={{
            flex: '1',
            "min-width": '220px',
            padding: '8px 12px',
            background: '#0f1117',
            border: '1px solid #30363d',
            "border-radius": '6px',
            color: '#e6edf3',
            "font-size": '14px',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
        />

        <select
          value={roleFilter()}
          onChange={(e) => { setRoleFilter(e.currentTarget.value); handleFilterChange(); }}
          style={{
            padding: '8px 12px',
            background: '#0f1117',
            border: '1px solid #30363d',
            "border-radius": '6px',
            color: '#e6edf3',
            "font-size": '14px',
            cursor: 'pointer',
            outline: 'none',
            "min-width": '130px',
          }}
        >
          <option value="">All Roles</option>
          <option value="player">Player</option>
          <option value="gm">GM</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={bannedFilter()}
          onChange={(e) => { setBannedFilter(e.currentTarget.value); handleFilterChange(); }}
          style={{
            padding: '8px 12px',
            background: '#0f1117',
            border: '1px solid #30363d',
            "border-radius": '6px',
            color: '#e6edf3',
            "font-size": '14px',
            cursor: 'pointer',
            outline: 'none',
            "min-width": '150px',
          }}
        >
          <option value="">All Status</option>
          <option value="true">Banned</option>
          <option value="false">Not Banned</option>
        </select>

        <button
          type="submit"
          style={{
            padding: '8px 20px',
            background: '#58a6ff',
            color: '#0f1117',
            border: 'none',
            "border-radius": '6px',
            "font-size": '14px',
            "font-weight": '600',
            cursor: 'pointer',
            "white-space": 'nowrap',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#79b8ff'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#58a6ff'; }}
        >
          Search
        </button>
      </form>

      {/* Error */}
      <Show when={error()}>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(248, 81, 73, 0.1)',
          border: '1px solid rgba(248, 81, 73, 0.4)',
          "border-radius": '6px',
          color: '#f85149',
          "font-size": '14px',
          "margin-bottom": '16px',
        }}>
          {error()}
        </div>
      </Show>

      {/* Loading */}
      <Show when={loading()}>
        <div style={{
          display: 'flex',
          "justify-content": 'center',
          padding: '40px',
          color: '#8b949e',
          "font-size": '14px',
        }}>
          Loading players...
        </div>
      </Show>

      {/* Table */}
      <Show when={!loading()}>
        <div style={{
          background: '#161b22',
          "border-radius": '8px',
          border: '1px solid #30363d',
          overflow: 'hidden',
        }}>
          <div style={{ "overflow-x": 'auto' }}>
            <table style={{
              width: '100%',
              "border-collapse": 'collapse',
              "font-size": '14px',
            }}>
              <thead>
                <tr style={{ background: '#1c2128' }}>
                  <For each={['Username', 'Email', 'Role', 'Status', 'Created', 'Last Login', 'Actions']}>
                    {(header) => (
                      <th style={{
                        padding: '12px 16px',
                        "text-align": 'left',
                        color: '#8b949e',
                        "font-weight": '600',
                        "font-size": '12px',
                        "text-transform": 'uppercase',
                        "letter-spacing": '0.5px',
                        "border-bottom": '1px solid #30363d',
                        "white-space": 'nowrap',
                      }}>
                        {header}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <Show when={data().length === 0}>
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: '40px 16px',
                        "text-align": 'center',
                        color: '#8b949e',
                      }}
                    >
                      No players found.
                    </td>
                  </tr>
                </Show>
                <For each={data()}>
                  {(player) => {
                    const roleColors = roleBadgeColors[player.role] ?? roleBadgeColors.player;
                    const statusCol = player.isBanned ? statusColors.banned : statusColors.active;
                    return (
                      <tr
                        style={{
                          "border-bottom": '1px solid #21262d',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ padding: '12px 16px', color: '#e6edf3', "font-weight": '500' }}>
                          {player.username}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#8b949e' }}>
                          {player.email}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            "border-radius": '12px',
                            background: roleColors.bg,
                            color: roleColors.text,
                            "font-size": '12px',
                            "font-weight": '500',
                            "text-transform": 'capitalize',
                          }}>
                            {player.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            "border-radius": '12px',
                            background: statusCol.bg,
                            color: statusCol.text,
                            "font-size": '12px',
                            "font-weight": '500',
                          }}>
                            {player.isBanned ? 'Banned' : 'Active'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#8b949e', "white-space": 'nowrap' }}>
                          {formatDate(player.createdAt)}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#8b949e', "white-space": 'nowrap' }}>
                          {formatDate(player.lastLogin)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => navigate(`/players/${player.id}`)}
                            style={{
                              padding: '6px 14px',
                              background: 'transparent',
                              border: '1px solid #30363d',
                              "border-radius": '6px',
                              color: '#58a6ff',
                              "font-size": '13px',
                              cursor: 'pointer',
                              "white-space": 'nowrap',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(88, 166, 255, 0.1)';
                              e.currentTarget.style.borderColor = '#58a6ff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = '#30363d';
                            }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{
            display: 'flex',
            "justify-content": 'space-between',
            "align-items": 'center',
            padding: '12px 16px',
            "border-top": '1px solid #30363d',
            background: '#1c2128',
          }}>
            <span style={{ color: '#8b949e', "font-size": '13px' }}>
              Showing {((pagination().page - 1) * pagination().pageSize) + 1}
              {' '}-{' '}
              {Math.min(pagination().page * pagination().pageSize, pagination().total)}
              {' '}of {pagination().total} players
            </span>
            <div style={{ display: 'flex', gap: '8px', "align-items": 'center' }}>
              <button
                disabled={pagination().page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '6px 14px',
                  background: pagination().page <= 1 ? '#21262d' : '#30363d',
                  border: '1px solid #30363d',
                  "border-radius": '6px',
                  color: pagination().page <= 1 ? '#484f58' : '#e6edf3',
                  "font-size": '13px',
                  cursor: pagination().page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span style={{ color: '#8b949e', "font-size": '13px', padding: '0 8px' }}>
                Page {pagination().page} of {pagination().totalPages}
              </span>
              <button
                disabled={pagination().page >= pagination().totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '6px 14px',
                  background: pagination().page >= pagination().totalPages ? '#21262d' : '#30363d',
                  border: '1px solid #30363d',
                  "border-radius": '6px',
                  color: pagination().page >= pagination().totalPages ? '#484f58' : '#e6edf3',
                  "font-size": '13px',
                  cursor: pagination().page >= pagination().totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
