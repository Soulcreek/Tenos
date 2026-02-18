import { createSignal, createResource, Show, For } from 'solid-js';
import { useParams, A } from '@solidjs/router';
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatNumber(value: number): string {
  return value.toLocaleString();
}

// ---------- Shared Styles ----------

const cardStyle = {
  background: '#161b22',
  border: '1px solid #30363d',
  'border-radius': '8px',
  padding: '20px',
};

const cardTitleStyle = {
  'font-size': '16px',
  'font-weight': '600',
  color: '#e6edf3',
  'margin-bottom': '16px',
};

const labelStyle = {
  'font-size': '12px',
  color: '#8b949e',
  'font-weight': '500',
  'margin-bottom': '4px',
};

const valueStyle = {
  'font-size': '14px',
  color: '#e6edf3',
};

const inputStyle = {
  background: '#0f1117',
  border: '1px solid #30363d',
  'border-radius': '6px',
  color: '#e6edf3',
  padding: '8px 12px',
  'font-size': '14px',
  outline: 'none',
  width: '100%',
  'box-sizing': 'border-box' as const,
};

const primaryBtnStyle = {
  background: '#58a6ff22',
  border: '1px solid #58a6ff55',
  color: '#58a6ff',
  padding: '8px 16px',
  'border-radius': '6px',
  'font-size': '13px',
  'font-weight': '500',
  cursor: 'pointer',
};

const dangerBtnStyle = {
  background: '#f8514922',
  border: '1px solid #f8514955',
  color: '#f85149',
  padding: '8px 16px',
  'border-radius': '6px',
  'font-size': '13px',
  'font-weight': '500',
  cursor: 'pointer',
};

const successBtnStyle = {
  background: '#3fb95022',
  border: '1px solid #3fb95055',
  color: '#3fb950',
  padding: '8px 16px',
  'border-radius': '6px',
  'font-size': '13px',
  'font-weight': '500',
  cursor: 'pointer',
};

const secondaryBtnStyle = {
  background: '#21262d',
  border: '1px solid #30363d',
  color: '#e6edf3',
  padding: '8px 16px',
  'border-radius': '6px',
  'font-size': '13px',
  'font-weight': '500',
  cursor: 'pointer',
};

const overlayStyle = {
  position: 'fixed' as const,
  top: '0',
  left: '0',
  right: '0',
  bottom: '0',
  background: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'z-index': '1000',
};

const modalStyle = {
  background: '#161b22',
  border: '1px solid #30363d',
  'border-radius': '12px',
  padding: '24px',
  'min-width': '400px',
  'max-width': '500px',
  width: '100%',
};

const modalTitleStyle = {
  'font-size': '18px',
  'font-weight': '600',
  color: '#e6edf3',
  'margin-bottom': '20px',
};

// ---------- Component ----------

export default function CharacterDetail() {
  const params = useParams<{ id: string }>();

  const [data, { refetch }] = createResource(
    () => params.id,
    (id) => characters.get(id),
  );

  const char = () => data()?.data;

  // --- Teleport state ---
  const [showTeleport, setShowTeleport] = createSignal(false);
  const [teleZone, setTeleZone] = createSignal('');
  const [teleX, setTeleX] = createSignal('');
  const [teleY, setTeleY] = createSignal('');
  const [teleZ, setTeleZ] = createSignal('');
  const [teleporting, setTeleporting] = createSignal(false);

  // --- Edit modal state ---
  const [showEdit, setShowEdit] = createSignal(false);
  const [editLevel, setEditLevel] = createSignal('');
  const [editGold, setEditGold] = createSignal('');
  const [editHp, setEditHp] = createSignal('');
  const [editMaxHp, setEditMaxHp] = createSignal('');
  const [editMp, setEditMp] = createSignal('');
  const [editMaxMp, setEditMaxMp] = createSignal('');
  const [saving, setSaving] = createSignal(false);

  // --- Reset stats state ---
  const [showResetConfirm, setShowResetConfirm] = createSignal(false);
  const [resetting, setResetting] = createSignal(false);

  // --- Removing item state ---
  const [removingItemId, setRemovingItemId] = createSignal<string | null>(null);

  function openTeleport() {
    const c = char();
    if (!c) return;
    setTeleZone(c.zone);
    setTeleX(String(c.positionX));
    setTeleY(String(c.positionY));
    setTeleZ(String(c.positionZ));
    setShowTeleport(true);
  }

  async function handleTeleport() {
    setTeleporting(true);
    try {
      await characters.teleport(params.id, {
        zone: teleZone(),
        x: Number(teleX()),
        y: Number(teleY()),
        z: Number(teleZ()),
      });
      setShowTeleport(false);
      refetch();
    } catch (err: any) {
      alert('Teleport failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      setTeleporting(false);
    }
  }

  function openEdit() {
    const c = char();
    if (!c) return;
    setEditLevel(String(c.level));
    setEditGold(String(c.gold));
    setEditHp(String(c.hp));
    setEditMaxHp(String(c.maxHp));
    setEditMp(String(c.mp));
    setEditMaxMp(String(c.maxMp));
    setShowEdit(true);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      await characters.update(params.id, {
        level: Number(editLevel()),
        gold: Number(editGold()),
        hp: Number(editHp()),
        maxHp: Number(editMaxHp()),
        mp: Number(editMp()),
        maxMp: Number(editMaxMp()),
      });
      setShowEdit(false);
      refetch();
    } catch (err: any) {
      alert('Save failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleResetStats() {
    setResetting(true);
    try {
      await characters.resetStats(params.id);
      setShowResetConfirm(false);
      refetch();
    } catch (err: any) {
      alert('Reset stats failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      setResetting(false);
    }
  }

  async function handleRemoveItem(inventoryItemId: string) {
    if (!confirm('Remove this item from inventory?')) return;
    setRemovingItemId(inventoryItemId);
    try {
      await characters.removeItem(params.id, inventoryItemId);
      refetch();
    } catch (err: any) {
      alert('Remove item failed: ' + (err.message ?? 'Unknown error'));
    } finally {
      setRemovingItemId(null);
    }
  }

  // --- Stat bar helper ---
  function StatBar(props: { current: number; max: number; color: string; label: string }) {
    const pct = () => props.max > 0 ? Math.round((props.current / props.max) * 100) : 0;
    return (
      <div style={{ 'margin-bottom': '12px' }}>
        <div style={{ display: 'flex', 'justify-content': 'space-between', 'margin-bottom': '4px' }}>
          <span style={{ 'font-size': '13px', color: '#e6edf3', 'font-weight': '500' }}>{props.label}</span>
          <span style={{ 'font-size': '13px', color: '#8b949e' }}>
            {formatNumber(props.current)} / {formatNumber(props.max)}
          </span>
        </div>
        <div style={{
          height: '8px',
          background: '#21262d',
          'border-radius': '4px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: pct() + '%',
            background: props.color,
            'border-radius': '4px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  }

  // --- Stat grid item ---
  function StatItem(props: { label: string; value: number | string }) {
    return (
      <div style={{
        background: '#0f1117',
        'border-radius': '6px',
        padding: '12px',
        'text-align': 'center',
      }}>
        <div style={labelStyle}>{props.label}</div>
        <div style={{ 'font-size': '20px', 'font-weight': '600', color: '#e6edf3', 'margin-top': '4px' }}>
          {typeof props.value === 'number' ? formatNumber(props.value) : props.value}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', 'min-height': '100%' }}>
      {/* Loading */}
      <Show when={!data.loading} fallback={
        <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center', padding: '64px', color: '#8b949e' }}>
          Loading character...
        </div>
      }>
        <Show when={char()} fallback={
          <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', gap: '16px', padding: '64px', color: '#8b949e' }}>
            <span style={{ 'font-size': '16px' }}>Character not found.</span>
            <A href="/characters" style={{ color: '#58a6ff', 'text-decoration': 'none' }}>Back to Characters</A>
          </div>
        }>
          {(c) => {
            const classColor = () => CLASS_COLORS[c().characterClass] ?? '#8b949e';

            return (
              <>
                {/* Back link */}
                <div style={{ 'margin-bottom': '16px' }}>
                  <A href="/characters" style={{ color: '#58a6ff', 'text-decoration': 'none', 'font-size': '14px' }}>
                    &larr; Back to Characters
                  </A>
                </div>

                {/* ===== Character Header ===== */}
                <div style={{
                  ...cardStyle,
                  display: 'flex',
                  'align-items': 'center',
                  'justify-content': 'space-between',
                  'flex-wrap': 'wrap',
                  gap: '16px',
                  'margin-bottom': '20px',
                }}>
                  <div style={{ display: 'flex', 'align-items': 'center', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', 'align-items': 'center', gap: '12px', 'margin-bottom': '4px' }}>
                        <h1 style={{ 'font-size': '24px', 'font-weight': '600', color: '#e6edf3', margin: '0' }}>
                          {c().name}
                        </h1>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          'border-radius': '12px',
                          'font-size': '12px',
                          'font-weight': '500',
                          color: '#ffffff',
                          background: classColor() + '22',
                          border: '1px solid ' + classColor() + '55',
                        }}>
                          {capitalize(c().characterClass)}
                        </span>
                        <span style={{
                          display: 'inline-block',
                          width: '10px',
                          height: '10px',
                          'border-radius': '50%',
                          background: c().isOnline ? '#3fb950' : '#484f58',
                          'box-shadow': c().isOnline ? '0 0 8px #3fb95066' : 'none',
                        }} />
                        <span style={{ 'font-size': '13px', color: c().isOnline ? '#3fb950' : '#8b949e' }}>
                          {c().isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', 'font-size': '14px', color: '#8b949e' }}>
                        <span>Level {c().level}</span>
                        <span>{KINGDOM_NAMES[c().kingdom] ?? 'Unknown'}</span>
                        <span>Gold: <span style={{ color: '#d29922' }}>{formatNumber(c().gold)}</span></span>
                      </div>
                    </div>
                  </div>
                  <button style={primaryBtnStyle} onClick={openEdit}>
                    Edit Character
                  </button>
                </div>

                {/* ===== Two-column layout ===== */}
                <div style={{
                  display: 'grid',
                  'grid-template-columns': '1fr 1fr',
                  gap: '20px',
                  'margin-bottom': '20px',
                }}>
                  {/* --- Stats Card --- */}
                  <div style={cardStyle}>
                    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'margin-bottom': '16px' }}>
                      <h2 style={{ ...cardTitleStyle, margin: '0' }}>Stats</h2>
                      <button
                        style={dangerBtnStyle}
                        onClick={() => setShowResetConfirm(true)}
                      >
                        Reset Stats
                      </button>
                    </div>

                    <StatBar current={c().hp} max={c().maxHp} color="#f85149" label="HP" />
                    <StatBar current={c().mp} max={c().maxMp} color="#58a6ff" label="MP" />

                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(3, 1fr)',
                      gap: '10px',
                      'margin-top': '16px',
                    }}>
                      <StatItem label="STR" value={c().str} />
                      <StatItem label="DEX" value={c().dex} />
                      <StatItem label="INT" value={c().int} />
                      <StatItem label="VIT" value={c().vit} />
                      <StatItem label="Stat Pts" value={c().statPoints} />
                      <StatItem label="Skill Pts" value={c().skillPoints} />
                    </div>
                  </div>

                  {/* --- Position & Zone Card --- */}
                  <div style={cardStyle}>
                    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', 'margin-bottom': '16px' }}>
                      <h2 style={{ ...cardTitleStyle, margin: '0' }}>Position & Zone</h2>
                      <button style={primaryBtnStyle} onClick={openTeleport}>
                        Teleport
                      </button>
                    </div>

                    <div style={{
                      display: 'grid',
                      'grid-template-columns': '1fr 1fr',
                      gap: '16px',
                    }}>
                      <div>
                        <div style={labelStyle}>Current Zone</div>
                        <div style={{ ...valueStyle, 'font-size': '18px', 'font-weight': '500' }}>{c().zone}</div>
                      </div>
                      <div />
                      <div>
                        <div style={labelStyle}>X</div>
                        <div style={{ ...valueStyle, 'font-variant-numeric': 'tabular-nums' }}>{c().positionX.toFixed(1)}</div>
                      </div>
                      <div>
                        <div style={labelStyle}>Y</div>
                        <div style={{ ...valueStyle, 'font-variant-numeric': 'tabular-nums' }}>{c().positionY.toFixed(1)}</div>
                      </div>
                      <div>
                        <div style={labelStyle}>Z</div>
                        <div style={{ ...valueStyle, 'font-variant-numeric': 'tabular-nums' }}>{c().positionZ.toFixed(1)}</div>
                      </div>
                    </div>

                    {/* Account info section at bottom of this card */}
                    <Show when={c().account}>
                      {(acct) => (
                        <div style={{ 'margin-top': '24px', 'padding-top': '16px', 'border-top': '1px solid #30363d' }}>
                          <h3 style={{ ...cardTitleStyle, 'font-size': '14px' }}>Account</h3>
                          <div style={{ display: 'flex', 'align-items': 'center', gap: '12px' }}>
                            <span style={valueStyle}>{acct().username}</span>
                            <span style={{
                              'font-size': '12px',
                              padding: '2px 8px',
                              'border-radius': '12px',
                              background: '#21262d',
                              color: '#8b949e',
                              border: '1px solid #30363d',
                            }}>
                              {acct().role}
                            </span>
                            <A
                              href={`/players/${acct().id}`}
                              style={{ color: '#58a6ff', 'text-decoration': 'none', 'font-size': '13px' }}
                            >
                              View Account
                            </A>
                          </div>
                        </div>
                      )}
                    </Show>
                  </div>
                </div>

                {/* ===== Equipment Card ===== */}
                <Show when={c().equipment && c().equipment.length > 0}>
                  <div style={{ ...cardStyle, 'margin-bottom': '20px' }}>
                    <h2 style={cardTitleStyle}>Equipment</h2>
                    <div style={{
                      display: 'grid',
                      'grid-template-columns': 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: '10px',
                    }}>
                      <For each={c().equipment}>
                        {(eq) => (
                          <div style={{
                            background: '#0f1117',
                            'border-radius': '6px',
                            padding: '12px 16px',
                            display: 'flex',
                            'align-items': 'center',
                            'justify-content': 'space-between',
                            border: '1px solid #21262d',
                          }}>
                            <div>
                              <div style={{ 'font-size': '11px', color: '#8b949e', 'text-transform': 'uppercase', 'letter-spacing': '0.5px', 'margin-bottom': '2px' }}>
                                {capitalize(eq.slot)}
                              </div>
                              <div style={{ 'font-size': '14px', color: '#e6edf3', 'font-weight': '500' }}>
                                {eq.item?.name ?? 'Unknown Item'}
                              </div>
                            </div>
                            <Show when={eq.upgradeLevel > 0}>
                              <span style={{
                                'font-size': '13px',
                                color: '#d29922',
                                'font-weight': '600',
                                'white-space': 'nowrap',
                              }}>
                                +{eq.upgradeLevel}
                              </span>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* ===== Inventory Grid ===== */}
                <div style={{ ...cardStyle, 'margin-bottom': '20px' }}>
                  <h2 style={cardTitleStyle}>Inventory</h2>
                  <Show when={c().inventory && c().inventory.length > 0} fallback={
                    <div style={{ color: '#8b949e', 'font-size': '14px', padding: '16px 0' }}>
                      Inventory is empty.
                    </div>
                  }>
                    <div style={{ overflow: 'auto' }}>
                      <table style={{ width: '100%', 'border-collapse': 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{
                              padding: '8px 12px',
                              'text-align': 'left',
                              'font-size': '11px',
                              'font-weight': '600',
                              color: '#8b949e',
                              'text-transform': 'uppercase',
                              'letter-spacing': '0.5px',
                              'border-bottom': '1px solid #30363d',
                            }}>
                              Slot
                            </th>
                            <th style={{
                              padding: '8px 12px',
                              'text-align': 'left',
                              'font-size': '11px',
                              'font-weight': '600',
                              color: '#8b949e',
                              'text-transform': 'uppercase',
                              'letter-spacing': '0.5px',
                              'border-bottom': '1px solid #30363d',
                            }}>
                              Item
                            </th>
                            <th style={{
                              padding: '8px 12px',
                              'text-align': 'center',
                              'font-size': '11px',
                              'font-weight': '600',
                              color: '#8b949e',
                              'text-transform': 'uppercase',
                              'letter-spacing': '0.5px',
                              'border-bottom': '1px solid #30363d',
                            }}>
                              Qty
                            </th>
                            <th style={{
                              padding: '8px 12px',
                              'text-align': 'center',
                              'font-size': '11px',
                              'font-weight': '600',
                              color: '#8b949e',
                              'text-transform': 'uppercase',
                              'letter-spacing': '0.5px',
                              'border-bottom': '1px solid #30363d',
                            }}>
                              Upgrade
                            </th>
                            <th style={{
                              padding: '8px 12px',
                              'text-align': 'right',
                              'font-size': '11px',
                              'font-weight': '600',
                              color: '#8b949e',
                              'text-transform': 'uppercase',
                              'letter-spacing': '0.5px',
                              'border-bottom': '1px solid #30363d',
                            }}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <For each={c().inventory}>
                            {(inv) => (
                              <tr
                                style={{ transition: 'background 0.15s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                <td style={{ padding: '10px 12px', 'font-size': '13px', color: '#8b949e', 'border-bottom': '1px solid #21262d' }}>
                                  #{inv.slot}
                                </td>
                                <td style={{ padding: '10px 12px', 'font-size': '14px', color: '#e6edf3', 'font-weight': '500', 'border-bottom': '1px solid #21262d' }}>
                                  {inv.item?.name ?? 'Unknown'}
                                </td>
                                <td style={{ padding: '10px 12px', 'font-size': '14px', color: '#e6edf3', 'text-align': 'center', 'border-bottom': '1px solid #21262d' }}>
                                  {inv.quantity}
                                </td>
                                <td style={{ padding: '10px 12px', 'font-size': '14px', color: inv.upgradeLevel > 0 ? '#d29922' : '#8b949e', 'text-align': 'center', 'font-weight': inv.upgradeLevel > 0 ? '600' : '400', 'border-bottom': '1px solid #21262d' }}>
                                  {inv.upgradeLevel > 0 ? '+' + inv.upgradeLevel : '-'}
                                </td>
                                <td style={{ padding: '10px 12px', 'text-align': 'right', 'border-bottom': '1px solid #21262d' }}>
                                  <button
                                    style={{
                                      ...dangerBtnStyle,
                                      padding: '4px 10px',
                                      'font-size': '12px',
                                      opacity: removingItemId() === inv.id ? '0.5' : '1',
                                    }}
                                    disabled={removingItemId() === inv.id}
                                    onClick={() => handleRemoveItem(inv.id)}
                                  >
                                    {removingItemId() === inv.id ? 'Removing...' : 'Remove'}
                                  </button>
                                </td>
                              </tr>
                            )}
                          </For>
                        </tbody>
                      </table>
                    </div>
                  </Show>
                </div>

                {/* ===== Reset Stats Confirmation Modal ===== */}
                <Show when={showResetConfirm()}>
                  <div style={overlayStyle} onClick={() => setShowResetConfirm(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                      <h2 style={modalTitleStyle}>Reset Stats</h2>
                      <p style={{ color: '#8b949e', 'font-size': '14px', 'line-height': '1.5', 'margin-bottom': '20px' }}>
                        Are you sure you want to reset all stats for <strong style={{ color: '#e6edf3' }}>{c().name}</strong>?
                        This will set STR, DEX, INT, and VIT back to base values and return all allocated stat points.
                        This action cannot be undone.
                      </p>
                      <div style={{ display: 'flex', gap: '10px', 'justify-content': 'flex-end' }}>
                        <button style={secondaryBtnStyle} onClick={() => setShowResetConfirm(false)}>
                          Cancel
                        </button>
                        <button
                          style={{ ...dangerBtnStyle, opacity: resetting() ? '0.5' : '1' }}
                          disabled={resetting()}
                          onClick={handleResetStats}
                        >
                          {resetting() ? 'Resetting...' : 'Reset Stats'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* ===== Teleport Modal ===== */}
                <Show when={showTeleport()}>
                  <div style={overlayStyle} onClick={() => setShowTeleport(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                      <h2 style={modalTitleStyle}>Teleport Character</h2>
                      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
                        <div>
                          <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>Zone</label>
                          <input
                            type="text"
                            style={inputStyle}
                            value={teleZone()}
                            onInput={(e) => setTeleZone(e.currentTarget.value)}
                          />
                        </div>
                        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>X</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={teleX()}
                              onInput={(e) => setTeleX(e.currentTarget.value)}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>Y</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={teleY()}
                              onInput={(e) => setTeleY(e.currentTarget.value)}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>Z</label>
                            <input
                              type="number"
                              style={inputStyle}
                              value={teleZ()}
                              onInput={(e) => setTeleZ(e.currentTarget.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', 'justify-content': 'flex-end', 'margin-top': '20px' }}>
                        <button style={secondaryBtnStyle} onClick={() => setShowTeleport(false)}>
                          Cancel
                        </button>
                        <button
                          style={{ ...successBtnStyle, opacity: teleporting() ? '0.5' : '1' }}
                          disabled={teleporting()}
                          onClick={handleTeleport}
                        >
                          {teleporting() ? 'Teleporting...' : 'Teleport'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Show>

                {/* ===== Edit Character Modal ===== */}
                <Show when={showEdit()}>
                  <div style={overlayStyle} onClick={() => setShowEdit(false)}>
                    <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
                      <h2 style={modalTitleStyle}>Edit Character</h2>
                      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '14px' }}>
                        <div>
                          <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>Level</label>
                          <input
                            type="number"
                            min="1"
                            style={inputStyle}
                            value={editLevel()}
                            onInput={(e) => setEditLevel(e.currentTarget.value)}
                          />
                        </div>
                        <div>
                          <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>Gold</label>
                          <input
                            type="number"
                            min="0"
                            style={inputStyle}
                            value={editGold()}
                            onInput={(e) => setEditGold(e.currentTarget.value)}
                          />
                        </div>
                        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>HP</label>
                            <input
                              type="number"
                              min="0"
                              style={inputStyle}
                              value={editHp()}
                              onInput={(e) => setEditHp(e.currentTarget.value)}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>Max HP</label>
                            <input
                              type="number"
                              min="1"
                              style={inputStyle}
                              value={editMaxHp()}
                              onInput={(e) => setEditMaxHp(e.currentTarget.value)}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>MP</label>
                            <input
                              type="number"
                              min="0"
                              style={inputStyle}
                              value={editMp()}
                              onInput={(e) => setEditMp(e.currentTarget.value)}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, display: 'block', 'margin-bottom': '6px' }}>Max MP</label>
                            <input
                              type="number"
                              min="1"
                              style={inputStyle}
                              value={editMaxMp()}
                              onInput={(e) => setEditMaxMp(e.currentTarget.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', 'justify-content': 'flex-end', 'margin-top': '20px' }}>
                        <button style={secondaryBtnStyle} onClick={() => setShowEdit(false)}>
                          Cancel
                        </button>
                        <button
                          style={{ ...primaryBtnStyle, opacity: saving() ? '0.5' : '1' }}
                          disabled={saving()}
                          onClick={handleSaveEdit}
                        >
                          {saving() ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  </div>
                </Show>
              </>
            );
          }}
        </Show>
      </Show>
    </div>
  );
}
