<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import type { EditorFile } from '$lib/stores/editor';
  import { browser } from '$app/environment';

  export let projectId: string;
  export let currentFile: EditorFile | null = null;

  const dispatch = createEventDispatcher<{ close: void }>();

  let messages: { role: 'user' | 'assistant'; content: string }[] = [];
  let inputMessage = '';
  let loading = false;
  let messagesContainer: HTMLDivElement;

  const API_URL = browser ? import.meta.env.PUBLIC_API_URL || 'http://localhost:3000' : '';

  async function sendMessage() {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    inputMessage = '';
    
    messages = [...messages, { role: 'user', content: userMessage }];
    loading = true;

    try {
      const response = await fetch(`${API_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          projectId,
          stream: true,
        }),
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      messages = [...messages, { role: 'assistant', content: '' }];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'delta') {
              assistantContent += parsed.content;
              messages = messages.map((m, i) => 
                i === messages.length - 1 
                  ? { ...m, content: assistantContent }
                  : m
              );
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('AI chat error:', error);
      messages = [...messages, { 
        role: 'assistant', 
        content: '❌ Failed to get AI response. Please check your API key in Settings.' 
      }];
    } finally {
      loading = false;
      scrollToBottom();
    }
  }

  function scrollToBottom() {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  $: if (messages.length) scrollToBottom();
</script>

<div class="ai-panel">
  <div class="panel-header">
    <span class="pixel-text title">🤖 AI ASSISTANT</span>
    <button class="close-btn" on:click={() => dispatch('close')}>✕</button>
  </div>

  <div class="messages" bind:this={messagesContainer}>
    {#if messages.length === 0}
      <div class="welcome">
        <p class="retro-text">How can I help you code today?</p>
        <div class="suggestions">
          <button class="suggestion" on:click={() => inputMessage = 'Explain this code'}>
            💡 Explain this code
          </button>
          <button class="suggestion" on:click={() => inputMessage = 'Add error handling'}>
            🛡️ Add error handling
          </button>
          <button class="suggestion" on:click={() => inputMessage = 'Optimize performance'}>
            ⚡ Optimize performance
          </button>
        </div>
      </div>
    {:else}
      {#each messages as message}
        <div class="message {message.role}">
          <div class="message-icon">
            {message.role === 'user' ? '👤' : '🤖'}
          </div>
          <div class="message-content">
            <pre>{message.content}</pre>
          </div>
        </div>
      {/each}
      {#if loading}
        <div class="message assistant">
          <div class="message-icon">🤖</div>
          <div class="message-content">
            <span class="typing animate-blink">▋</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <div class="input-area">
    <textarea 
      class="input"
      placeholder="Ask anything about your code..."
      bind:value={inputMessage}
      on:keydown={handleKeyDown}
      disabled={loading}
      rows="2"
    ></textarea>
    <button 
      class="btn btn-primary send-btn"
      on:click={sendMessage}
      disabled={loading || !inputMessage.trim()}
    >
      Send
    </button>
  </div>
</div>

<style>
  .ai-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-primary);
  }

  .title {
    font-size: 0.6rem;
    color: var(--neon-pink);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.9rem;
  }

  .close-btn:hover {
    color: var(--text-primary);
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .welcome {
    text-align: center;
    padding: 2rem 1rem;
  }

  .welcome p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }

  .suggestions {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .suggestion {
    padding: 0.6rem 1rem;
    background: var(--bg-surface);
    border: 1px solid var(--border-primary);
    color: var(--text-secondary);
    font-family: var(--font-retro);
    font-size: 0.95rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
  }

  .suggestion:hover {
    border-color: var(--neon-cyan);
    color: var(--neon-cyan);
  }

  .message {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .message-icon {
    font-size: 1.2rem;
    flex-shrink: 0;
  }

  .message-content {
    flex: 1;
    min-width: 0;
  }

  .message-content pre {
    font-family: var(--font-retro);
    font-size: 1rem;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
  }

  .message.user .message-content pre {
    color: var(--neon-cyan);
  }

  .message.assistant .message-content pre {
    color: var(--text-primary);
  }

  .typing {
    font-size: 1.2rem;
    color: var(--neon-pink);
  }

  .input-area {
    padding: 0.75rem;
    border-top: 1px solid var(--border-primary);
    display: flex;
    gap: 0.5rem;
  }

  .input-area textarea {
    flex: 1;
    resize: none;
    font-family: var(--font-retro);
    font-size: 1rem;
  }

  .send-btn {
    padding: 0.5rem 1rem;
    font-size: 0.7rem;
  }
</style>
