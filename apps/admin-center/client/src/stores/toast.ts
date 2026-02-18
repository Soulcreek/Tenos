/**
 * Global toast notification store.
 *
 * Usage:
 *   import { toastStore } from '../stores/toast';
 *   toastStore.success('Player banned');
 *   toastStore.error('Failed to save');
 *   toastStore.info('Refreshing data...');
 *   toastStore.warn('This action is irreversible');
 */

import { createSignal, createRoot } from 'solid-js';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warn';
  createdAt: number;
}

let nextId = 1;

function createToastStore() {
  const [toasts, setToasts] = createSignal<Toast[]>([]);

  function add(message: string, type: Toast['type'], durationMs = 4000) {
    const id = nextId++;
    const toast: Toast = { id, message, type, createdAt: Date.now() };
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, durationMs);
  }

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return {
    toasts,
    dismiss,
    success: (msg: string) => add(msg, 'success'),
    error: (msg: string) => add(msg, 'error', 6000),
    info: (msg: string) => add(msg, 'info'),
    warn: (msg: string) => add(msg, 'warn', 5000),
  };
}

export const toastStore = createRoot(createToastStore);
