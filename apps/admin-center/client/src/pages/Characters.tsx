import { createSignal, createResource, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { characters } from '../lib/api';

const CLASS_COLORS: Record<string, string> = {
  warrior: '#f85149',
  assassin: '#a371f7',
  shaman: '#3fb950',
  sorcerer: '#58a6ff',
};

const KINGDOM_NAMES: Record<number, string> = {
  1: 'Shinsoo',
  2: 'Chunjo',
  3: 'Jinno',
};

function formatGold(value: number): string {
  if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
  return value.toLocaleString();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Characters() {
  const [search, setSearch] = createSignal('');
  const [classFilter, setClassFilter] = createSignal('');
  const [kingdomFilter, setKingdomFilter] = createSignal('');
  const [onlineFilter, setOnlineFilter] = createSignal('');
  const [minLevel, setMinLevel] = createSignal('');
  const [maxLevel, setMaxLevel] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [sortBy, setSortBy] = createSignal('name');
  const [sortOrder, setSortOrder] = createSignal('asc');
  const pageSize = 20;

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      pageSize,
      search: search(),
      characterClass: classFilter(),
      kingdom: kingdomFilter() ? Number(kingdomFilter()) : undefined,
      minLevel: minLevel() ? Number(minLevel()) : undefined,
      maxLevel: maxLevel() ? Number(maxLevel()) : undefined,
      isOnline: onlineFilter() || undefined,
      sortBy: sortBy(),
      sortOrder: sortOrder(),
    }),
    (params) => characters.list(params as any),
  );

  const items = () => data()?.data ?? [];
  const pagination = () => data()?.pagination ?? { page: 1, pageSize, total: 0, totalPages: 1 };

  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  function handleSearchInput(value: string) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 300);
  }

  function handleSort(column: string) {
    if (sortBy() === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  }

  function sortIndicator(column: string): string {
    if (sortBy() !== column) return '';
    return sortOrder() === 'asc' ? ' \u25B2' : ' \u25BC';
  }

  // --- Styles ---
  const containerStyle = {
    padding: '24px',
    'min-height': '100%',
  };

  const headerStyle = {
    'font-size': '24px',
    'font-weight': '600',
    color: '#e6edf3',
    'margin-bottom': '20px',
  };

  const filterBarStyle = {
    display: 'flex',
    'flex-wrap': 'wrap' as const,
    gap: '12px',
    'margin-bottom': '20px',
    'align-items': 'flex-end',
  };

  const filterGroupStyle = {
    display: 'flex',
    'flex-direction': 'column' as const,
    gap: '4px',
  };

  const labelStyle = {
    'font-size': '12px',
    color: '#8b949e',
    'font-weight': '500',
  };

  const inputStyle = {
    background: '#161b22',
    border: '1px solid #30363d',
    'border-radius': '6px',
    color: '#e6edf3',
    padding: '8px 12px',
    'font-size': '14px',
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    'min-width': '130px',
  };

  const levelInputStyle = {
    ...inputStyle,
    width: '80px',
  };

  const tableWrapperStyle = {
    background: '#161b22',
    border: '1px solid #30363d',
    'border-radius': '8px',
    overflow: 'hidden',
  };

  const tableStyle = {
    width: '100%',
    'border-collapse': 'collapse' as const,
  };

  const thStyle = {
    padding: '12px 16px',
    'text-align': 'left' as const,
    'font-size': '12px',
    'font-weight': '600',
    color: '#8b949e',
    'text-transform': 'uppercase' as const,
    'letter-spacing': '0.5px',
    'border-bottom': '1px solid #30363d',
    background: '#1c2128',
    cursor: 'pointer',
    'user-select': 'none',
    'white-space': 'nowrap' as const,
  };

  const tdStyle = {
    padding: '12px 16px',
    'font-size': '14px',
    color: '#e6edf3',
    'border-bottom': '1px solid #21262d',
  };

  const badgeStyle = (color: string) => ({
    display: 'inline-block',
    padding: '2px 8px',
    'border-radius': '12px',
    'font-size': '12px',
    'font-weight': '500',
    color: '#ffffff',
    background: color + '22',
    border: `1px solid ${color}55`,
  });

  const dotStyle = (online: boolean) => ({
    display: 'inline-block',
    width: '8px',
    height: '8px',
    'border-radius': '50%',
    background: online ? '#3fb950' : '#484f58',
    'box-shadow': online ? '0 0 6px #3fb95066' : 'none',
  });

  const viewBtnStyle = {
    background: '#58a6ff22',
    border: '1px solid #58a6ff55',
    color: '#58a6ff',
    padding: '4px 12px',
    'border-radius': '6px',
    'font-size': '13px',
    cursor: 'pointer',
    'text-decoration': 'none',
    'white-space': 'nowrap' as const,
  };

  const paginationStyle = {
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
    padding: '16px',
    'border-top': '1px solid #30363d',
    background: '#1c2128',
  };

  const paginationInfoStyle = {
    'font-size': '13px',
    color: '#8b949e',
  };

  const paginationBtnsStyle = {
    display: 'flex',
    gap: '4px',
  };

  const pageBtnStyle = (active: boolean, disabled: boolean) => ({
    padding: '6px 12px',
    'border-radius': '6px',
    border: '1px solid ' + (active ? '#58a6ff' : '#30363d'),
    background: active ? '#58a6ff22' : '#161b22',
    color: active ? '#58a6ff' : disabled ? '#484f58' : '#e6edf3',
    'font-size': '13px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? '0.5' : '1',
  });

  const emptyStateStyle = {
    padding: '48px 16px',
    'text-align': 'center' as const,
    color: '#8b949e',
    'font-size': '14px',
  };

  const loadingRowStyle = {
    padding: '48px 16px',
    'text-align': 'center' as const,
    color: '#8b949e',
    'font-size': '14px',
  };

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>Characters</h1>

      {/* Search & Filter Bar */}
      <div style={filterBarStyle}>
        <div style={filterGroupStyle}>
          <label style={labelStyle}>Search</label>
          <input
            type="text"
            placeholder="Character name..."
            style={{ ...inputStyle, 'min-width': '200px' }}
            onInput={(e) => handleSearchInput(e.currentTarget.value)}
          />
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>Class</label>
          <select
            style={selectStyle}
            value={classFilter()}
            onChange={(e) => { setClassFilter(e.currentTarget.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="warrior">Warrior</option>
            <option value="assassin">Assassin</option>
            <option value="shaman">Shaman</option>
            <option value="sorcerer">Sorcerer</option>
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>Kingdom</label>
          <select
            style={selectStyle}
            value={kingdomFilter()}
            onChange={(e) => { setKingdomFilter(e.currentTarget.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="1">Shinsoo</option>
            <option value="2">Chunjo</option>
            <option value="3">Jinno</option>
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>Status</label>
          <select
            style={selectStyle}
            value={onlineFilter()}
            onChange={(e) => { setOnlineFilter(e.currentTarget.value); setPage(1); }}
          >
            <option value="">All</option>
            <option value="true">Online</option>
            <option value="false">Offline</option>
          </select>
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>Min Level</label>
          <input
            type="number"
            placeholder="1"
            min="1"
            style={levelInputStyle}
            value={minLevel()}
            onInput={(e) => { setMinLevel(e.currentTarget.value); setPage(1); }}
          />
        </div>

        <div style={filterGroupStyle}>
          <label style={labelStyle}>Max Level</label>
          <input
            type="number"
            placeholder="120"
            min="1"
            style={levelInputStyle}
            value={maxLevel()}
            onInput={(e) => { setMaxLevel(e.currentTarget.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Characters Table */}
      <div style={tableWrapperStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort('name')}>
                Name{sortIndicator('name')}
              </th>
              <th style={thStyle} onClick={() => handleSort('characterClass')}>
                Class{sortIndicator('characterClass')}
              </th>
              <th style={thStyle} onClick={() => handleSort('level')}>
                Level{sortIndicator('level')}
              </th>
              <th style={thStyle} onClick={() => handleSort('kingdom')}>
                Kingdom{sortIndicator('kingdom')}
              </th>
              <th style={thStyle} onClick={() => handleSort('zone')}>
                Zone{sortIndicator('zone')}
              </th>
              <th style={thStyle} onClick={() => handleSort('gold')}>
                Gold{sortIndicator('gold')}
              </th>
              <th style={{ ...thStyle, 'text-align': 'center' }}>Online</th>
              <th style={{ ...thStyle, cursor: 'default' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <Show when={!data.loading} fallback={
              <tr><td colspan="8" style={loadingRowStyle}>Loading characters...</td></tr>
            }>
              <Show when={items().length > 0} fallback={
                <tr><td colspan="8" style={emptyStateStyle}>No characters found.</td></tr>
              }>
                <For each={items()}>
                  {(char) => (
                    <tr
                      style={{ transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ ...tdStyle, 'font-weight': '500' }}>{char.name}</td>
                      <td style={tdStyle}>
                        <span style={badgeStyle(CLASS_COLORS[char.characterClass] ?? '#8b949e')}>
                          {capitalize(char.characterClass)}
                        </span>
                      </td>
                      <td style={tdStyle}>{char.level}</td>
                      <td style={tdStyle}>{KINGDOM_NAMES[char.kingdom] ?? `Kingdom ${char.kingdom}`}</td>
                      <td style={{ ...tdStyle, color: '#8b949e' }}>{char.zone}</td>
                      <td style={{ ...tdStyle, color: '#d29922', 'font-variant-numeric': 'tabular-nums' }}>
                        {formatGold(char.gold)}
                      </td>
                      <td style={{ ...tdStyle, 'text-align': 'center' }}>
                        <span style={dotStyle(char.isOnline)} title={char.isOnline ? 'Online' : 'Offline'} />
                      </td>
                      <td style={tdStyle}>
                        <A href={`/characters/${char.id}`} style={viewBtnStyle}>
                          View
                        </A>
                      </td>
                    </tr>
                  )}
                </For>
              </Show>
            </Show>
          </tbody>
        </table>

        {/* Pagination */}
        <Show when={pagination().totalPages > 1}>
          <div style={paginationStyle}>
            <span style={paginationInfoStyle}>
              Showing {((pagination().page - 1) * pagination().pageSize) + 1}
              {' '}-{' '}
              {Math.min(pagination().page * pagination().pageSize, pagination().total)}
              {' '}of {pagination().total} characters
            </span>
            <div style={paginationBtnsStyle}>
              <button
                style={pageBtnStyle(false, page() === 1)}
                disabled={page() === 1}
                onClick={() => setPage(1)}
              >
                First
              </button>
              <button
                style={pageBtnStyle(false, page() === 1)}
                disabled={page() === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <For each={(() => {
                const total = pagination().totalPages;
                const current = page();
                const pages: number[] = [];
                let start = Math.max(1, current - 2);
                let end = Math.min(total, current + 2);
                if (end - start < 4) {
                  start = Math.max(1, end - 4);
                  end = Math.min(total, start + 4);
                }
                for (let i = start; i <= end; i++) pages.push(i);
                return pages;
              })()}>
                {(p) => (
                  <button
                    style={pageBtnStyle(p === page(), false)}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )}
              </For>
              <button
                style={pageBtnStyle(false, page() === pagination().totalPages)}
                disabled={page() === pagination().totalPages}
                onClick={() => setPage((p) => Math.min(pagination().totalPages, p + 1))}
              >
                Next
              </button>
              <button
                style={pageBtnStyle(false, page() === pagination().totalPages)}
                disabled={page() === pagination().totalPages}
                onClick={() => setPage(pagination().totalPages)}
              >
                Last
              </button>
            </div>
          </div>
        </Show>

        {/* Pagination info when single page */}
        <Show when={pagination().totalPages <= 1 && pagination().total > 0}>
          <div style={paginationStyle}>
            <span style={paginationInfoStyle}>
              {pagination().total} character{pagination().total !== 1 ? 's' : ''} total
            </span>
            <div />
          </div>
        </Show>
      </div>
    </div>
  );
}
