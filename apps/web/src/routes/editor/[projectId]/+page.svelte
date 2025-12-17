<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { auth, isAuthenticated } from '$lib/stores/auth';
  import { editor, type EditorFile } from '$lib/stores/editor';
  import FileTree from '$lib/components/editor/FileTree.svelte';
  import EditorTabs from '$lib/components/editor/EditorTabs.svelte';
  import MonacoEditor from '$lib/components/editor/MonacoEditor.svelte';
  import Terminal from '$lib/components/runtime/Terminal.svelte';
  import Preview from '$lib/components/runtime/Preview.svelte';
  import AIPanel from '$lib/components/ai/AIPanel.svelte';

  const projectId = $page.params.projectId;
  
  let showAI = false;
  let showTerminal = true;
  let showPreview = true;
  let terminalHeight = 200;
  let sidebarWidth = 250;
  let aiPanelWidth = 350;

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
    
    await editor.loadProject(projectId);
  });

  onDestroy(() => {
    editor.cleanup();
  });

  function handleKeyDown(e: KeyboardEvent) {
    // Cmd/Ctrl + K for AI inline edit
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      showAI = true;
    }
    // Cmd/Ctrl + S for save
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      editor.saveCurrentFile();
    }
    // Cmd/Ctrl + ` for terminal toggle
    if ((e.metaKey || e.ctrlKey) && e.key === '`') {
      e.preventDefault();
      showTerminal = !showTerminal;
    }
  }
</script>

<svelte:head>
  <title>{$editor.project?.name || 'Editor'} - CodeGravity AI</title>
</svelte:head>

<svelte:window on:keydown={handleKeyDown} />

<div class="ide">
  <!-- Top Navbar -->
  <nav class="ide-navbar">
    <div class="nav-left">
      <a href="/dashboard" class="logo pixel-text glow-cyan">░▒▓ CG ▓▒░</a>
      <span class="project-name retro-text">{$editor.project?.name || 'Loading...'}</span>
    </div>
    <div class="nav-center">
      <button class="toolbar-btn" on:click={() => editor.runDev()}>
        ▶ Run
      </button>
      <button class="toolbar-btn" on:click={() => editor.saveCurrentFile()}>
        💾 Save
      </button>
    </div>
    <div class="nav-right">
      <button 
        class="toolbar-btn" 
        class:active={showAI}
        on:click={() => showAI = !showAI}
      >
        🤖 AI
      </button>
      <button 
        class="toolbar-btn"
        class:active={showTerminal}
        on:click={() => showTerminal = !showTerminal}
      >
        📟 Terminal
      </button>
      <button 
        class="toolbar-btn"
        class:active={showPreview}
        on:click={() => showPreview = !showPreview}
      >
        👁️ Preview
      </button>
      <a href="/settings" class="toolbar-btn">⚙️</a>
    </div>
  </nav>

  <!-- Main IDE Layout -->
  <div class="ide-content">
    <!-- File Explorer Sidebar -->
    <aside class="sidebar" style="width: {sidebarWidth}px">
      <div class="sidebar-header">
        <span class="pixel-text sidebar-title">EXPLORER</span>
      </div>
      <FileTree 
        files={$editor.files} 
        on:select={(e) => editor.openFile(e.detail)}
      />
    </aside>

    <!-- Editor Area -->
    <main class="editor-area">
      <div class="editor-main">
        <EditorTabs 
          tabs={$editor.openFiles}
          activeFile={$editor.currentFile}
          on:select={(e) => editor.selectFile(e.detail)}
          on:close={(e) => editor.closeFile(e.detail)}
        />
        
        <div class="editor-container">
          {#if $editor.currentFile}
            <MonacoEditor 
              file={$editor.currentFile}
              on:change={(e) => editor.updateFileContent(e.detail)}
            />
          {:else}
            <div class="no-file">
              <pre class="ascii-welcome glow-cyan">
╔════════════════════════════════════════════════════════════╗
║  Open a file from the explorer to start coding             ║
║                                                            ║
║  Shortcuts:                                                ║
║    Ctrl+K  - AI Inline Edit                               ║
║    Ctrl+S  - Save File                                    ║
║    Ctrl+`  - Toggle Terminal                              ║
╚════════════════════════════════════════════════════════════╝
              </pre>
            </div>
          {/if}
        </div>
      </div>

      <!-- Bottom Panel (Terminal + Preview) -->
      {#if showTerminal || showPreview}
        <div class="bottom-panel" style="height: {terminalHeight}px">
          {#if showTerminal}
            <div class="terminal-container" class:full={!showPreview}>
              <div class="panel-header">
                <span class="pixel-text panel-title">TERMINAL</span>
                <button class="panel-btn" on:click={() => showTerminal = false}>✕</button>
              </div>
              <Terminal />
            </div>
          {/if}
          
          {#if showPreview}
            <div class="preview-container" class:full={!showTerminal}>
              <div class="panel-header">
                <span class="pixel-text panel-title">PREVIEW</span>
                <button class="panel-btn" on:click={() => editor.reloadPreview()}>🔄</button>
                <button class="panel-btn" on:click={() => showPreview = false}>✕</button>
              </div>
              <Preview url={$editor.previewUrl} />
            </div>
          {/if}
        </div>
      {/if}
    </main>

    <!-- AI Panel -->
    {#if showAI}
      <aside class="ai-panel" style="width: {aiPanelWidth}px">
        <AIPanel 
          on:close={() => showAI = false}
          projectId={projectId}
          currentFile={$editor.currentFile}
        />
      </aside>
    {/if}
  </div>
</div>

<style>
  .ide {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-deep);
    overflow: hidden;
  }

  .ide-navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--bg-primary);
    border-bottom: 2px solid var(--border-primary);
    height: 48px;
    flex-shrink: 0;
  }

  .nav-left, .nav-center, .nav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .logo {
    font-size: 0.6rem;
    text-decoration: none;
  }

  .project-name {
    font-size: 1.1rem;
    color: var(--text-secondary);
    padding-left: 0.75rem;
    border-left: 1px solid var(--border-primary);
  }

  .toolbar-btn {
    padding: 0.4rem 0.75rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-primary);
    color: var(--text-primary);
    font-family: var(--font-retro);
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-decoration: none;
  }

  .toolbar-btn:hover {
    background: var(--bg-elevated);
    border-color: var(--neon-cyan);
  }

  .toolbar-btn.active {
    background: var(--neon-cyan);
    color: var(--bg-deep);
    border-color: var(--neon-cyan);
  }

  .ide-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .sidebar {
    background: var(--bg-primary);
    border-right: 2px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 0.75rem;
    border-bottom: 1px solid var(--border-primary);
  }

  .sidebar-title {
    font-size: 0.55rem;
    color: var(--text-muted);
  }

  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
  }

  .no-file {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ascii-welcome {
    font-family: var(--font-code);
    font-size: 0.7rem;
    line-height: 1.3;
  }

  .bottom-panel {
    display: flex;
    border-top: 2px solid var(--border-primary);
    flex-shrink: 0;
  }

  .terminal-container, .preview-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .terminal-container.full, .preview-container.full {
    flex: 1;
  }

  .terminal-container {
    border-right: 1px solid var(--border-primary);
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-primary);
  }

  .panel-title {
    font-size: 0.5rem;
    color: var(--text-muted);
    flex: 1;
  }

  .panel-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.2rem;
    font-size: 0.8rem;
  }

  .panel-btn:hover {
    color: var(--text-primary);
  }

  .ai-panel {
    background: var(--bg-primary);
    border-left: 2px solid var(--border-primary);
    flex-shrink: 0;
    overflow: hidden;
  }
</style>
