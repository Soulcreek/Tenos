import { createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { players } from '../lib/api';

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

const KingdomName: Record<number, string> = {
  1: 'Shinsoo',
  2: 'Chunjo',
  3: 'Jinno',
};

const roleBadgeColors: Record<string, { bg: string; text: string }> = {
  admin: { bg: 'rgba(88, 166, 255, 0.15)', text: '#58a6ff' },
  gm: { bg: 'rgba(210, 153, 34, 0.15)', text: '#d29922' },
  player: { bg: 'rgba(139, 148, 158, 0.15)', text: '#8b949e' },
};

// -- Shared style fragments --

const cardStyle = {
  background: '#161b22',
  "border-radius": '8px',
  border: '1px solid #30363d',
  "margin-bottom": '24px',
  overflow: 'hidden',
};

const cardHeaderStyle = {
  display: 'flex',
  "justify-content": 'space-between',
  "align-items": 'center',
  padding: '16px 20px',
  "border-bottom": '1px solid #30363d',
  background: '#1c2128',
};

const cardTitleStyle = {
  margin: '0',
  "font-size": '16px',
  "font-weight": '600',
  color: '#e6edf3',
};

const thStyle = {
  padding: '10px 16px',
  "text-align": 'left' as const,
  color: '#8b949e',
  "font-weight": '600',
  "font-size": '12px',
  "text-transform": 'uppercase' as const,
  "letter-spacing": '0.5px',
  "border-bottom": '1px solid #30363d',
  "white-space": 'nowrap' as const,
};

const tdStyle = {
  padding: '10px 16px',
  color: '#8b949e',
  "font-size": '14px',
  "border-bottom": '1px solid #21262d',
};

const labelStyle = {
  color: '#8b949e',
  "font-size": '12px',
  "text-transform": 'uppercase' as const,
  "letter-spacing": '0.5px',
  "margin-bottom": '4px',
};

const valueStyle = {
  color: '#e6edf3',
  "font-size": '14px',
  "font-weight": '500',
};

const primaryBtnStyle = {
  padding: '8px 16px',
  background: '#58a6ff',
  color: '#0f1117',
  border: 'none',
  "border-radius": '6px',
  "font-size": '13px',
  "font-weight": '600',
  cursor: 'pointer',
};

const dangerBtnStyle = {
  ...primaryBtnStyle,
  background: '#f85149',
};

const outlineBtnStyle = {
  padding: '8px 16px',
  background: 'transparent',
  border: '1px solid #30363d',
  "border-radius": '6px',
  color: '#e6edf3',
  "font-size": '13px',
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
  "align-items": 'center',
  "justify-content": 'center',
  "z-index": '1000',
};

const modalStyle = {
  background: '#161b22',
  "border-radius": '12px',
  border: '1px solid #30363d',
  width: '100%',
  "max-width": '480px',
  "box-shadow": '0 16px 48px rgba(0, 0, 0, 0.4)',
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  background: '#0f1117',
  border: '1px solid #30363d',
  "border-radius": '6px',
  color: '#e6edf3',
  "font-size": '14px',
  outline: 'none',
  "box-sizing": 'border-box' as const,
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
};

export default function PlayerDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [player, setPlayer] = createSignal<any>(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [actionLoading, setActionLoading] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);

  // Role editing
  const [editingRole, setEditingRole] = createSignal(false);
  const [selectedRole, setSelectedRole] = createSignal('');

  // Ban modal
  const [showBanModal, setShowBanModal] = createSignal(false);
  const [banReason, setBanReason] = createSignal('');
  const [banType, setBanType] = createSignal('permanent');
  const [banExpiry, setBanExpiry] = createSignal('');

  // Unban confirmation
  const [showUnbanConfirm, setShowUnbanConfirm] = createSignal(false);

  async function fetchPlayer() {
    setLoading(true);
    setError(null);
    try {
      const res = await players.get(params.id);
      setPlayer(res.data);
      setSelectedRole(res.data.role);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load player');
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    fetchPlayer();
  });

  async function handleRoleChange() {
    if (!player() || selectedRole() === player().role) {
      setEditingRole(false);
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      await players.update(params.id, { role: selectedRole() });
      await fetchPlayer();
      setEditingRole(false);
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBan() {
    if (!banReason().trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await players.ban(params.id, {
        reason: banReason(),
        type: banType(),
        expiresAt: banType() === 'temporary' && banExpiry() ? banExpiry() : undefined,
      });
      setShowBanModal(false);
      setBanReason('');
      setBanType('permanent');
      setBanExpiry('');
      await fetchPlayer();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to ban player');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUnban() {
    setActionLoading(true);
    setActionError(null);
    try {
      await players.unban(params.id);
      setShowUnbanConfirm(false);
      await fetchPlayer();
    } catch (err: any) {
      setActionError(err.message ?? 'Failed to unban player');
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ padding: '24px', "max-width": '1200px', margin: '0 auto' }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate('/players')}
        style={{
          display: 'inline-flex',
          "align-items": 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'transparent',
          border: '1px solid #30363d',
          "border-radius": '6px',
          color: '#8b949e',
          "font-size": '13px',
          cursor: 'pointer',
          "margin-bottom": '20px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#e6edf3'; e.currentTarget.style.borderColor = '#58a6ff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#8b949e'; e.currentTarget.style.borderColor = '#30363d'; }}
      >
        &larr; Back to Players
      </button>

      {/* Loading */}
      <Show when={loading()}>
        <div style={{ display: 'flex', "justify-content": 'center', padding: '60px', color: '#8b949e' }}>
          Loading player details...
        </div>
      </Show>

      {/* Error */}
      <Show when={error() && !loading()}>
        <div style={{
          padding: '16px 20px',
          background: 'rgba(248, 81, 73, 0.1)',
          border: '1px solid rgba(248, 81, 73, 0.4)',
          "border-radius": '8px',
          color: '#f85149',
          "font-size": '14px',
        }}>
          {error()}
        </div>
      </Show>

      <Show when={player() && !loading()}>
        {/* Action error banner */}
        <Show when={actionError()}>
          <div style={{
            padding: '12px 16px',
            background: 'rgba(248, 81, 73, 0.1)',
            border: '1px solid rgba(248, 81, 73, 0.4)',
            "border-radius": '6px',
            color: '#f85149',
            "font-size": '14px',
            "margin-bottom": '16px',
            display: 'flex',
            "justify-content": 'space-between',
            "align-items": 'center',
          }}>
            <span>{actionError()}</span>
            <button
              onClick={() => setActionError(null)}
              style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', "font-size": '18px' }}
            >
              &times;
            </button>
          </div>
        </Show>

        {/* ========== Account Info Card ========== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>Account Information</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Show when={player().isBanned}>
                <button
                  onClick={() => setShowUnbanConfirm(true)}
                  style={{ ...primaryBtnStyle, background: '#3fb950' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Unban
                </button>
              </Show>
              <Show when={!player().isBanned}>
                <button
                  onClick={() => setShowBanModal(true)}
                  style={dangerBtnStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Ban Player
                </button>
              </Show>
            </div>
          </div>

          <div style={{
            padding: '20px',
            display: 'grid',
            "grid-template-columns": 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}>
            {/* Username */}
            <div>
              <div style={labelStyle}>Username</div>
              <div style={valueStyle}>{player().username}</div>
            </div>
            {/* Email */}
            <div>
              <div style={labelStyle}>Email</div>
              <div style={valueStyle}>{player().email}</div>
            </div>
            {/* Role */}
            <div>
              <div style={labelStyle}>Role</div>
              <Show when={!editingRole()}>
                <div style={{ display: 'flex', "align-items": 'center', gap: '8px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 10px',
                    "border-radius": '12px',
                    background: (roleBadgeColors[player().role] ?? roleBadgeColors.player).bg,
                    color: (roleBadgeColors[player().role] ?? roleBadgeColors.player).text,
                    "font-size": '12px',
                    "font-weight": '500',
                    "text-transform": 'capitalize',
                  }}>
                    {player().role}
                  </span>
                  <button
                    onClick={() => { setSelectedRole(player().role); setEditingRole(true); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#58a6ff',
                      cursor: 'pointer',
                      "font-size": '12px',
                      padding: '2px 4px',
                    }}
                  >
                    Edit
                  </button>
                </div>
              </Show>
              <Show when={editingRole()}>
                <div style={{ display: 'flex', "align-items": 'center', gap: '8px' }}>
                  <select
                    value={selectedRole()}
                    onChange={(e) => setSelectedRole(e.currentTarget.value)}
                    style={{ ...selectStyle, width: 'auto', "min-width": '100px' }}
                  >
                    <option value="player">Player</option>
                    <option value="gm">GM</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleRoleChange}
                    disabled={actionLoading()}
                    style={{ ...primaryBtnStyle, padding: '6px 12px', "font-size": '12px' }}
                  >
                    {actionLoading() ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingRole(false)}
                    style={{ ...outlineBtnStyle, padding: '6px 12px', "font-size": '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              </Show>
            </div>
            {/* Status */}
            <div>
              <div style={labelStyle}>Status</div>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                "border-radius": '12px',
                background: player().isBanned ? 'rgba(248, 81, 73, 0.15)' : 'rgba(63, 185, 80, 0.15)',
                color: player().isBanned ? '#f85149' : '#3fb950',
                "font-size": '12px',
                "font-weight": '500',
              }}>
                {player().isBanned ? 'Banned' : 'Active'}
              </span>
            </div>
            {/* Created */}
            <div>
              <div style={labelStyle}>Created</div>
              <div style={valueStyle}>{formatDate(player().createdAt)}</div>
            </div>
            {/* Last Login */}
            <div>
              <div style={labelStyle}>Last Login</div>
              <div style={valueStyle}>{formatDate(player().lastLogin)}</div>
            </div>
          </div>
        </div>

        {/* ========== Characters Card ========== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>Characters</h2>
            <span style={{ color: '#8b949e', "font-size": '13px' }}>
              {player().characters?.length ?? 0} total
            </span>
          </div>

          <div style={{ "overflow-x": 'auto' }}>
            <table style={{ width: '100%', "border-collapse": 'collapse' }}>
              <thead>
                <tr style={{ background: '#1c2128' }}>
                  <For each={['Name', 'Class', 'Level', 'Kingdom', 'Zone', 'Online']}>
                    {(header) => <th style={thStyle}>{header}</th>}
                  </For>
                </tr>
              </thead>
              <tbody>
                <Show when={!player().characters || player().characters.length === 0}>
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, "text-align": 'center', padding: '24px 16px' }}>
                      No characters found.
                    </td>
                  </tr>
                </Show>
                <For each={player().characters ?? []}>
                  {(char: any) => (
                    <tr
                      style={{ "border-bottom": '1px solid #21262d', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ ...tdStyle, color: '#58a6ff', cursor: 'pointer', "font-weight": '500' }}>
                        <a
                          onClick={() => navigate(`/characters/${char.id}`)}
                          style={{ color: '#58a6ff', "text-decoration": 'none', cursor: 'pointer' }}
                          onMouseEnter={(e) => { e.currentTarget.style["text-decoration"] = 'underline'; }}
                          onMouseLeave={(e) => { e.currentTarget.style["text-decoration"] = 'none'; }}
                        >
                          {char.name}
                        </a>
                      </td>
                      <td style={{ ...tdStyle, "text-transform": 'capitalize' }}>
                        {char.characterClass}
                      </td>
                      <td style={{ ...tdStyle, color: '#e6edf3', "font-weight": '500' }}>
                        {char.level}
                      </td>
                      <td style={tdStyle}>
                        {KingdomName[char.kingdom] ?? `Kingdom ${char.kingdom}`}
                      </td>
                      <td style={tdStyle}>
                        {char.zone}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          width: '8px',
                          height: '8px',
                          "border-radius": '50%',
                          background: char.isOnline ? '#3fb950' : '#484f58',
                          "margin-right": '6px',
                        }} />
                        {char.isOnline ? 'Online' : 'Offline'}
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========== Ban History Card ========== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>Ban History</h2>
            <span style={{ color: '#8b949e', "font-size": '13px' }}>
              {player().bans?.length ?? 0} records
            </span>
          </div>

          <div style={{ "overflow-x": 'auto' }}>
            <table style={{ width: '100%', "border-collapse": 'collapse' }}>
              <thead>
                <tr style={{ background: '#1c2128' }}>
                  <For each={['Reason', 'Type', 'Date', 'Expires', 'Status']}>
                    {(header) => <th style={thStyle}>{header}</th>}
                  </For>
                </tr>
              </thead>
              <tbody>
                <Show when={!player().bans || player().bans.length === 0}>
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, "text-align": 'center', padding: '24px 16px' }}>
                      No ban history.
                    </td>
                  </tr>
                </Show>
                <For each={player().bans ?? []}>
                  {(ban: any) => (
                    <tr
                      style={{ "border-bottom": '1px solid #21262d', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ ...tdStyle, color: '#e6edf3', "max-width": '300px', overflow: 'hidden', "text-overflow": 'ellipsis' }}>
                        {ban.reason}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          "border-radius": '12px',
                          background: ban.type === 'permanent' ? 'rgba(248, 81, 73, 0.15)' : 'rgba(210, 153, 34, 0.15)',
                          color: ban.type === 'permanent' ? '#f85149' : '#d29922',
                          "font-size": '12px',
                          "font-weight": '500',
                          "text-transform": 'capitalize',
                        }}>
                          {ban.type}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, "white-space": 'nowrap' }}>
                        {formatDate(ban.createdAt)}
                      </td>
                      <td style={{ ...tdStyle, "white-space": 'nowrap' }}>
                        {ban.expiresAt ? formatDate(ban.expiresAt) : 'Never'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          "border-radius": '12px',
                          background: ban.isActive ? 'rgba(248, 81, 73, 0.15)' : 'rgba(139, 148, 158, 0.15)',
                          color: ban.isActive ? '#f85149' : '#8b949e',
                          "font-size": '12px',
                          "font-weight": '500',
                        }}>
                          {ban.isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>

        {/* ========== Login History Card ========== */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <h2 style={cardTitleStyle}>Login History</h2>
            <span style={{ color: '#8b949e', "font-size": '13px' }}>
              Recent attempts
            </span>
          </div>

          <div style={{ "overflow-x": 'auto' }}>
            <table style={{ width: '100%', "border-collapse": 'collapse' }}>
              <thead>
                <tr style={{ background: '#1c2128' }}>
                  <For each={['IP Address', 'Time', 'Result']}>
                    {(header) => <th style={thStyle}>{header}</th>}
                  </For>
                </tr>
              </thead>
              <tbody>
                <Show when={!player().loginHistory || player().loginHistory.length === 0}>
                  <tr>
                    <td colSpan={3} style={{ ...tdStyle, "text-align": 'center', padding: '24px 16px' }}>
                      No login history available.
                    </td>
                  </tr>
                </Show>
                <For each={player().loginHistory ?? []}>
                  {(record: any) => (
                    <tr
                      style={{ "border-bottom": '1px solid #21262d', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#1c2128'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td style={{ ...tdStyle, "font-family": 'monospace', color: '#e6edf3' }}>
                        {record.ipAddress}
                      </td>
                      <td style={{ ...tdStyle, "white-space": 'nowrap' }}>
                        {formatDate(record.createdAt)}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 10px',
                          "border-radius": '12px',
                          background: record.success ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                          color: record.success ? '#3fb950' : '#f85149',
                          "font-size": '12px',
                          "font-weight": '500',
                        }}>
                          {record.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* ========== Ban Modal ========== */}
      <Show when={showBanModal()}>
        <div
          style={overlayStyle}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBanModal(false); }}
        >
          <div style={modalStyle}>
            <div style={{
              padding: '20px',
              "border-bottom": '1px solid #30363d',
            }}>
              <h3 style={{ margin: 0, color: '#e6edf3', "font-size": '18px', "font-weight": '600' }}>
                Ban Player
              </h3>
              <p style={{ margin: '4px 0 0 0', color: '#8b949e', "font-size": '13px' }}>
                Ban account: {player()?.username}
              </p>
            </div>

            <div style={{ padding: '20px', display: 'flex', "flex-direction": 'column', gap: '16px' }}>
              {/* Reason */}
              <div>
                <label style={{ display: 'block', color: '#e6edf3', "font-size": '13px', "font-weight": '500', "margin-bottom": '6px' }}>
                  Reason *
                </label>
                <textarea
                  value={banReason()}
                  onInput={(e) => setBanReason(e.currentTarget.value)}
                  placeholder="Enter the reason for this ban..."
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    "font-family": 'inherit',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
                />
              </div>

              {/* Ban Type */}
              <div>
                <label style={{ display: 'block', color: '#e6edf3', "font-size": '13px', "font-weight": '500', "margin-bottom": '6px' }}>
                  Ban Type
                </label>
                <select
                  value={banType()}
                  onChange={(e) => setBanType(e.currentTarget.value)}
                  style={selectStyle}
                >
                  <option value="permanent">Permanent</option>
                  <option value="temporary">Temporary</option>
                </select>
              </div>

              {/* Expiry (only for temporary) */}
              <Show when={banType() === 'temporary'}>
                <div>
                  <label style={{ display: 'block', color: '#e6edf3', "font-size": '13px', "font-weight": '500', "margin-bottom": '6px' }}>
                    Expires At
                  </label>
                  <input
                    type="datetime-local"
                    value={banExpiry()}
                    onInput={(e) => setBanExpiry(e.currentTarget.value)}
                    style={inputStyle}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
                  />
                </div>
              </Show>

              {/* Action error inside modal */}
              <Show when={actionError()}>
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.4)',
                  "border-radius": '6px',
                  color: '#f85149',
                  "font-size": '13px',
                }}>
                  {actionError()}
                </div>
              </Show>
            </div>

            <div style={{
              padding: '16px 20px',
              "border-top": '1px solid #30363d',
              display: 'flex',
              "justify-content": 'flex-end',
              gap: '8px',
              background: '#1c2128',
              "border-radius": '0 0 12px 12px',
            }}>
              <button
                onClick={() => { setShowBanModal(false); setActionError(null); }}
                style={outlineBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={actionLoading() || !banReason().trim()}
                style={{
                  ...dangerBtnStyle,
                  opacity: actionLoading() || !banReason().trim() ? '0.5' : '1',
                  cursor: actionLoading() || !banReason().trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading() ? 'Banning...' : 'Confirm Ban'}
              </button>
            </div>
          </div>
        </div>
      </Show>

      {/* ========== Unban Confirmation Modal ========== */}
      <Show when={showUnbanConfirm()}>
        <div
          style={overlayStyle}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUnbanConfirm(false); }}
        >
          <div style={modalStyle}>
            <div style={{
              padding: '20px',
              "border-bottom": '1px solid #30363d',
            }}>
              <h3 style={{ margin: 0, color: '#e6edf3', "font-size": '18px', "font-weight": '600' }}>
                Unban Player
              </h3>
            </div>

            <div style={{ padding: '20px' }}>
              <p style={{ margin: 0, color: '#8b949e', "font-size": '14px', "line-height": '1.6' }}>
                Are you sure you want to unban <strong style={{ color: '#e6edf3' }}>{player()?.username}</strong>?
                This will lift all active bans on this account and allow the player to log in again.
              </p>

              <Show when={actionError()}>
                <div style={{
                  "margin-top": '12px',
                  padding: '10px 14px',
                  background: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.4)',
                  "border-radius": '6px',
                  color: '#f85149',
                  "font-size": '13px',
                }}>
                  {actionError()}
                </div>
              </Show>
            </div>

            <div style={{
              padding: '16px 20px',
              "border-top": '1px solid #30363d',
              display: 'flex',
              "justify-content": 'flex-end',
              gap: '8px',
              background: '#1c2128',
              "border-radius": '0 0 12px 12px',
            }}>
              <button
                onClick={() => { setShowUnbanConfirm(false); setActionError(null); }}
                style={outlineBtnStyle}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#58a6ff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#30363d'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleUnban}
                disabled={actionLoading()}
                style={{
                  ...primaryBtnStyle,
                  background: '#3fb950',
                  opacity: actionLoading() ? '0.5' : '1',
                  cursor: actionLoading() ? 'not-allowed' : 'pointer',
                }}
              >
                {actionLoading() ? 'Unbanning...' : 'Confirm Unban'}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
