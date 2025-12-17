import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  githubUsername: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const API_URL = browser ? import.meta.env.PUBLIC_API_URL || 'http://localhost:3000' : '';

  return {
    subscribe,
    
    async checkSession() {
      if (!browser) return;
      
      update(s => ({ ...s, loading: true }));
      
      try {
        const response = await fetch(`${API_URL}/api/auth/session`, {
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success && data.data?.user) {
          update(s => ({ ...s, user: data.data.user, loading: false, error: null }));
        } else {
          update(s => ({ ...s, user: null, loading: false, error: null }));
        }
      } catch (error) {
        update(s => ({ ...s, user: null, loading: false, error: 'Failed to check session' }));
      }
    },

    async loginWithGitHub() {
      if (!browser) return;
      window.location.href = `${API_URL}/api/auth/github`;
    },

    async logout() {
      if (!browser) return;
      
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
        
        set({ user: null, loading: false, error: null });
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);
      }
    },

    setUser(user: User) {
      update(s => ({ ...s, user, loading: false, error: null }));
    },
  };
}

export const auth = createAuthStore();
export const isAuthenticated = derived(auth, $auth => !!$auth.user);
export const isLoading = derived(auth, $auth => $auth.loading);
