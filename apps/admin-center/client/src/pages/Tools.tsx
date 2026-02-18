import { createSignal, createEffect, onMount, Show, For, type JSX } from 'solid-js';
import { tools } from '../lib/api';
import { toastStore } from '../stores/toast';
import { ZONES, KOMBIFY_TOOL_CATEGORIES } from '@tenos/shared';
import type { KombifyTool, ToolParameter, ToolExecution } from '@tenos/shared';

// ---------------------------------------------------------------------------
// Theme Colors
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
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCategoryName(cat: string): string {
  return cat
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) return 'Running...';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function truncateJson(params: Record<string, unknown>): string {
  const str = JSON.stringify(params);
  if (str.length <= 80) return str;
  return str.slice(0, 77) + '...';
}

// ---------------------------------------------------------------------------
// Shared Styles
// ---------------------------------------------------------------------------

const cardStyle: JSX.CSSProperties = {
  'background-color': colors.bg1,
  'border-radius': '10px',
  border: `1px solid ${colors.border}`,
  padding: '20px',
  transition: 'border-color 0.2s ease',
};

const inputStyle: JSX.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: colors.bg0,
  border: `1px solid ${colors.border}`,
  'border-radius': '6px',
  color: colors.text,
  'font-size': '14px',
  outline: 'none',
  'box-sizing': 'border-box',
};

const labelStyle: JSX.CSSProperties = {
  display: 'block',
  'font-size': '13px',
  'font-weight': '500',
  color: colors.text,
  'margin-bottom': '6px',
};

const badgeBase: JSX.CSSProperties = {
  display: 'inline-block',
  padding: '2px 10px',
  'border-radius': '12px',
  'font-size': '11px',
  'font-weight': '600',
  'letter-spacing': '0.03em',
  'white-space': 'nowrap',
};

// ---------------------------------------------------------------------------
// Status Badge Component
// ---------------------------------------------------------------------------

function StatusBadge(props: { status: string }) {
  const statusMap: Record<string, { bg: string; text: string }> = {
    running: { bg: 'rgba(88, 166, 255, 0.15)', text: colors.blue },
    success: { bg: 'rgba(63, 185, 80, 0.15)', text: colors.green },
    failed: { bg: 'rgba(248, 81, 73, 0.15)', text: colors.red },
    cancelled: { bg: 'rgba(139, 148, 158, 0.15)', text: colors.textMuted },
    idle: { bg: 'rgba(139, 148, 158, 0.15)', text: colors.textMuted },
  };

  const style = () => statusMap[props.status] ?? statusMap.idle;

  return (
    <span
      style={{
        ...badgeBase,
        'background-color': style().bg,
        color: style().text,
        'text-transform': 'capitalize',
      }}
    >
      {props.status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tool Execution Panel (Modal)
// ---------------------------------------------------------------------------

function ToolExecutionPanel(props: {
  tool: KombifyTool;
  onClose: () => void;
  onExecuted: () => void;
}) {
  const [formValues, setFormValues] = createSignal<Record<string, unknown>>({});
  const [destructiveAck, setDestructiveAck] = createSignal(false);
  const [executing, setExecuting] = createSignal(false);
  const [result, setResult] = createSignal<{
    success: boolean;
    message: string;
    affectedCount?: number;
    data?: unknown;
  } | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  // Initialize form with defaults
  onMount(() => {
    const defaults: Record<string, unknown> = {};
    for (const param of props.tool.parameters) {
      defaults[param.name] = param.defaultValue ?? (param.type === 'boolean' ? false : '');
    }
    setFormValues(defaults);
  });

  function updateField(name: string, value: unknown) {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }

  function renderField(param: ToolParameter): JSX.Element {
    const value = () => formValues()[param.name];

    switch (param.type) {
      case 'boolean':
        return (
          <label
            style={{
              display: 'flex',
              'align-items': 'center',
              gap: '10px',
              cursor: 'pointer',
              'font-size': '14px',
              color: colors.text,
            }}
          >
            <input
              type="checkbox"
              checked={!!value()}
              onChange={(e) => updateField(param.name, e.currentTarget.checked)}
              style={{
                width: '18px',
                height: '18px',
                'accent-color': colors.blue,
                cursor: 'pointer',
              }}
            />
            {param.label}
          </label>
        );

      case 'select':
        return (
          <select
            value={String(value() ?? '')}
            onChange={(e) => updateField(param.name, e.currentTarget.value)}
            style={{
              ...inputStyle,
              cursor: 'pointer',
            }}
          >
            <For each={param.options ?? []}>
              {(opt) => <option value={opt.value}>{opt.label}</option>}
            </For>
          </select>
        );

      case 'zone':
        return (
          <select
            value={String(value() ?? '')}
            onChange={(e) => updateField(param.name, e.currentTarget.value)}
            style={{
              ...inputStyle,
              cursor: 'pointer',
            }}
          >
            <option value="">-- Select Zone --</option>
            <For each={ZONES}>
              {(zone) => <option value={zone.id}>{zone.name}</option>}
            </For>
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value() != null ? String(value()) : ''}
            onInput={(e) => {
              const v = e.currentTarget.value;
              updateField(param.name, v === '' ? null : Number(v));
            }}
            min={param.validation?.min}
            max={param.validation?.max}
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = colors.blue; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
          />
        );

      default:
        // string, player, character, item
        return (
          <input
            type="text"
            value={String(value() ?? '')}
            onInput={(e) => updateField(param.name, e.currentTarget.value)}
            placeholder={
              param.type === 'player'
                ? 'Enter player ID or username'
                : param.type === 'character'
                  ? 'Enter character ID or name'
                  : param.type === 'item'
                    ? 'Enter item ID'
                    : ''
            }
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = colors.blue; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = colors.border; }}
          />
        );
    }
  }

  async function handleExecute() {
    if (props.tool.isDestructive && !destructiveAck()) return;

    setExecuting(true);
    setError(null);
    setResult(null);

    try {
      const res = await tools.execute(props.tool.id, formValues());
      const data = (res as any).data;
      setResult({
        success: data.success !== false,
        message: data.message ?? 'Tool executed successfully',
        affectedCount: data.affectedCount,
        data: data.data,
      });
      toastStore.success(`${props.tool.name}: ${data.message ?? 'Completed'}`);
      props.onExecuted();
    } catch (err: any) {
      setError(err.message ?? 'Execution failed');
      toastStore.error(`${props.tool.name} failed: ${err.message ?? 'Unknown error'}`);
    } finally {
      setExecuting(false);
    }
  }

  return (
    // Modal overlay
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
        padding: '24px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      <div
        style={{
          'background-color': colors.bg1,
          'border-radius': '12px',
          border: `1px solid ${colors.border}`,
          width: '100%',
          'max-width': '600px',
          'max-height': '85vh',
          'overflow-y': 'auto',
          'box-shadow': '0 24px 48px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            'align-items': 'flex-start',
            'justify-content': 'space-between',
            padding: '20px 24px',
            'border-bottom': `1px solid ${colors.border}`,
          }}
        >
          <div>
            <h2
              style={{
                margin: '0 0 4px 0',
                'font-size': '18px',
                'font-weight': '600',
                color: colors.text,
              }}
            >
              {props.tool.name}
            </h2>
            <p
              style={{
                margin: '0',
                'font-size': '13px',
                color: colors.textMuted,
                'line-height': '1.4',
              }}
            >
              {props.tool.description}
            </p>
            <div style={{ display: 'flex', gap: '8px', 'margin-top': '8px' }}>
              <span
                style={{
                  ...badgeBase,
                  'background-color': 'rgba(88, 166, 255, 0.12)',
                  color: colors.blue,
                }}
              >
                {formatCategoryName(props.tool.category)}
              </span>
              <Show when={props.tool.isDestructive}>
                <span
                  style={{
                    ...badgeBase,
                    'background-color': 'rgba(248, 81, 73, 0.15)',
                    color: colors.red,
                  }}
                >
                  Destructive
                </span>
              </Show>
              <span
                style={{
                  ...badgeBase,
                  'background-color': 'rgba(210, 153, 34, 0.12)',
                  color: colors.yellow,
                }}
              >
                Requires: {props.tool.requiredRole}
              </span>
            </div>
          </div>
          <button
            onClick={props.onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              'font-size': '22px',
              cursor: 'pointer',
              padding: '0 0 0 12px',
              'line-height': '1',
              'flex-shrink': '0',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = colors.text; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = colors.textMuted; }}
          >
            x
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: '24px' }}>
          <For each={props.tool.parameters}>
            {(param) => (
              <div style={{ 'margin-bottom': '18px' }}>
                <Show when={param.type !== 'boolean'}>
                  <label style={labelStyle}>
                    {param.label}
                    <Show when={param.required}>
                      <span style={{ color: colors.red, 'margin-left': '4px' }}>*</span>
                    </Show>
                  </label>
                </Show>
                {renderField(param)}
                {/* Validation hints */}
                <Show when={param.validation}>
                  <div
                    style={{
                      'font-size': '11px',
                      color: colors.textMuted,
                      'margin-top': '4px',
                    }}
                  >
                    <Show when={param.validation?.min != null && param.validation?.max != null}>
                      Range: {param.validation!.min} - {param.validation!.max}
                    </Show>
                    <Show when={param.validation?.min != null && param.validation?.max == null}>
                      Min: {param.validation!.min}
                    </Show>
                    <Show when={param.validation?.min == null && param.validation?.max != null}>
                      Max: {param.validation!.max}
                    </Show>
                    <Show when={param.validation?.message}>
                      <span style={{ 'margin-left': '8px' }}>{param.validation!.message}</span>
                    </Show>
                  </div>
                </Show>
              </div>
            )}
          </For>

          {/* Confirmation message */}
          <Show when={props.tool.confirmationMessage}>
            <div
              style={{
                padding: '12px 16px',
                'background-color': 'rgba(210, 153, 34, 0.1)',
                border: `1px solid rgba(210, 153, 34, 0.3)`,
                'border-radius': '8px',
                color: colors.yellow,
                'font-size': '13px',
                'line-height': '1.5',
                'margin-bottom': '18px',
              }}
            >
              <div style={{ 'font-weight': '600', 'margin-bottom': '4px' }}>Warning</div>
              {props.tool.confirmationMessage}
            </div>
          </Show>

          {/* Destructive acknowledgment */}
          <Show when={props.tool.isDestructive}>
            <label
              style={{
                display: 'flex',
                'align-items': 'center',
                gap: '10px',
                cursor: 'pointer',
                'font-size': '13px',
                color: colors.red,
                'margin-bottom': '18px',
                padding: '12px 16px',
                'background-color': 'rgba(248, 81, 73, 0.08)',
                'border-radius': '8px',
                border: `1px solid rgba(248, 81, 73, 0.2)`,
              }}
            >
              <input
                type="checkbox"
                checked={destructiveAck()}
                onChange={(e) => setDestructiveAck(e.currentTarget.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  'accent-color': colors.red,
                  cursor: 'pointer',
                  'flex-shrink': '0',
                }}
              />
              I understand this action is destructive and may not be reversible
            </label>
          </Show>

          {/* Execute button */}
          <Show when={!result()}>
            <button
              onClick={handleExecute}
              disabled={executing() || (props.tool.isDestructive && !destructiveAck())}
              style={{
                width: '100%',
                padding: '10px 20px',
                'background-color': props.tool.isDestructive ? colors.red : colors.blue,
                color: props.tool.isDestructive ? '#ffffff' : colors.bg0,
                border: 'none',
                'border-radius': '8px',
                'font-size': '14px',
                'font-weight': '600',
                cursor:
                  executing() || (props.tool.isDestructive && !destructiveAck())
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  executing() || (props.tool.isDestructive && !destructiveAck()) ? '0.5' : '1',
                transition: 'opacity 0.2s ease',
              }}
            >
              {executing() ? 'Executing...' : 'Execute Tool'}
            </button>
          </Show>

          {/* Error result */}
          <Show when={error()}>
            <div
              style={{
                padding: '14px 18px',
                'background-color': 'rgba(248, 81, 73, 0.1)',
                border: `1px solid rgba(248, 81, 73, 0.3)`,
                'border-radius': '8px',
                color: colors.red,
                'font-size': '13px',
                'line-height': '1.5',
                'margin-top': '16px',
              }}
            >
              <div style={{ 'font-weight': '600', 'margin-bottom': '4px' }}>Execution Failed</div>
              {error()}
            </div>
          </Show>

          {/* Success / failure result */}
          <Show when={result()}>
            {(res) => (
              <div
                style={{
                  padding: '14px 18px',
                  'background-color': res().success
                    ? 'rgba(63, 185, 80, 0.1)'
                    : 'rgba(248, 81, 73, 0.1)',
                  border: `1px solid ${res().success ? 'rgba(63, 185, 80, 0.3)' : 'rgba(248, 81, 73, 0.3)'}`,
                  'border-radius': '8px',
                  color: res().success ? colors.green : colors.red,
                  'font-size': '13px',
                  'line-height': '1.5',
                }}
              >
                <div style={{ 'font-weight': '600', 'margin-bottom': '4px' }}>
                  {res().success ? 'Execution Successful' : 'Execution Failed'}
                </div>
                <div>{res().message}</div>
                <Show when={res().affectedCount != null}>
                  <div style={{ 'margin-top': '6px', color: colors.textMuted }}>
                    Affected: {res().affectedCount} record(s)
                  </div>
                </Show>
                <button
                  onClick={props.onClose}
                  style={{
                    'margin-top': '14px',
                    padding: '8px 20px',
                    background: colors.bg3,
                    border: 'none',
                    'border-radius': '6px',
                    color: colors.text,
                    'font-size': '13px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = colors.border; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = colors.bg3; }}
                >
                  Close
                </button>
              </div>
            )}
          </Show>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tools Page
// ---------------------------------------------------------------------------

export default function Tools() {
  const [toolList, setToolList] = createSignal<KombifyTool[]>([]);
  const [loadingTools, setLoadingTools] = createSignal(true);
  const [toolsError, setToolsError] = createSignal<string | null>(null);

  const [activeCategory, setActiveCategory] = createSignal<string>('all');
  const [selectedTool, setSelectedTool] = createSignal<KombifyTool | null>(null);

  const [history, setHistory] = createSignal<ToolExecution[]>([]);
  const [historyPagination, setHistoryPagination] = createSignal({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [historyPage, setHistoryPage] = createSignal(1);
  const [loadingHistory, setLoadingHistory] = createSignal(true);

  // Fetch tools
  async function fetchTools() {
    setLoadingTools(true);
    setToolsError(null);
    try {
      const res = await tools.list();
      setToolList((res as any).data ?? []);
    } catch (err: any) {
      setToolsError(err.message ?? 'Failed to load tools');
    } finally {
      setLoadingTools(false);
    }
  }

  // Fetch execution history
  async function fetchHistory() {
    setLoadingHistory(true);
    try {
      const res = await tools.history({ page: historyPage(), pageSize: 10 });
      setHistory((res as any).data ?? []);
      setHistoryPagination(
        (res as any).pagination ?? { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      );
    } catch {
      // silently fail history load
    } finally {
      setLoadingHistory(false);
    }
  }

  onMount(() => {
    fetchTools();
    fetchHistory();
  });

  createEffect(() => {
    historyPage();
    fetchHistory();
  });

  // Filtered tools
  const filteredTools = () => {
    const cat = activeCategory();
    if (cat === 'all') return toolList();
    return toolList().filter((t) => t.category === cat);
  };

  // Category counts
  const categoryCounts = () => {
    const counts: Record<string, number> = { all: toolList().length };
    for (const t of toolList()) {
      counts[t.category] = (counts[t.category] ?? 0) + 1;
    }
    return counts;
  };

  return (
    <div style={{ 'max-width': '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ 'margin-bottom': '28px' }}>
        <h1
          style={{
            margin: '0 0 4px 0',
            'font-size': '28px',
            'font-weight': '700',
            color: colors.text,
          }}
        >
          Kombify Tools
        </h1>
        <p style={{ margin: '0', 'font-size': '14px', color: colors.textMuted }}>
          Game Management Operations
        </p>
      </div>

      {/* ================================================================ */}
      {/* Section 1: Tool Selection & Execution                            */}
      {/* ================================================================ */}

      {/* Category Filter */}
      <div
        style={{
          display: 'flex',
          'flex-wrap': 'wrap',
          gap: '8px',
          'margin-bottom': '24px',
          padding: '16px',
          'background-color': colors.bg1,
          'border-radius': '10px',
          border: `1px solid ${colors.border}`,
        }}
      >
        {/* All pill */}
        <button
          onClick={() => setActiveCategory('all')}
          style={{
            padding: '6px 16px',
            'border-radius': '20px',
            border: `1px solid ${activeCategory() === 'all' ? colors.blue : colors.border}`,
            'background-color': activeCategory() === 'all' ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
            color: activeCategory() === 'all' ? colors.blue : colors.textMuted,
            'font-size': '13px',
            'font-weight': '500',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            'white-space': 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (activeCategory() !== 'all') {
              e.currentTarget.style.borderColor = colors.blue;
              e.currentTarget.style.color = colors.blue;
            }
          }}
          onMouseLeave={(e) => {
            if (activeCategory() !== 'all') {
              e.currentTarget.style.borderColor = colors.border;
              e.currentTarget.style.color = colors.textMuted;
            }
          }}
        >
          All ({categoryCounts().all ?? 0})
        </button>

        <For each={[...KOMBIFY_TOOL_CATEGORIES]}>
          {(cat) => {
            const isActive = () => activeCategory() === cat;
            const count = () => categoryCounts()[cat] ?? 0;
            return (
              <Show when={count() > 0}>
                <button
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '6px 16px',
                    'border-radius': '20px',
                    border: `1px solid ${isActive() ? colors.blue : colors.border}`,
                    'background-color': isActive() ? 'rgba(88, 166, 255, 0.15)' : 'transparent',
                    color: isActive() ? colors.blue : colors.textMuted,
                    'font-size': '13px',
                    'font-weight': '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    'white-space': 'nowrap',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive()) {
                      e.currentTarget.style.borderColor = colors.blue;
                      e.currentTarget.style.color = colors.blue;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive()) {
                      e.currentTarget.style.borderColor = colors.border;
                      e.currentTarget.style.color = colors.textMuted;
                    }
                  }}
                >
                  {formatCategoryName(cat)} ({count()})
                </button>
              </Show>
            );
          }}
        </For>
      </div>

      {/* Tools loading / error states */}
      <Show when={loadingTools()}>
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
          Loading tools...
        </div>
      </Show>

      <Show when={toolsError()}>
        <div
          style={{
            padding: '16px 20px',
            'background-color': 'rgba(248, 81, 73, 0.1)',
            border: '1px solid rgba(248, 81, 73, 0.4)',
            'border-radius': '8px',
            color: colors.red,
            'font-size': '14px',
            'margin-bottom': '24px',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'space-between',
          }}
        >
          <span>{toolsError()}</span>
          <button
            onClick={fetchTools}
            style={{
              padding: '6px 16px',
              background: colors.bg3,
              border: 'none',
              'border-radius': '6px',
              color: colors.text,
              'font-size': '13px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </Show>

      {/* Tool Cards Grid */}
      <Show when={!loadingTools() && !toolsError()}>
        <Show
          when={filteredTools().length > 0}
          fallback={
            <div
              style={{
                'text-align': 'center',
                padding: '48px 24px',
                color: colors.textMuted,
                'font-size': '14px',
                'background-color': colors.bg1,
                'border-radius': '10px',
                border: `1px solid ${colors.border}`,
                'margin-bottom': '32px',
              }}
            >
              No tools found in this category.
            </div>
          }
        >
          <div
            style={{
              display: 'grid',
              'grid-template-columns': 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '16px',
              'margin-bottom': '40px',
            }}
          >
            <For each={filteredTools()}>
              {(tool) => (
                <div
                  style={{
                    ...cardStyle,
                    display: 'flex',
                    'flex-direction': 'column',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; }}
                >
                  {/* Tool name */}
                  <div
                    style={{
                      'font-size': '16px',
                      'font-weight': '600',
                      color: colors.text,
                      'margin-bottom': '6px',
                    }}
                  >
                    {tool.name}
                  </div>

                  {/* Description */}
                  <div
                    style={{
                      'font-size': '13px',
                      color: colors.textMuted,
                      'line-height': '1.5',
                      'margin-bottom': '14px',
                      flex: '1',
                    }}
                  >
                    {tool.description}
                  </div>

                  {/* Badges row */}
                  <div
                    style={{
                      display: 'flex',
                      'flex-wrap': 'wrap',
                      gap: '6px',
                      'margin-bottom': '16px',
                    }}
                  >
                    <span
                      style={{
                        ...badgeBase,
                        'background-color': 'rgba(88, 166, 255, 0.12)',
                        color: colors.blue,
                      }}
                    >
                      {formatCategoryName(tool.category)}
                    </span>
                    <Show when={tool.isDestructive}>
                      <span
                        style={{
                          ...badgeBase,
                          'background-color': 'rgba(248, 81, 73, 0.15)',
                          color: colors.red,
                        }}
                      >
                        Destructive
                      </span>
                    </Show>
                    <span
                      style={{
                        ...badgeBase,
                        'background-color': 'rgba(210, 153, 34, 0.12)',
                        color: colors.yellow,
                        'text-transform': 'capitalize',
                      }}
                    >
                      {tool.requiredRole}
                    </span>
                  </div>

                  {/* Execute button */}
                  <button
                    onClick={() => setSelectedTool(tool)}
                    style={{
                      padding: '9px 20px',
                      'background-color': tool.isDestructive
                        ? 'rgba(248, 81, 73, 0.12)'
                        : 'rgba(88, 166, 255, 0.12)',
                      color: tool.isDestructive ? colors.red : colors.blue,
                      border: `1px solid ${tool.isDestructive ? 'rgba(248, 81, 73, 0.3)' : 'rgba(88, 166, 255, 0.3)'}`,
                      'border-radius': '8px',
                      'font-size': '13px',
                      'font-weight': '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      'align-self': 'flex-start',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = tool.isDestructive
                        ? 'rgba(248, 81, 73, 0.2)'
                        : 'rgba(88, 166, 255, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = tool.isDestructive
                        ? 'rgba(248, 81, 73, 0.12)'
                        : 'rgba(88, 166, 255, 0.12)';
                    }}
                  >
                    Execute
                  </button>
                </div>
              )}
            </For>
          </div>
        </Show>
      </Show>

      {/* ================================================================ */}
      {/* Section 2: Execution History                                      */}
      {/* ================================================================ */}

      <div style={{ 'margin-bottom': '16px' }}>
        <h2
          style={{
            margin: '0 0 4px 0',
            'font-size': '20px',
            'font-weight': '600',
            color: colors.text,
          }}
        >
          Execution History
        </h2>
        <p style={{ margin: '0', 'font-size': '13px', color: colors.textMuted }}>
          Recent tool executions and their outcomes
        </p>
      </div>

      <div
        style={{
          'background-color': colors.bg1,
          'border-radius': '10px',
          border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}
      >
        <Show when={loadingHistory()}>
          <div
            style={{
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'center',
              padding: '48px 0',
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
            Loading history...
          </div>
        </Show>

        <Show when={!loadingHistory()}>
          <div style={{ 'overflow-x': 'auto' }}>
            <table
              style={{
                width: '100%',
                'border-collapse': 'collapse',
                'font-size': '13px',
              }}
            >
              <thead>
                <tr style={{ 'background-color': colors.bg2 }}>
                  <For
                    each={[
                      'Tool Name',
                      'Executed By',
                      'Status',
                      'Started At',
                      'Duration',
                      'Parameters',
                    ]}
                  >
                    {(header) => (
                      <th
                        style={{
                          padding: '11px 16px',
                          'text-align': 'left',
                          color: colors.textMuted,
                          'font-weight': '600',
                          'font-size': '11px',
                          'text-transform': 'uppercase',
                          'letter-spacing': '0.05em',
                          'border-bottom': `1px solid ${colors.border}`,
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
                <Show when={history().length === 0}>
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '40px 16px',
                        'text-align': 'center',
                        color: colors.textMuted,
                        'font-size': '14px',
                      }}
                    >
                      No execution history found.
                    </td>
                  </tr>
                </Show>
                <For each={history()}>
                  {(exec) => (
                    <tr
                      style={{ 'border-bottom': `1px solid ${colors.bg3}` }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.bg2; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <td
                        style={{
                          padding: '11px 16px',
                          color: colors.text,
                          'font-weight': '500',
                          'white-space': 'nowrap',
                        }}
                      >
                        {exec.toolName}
                      </td>
                      <td
                        style={{
                          padding: '11px 16px',
                          color: colors.blue,
                          'font-weight': '500',
                          'white-space': 'nowrap',
                        }}
                      >
                        {exec.executedByUsername}
                      </td>
                      <td style={{ padding: '11px 16px' }}>
                        <StatusBadge status={exec.status} />
                      </td>
                      <td
                        style={{
                          padding: '11px 16px',
                          color: colors.textMuted,
                          'white-space': 'nowrap',
                        }}
                      >
                        {formatDate(exec.startedAt)}
                      </td>
                      <td
                        style={{
                          padding: '11px 16px',
                          color:
                            exec.status === 'running' ? colors.blue : colors.textMuted,
                          'white-space': 'nowrap',
                          'font-weight': exec.status === 'running' ? '500' : '400',
                        }}
                      >
                        {formatDuration(exec.startedAt, exec.completedAt)}
                      </td>
                      <td
                        style={{
                          padding: '11px 16px',
                          color: colors.textMuted,
                          'font-family': 'monospace',
                          'font-size': '12px',
                          'max-width': '250px',
                          overflow: 'hidden',
                          'text-overflow': 'ellipsis',
                          'white-space': 'nowrap',
                        }}
                        title={JSON.stringify(exec.parameters, null, 2)}
                      >
                        {truncateJson(exec.parameters)}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          {/* History Pagination */}
          <Show when={historyPagination().totalPages > 1}>
            <div
              style={{
                display: 'flex',
                'justify-content': 'space-between',
                'align-items': 'center',
                padding: '12px 16px',
                'border-top': `1px solid ${colors.border}`,
                'background-color': colors.bg2,
              }}
            >
              <span style={{ color: colors.textMuted, 'font-size': '13px' }}>
                Showing{' '}
                {(historyPagination().page - 1) * historyPagination().pageSize + 1}
                {' - '}
                {Math.min(
                  historyPagination().page * historyPagination().pageSize,
                  historyPagination().total,
                )}
                {' of '}
                {historyPagination().total} executions
              </span>
              <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
                <button
                  disabled={historyPagination().page <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '6px 14px',
                    'background-color':
                      historyPagination().page <= 1 ? colors.bg3 : colors.border,
                    border: `1px solid ${colors.border}`,
                    'border-radius': '6px',
                    color: historyPagination().page <= 1 ? '#484f58' : colors.text,
                    'font-size': '13px',
                    cursor: historyPagination().page <= 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span
                  style={{
                    color: colors.textMuted,
                    'font-size': '13px',
                    padding: '0 8px',
                  }}
                >
                  Page {historyPagination().page} of {historyPagination().totalPages}
                </span>
                <button
                  disabled={historyPagination().page >= historyPagination().totalPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  style={{
                    padding: '6px 14px',
                    'background-color':
                      historyPagination().page >= historyPagination().totalPages
                        ? colors.bg3
                        : colors.border,
                    border: `1px solid ${colors.border}`,
                    'border-radius': '6px',
                    color:
                      historyPagination().page >= historyPagination().totalPages
                        ? '#484f58'
                        : colors.text,
                    'font-size': '13px',
                    cursor:
                      historyPagination().page >= historyPagination().totalPages
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </Show>
        </Show>
      </div>

      {/* Spinner animation keyframes */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Tool Execution Modal */}
      <Show when={selectedTool()}>
        {(tool) => (
          <ToolExecutionPanel
            tool={tool()}
            onClose={() => setSelectedTool(null)}
            onExecuted={() => fetchHistory()}
          />
        )}
      </Show>
    </div>
  );
}
