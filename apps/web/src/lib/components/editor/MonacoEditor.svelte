<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import type { EditorFile } from '$lib/stores/editor';
  import { browser } from '$app/environment';

  export let file: EditorFile;

  const dispatch = createEventDispatcher<{ change: string }>();

  let editorContainer: HTMLDivElement;
  let editor: any = null;
  let monaco: any = null;

  onMount(async () => {
    if (!browser) return;

    // Dynamic import monaco
    const monacoLoader = await import('@monaco-editor/loader');
    monaco = await monacoLoader.default.init();

    // Configure theme
    monaco.editor.defineTheme('codegravity-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '555555' },
        { token: 'keyword', foreground: '00D9FF' },
        { token: 'string', foreground: '00FF41' },
        { token: 'number', foreground: 'FFE600' },
        { token: 'function', foreground: 'FF0080' },
      ],
      colors: {
        'editor.background': '#0D0D0D',
        'editor.foreground': '#E0E0E0',
        'editor.lineHighlightBackground': '#1A1A2E',
        'editor.selectionBackground': '#0F3460',
        'editorCursor.foreground': '#00D9FF',
        'editorLineNumber.foreground': '#555555',
        'editorLineNumber.activeForeground': '#00D9FF',
        'editor.inactiveSelectionBackground': '#16213E',
      },
    });

    editor = monaco.editor.create(editorContainer, {
      value: file.content,
      language: file.language || 'plaintext',
      theme: 'codegravity-dark',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 14,
      lineHeight: 22,
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: 'on',
      padding: { top: 10 },
    });

    // Listen for changes
    editor.onDidChangeModelContent(() => {
      dispatch('change', editor.getValue());
    });
  });

  // Update content when file changes
  $: if (editor && file) {
    const model = editor.getModel();
    if (model && model.getValue() !== file.content) {
      editor.setValue(file.content);
      monaco?.editor.setModelLanguage(model, file.language || 'plaintext');
    }
  }

  onDestroy(() => {
    editor?.dispose();
  });
</script>

<div class="monaco-wrapper" bind:this={editorContainer}></div>

<style>
  .monaco-wrapper {
    width: 100%;
    height: 100%;
  }
</style>
