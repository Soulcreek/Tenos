import { Show, createSignal } from 'solid-js';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmDialog(props: ConfirmDialogProps) {
  const [loading, setLoading] = createSignal(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await props.onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Show when={props.open}>
      <div
        onClick={props.onCancel}
        style={{
          position: 'fixed',
          inset: '0',
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'z-index': '9000',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
            'border-radius': '12px',
            padding: '24px',
            'max-width': '440px',
            width: '100%',
          }}
        >
          <h3 style={{ color: '#e6edf3', margin: '0 0 12px', 'font-size': '18px' }}>
            {props.title}
          </h3>
          <p style={{ color: '#8b949e', margin: '0 0 24px', 'font-size': '14px', 'line-height': '1.5' }}>
            {props.message}
          </p>
          <div style={{ display: 'flex', gap: '12px', 'justify-content': 'flex-end' }}>
            <button
              onClick={props.onCancel}
              disabled={loading()}
              style={{
                padding: '8px 16px',
                background: '#21262d',
                color: '#e6edf3',
                border: '1px solid #30363d',
                'border-radius': '6px',
                cursor: 'pointer',
                'font-size': '14px',
              }}
            >
              {props.cancelLabel ?? 'Cancel'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading()}
              style={{
                padding: '8px 16px',
                background: props.destructive ? '#f85149' : '#58a6ff',
                color: '#fff',
                border: 'none',
                'border-radius': '6px',
                cursor: loading() ? 'not-allowed' : 'pointer',
                'font-size': '14px',
                opacity: loading() ? '0.6' : '1',
              }}
            >
              {loading() ? 'Processing...' : (props.confirmLabel ?? 'Confirm')}
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
