import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface Project {
  id: string;
  name: string;
  description?: string;
  template?: string;
  isFavorite: boolean;
  isPublic: boolean;
  lastOpenedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectsState {
  items: Project[];
  loading: boolean;
  error: string | null;
}

function createProjectsStore() {
  const { subscribe, set, update } = writable<ProjectsState>({
    items: [],
    loading: false,
    error: null,
  });

  const API_URL = browser ? import.meta.env.PUBLIC_API_URL || 'http://localhost:3000' : '';

  return {
    subscribe,
    
    async load() {
      update(s => ({ ...s, loading: true }));
      
      try {
        const response = await fetch(`${API_URL}/api/projects`, {
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
          update(s => ({ ...s, items: data.data, loading: false, error: null }));
        } else {
          throw new Error(data.error?.message || 'Failed to load projects');
        }
      } catch (error) {
        update(s => ({ ...s, loading: false, error: String(error) }));
      }
    },

    async create(projectData: { name: string; description?: string; template?: string }): Promise<Project | null> {
      try {
        const response = await fetch(`${API_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(projectData),
        });
        
        const data = await response.json();
        
        if (data.success) {
          update(s => ({ ...s, items: [data.data, ...s.items] }));
          return data.data;
        }
        return null;
      } catch (error) {
        console.error('Create project error:', error);
        return null;
      }
    },

    async delete(id: string): Promise<boolean> {
      try {
        const response = await fetch(`${API_URL}/api/projects/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        const data = await response.json();
        
        if (data.success) {
          update(s => ({ ...s, items: s.items.filter(p => p.id !== id) }));
          return true;
        }
        return false;
      } catch (error) {
        console.error('Delete project error:', error);
        return false;
      }
    },

    async toggleFavorite(id: string): Promise<void> {
      update(s => ({
        ...s,
        items: s.items.map(p => 
          p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
        ),
      }));

      try {
        const project = (await new Promise<ProjectsState>(resolve => {
          const unsubscribe = subscribe(s => { resolve(s); unsubscribe(); });
        })).items.find(p => p.id === id);

        await fetch(`${API_URL}/api/projects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ isFavorite: project?.isFavorite }),
        });
      } catch (error) {
        console.error('Toggle favorite error:', error);
      }
    },
  };
}

export const projects = createProjectsStore();

// Derived stores
export const projectsList = derived(
  { subscribe: projects.subscribe },
  $projects => $projects.items
);
