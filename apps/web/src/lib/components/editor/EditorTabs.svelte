<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { EditorFile } from '$lib/stores/editor';

  export let tabs: EditorFile[] = [];
  export let activeFile: EditorFile | null = null;

  const dispatch = createEventDispatcher<{ 
    select: string;
    close: string;
  }>();

  function getFileName(path: string): string {
    return path.split('/').pop() || path;
  }
</script>

<div class="editor-tabs">
  {#each tabs as tab}
    <button 
      class="tab"
      class:active={activeFile?.path === tab.path}
      on:click={() => dispatch('select', tab.path)}
    >
      <span class="tab-name">
        {#if tab.isDirty}
          <span class="dirty-dot">●</span>
        {/if}
        {getFileName(tab.path)}
      </span>
      <button 
        class="close-btn"
        on:click|stopPropagation={() => dispatch('close', tab.path)}
      >
        ✕
      </button>
    </button>
  {/each}
</div>

<style>
  .editor-tabs {
    display: flex;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-primary);
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--bg-primary);
    border: none;
    border-right: 1px solid var(--border-primary);
    color: var(--text-secondary);
    font-family: var(--font-retro);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .tab:hover {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .tab.active {
    background: var(--bg-deep);
    color: var(--neon-cyan);
    border-bottom: 2px solid var(--neon-cyan);
  }

  .tab-name {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .dirty-dot {
    color: var(--neon-yellow);
    font-size: 0.7rem;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 0.25rem;
    font-size: 0.7rem;
    opacity: 0.6;
    transition: opacity 0.15s;
  }

  .close-btn:hover {
    opacity: 1;
    color: var(--neon-red);
  }
</style>
