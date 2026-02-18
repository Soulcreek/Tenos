import { createSignal, createRoot } from 'solid-js';
import { auth as authApi, setTokens, clearTokens, getStoredRefreshToken, hasAccessToken } from '../lib/api';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: 'player' | 'gm' | 'admin';
  lastLogin: string | null;
  createdAt: string;
}

function createAuthStore() {
  const [user, setUser] = createSignal<AuthUser | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const isAuthenticated = () => user() !== null;
  const isAdmin = () => user()?.role === 'admin';
  const isGm = () => user()?.role === 'gm' || user()?.role === 'admin';

  async function login(username: string, password: string): Promise<boolean> {
    setError(null);
    try {
      const response = await authApi.login(username, password);
      if (response.success && response.data) {
        setTokens(response.data.accessToken, response.data.refreshToken);
        setUser(response.data.user);
        return true;
      }
      setError('Login failed');
      return false;
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
      return false;
    }
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    clearTokens();
    setUser(null);
  }

  async function checkAuth(): Promise<boolean> {
    setIsLoading(true);
    try {
      // Try to use existing token or refresh
      if (!hasAccessToken() && !getStoredRefreshToken()) {
        setUser(null);
        return false;
      }

      const response = await authApi.me();
      if (response.success && response.data) {
        setUser(response.data);
        return true;
      }
      setUser(null);
      return false;
    } catch {
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    isGm,
    login,
    logout,
    checkAuth,
  };
}

export const authStore = createRoot(createAuthStore);
