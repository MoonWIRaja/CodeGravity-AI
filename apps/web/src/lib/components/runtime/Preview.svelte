<script lang="ts">
  export let url: string = '';
</script>

<div class="preview-container">
  {#if url}
    <iframe 
      src={url} 
      title="Preview" 
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    ></iframe>
  {:else}
    <div class="no-preview">
      <p class="retro-text">Preview not available</p>
      <p class="hint">Click "▶ Run" to start the dev server</p>
    </div>
  {/if}
</div>

<style>
  .preview-container {
    width: 100%;
    height: 100%;
    background: #FFFFFF;
    overflow: hidden;
  }

  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }

  .no-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-deep);
    color: var(--text-muted);
    gap: 0.5rem;
  }

  .hint {
    font-family: var(--font-retro);
    font-size: 0.9rem;
  }
</style>
