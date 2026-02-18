import { For, Show } from 'solid-js';
import { toastStore, type Toast } from '../../stores/toast';

const TYPE_STYLES: Record<Toast['type'], { bg: string; border: string; icon: string }> = {
  success: { bg: '#0d2818', border: '#3fb950', icon: '\u2713' },
  error: { bg: '#2d0f0f', border: '#f85149', icon: '\u2717' },
  info: { bg: '#0d1d2d', border: '#58a6ff', icon: '\u2139' },
  warn: { bg: '#2d2200', border: '#d29922', icon: '\u26A0' },
};

export default function ToastContainer() {
  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        'z-index': '10000',
        display: 'flex',
        'flex-direction': 'column',
        gap: '8px',
        'max-width': '420px',
        'pointer-events': 'none',
      }}
    >
      <For each={toastStore.toasts()}>
        {(toast) => {
          const s = TYPE_STYLES[toast.type];
          return (
            <div
              style={{
                display: 'flex',
                'align-items': 'flex-start',
                gap: '10px',
                padding: '12px 16px',
                background: s.bg,
                border: `1px solid ${s.border}`,
                'border-radius': '8px',
                color: '#e6edf3',
                'font-size': '14px',
                'box-shadow': '0 4px 16px rgba(0,0,0,0.4)',
                'pointer-events': 'auto',
                animation: 'slideIn 0.25s ease-out',
              }}
            >
              <span
                style={{
                  'font-size': '16px',
                  'line-height': '1',
                  'flex-shrink': '0',
                  'margin-top': '1px',
                }}
              >
                {s.icon}
              </span>
              <span style={{ flex: '1', 'word-break': 'break-word' }}>{toast.message}</span>
              <button
                onClick={() => toastStore.dismiss(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8b949e',
                  cursor: 'pointer',
                  'font-size': '16px',
                  'line-height': '1',
                  padding: '0',
                  'flex-shrink': '0',
                }}
              >
                \u00D7
              </button>
            </div>
          );
        }}
      </For>
    </div>
  );
}
