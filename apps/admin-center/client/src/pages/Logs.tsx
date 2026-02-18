import { logs, downloadCsv } from '../lib/api';
import { createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { authStore } from '../stores/auth';
import { toastStore } from '../stores/toast';

const PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Color constants
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
  orange: '#d18616',
  purple: '#a371f7',
  cyan: '#39d2c0',
} as const;

// ---------------------------------------------------------------------------
// Action badge color mapping
// ---------------------------------------------------------------------------

function getActionColor(action: string): { bg: string; text: string } {
  const a = action.toLowerCase();
  if (a.startsWith('auth') || a.includes('login') || a.includes('logout') || a.includes('session')) {
    return { bg: 'rgba(88, 166, 255, 0.15)', text: colors.blue };
  }
  if (a.startsWith('player') || a.includes('ban') || a.includes('unban')) {
    return { bg: 'rgba(63, 185, 80, 0.15)', text: colors.green };
  }
  if (a.startsWith('character') || a.includes('char')) {
    return { bg: 'rgba(163, 113, 247, 0.15)', text: colors.purple };
  }
  if (a.startsWith('server')) {
    return { bg: 'rgba(210, 153, 34, 0.15)', text: colors.yellow };
  }
  if (a.startsWith('config')) {
    return { bg: 'rgba(209, 134, 22, 0.15)', text: colors.orange };
  }
  if (a.startsWith('tool')) {
    return { bg: 'rgba(57, 210, 192, 0.15)', text: colors.cyan };
  }
  return { bg: 'rgba(139, 148, 158, 0.15)', text: colors.textMuted };
}

// ---------------------------------------------------------------------------
// Announcement type badge colors
// ---------------------------------------------------------------------------

const announcementTypeColors: Record<string, { bg: string; text: string }> = {
  info: { bg: 'rgba(88, 166, 255, 0.15)', text: colors.blue },
  warning: { bg: 'rgba(210, 153, 34, 0.15)', text: colors.yellow },
  maintenance: { bg: 'rgba(209, 134, 22, 0.15)', text: colors.orange },
  event: { bg: 'rgba(63, 185, 80, 0.15)', text: colors.green },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
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

const inputStyle = {
  padding: '8px 12px',
  background: colors.bg0,
  border: `1px solid ${colors.border}`,
  'border-radius': '6px',
  color: colors.text,
  'font-size': '14px',
  outline: 'none',
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
  'min-width': '130px',
};

const labelStyle = {
  'font-size': '12px',
  color: colors.textMuted,
  'font-weight': '500',
  'margin-bottom': '4px',
};

const filterGroupStyle = {
  display: 'flex',
  'flex-direction': 'column' as const,
};

const thStyle = {
  padding: '12px 16px',
  'text-align': 'left' as const,
  'font-size': '12px',
  'font-weight': '600',
  color: colors.textMuted,
  'text-transform': 'uppercase' as const,
  'letter-spacing': '0.5px',
  'border-bottom': `1px solid ${colors.border}`,
  background: colors.bg2,
  'white-space': 'nowrap' as const,
};

const tdStyle = {
  padding: '12px 16px',
  'font-size': '14px',
  color: colors.text,
  'border-bottom': `1px solid ${colors.bg3}`,
  'vertical-align': 'top' as const,
};

// ---------------------------------------------------------------------------
// Logs Page
// ---------------------------------------------------------------------------

export default function Logs() {
  const [activeTab, setActiveTab] = createSignal<'audit' | 'announcements'>('audit');

  // =========================================================================
  // Audit Logs State
  // =========================================================================

  const [auditActions, setAuditActions] = createSignal<string[]>([]);
  const [auditData, setAuditData] = createSignal<any[]>([]);
  const [auditPagination, setAuditPagination] = createSignal({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [auditLoading, setAuditLoading] = createSignal(false);
  const [auditError, setAuditError] = createSignal<string | null>(null);
  const [auditPage, setAuditPage] = createSignal(1);

  // Audit filters
  const [filterAction, setFilterAction] = createSignal('');
  const [filterActor, setFilterActor] = createSignal('');
  const [filterTargetType, setFilterTargetType] = createSignal('');
  const [filterDateFrom, setFilterDateFrom] = createSignal('');
  const [filterDateTo, setFilterDateTo] = createSignal('');

  // Expanded row tracking
  const [expandedRow, setExpandedRow] = createSignal<string | null>(null);

  // =========================================================================
  // Announcements State
  // =========================================================================

  const [announcements, setAnnouncements] = createSignal<any[]>([]);
  const [annPagination, setAnnPagination] = createSignal({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [annLoading, setAnnLoading] = createSignal(false);
  const [annError, setAnnError] = createSignal<string | null>(null);
  const [annPage, setAnnPage] = createSignal(1);

  // Create announcement form
  const [formOpen, setFormOpen] = createSignal(false);
  const [formTitle, setFormTitle] = createSignal('');
  const [formMessage, setFormMessage] = createSignal('');
  const [formType, setFormType] = createSignal('info');
  const [formTarget, setFormTarget] = createSignal('all');
  const [formTargetValue, setFormTargetValue] = createSignal('');
  const [formSchedule, setFormSchedule] = createSignal('');
  const [formExpires, setFormExpires] = createSignal('');
  const [formSubmitting, setFormSubmitting] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);
  const [formSuccess, setFormSuccess] = createSignal<string | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = createSignal<string | null>(null);
  const [deleteLoading, setDeleteLoading] = createSignal(false);

  // =========================================================================
  // Data Fetching
  // =========================================================================

  async function fetchAuditActions() {
    try {
      const res = await logs.auditActions();
      if (res.data) {
        setAuditActions(res.data);
      }
    } catch {
      // Silently fail - dropdown will just be empty
    }
  }

  async function fetchAuditLogs() {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await logs.audit({
        page: auditPage(),
        pageSize: PAGE_SIZE,
        action: filterAction() || undefined,
        actor: filterActor() || undefined,
        targetType: filterTargetType() || undefined,
        dateFrom: filterDateFrom() || undefined,
        dateTo: filterDateTo() || undefined,
      });
      setAuditData(res.data);
      setAuditPagination(res.pagination);
    } catch (err: any) {
      setAuditError(err.message ?? 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  }

  async function fetchAnnouncements() {
    setAnnLoading(true);
    setAnnError(null);
    try {
      const res = await logs.announcements({
        page: annPage(),
        pageSize: PAGE_SIZE,
      });
      setAnnouncements(res.data);
      setAnnPagination(res.pagination);
    } catch (err: any) {
      setAnnError(err.message ?? 'Failed to load announcements');
    } finally {
      setAnnLoading(false);
    }
  }

  onMount(() => {
    fetchAuditActions();
    fetchAuditLogs();
    fetchAnnouncements();
  });

  createEffect(() => {
    auditPage();
    fetchAuditLogs();
  });

  createEffect(() => {
    annPage();
    fetchAnnouncements();
  });

  // =========================================================================
  // Handlers
  // =========================================================================

  function handleAuditSearch(e: Event) {
    e.preventDefault();
    setAuditPage(1);
    fetchAuditLogs();
  }

  function toggleExpandedRow(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id));
  }

  async function handleCreateAnnouncement(e: Event) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    setFormSuccess(null);
    try {
      await logs.createAnnouncement({
        title: formTitle(),
        message: formMessage(),
        type: formType(),
        target: formTarget(),
        targetValue: formTarget() !== 'all' ? formTargetValue() : undefined,
        scheduledAt: formSchedule() || undefined,
        expiresAt: formExpires() || undefined,
      });
      setFormSuccess('Announcement created successfully.');
      toastStore.success('Announcement created');
      setFormTitle('');
      setFormMessage('');
      setFormType('info');
      setFormTarget('all');
      setFormTargetValue('');
      setFormSchedule('');
      setFormExpires('');
      fetchAnnouncements();
    } catch (err: any) {
      setFormError(err.message ?? 'Failed to create announcement');
      toastStore.error(err.message ?? 'Failed to create announcement');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    setDeleteLoading(true);
    try {
      await logs.deleteAnnouncement(id);
      toastStore.success('Announcement deleted');
      setDeleteConfirmId(null);
      fetchAnnouncements();
    } catch (err: any) {
      setAnnError(err.message ?? 'Failed to delete announcement');
      toastStore.error(err.message ?? 'Failed to delete announcement');
    } finally {
      setDeleteLoading(false);
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div style={{ padding: '24px', 'max-width': '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ 'margin-bottom': '24px' }}>
        <h1 style={{
          margin: '0 0 4px 0',
          'font-size': '24px',
          'font-weight': '600',
          color: colors.text,
        }}>
          Audit Logs & Announcements
        </h1>
        <p style={{ margin: 0, color: colors.textMuted, 'font-size': '14px' }}>
          Review system activity and manage server announcements
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0',
        'margin-bottom': '24px',
        'border-bottom': `1px solid ${colors.border}`,
      }}>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            'border-bottom': activeTab() === 'audit' ? `2px solid ${colors.blue}` : '2px solid transparent',
            color: activeTab() === 'audit' ? colors.text : colors.textMuted,
            'font-size': '14px',
            'font-weight': '600',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (activeTab() !== 'audit') e.currentTarget.style.color = colors.text;
          }}
          onMouseLeave={(e) => {
            if (activeTab() !== 'audit') e.currentTarget.style.color = colors.textMuted;
          }}
        >
          Audit Logs
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          style={{
            padding: '12px 24px',
            background: 'transparent',
            border: 'none',
            'border-bottom': activeTab() === 'announcements' ? `2px solid ${colors.blue}` : '2px solid transparent',
            color: activeTab() === 'announcements' ? colors.text : colors.textMuted,
            'font-size': '14px',
            'font-weight': '600',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            if (activeTab() !== 'announcements') e.currentTarget.style.color = colors.text;
          }}
          onMouseLeave={(e) => {
            if (activeTab() !== 'announcements') e.currentTarget.style.color = colors.textMuted;
          }}
        >
          Announcements
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: AUDIT LOGS                                                 */}
      {/* ================================================================= */}
      <Show when={activeTab() === 'audit'}>
        {/* Export Button */}
        <div style={{ display: 'flex', 'justify-content': 'flex-end', 'margin-bottom': '12px' }}>
          <button
            onClick={() => {
              const entries = auditEntries();
              if (entries && entries.length > 0) {
                downloadCsv(
                  entries.map((e: any) => ({
                    timestamp: e.createdAt,
                    action: e.action,
                    actor: e.actorUsername,
                    targetType: e.targetType ?? '',
                    targetId: e.targetId ?? '',
                    ipAddress: e.ipAddress,
                    details: JSON.stringify(e.details),
                  })),
                  `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
                );
                toastStore.success('Audit log exported');
              } else {
                toastStore.warn('No audit entries to export');
              }
            }}
            style={{
              background: '#21262d',
              border: `1px solid ${colors.border}`,
              color: colors.text,
              padding: '8px 16px',
              'border-radius': '6px',
              cursor: 'pointer',
              'font-size': '13px',
            }}
          >
            Export CSV
          </button>
        </div>
        {/* Filter Bar */}
        <form
          onSubmit={handleAuditSearch}
          style={{
            display: 'flex',
            gap: '12px',
            'align-items': 'flex-end',
            'flex-wrap': 'wrap',
            padding: '16px',
            background: colors.bg1,
            'border-radius': '8px',
            border: `1px solid ${colors.border}`,
            'margin-bottom': '16px',
          }}
        >
          <div style={filterGroupStyle}>
            <label style={labelStyle}>Action</label>
            <select
              value={filterAction()}
              onChange={(e) => setFilterAction(e.currentTarget.value)}
              style={selectStyle}
            >
              <option value="">All Actions</option>
              <For each={auditActions()}>
                {(action) => (
                  <option value={action}>{formatAction(action)}</option>
                )}
              </For>
            </select>
          </div>

          <div style={filterGroupStyle}>
            <label style={labelStyle}>Actor</label>
            <input
              type="text"
              placeholder="Username..."
              value={filterActor()}
              onInput={(e) => setFilterActor(e.currentTarget.value)}
              style={{ ...inputStyle, 'min-width': '160px' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = colors.blue; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
            />
          </div>

          <div style={filterGroupStyle}>
            <label style={labelStyle}>Target Type</label>
            <select
              value={filterTargetType()}
              onChange={(e) => setFilterTargetType(e.currentTarget.value)}
              style={selectStyle}
            >
              <option value="">All Targets</option>
              <option value="account">Account</option>
              <option value="character">Character</option>
              <option value="server">Server</option>
              <option value="tool">Tool</option>
              <option value="config">Config</option>
            </select>
          </div>

          <div style={filterGroupStyle}>
            <label style={labelStyle}>Date From</label>
            <input
              type="date"
              value={filterDateFrom()}
              onInput={(e) => setFilterDateFrom(e.currentTarget.value)}
              style={inputStyle}
            />
          </div>

          <div style={filterGroupStyle}>
            <label style={labelStyle}>Date To</label>
            <input
              type="date"
              value={filterDateTo()}
              onInput={(e) => setFilterDateTo(e.currentTarget.value)}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '8px 20px',
              background: colors.blue,
              color: colors.bg0,
              border: 'none',
              'border-radius': '6px',
              'font-size': '14px',
              'font-weight': '600',
              cursor: 'pointer',
              'white-space': 'nowrap',
              'align-self': 'flex-end',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#79b8ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = colors.blue; }}
          >
            Search
          </button>
        </form>

        {/* Error */}
        <Show when={auditError()}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(248, 81, 73, 0.1)',
            border: '1px solid rgba(248, 81, 73, 0.4)',
            'border-radius': '6px',
            color: colors.red,
            'font-size': '14px',
            'margin-bottom': '16px',
          }}>
            {auditError()}
          </div>
        </Show>

        {/* Loading */}
        <Show when={auditLoading()}>
          <div style={{
            display: 'flex',
            'justify-content': 'center',
            padding: '40px',
            color: colors.textMuted,
            'font-size': '14px',
          }}>
            Loading audit logs...
          </div>
        </Show>

        {/* Audit Log Table */}
        <Show when={!auditLoading()}>
          <div style={{
            background: colors.bg1,
            'border-radius': '8px',
            border: `1px solid ${colors.border}`,
            overflow: 'hidden',
          }}>
            <div style={{ 'overflow-x': 'auto' }}>
              <table style={{
                width: '100%',
                'border-collapse': 'collapse',
                'font-size': '14px',
              }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Timestamp</th>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Actor</th>
                    <th style={thStyle}>Target</th>
                    <th style={thStyle}>Details</th>
                    <th style={thStyle}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  <Show when={auditData().length === 0}>
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          padding: '40px 16px',
                          'text-align': 'center',
                          color: colors.textMuted,
                        }}
                      >
                        No audit logs found.
                      </td>
                    </tr>
                  </Show>
                  <For each={auditData()}>
                    {(entry) => {
                      const actionColor = getActionColor(entry.action ?? '');
                      const entryId = entry.id ?? `${entry.createdAt}-${entry.action}`;
                      const isExpanded = () => expandedRow() === entryId;

                      return (
                        <>
                          <tr
                            style={{
                              'border-bottom': isExpanded() ? 'none' : `1px solid ${colors.bg3}`,
                              cursor: 'pointer',
                              transition: 'background 0.15s',
                            }}
                            onClick={() => toggleExpandedRow(entryId)}
                            onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg2; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ ...tdStyle, 'white-space': 'nowrap', color: colors.textMuted }}>
                              {formatDateTime(entry.createdAt)}
                            </td>
                            <td style={tdStyle}>
                              <span style={{
                                display: 'inline-block',
                                padding: '2px 10px',
                                'border-radius': '12px',
                                background: actionColor.bg,
                                color: actionColor.text,
                                'font-size': '12px',
                                'font-weight': '500',
                                'white-space': 'nowrap',
                              }}>
                                {formatAction(entry.action)}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, color: colors.blue, 'font-weight': '500' }}>
                              {entry.actorUsername ?? entry.actor ?? '--'}
                            </td>
                            <td style={{ ...tdStyle, color: colors.textMuted }}>
                              {entry.targetType ? (
                                <span>
                                  <span style={{
                                    display: 'inline-block',
                                    padding: '1px 6px',
                                    'border-radius': '4px',
                                    background: colors.bg3,
                                    'font-size': '11px',
                                    'font-weight': '500',
                                    color: colors.textMuted,
                                    'margin-right': '6px',
                                    'text-transform': 'uppercase',
                                    'letter-spacing': '0.03em',
                                  }}>
                                    {entry.targetType}
                                  </span>
                                  <span style={{ color: colors.text }}>{entry.targetId ?? ''}</span>
                                </span>
                              ) : '--'}
                            </td>
                            <td style={{ ...tdStyle, color: colors.textMuted, 'font-size': '13px' }}>
                              <span style={{
                                display: 'inline-flex',
                                'align-items': 'center',
                                gap: '4px',
                                color: isExpanded() ? colors.blue : colors.textMuted,
                              }}>
                                {isExpanded() ? '[ - ]' : '[ + ]'}
                                {' '}
                                {entry.details ? 'View' : 'None'}
                              </span>
                            </td>
                            <td style={{
                              ...tdStyle,
                              'font-family': 'monospace',
                              'font-size': '13px',
                              color: colors.textMuted,
                            }}>
                              {entry.ipAddress ?? '--'}
                            </td>
                          </tr>
                          {/* Expanded details row */}
                          <Show when={isExpanded() && entry.details}>
                            <tr>
                              <td
                                colSpan={6}
                                style={{
                                  padding: '0 16px 16px 16px',
                                  background: colors.bg2,
                                  'border-bottom': `1px solid ${colors.bg3}`,
                                }}
                              >
                                <div style={{
                                  padding: '12px 16px',
                                  background: colors.bg0,
                                  'border-radius': '6px',
                                  border: `1px solid ${colors.border}`,
                                  'margin-top': '4px',
                                }}>
                                  <div style={{
                                    'font-size': '11px',
                                    'font-weight': '600',
                                    color: colors.textMuted,
                                    'text-transform': 'uppercase',
                                    'letter-spacing': '0.05em',
                                    'margin-bottom': '8px',
                                  }}>
                                    Details
                                  </div>
                                  <pre style={{
                                    margin: 0,
                                    'font-family': 'monospace',
                                    'font-size': '13px',
                                    color: colors.text,
                                    'white-space': 'pre-wrap',
                                    'word-break': 'break-word',
                                    'line-height': '1.5',
                                  }}>
                                    {typeof entry.details === 'string'
                                      ? entry.details
                                      : JSON.stringify(entry.details, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          </Show>
                        </>
                      );
                    }}
                  </For>
                </tbody>
              </table>
            </div>

            {/* Audit Pagination */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              padding: '12px 16px',
              'border-top': `1px solid ${colors.border}`,
              background: colors.bg2,
            }}>
              <span style={{ color: colors.textMuted, 'font-size': '13px' }}>
                <Show when={auditPagination().total > 0} fallback="No results">
                  Showing{' '}
                  {((auditPagination().page - 1) * auditPagination().pageSize) + 1}
                  {' '}-{' '}
                  {Math.min(auditPagination().page * auditPagination().pageSize, auditPagination().total)}
                  {' '}of {auditPagination().total} entries
                </Show>
              </span>
              <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                <button
                  disabled={auditPagination().page <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    background: auditPagination().page <= 1 ? colors.bg3 : colors.border,
                    border: `1px solid ${colors.border}`,
                    'border-radius': '6px',
                    color: auditPagination().page <= 1 ? '#484f58' : colors.text,
                    'font-size': '13px',
                    cursor: auditPagination().page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span style={{ color: colors.textMuted, 'font-size': '13px', padding: '0 8px' }}>
                  Page {auditPagination().page} of {Math.max(1, auditPagination().totalPages)}
                </span>
                <button
                  disabled={auditPagination().page >= auditPagination().totalPages}
                  onClick={() => setAuditPage((p) => p + 1)}
                  style={{
                    padding: '6px 14px',
                    background: auditPagination().page >= auditPagination().totalPages ? colors.bg3 : colors.border,
                    border: `1px solid ${colors.border}`,
                    'border-radius': '6px',
                    color: auditPagination().page >= auditPagination().totalPages ? '#484f58' : colors.text,
                    'font-size': '13px',
                    cursor: auditPagination().page >= auditPagination().totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Show>

      {/* ================================================================= */}
      {/* TAB 2: ANNOUNCEMENTS                                              */}
      {/* ================================================================= */}
      <Show when={activeTab() === 'announcements'}>
        {/* Create Announcement Form (admin only) */}
        <Show when={authStore.isAdmin()}>
          <div style={{
            background: colors.bg1,
            'border-radius': '8px',
            border: `1px solid ${colors.border}`,
            'margin-bottom': '20px',
            overflow: 'hidden',
          }}>
            {/* Collapsible header */}
            <button
              onClick={() => setFormOpen((v) => !v)}
              style={{
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'space-between',
                width: '100%',
                padding: '14px 20px',
                background: colors.bg2,
                border: 'none',
                color: colors.text,
                'font-size': '14px',
                'font-weight': '600',
                cursor: 'pointer',
                'text-align': 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.bg3; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = colors.bg2; }}
            >
              <span>Create Announcement</span>
              <span style={{
                color: colors.textMuted,
                'font-size': '18px',
                'font-weight': '400',
                transition: 'transform 0.2s',
                transform: formOpen() ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                v
              </span>
            </button>

            {/* Form body */}
            <Show when={formOpen()}>
              <form
                onSubmit={handleCreateAnnouncement}
                style={{ padding: '20px', display: 'flex', 'flex-direction': 'column', gap: '16px' }}
              >
                {/* Form error / success */}
                <Show when={formError()}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(248, 81, 73, 0.1)',
                    border: '1px solid rgba(248, 81, 73, 0.4)',
                    'border-radius': '6px',
                    color: colors.red,
                    'font-size': '13px',
                  }}>
                    {formError()}
                  </div>
                </Show>
                <Show when={formSuccess()}>
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(63, 185, 80, 0.1)',
                    border: '1px solid rgba(63, 185, 80, 0.4)',
                    'border-radius': '6px',
                    color: colors.green,
                    'font-size': '13px',
                  }}>
                    {formSuccess()}
                  </div>
                </Show>

                {/* Row 1: Title */}
                <div style={filterGroupStyle}>
                  <label style={labelStyle}>Title *</label>
                  <input
                    type="text"
                    placeholder="Announcement title..."
                    value={formTitle()}
                    onInput={(e) => setFormTitle(e.currentTarget.value)}
                    required
                    style={{ ...inputStyle, width: '100%' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.blue; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                  />
                </div>

                {/* Row 2: Message */}
                <div style={filterGroupStyle}>
                  <label style={labelStyle}>Message *</label>
                  <textarea
                    placeholder="Announcement message..."
                    value={formMessage()}
                    onInput={(e) => setFormMessage(e.currentTarget.value)}
                    required
                    rows={4}
                    style={{
                      ...inputStyle,
                      width: '100%',
                      resize: 'vertical',
                      'font-family': 'inherit',
                      'min-height': '80px',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.blue; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                  />
                </div>

                {/* Row 3: Type, Target, Target Value */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  'flex-wrap': 'wrap',
                  'align-items': 'flex-end',
                }}>
                  <div style={filterGroupStyle}>
                    <label style={labelStyle}>Type</label>
                    <select
                      value={formType()}
                      onChange={(e) => setFormType(e.currentTarget.value)}
                      style={selectStyle}
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="event">Event</option>
                    </select>
                  </div>

                  <div style={filterGroupStyle}>
                    <label style={labelStyle}>Target</label>
                    <select
                      value={formTarget()}
                      onChange={(e) => setFormTarget(e.currentTarget.value)}
                      style={selectStyle}
                    >
                      <option value="all">All</option>
                      <option value="kingdom">Kingdom</option>
                      <option value="zone">Zone</option>
                      <option value="server">Server</option>
                    </select>
                  </div>

                  <Show when={formTarget() !== 'all'}>
                    <div style={filterGroupStyle}>
                      <label style={labelStyle}>Target Value</label>
                      <input
                        type="text"
                        placeholder={`Enter ${formTarget()} name/ID...`}
                        value={formTargetValue()}
                        onInput={(e) => setFormTargetValue(e.currentTarget.value)}
                        style={{ ...inputStyle, 'min-width': '180px' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = colors.blue; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                      />
                    </div>
                  </Show>
                </div>

                {/* Row 4: Schedule and Expires */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  'flex-wrap': 'wrap',
                  'align-items': 'flex-end',
                }}>
                  <div style={filterGroupStyle}>
                    <label style={labelStyle}>Schedule (optional)</label>
                    <input
                      type="datetime-local"
                      value={formSchedule()}
                      onInput={(e) => setFormSchedule(e.currentTarget.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div style={filterGroupStyle}>
                    <label style={labelStyle}>Expires (optional)</label>
                    <input
                      type="datetime-local"
                      value={formExpires()}
                      onInput={(e) => setFormExpires(e.currentTarget.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Submit */}
                <div style={{ display: 'flex', 'justify-content': 'flex-end', 'margin-top': '4px' }}>
                  <button
                    type="submit"
                    disabled={formSubmitting()}
                    style={{
                      padding: '10px 24px',
                      background: formSubmitting() ? colors.bg3 : colors.blue,
                      color: formSubmitting() ? colors.textMuted : colors.bg0,
                      border: 'none',
                      'border-radius': '6px',
                      'font-size': '14px',
                      'font-weight': '600',
                      cursor: formSubmitting() ? 'not-allowed' : 'pointer',
                      'white-space': 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      if (!formSubmitting()) e.currentTarget.style.background = '#79b8ff';
                    }}
                    onMouseLeave={(e) => {
                      if (!formSubmitting()) e.currentTarget.style.background = colors.blue;
                    }}
                  >
                    {formSubmitting() ? 'Sending...' : 'Send Announcement'}
                  </button>
                </div>
              </form>
            </Show>
          </div>
        </Show>

        {/* Announcements Error */}
        <Show when={annError()}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(248, 81, 73, 0.1)',
            border: '1px solid rgba(248, 81, 73, 0.4)',
            'border-radius': '6px',
            color: colors.red,
            'font-size': '14px',
            'margin-bottom': '16px',
          }}>
            {annError()}
          </div>
        </Show>

        {/* Loading */}
        <Show when={annLoading()}>
          <div style={{
            display: 'flex',
            'justify-content': 'center',
            padding: '40px',
            color: colors.textMuted,
            'font-size': '14px',
          }}>
            Loading announcements...
          </div>
        </Show>

        {/* Announcements List */}
        <Show when={!annLoading()}>
          <Show
            when={announcements().length > 0}
            fallback={
              <div style={{
                padding: '40px',
                'text-align': 'center',
                color: colors.textMuted,
                'font-size': '14px',
                background: colors.bg1,
                'border-radius': '8px',
                border: `1px solid ${colors.border}`,
              }}>
                No announcements found.
              </div>
            }
          >
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
              <For each={announcements()}>
                {(ann) => {
                  const typeColor = announcementTypeColors[ann.type] ?? announcementTypeColors.info;
                  const isSent = ann.sentAt || (!ann.scheduledAt || new Date(ann.scheduledAt) <= new Date());

                  return (
                    <div style={{
                      background: colors.bg1,
                      'border-radius': '8px',
                      border: `1px solid ${colors.border}`,
                      padding: '20px',
                      transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.bg3; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                    >
                      {/* Card header: title + badges */}
                      <div style={{
                        display: 'flex',
                        'align-items': 'flex-start',
                        'justify-content': 'space-between',
                        gap: '12px',
                        'margin-bottom': '10px',
                      }}>
                        <div style={{ display: 'flex', 'align-items': 'center', gap: '10px', 'flex-wrap': 'wrap' }}>
                          <span style={{
                            'font-size': '16px',
                            'font-weight': '600',
                            color: colors.text,
                          }}>
                            {ann.title}
                          </span>
                          {/* Type badge */}
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            'border-radius': '12px',
                            background: typeColor.bg,
                            color: typeColor.text,
                            'font-size': '12px',
                            'font-weight': '500',
                            'text-transform': 'capitalize',
                          }}>
                            {ann.type}
                          </span>
                          {/* Sent status */}
                          <span style={{
                            display: 'inline-flex',
                            'align-items': 'center',
                            gap: '4px',
                            'font-size': '12px',
                            color: isSent ? colors.green : colors.yellow,
                          }}>
                            <span style={{ 'font-size': '14px' }}>
                              {isSent ? '\u2713' : '\u25F4'}
                            </span>
                            {isSent ? 'Sent' : 'Pending'}
                          </span>
                        </div>

                        {/* Delete button (admin only) */}
                        <Show when={authStore.isAdmin()}>
                          <Show
                            when={deleteConfirmId() === ann.id}
                            fallback={
                              <button
                                onClick={() => setDeleteConfirmId(ann.id)}
                                style={{
                                  padding: '4px 12px',
                                  background: 'rgba(248, 81, 73, 0.1)',
                                  border: `1px solid rgba(248, 81, 73, 0.3)`,
                                  'border-radius': '6px',
                                  color: colors.red,
                                  'font-size': '12px',
                                  'font-weight': '500',
                                  cursor: 'pointer',
                                  'white-space': 'nowrap',
                                  'flex-shrink': '0',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = 'rgba(248, 81, 73, 0.2)';
                                  e.currentTarget.style.borderColor = 'rgba(248, 81, 73, 0.6)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = 'rgba(248, 81, 73, 0.1)';
                                  e.currentTarget.style.borderColor = 'rgba(248, 81, 73, 0.3)';
                                }}
                              >
                                Delete
                              </button>
                            }
                          >
                            <div style={{ display: 'flex', gap: '6px', 'flex-shrink': '0' }}>
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                disabled={deleteLoading()}
                                style={{
                                  padding: '4px 12px',
                                  background: colors.red,
                                  border: 'none',
                                  'border-radius': '6px',
                                  color: '#ffffff',
                                  'font-size': '12px',
                                  'font-weight': '600',
                                  cursor: deleteLoading() ? 'not-allowed' : 'pointer',
                                  'white-space': 'nowrap',
                                }}
                              >
                                {deleteLoading() ? 'Deleting...' : 'Confirm'}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                style={{
                                  padding: '4px 12px',
                                  background: colors.bg3,
                                  border: `1px solid ${colors.border}`,
                                  'border-radius': '6px',
                                  color: colors.text,
                                  'font-size': '12px',
                                  cursor: 'pointer',
                                  'white-space': 'nowrap',
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </Show>
                        </Show>
                      </div>

                      {/* Message */}
                      <p style={{
                        margin: '0 0 12px 0',
                        'font-size': '14px',
                        color: colors.textMuted,
                        'line-height': '1.6',
                        'white-space': 'pre-wrap',
                      }}>
                        {ann.message}
                      </p>

                      {/* Meta info */}
                      <div style={{
                        display: 'flex',
                        gap: '16px',
                        'flex-wrap': 'wrap',
                        'font-size': '12px',
                        color: colors.textMuted,
                        'padding-top': '10px',
                        'border-top': `1px solid ${colors.bg3}`,
                      }}>
                        <span>
                          <span style={{ 'font-weight': '500', color: colors.textMuted }}>Target: </span>
                          <span style={{ color: colors.text }}>
                            {ann.target === 'all' ? 'All Players' : `${ann.target}${ann.targetValue ? ': ' + ann.targetValue : ''}`}
                          </span>
                        </span>
                        <Show when={ann.scheduledAt}>
                          <span>
                            <span style={{ 'font-weight': '500' }}>Scheduled: </span>
                            <span style={{ color: colors.text }}>{formatDateShort(ann.scheduledAt)}</span>
                          </span>
                        </Show>
                        <Show when={ann.expiresAt}>
                          <span>
                            <span style={{ 'font-weight': '500' }}>Expires: </span>
                            <span style={{ color: colors.text }}>{formatDateShort(ann.expiresAt)}</span>
                          </span>
                        </Show>
                        <span>
                          <span style={{ 'font-weight': '500' }}>Created by: </span>
                          <span style={{ color: colors.blue }}>{ann.createdByUsername ?? ann.createdBy ?? '--'}</span>
                        </span>
                        <span>
                          <span style={{ 'font-weight': '500' }}>Date: </span>
                          <span style={{ color: colors.text }}>{formatDateShort(ann.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                  );
                }}
              </For>
            </div>

            {/* Announcements Pagination */}
            <div style={{
              display: 'flex',
              'justify-content': 'space-between',
              'align-items': 'center',
              padding: '16px 0',
              'margin-top': '12px',
            }}>
              <span style={{ color: colors.textMuted, 'font-size': '13px' }}>
                <Show when={annPagination().total > 0} fallback="No results">
                  Showing{' '}
                  {((annPagination().page - 1) * annPagination().pageSize) + 1}
                  {' '}-{' '}
                  {Math.min(annPagination().page * annPagination().pageSize, annPagination().total)}
                  {' '}of {annPagination().total} announcements
                </Show>
              </span>
              <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                <button
                  disabled={annPagination().page <= 1}
                  onClick={() => setAnnPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    background: annPagination().page <= 1 ? colors.bg3 : colors.border,
                    border: `1px solid ${colors.border}`,
                    'border-radius': '6px',
                    color: annPagination().page <= 1 ? '#484f58' : colors.text,
                    'font-size': '13px',
                    cursor: annPagination().page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span style={{ color: colors.textMuted, 'font-size': '13px', padding: '0 8px' }}>
                  Page {annPagination().page} of {Math.max(1, annPagination().totalPages)}
                </span>
                <button
                  disabled={annPagination().page >= annPagination().totalPages}
                  onClick={() => setAnnPage((p) => p + 1)}
                  style={{
                    padding: '6px 14px',
                    background: annPagination().page >= annPagination().totalPages ? colors.bg3 : colors.border,
                    border: `1px solid ${colors.border}`,
                    'border-radius': '6px',
                    color: annPagination().page >= annPagination().totalPages ? '#484f58' : colors.text,
                    'font-size': '13px',
                    cursor: annPagination().page >= annPagination().totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
