import { create } from 'zustand';
import { api, ApiError, getToken, ONLINE, setToken, type Me } from './api';

/**
 * The signed-in account. Online builds require sign-in (the server owns Legacy points, perks,
 * prestiges and verified runs); offline builds skip all of this.
 */
interface AccountStore {
  status: 'offline' | 'signed-out' | 'loading' | 'ready';
  me: Me | null;
  error: string | null;
  refresh: () => Promise<Me | null>;
  signInWithGoogle: (credential: string) => Promise<void>;
  signInDev: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAccount = create<AccountStore>((set, get) => ({
  status: !ONLINE ? 'offline' : getToken() ? 'loading' : 'signed-out',
  me: null,
  error: null,

  async refresh() {
    if (!ONLINE || !getToken()) return null;
    try {
      const me = await api.me();
      set({ me, status: 'ready', error: null });
      return me;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setToken(null);
        set({ me: null, status: 'signed-out', error: e.message });
      } else {
        // Server unreachable: keep playing with what we have.
        set({ status: get().me ? 'ready' : 'signed-out', error: (e as Error).message });
      }
      return null;
    }
  },

  async signInWithGoogle(credential) {
    set({ status: 'loading', error: null });
    try {
      const { token } = await api.signInGoogle(credential);
      setToken(token);
      await get().refresh();
    } catch (e) {
      set({ status: 'signed-out', error: (e as Error).message });
    }
  },

  async signInDev(name) {
    set({ status: 'loading', error: null });
    try {
      const { token } = await api.signInDev(name);
      setToken(token);
      await get().refresh();
    } catch (e) {
      set({ status: 'signed-out', error: (e as Error).message });
    }
  },

  async signOut() {
    try {
      await api.signOut();
    } catch {
      /* session may already be gone */
    }
    setToken(null);
    set({ me: null, status: 'signed-out' });
  },
}));
