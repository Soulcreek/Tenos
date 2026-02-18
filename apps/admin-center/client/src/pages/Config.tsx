import { createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { config } from '../lib/api';
import { toastStore } from '../stores/toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConfigEntry {
  id: string;
  category: string;
  key: string;
  value: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  isEditable: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = ['gameplay', 'combat', 'economy', 'server', 'upgrade', 'event'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  gameplay: 'Gameplay',
  combat: 'Combat',
  economy: 'Economy',
  server: 'Server',
  upgrade: 'Upgrade',
  event: 'Event',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function displayValue(value: string, valueType: string): string {
  if (valueType === 'boolean') return value === 'true' ? 'True' : 'False';
  return value;
}

// ---------------------------------------------------------------------------
// Config Page
// ---------------------------------------------------------------------------

export default function Config() {
  const [entries, setEntries] = createSignal<ConfigEntry[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal<string | null>(null);
  const [saveSuccess, setSaveSuccess] = createSignal(false);

  const [activeTab, setActiveTab] = createSignal<string>('all');
  const [searchQuery, setSearchQuery] = createSignal('');

  // Track local changes: Map of entry id -> new value string
  const [changes, setChanges] = createSignal<Record<string, string>>({});

  // Store original values for showing diffs
  const [originals, setOriginals] = createSignal<Record<string, string>>({});

  // Derived: count of changes
  const changeCount = () => Object.keys(changes()).length;
  const hasChanges = () => changeCount() > 0;

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  async function fetchEntries() {
    setLoading(true);
    setError(null);
    try {
      const res = await config.list();
      const data = res.data as ConfigEntry[];
      setEntries(data);
      // Build originals map
      const orig: Record<string, string> = {};
      for (const entry of data) {
        orig[entry.id] = entry.value;
      }
      setOriginals(orig);
      // Clear changes that no longer exist or match current values
      setChanges((prev) => {
        const next: Record<string, string> = {};
        for (const [id, val] of Object.entries(prev)) {
          if (orig[id] !== undefined && orig[id] !== val) {
            next[id] = val;
          }
        }
        return next;
      });
    } catch (err: any) {
      setError(err.message ?? 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    fetchEntries();
  });

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filteredEntries = () => {
    let items = entries();
    const tab = activeTab();
    if (tab !== 'all') {
      items = items.filter((e) => e.category === tab);
    }
    const q = searchQuery().toLowerCase().trim();
    if (q) {
      items = items.filter(
        (e) =>
          e.key.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q),
      );
    }
    return items;
  };

  // Group by category for display
  const groupedEntries = () => {
    const filtered = filteredEntries();
    const groups: Record<string, ConfigEntry[]> = {};
    for (const entry of filtered) {
      if (!groups[entry.category]) {
        groups[entry.category] = [];
      }
      groups[entry.category].push(entry);
    }
    // Sort groups by CATEGORIES order
    const ordered: [string, ConfigEntry[]][] = [];
    for (const cat of CATEGORIES) {
      if (groups[cat]) {
        ordered.push([cat, groups[cat]]);
      }
    }
    // Any categories not in CATEGORIES (shouldn't happen, but safe)
    for (const [cat, items] of Object.entries(groups)) {
      if (!CATEGORIES.includes(cat as any)) {
        ordered.push([cat, items]);
      }
    }
    return ordered;
  };

  // ---------------------------------------------------------------------------
  // Change tracking
  // ---------------------------------------------------------------------------

  function getCurrentValue(entry: ConfigEntry): string {
    const ch = changes();
    if (ch[entry.id] !== undefined) return ch[entry.id];
    return entry.value;
  }

  function setEntryValue(id: string, newValue: string) {
    const orig = originals();
    setChanges((prev) => {
      const next = { ...prev };
      if (orig[id] === newValue) {
        delete next[id];
      } else {
        next[id] = newValue;
      }
      return next;
    });
  }

  function resetEntry(id: string) {
    setChanges((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function discardAll() {
    setChanges({});
  }

  function isModified(id: string): boolean {
    return changes()[id] !== undefined;
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function saveAll() {
    const ch = changes();
    const updates = Object.entries(ch).map(([id, value]) => ({ id, value }));
    if (updates.length === 0) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await config.bulkUpdate(updates);
      setSaveSuccess(true);
      toastStore.success(`Saved ${updates.length} configuration change${updates.length > 1 ? 's' : ''}`);
      setTimeout(() => setSaveSuccess(false), 3000);
      // Refresh data
      await fetchEntries();
    } catch (err: any) {
      setSaveError(err.message ?? 'Failed to save changes');
      toastStore.error(err.message ?? 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ padding: '24px', 'max-width': '1400px', margin: '0 auto', 'padding-bottom': '100px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
        'margin-bottom': '24px',
      }}>
        <div>
          <h1 style={{
            margin: '0 0 4px 0',
            'font-size': '24px',
            'font-weight': '600',
            color: '#e6edf3',
          }}>
            Game Configuration
          </h1>
          <p style={{ margin: 0, color: '#8b949e', 'font-size': '14px' }}>
            View and edit server configuration values
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', 'align-items': 'center' }}>
          <button
            onClick={fetchEntries}
            disabled={loading()}
            style={{
              padding: '8px 18px',
              background: '#1c2128',
              border: '1px solid #30363d',
              'border-radius': '6px',
              color: '#e6edf3',
              'font-size': '13px',
              'font-weight': '500',
              cursor: loading() ? 'not-allowed' : 'pointer',
              opacity: loading() ? '0.6' : '1',
            }}
            onMouseEnter={(e) => { if (!loading()) e.currentTarget.style.background = '#21262d'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1c2128'; }}
          >
            Refresh
          </button>
          <button
            onClick={saveAll}
            disabled={!hasChanges() || saving()}
            style={{
              padding: '8px 18px',
              background: hasChanges() ? '#58a6ff' : '#21262d',
              border: 'none',
              'border-radius': '6px',
              color: hasChanges() ? '#0f1117' : '#484f58',
              'font-size': '13px',
              'font-weight': '600',
              cursor: hasChanges() && !saving() ? 'pointer' : 'not-allowed',
              opacity: saving() ? '0.7' : '1',
            }}
            onMouseEnter={(e) => { if (hasChanges() && !saving()) e.currentTarget.style.background = '#79b8ff'; }}
            onMouseLeave={(e) => { if (hasChanges()) e.currentTarget.style.background = '#58a6ff'; }}
          >
            {saving() ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {/* Success message */}
      <Show when={saveSuccess()}>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(63, 185, 80, 0.1)',
          border: '1px solid rgba(63, 185, 80, 0.4)',
          'border-radius': '6px',
          color: '#3fb950',
          'font-size': '14px',
          'margin-bottom': '16px',
        }}>
          Configuration saved successfully.
        </div>
      </Show>

      {/* Save error */}
      <Show when={saveError()}>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(248, 81, 73, 0.1)',
          border: '1px solid rgba(248, 81, 73, 0.4)',
          'border-radius': '6px',
          color: '#f85149',
          'font-size': '14px',
          'margin-bottom': '16px',
        }}>
          {saveError()}
        </div>
      </Show>

      {/* Search Bar */}
      <div style={{
        'margin-bottom': '16px',
      }}>
        <input
          type="text"
          placeholder="Search config by key or description..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          style={{
            width: '100%',
            'box-sizing': 'border-box',
            padding: '10px 14px',
            background: '#0f1117',
            border: '1px solid #30363d',
            'border-radius': '6px',
            color: '#e6edf3',
            'font-size': '14px',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
        />
      </div>

      {/* Category Tabs */}
      <div style={{
        display: 'flex',
        gap: '0px',
        'border-bottom': '1px solid #30363d',
        'margin-bottom': '24px',
        'overflow-x': 'auto',
      }}>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            'border-bottom': activeTab() === 'all' ? '2px solid #58a6ff' : '2px solid transparent',
            color: activeTab() === 'all' ? '#58a6ff' : '#8b949e',
            'font-size': '14px',
            'font-weight': activeTab() === 'all' ? '600' : '400',
            cursor: 'pointer',
            'white-space': 'nowrap',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => { if (activeTab() !== 'all') e.currentTarget.style.color = '#e6edf3'; }}
          onMouseLeave={(e) => { if (activeTab() !== 'all') e.currentTarget.style.color = '#8b949e'; }}
        >
          All
        </button>
        <For each={[...CATEGORIES]}>
          {(cat) => (
            <button
              onClick={() => setActiveTab(cat)}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                border: 'none',
                'border-bottom': activeTab() === cat ? '2px solid #58a6ff' : '2px solid transparent',
                color: activeTab() === cat ? '#58a6ff' : '#8b949e',
                'font-size': '14px',
                'font-weight': activeTab() === cat ? '600' : '400',
                cursor: 'pointer',
                'white-space': 'nowrap',
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { if (activeTab() !== cat) e.currentTarget.style.color = '#e6edf3'; }}
              onMouseLeave={(e) => { if (activeTab() !== cat) e.currentTarget.style.color = '#8b949e'; }}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          )}
        </For>
      </div>

      {/* Error */}
      <Show when={error()}>
        <div style={{
          padding: '12px 16px',
          background: 'rgba(248, 81, 73, 0.1)',
          border: '1px solid rgba(248, 81, 73, 0.4)',
          'border-radius': '6px',
          color: '#f85149',
          'font-size': '14px',
          'margin-bottom': '16px',
        }}>
          {error()}
        </div>
      </Show>

      {/* Loading */}
      <Show when={loading()}>
        <div style={{
          display: 'flex',
          'justify-content': 'center',
          'align-items': 'center',
          padding: '60px 0',
          color: '#8b949e',
          'font-size': '14px',
          gap: '12px',
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid #30363d',
            'border-top-color': '#58a6ff',
            'border-radius': '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          Loading configuration...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Show>

      {/* Config Groups */}
      <Show when={!loading()}>
        <Show when={filteredEntries().length === 0 && !error()}>
          <div style={{
            'text-align': 'center',
            padding: '48px 16px',
            color: '#8b949e',
            'font-size': '14px',
          }}>
            {searchQuery() ? 'No config entries match your search.' : 'No configuration entries found.'}
          </div>
        </Show>

        <For each={groupedEntries()}>
          {([category, items]) => (
            <div style={{ 'margin-bottom': '28px' }}>
              {/* Category Header */}
              <div style={{
                display: 'flex',
                'align-items': 'center',
                gap: '10px',
                'margin-bottom': '12px',
              }}>
                <h2 style={{
                  margin: 0,
                  'font-size': '16px',
                  'font-weight': '600',
                  color: '#e6edf3',
                  'text-transform': 'capitalize',
                }}>
                  {CATEGORY_LABELS[category] ?? category}
                </h2>
                <span style={{
                  'font-size': '12px',
                  color: '#8b949e',
                  background: '#21262d',
                  padding: '2px 8px',
                  'border-radius': '10px',
                }}>
                  {items.length} {items.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {/* Config Entries */}
              <div style={{
                background: '#161b22',
                'border-radius': '8px',
                border: '1px solid #30363d',
                overflow: 'hidden',
              }}>
                <For each={items}>
                  {(entry, index) => {
                    const modified = () => isModified(entry.id);
                    const currentVal = () => getCurrentValue(entry);

                    return (
                      <div style={{
                        padding: '16px 20px',
                        'border-bottom': index() < items.length - 1 ? '1px solid #21262d' : 'none',
                        display: 'grid',
                        'grid-template-columns': '1fr 1fr auto',
                        gap: '16px',
                        'align-items': 'start',
                        transition: 'background 0.15s',
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* Left column: key + description */}
                        <div style={{ 'min-width': '0' }}>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '8px', 'flex-wrap': 'wrap' }}>
                            {/* Modified indicator */}
                            <Show when={modified()}>
                              <span style={{
                                width: '8px',
                                height: '8px',
                                'border-radius': '50%',
                                background: '#d29922',
                                display: 'inline-block',
                                'flex-shrink': '0',
                              }} />
                            </Show>
                            <span style={{
                              'font-family': "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                              'font-size': '14px',
                              'font-weight': '600',
                              color: '#e6edf3',
                              'word-break': 'break-all',
                            }}>
                              {entry.key}
                            </span>
                            <Show when={!entry.isEditable}>
                              <span style={{
                                'font-size': '11px',
                                'font-weight': '500',
                                color: '#8b949e',
                                background: '#21262d',
                                padding: '1px 7px',
                                'border-radius': '4px',
                                'white-space': 'nowrap',
                              }}>
                                Read-only
                              </span>
                            </Show>
                          </div>
                          <div style={{
                            'font-size': '13px',
                            color: '#8b949e',
                            'margin-top': '4px',
                            'line-height': '1.4',
                          }}>
                            {entry.description}
                          </div>
                          {/* Show original value when modified */}
                          <Show when={modified()}>
                            <div style={{
                              'font-size': '12px',
                              color: '#8b949e',
                              'margin-top': '6px',
                              'font-style': 'italic',
                            }}>
                              Original: <span style={{
                                'font-family': "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                                color: '#6e7681',
                              }}>
                                {displayValue(originals()[entry.id], entry.valueType)}
                              </span>
                            </div>
                          </Show>
                          {/* Updated info */}
                          <div style={{
                            'font-size': '11px',
                            color: '#484f58',
                            'margin-top': '4px',
                          }}>
                            Updated {formatDate(entry.updatedAt)}{entry.updatedBy ? ` by ${entry.updatedBy}` : ''}
                          </div>
                        </div>

                        {/* Middle column: input */}
                        <div style={{ display: 'flex', 'align-items': 'start', 'min-width': '0' }}>
                          {/* String input */}
                          <Show when={entry.valueType === 'string'}>
                            <input
                              type="text"
                              value={currentVal()}
                              disabled={!entry.isEditable}
                              onInput={(e) => setEntryValue(entry.id, e.currentTarget.value)}
                              style={{
                                width: '100%',
                                'box-sizing': 'border-box',
                                padding: '8px 12px',
                                background: entry.isEditable ? '#0f1117' : '#161b22',
                                border: `1px solid ${modified() ? '#d29922' : '#30363d'}`,
                                'border-radius': '6px',
                                color: entry.isEditable ? '#e6edf3' : '#484f58',
                                'font-size': '14px',
                                'font-family': "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                                outline: 'none',
                                cursor: entry.isEditable ? 'text' : 'not-allowed',
                              }}
                              onFocus={(e) => { if (entry.isEditable) e.currentTarget.style.borderColor = '#58a6ff'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = modified() ? '#d29922' : '#30363d'; }}
                            />
                          </Show>

                          {/* Number input */}
                          <Show when={entry.valueType === 'number'}>
                            <input
                              type="number"
                              value={currentVal()}
                              disabled={!entry.isEditable}
                              onInput={(e) => setEntryValue(entry.id, e.currentTarget.value)}
                              style={{
                                width: '100%',
                                'box-sizing': 'border-box',
                                padding: '8px 12px',
                                background: entry.isEditable ? '#0f1117' : '#161b22',
                                border: `1px solid ${modified() ? '#d29922' : '#30363d'}`,
                                'border-radius': '6px',
                                color: entry.isEditable ? '#e6edf3' : '#484f58',
                                'font-size': '14px',
                                'font-family': "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                                outline: 'none',
                                cursor: entry.isEditable ? 'text' : 'not-allowed',
                              }}
                              onFocus={(e) => { if (entry.isEditable) e.currentTarget.style.borderColor = '#58a6ff'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = modified() ? '#d29922' : '#30363d'; }}
                            />
                          </Show>

                          {/* Boolean toggle */}
                          <Show when={entry.valueType === 'boolean'}>
                            <label style={{
                              display: 'inline-flex',
                              'align-items': 'center',
                              gap: '10px',
                              cursor: entry.isEditable ? 'pointer' : 'not-allowed',
                              'user-select': 'none',
                              'padding-top': '4px',
                            }}>
                              <div
                                onClick={() => {
                                  if (!entry.isEditable) return;
                                  const newVal = currentVal() === 'true' ? 'false' : 'true';
                                  setEntryValue(entry.id, newVal);
                                }}
                                style={{
                                  width: '44px',
                                  height: '24px',
                                  'border-radius': '12px',
                                  background: currentVal() === 'true' ? '#3fb950' : '#30363d',
                                  position: 'relative',
                                  transition: 'background 0.2s',
                                  cursor: entry.isEditable ? 'pointer' : 'not-allowed',
                                  opacity: entry.isEditable ? '1' : '0.5',
                                  'flex-shrink': '0',
                                  border: modified() ? '2px solid #d29922' : '2px solid transparent',
                                }}
                              >
                                <div style={{
                                  width: '18px',
                                  height: '18px',
                                  'border-radius': '50%',
                                  background: '#e6edf3',
                                  position: 'absolute',
                                  top: '1px',
                                  left: currentVal() === 'true' ? '22px' : '2px',
                                  transition: 'left 0.2s',
                                  'box-shadow': '0 1px 3px rgba(0,0,0,0.3)',
                                }} />
                              </div>
                              <span style={{
                                'font-size': '13px',
                                color: currentVal() === 'true' ? '#3fb950' : '#8b949e',
                                'font-weight': '500',
                              }}>
                                {currentVal() === 'true' ? 'Enabled' : 'Disabled'}
                              </span>
                            </label>
                          </Show>

                          {/* JSON textarea */}
                          <Show when={entry.valueType === 'json'}>
                            <textarea
                              value={currentVal()}
                              disabled={!entry.isEditable}
                              onInput={(e) => setEntryValue(entry.id, e.currentTarget.value)}
                              rows={4}
                              style={{
                                width: '100%',
                                'box-sizing': 'border-box',
                                padding: '8px 12px',
                                background: entry.isEditable ? '#0f1117' : '#161b22',
                                border: `1px solid ${modified() ? '#d29922' : '#30363d'}`,
                                'border-radius': '6px',
                                color: entry.isEditable ? '#e6edf3' : '#484f58',
                                'font-size': '13px',
                                'font-family': "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
                                outline: 'none',
                                resize: 'vertical',
                                'line-height': '1.5',
                                cursor: entry.isEditable ? 'text' : 'not-allowed',
                              }}
                              onFocus={(e) => { if (entry.isEditable) e.currentTarget.style.borderColor = '#58a6ff'; }}
                              onBlur={(e) => { e.currentTarget.style.borderColor = modified() ? '#d29922' : '#30363d'; }}
                            />
                          </Show>
                        </div>

                        {/* Right column: reset button */}
                        <div style={{ 'padding-top': '4px' }}>
                          <Show when={modified()}>
                            <button
                              onClick={() => resetEntry(entry.id)}
                              style={{
                                padding: '6px 12px',
                                background: 'transparent',
                                border: '1px solid #30363d',
                                'border-radius': '6px',
                                color: '#d29922',
                                'font-size': '12px',
                                'font-weight': '500',
                                cursor: 'pointer',
                                'white-space': 'nowrap',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(210, 153, 34, 0.1)';
                                e.currentTarget.style.borderColor = '#d29922';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = '#30363d';
                              }}
                            >
                              Reset
                            </button>
                          </Show>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </Show>

      {/* Unsaved Changes Bar */}
      <Show when={hasChanges()}>
        <div style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          background: '#161b22',
          'border-top': '1px solid #30363d',
          padding: '14px 24px',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          'z-index': '100',
          'box-shadow': '0 -4px 12px rgba(0, 0, 0, 0.3)',
        }}>
          <span style={{
            color: '#d29922',
            'font-size': '14px',
            'font-weight': '500',
          }}>
            {changeCount()} unsaved {changeCount() === 1 ? 'change' : 'changes'}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={discardAll}
              style={{
                padding: '8px 18px',
                background: '#21262d',
                border: '1px solid #30363d',
                'border-radius': '6px',
                color: '#8b949e',
                'font-size': '13px',
                'font-weight': '500',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#30363d';
                e.currentTarget.style.color = '#e6edf3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#21262d';
                e.currentTarget.style.color = '#8b949e';
              }}
            >
              Discard All
            </button>
            <button
              onClick={saveAll}
              disabled={saving()}
              style={{
                padding: '8px 18px',
                background: '#3fb950',
                border: 'none',
                'border-radius': '6px',
                color: '#0f1117',
                'font-size': '13px',
                'font-weight': '600',
                cursor: saving() ? 'not-allowed' : 'pointer',
                opacity: saving() ? '0.7' : '1',
              }}
              onMouseEnter={(e) => { if (!saving()) e.currentTarget.style.background = '#56d364'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#3fb950'; }}
            >
              {saving() ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
