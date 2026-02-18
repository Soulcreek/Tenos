import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { authStore } from '../stores/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [localError, setLocalError] = createSignal<string | null>(null);

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    setLocalError(null);

    const user = username().trim();
    const pass = password();

    if (!user || !pass) {
      setLocalError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await authStore.login(user, pass);
      if (success) {
        navigate('/', { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const errorMessage = () => localError() || authStore.error();

  return (
    <div
      style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'min-height': '100vh',
        width: '100vw',
        background: '#0f1117',
        'font-family': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          'max-width': '400px',
          padding: '0 16px',
        }}
      >
        {/* Header */}
        <div
          style={{
            'text-align': 'center',
            'margin-bottom': '32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              'border-radius': '14px',
              background: 'linear-gradient(135deg, #58a6ff, #3fb950)',
              display: 'inline-flex',
              'align-items': 'center',
              'justify-content': 'center',
              'font-weight': '700',
              'font-size': '28px',
              color: '#0f1117',
              'margin-bottom': '16px',
            }}
          >
            T
          </div>
          <h1
            style={{
              'font-size': '24px',
              'font-weight': '600',
              color: '#e6edf3',
              margin: '0 0 4px 0',
            }}
          >
            Tenos Admin Center
          </h1>
          <p
            style={{
              'font-size': '14px',
              color: '#8b949e',
              margin: '0',
            }}
          >
            Sign in to your account
          </p>
        </div>

        {/* Login Card */}
        <div
          style={{
            background: '#161b22',
            border: '1px solid #21262d',
            'border-radius': '12px',
            padding: '32px',
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* Error Message */}
            <Show when={errorMessage()}>
              <div
                style={{
                  background: 'rgba(248, 81, 73, 0.1)',
                  border: '1px solid rgba(248, 81, 73, 0.4)',
                  'border-radius': '6px',
                  padding: '12px 16px',
                  'margin-bottom': '20px',
                  color: '#f85149',
                  'font-size': '14px',
                  display: 'flex',
                  'align-items': 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {errorMessage()}
              </div>
            </Show>

            {/* Username Field */}
            <div style={{ 'margin-bottom': '16px' }}>
              <label
                for="username"
                style={{
                  display: 'block',
                  'font-size': '14px',
                  'font-weight': '500',
                  color: '#e6edf3',
                  'margin-bottom': '8px',
                }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username()}
                onInput={(e) => setUsername(e.currentTarget.value)}
                placeholder="Enter your username"
                autocomplete="username"
                disabled={isSubmitting()}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0f1117',
                  border: '1px solid #30363d',
                  'border-radius': '6px',
                  color: '#e6edf3',
                  'font-size': '14px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  'box-sizing': 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#58a6ff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#30363d';
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ 'margin-bottom': '24px' }}>
              <label
                for="password"
                style={{
                  display: 'block',
                  'font-size': '14px',
                  'font-weight': '500',
                  color: '#e6edf3',
                  'margin-bottom': '8px',
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                placeholder="Enter your password"
                autocomplete="current-password"
                disabled={isSubmitting()}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0f1117',
                  border: '1px solid #30363d',
                  'border-radius': '6px',
                  color: '#e6edf3',
                  'font-size': '14px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                  'box-sizing': 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#58a6ff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#30363d';
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting()}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: isSubmitting() ? '#1c3a5e' : '#58a6ff',
                color: isSubmitting() ? '#8b949e' : '#0f1117',
                border: 'none',
                'border-radius': '6px',
                'font-size': '14px',
                'font-weight': '600',
                cursor: isSubmitting() ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
                display: 'flex',
                'align-items': 'center',
                'justify-content': 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting()) {
                  e.currentTarget.style.background = '#79c0ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting()) {
                  e.currentTarget.style.background = '#58a6ff';
                }
              }}
            >
              <Show
                when={!isSubmitting()}
                fallback={
                  <>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #8b949e',
                        'border-top-color': 'transparent',
                        'border-radius': '50%',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Signing in...
                  </>
                }
              >
                Sign in
              </Show>
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          style={{
            'text-align': 'center',
            'font-size': '12px',
            color: '#8b949e',
            'margin-top': '24px',
          }}
        >
          Tenos Game Administration Platform
        </p>
      </div>

      {/* Keyframe animation for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
