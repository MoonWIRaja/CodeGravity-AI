import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface EditorFile {
  id: string;
  path: string;
  content: string;
  type: 'file' | 'directory';
  isDirty: boolean;
  language?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

interface EditorState {
  project: { id: string; name: string } | null;
  files: FileTreeNode[];
  openFiles: EditorFile[];
  currentFile: EditorFile | null;
  previewUrl: string;
  isRunning: boolean;
  loading: boolean;
}

function createEditorStore() {
  const { subscribe, set, update } = writable<EditorState>({
    project: null,
    files: [],
    openFiles: [],
    currentFile: null,
    previewUrl: '',
    isRunning: false,
    loading: true,
  });

  const API_URL = browser ? import.meta.env.PUBLIC_API_URL || 'http://localhost:3000' : '';

  return {
    subscribe,

    async loadProject(projectId: string) {
      update(s => ({ ...s, loading: true }));

      try {
        // Fetch project details
        const projectRes = await fetch(`${API_URL}/api/projects/${projectId}`, {
          credentials: 'include',
        });
        const projectData = await projectRes.json();

        if (!projectData.success) throw new Error('Failed to load project');

        // Fetch files
        const filesRes = await fetch(`${API_URL}/api/files/${projectId}`, {
          credentials: 'include',
        });
        const filesData = await filesRes.json();

        update(s => ({
          ...s,
          project: { id: projectId, name: projectData.data.name },
          files: filesData.data?.tree || [],
          loading: false,
        }));
      } catch (error) {
        console.error('Load project error:', error);
        update(s => ({ ...s, loading: false }));
      }
    },

    async openFile(path: string) {
      const state = await new Promise<EditorState>(resolve => {
        const unsubscribe = subscribe(s => { resolve(s); unsubscribe(); });
      });

      // Check if already open
      const existing = state.openFiles.find(f => f.path === path);
      if (existing) {
        update(s => ({ ...s, currentFile: existing }));
        return;
      }

      try {
        // Fetch file content
        const res = await fetch(`${API_URL}/api/files/${state.project?.id}/content/${path}`, {
          credentials: 'include',
        });
        const data = await res.json();

        if (data.success) {
          const file: EditorFile = {
            id: data.data.id,
            path: data.data.path,
            content: data.data.content || '',
            type: 'file',
            isDirty: false,
            language: getLanguage(path),
          };

          update(s => ({
            ...s,
            openFiles: [...s.openFiles, file],
            currentFile: file,
          }));
        }
      } catch (error) {
        console.error('Open file error:', error);
      }
    },

    selectFile(path: string) {
      update(s => ({
        ...s,
        currentFile: s.openFiles.find(f => f.path === path) || null,
      }));
    },

    closeFile(path: string) {
      update(s => {
        const openFiles = s.openFiles.filter(f => f.path !== path);
        const currentFile = s.currentFile?.path === path
          ? openFiles[openFiles.length - 1] || null
          : s.currentFile;
        return { ...s, openFiles, currentFile };
      });
    },

    updateFileContent(content: string) {
      update(s => {
        if (!s.currentFile) return s;
        
        const updatedFile = { ...s.currentFile, content, isDirty: true };
        const openFiles = s.openFiles.map(f =>
          f.path === s.currentFile?.path ? updatedFile : f
        );
        
        return { ...s, openFiles, currentFile: updatedFile };
      });
    },

    async saveCurrentFile() {
      const state = await new Promise<EditorState>(resolve => {
        const unsubscribe = subscribe(s => { resolve(s); unsubscribe(); });
      });

      if (!state.currentFile || !state.project) return;

      try {
        await fetch(`${API_URL}/api/files/${state.project.id}/content/${state.currentFile.path}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: state.currentFile.content }),
        });

        update(s => {
          if (!s.currentFile) return s;
          const savedFile = { ...s.currentFile, isDirty: false };
          const openFiles = s.openFiles.map(f =>
            f.path === s.currentFile?.path ? savedFile : f
          );
          return { ...s, openFiles, currentFile: savedFile };
        });
      } catch (error) {
        console.error('Save file error:', error);
      }
    },

    runDev() {
      update(s => ({ ...s, isRunning: true, previewUrl: 'http://localhost:5173' }));
      // WebContainer integration would go here
    },

    reloadPreview() {
      update(s => {
        const url = s.previewUrl;
        return { ...s, previewUrl: '' };
      });
      setTimeout(() => {
        update(s => ({ ...s, previewUrl: 'http://localhost:5173' }));
      }, 100);
    },

    cleanup() {
      set({
        project: null,
        files: [],
        openFiles: [],
        currentFile: null,
        previewUrl: '',
        isRunning: false,
        loading: false,
      });
    },
  };
}

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    svelte: 'html',
    vue: 'html',
    html: 'html',
    css: 'css',
    scss: 'scss',
    json: 'json',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
  };
  return langMap[ext || ''] || 'plaintext';
}

export const editor = createEditorStore();
