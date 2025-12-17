<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { FileTreeNode } from '$lib/stores/editor';

  export let files: FileTreeNode[] = [];
  
  const dispatch = createEventDispatcher<{ select: string }>();

  let expandedDirs = new Set<string>();

  function toggleDir(path: string) {
    if (expandedDirs.has(path)) {
      expandedDirs.delete(path);
    } else {
      expandedDirs.add(path);
    }
    expandedDirs = expandedDirs; // trigger reactivity
  }

  function selectFile(path: string) {
    dispatch('select', path);
  }

  function getIcon(node: FileTreeNode): string {
    if (node.type === 'directory') {
      return expandedDirs.has(node.path) ? '📂' : '📁';
    }
    
    const ext = node.name.split('.').pop()?.toLowerCase();
    const icons: Record<string, string> = {
      js: '📜',
      ts: '📘',
      jsx: '⚛️',
      tsx: '⚛️',
      svelte: '🟠',
      vue: '💚',
      html: '🌐',
      css: '🎨',
      json: '📋',
      md: '📝',
      py: '🐍',
      rs: '🦀',
      go: '🐹',
    };
    return icons[ext || ''] || '📄';
  }
</script>

<div class="file-tree">
  {#each files as node}
    <div class="tree-node">
      {#if node.type === 'directory'}
        <button 
          class="tree-item dir"
          on:click={() => toggleDir(node.path)}
        >
          <span class="icon">{getIcon(node)}</span>
          <span class="name">{node.name}</span>
        </button>
        {#if expandedDirs.has(node.path) && node.children}
          <div class="tree-children">
            <svelte:self files={node.children} on:select />
          </div>
        {/if}
      {:else}
        <button 
          class="tree-item file"
          on:click={() => selectFile(node.path)}
        >
          <span class="icon">{getIcon(node)}</span>
          <span class="name">{node.name}</span>
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .file-tree {
    padding: 0.5rem;
    font-family: var(--font-retro);
    font-size: 0.95rem;
    overflow-y: auto;
    flex: 1;
  }

  .tree-node {
    user-select: none;
  }

  .tree-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.3rem 0.5rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tree-item:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .tree-item.dir {
    color: var(--neon-cyan);
  }

  .icon {
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tree-children {
    padding-left: 1rem;
    border-left: 1px solid var(--border-primary);
    margin-left: 0.5rem;
  }
</style>
