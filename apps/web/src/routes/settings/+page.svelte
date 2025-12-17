<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth, isAuthenticated } from '$lib/stores/auth';
  import { browser } from '$app/environment';

  let activeTab = 'ai';
  let aiSettings = {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4-turbo',
    enableStreaming: true,
  };
  let hasExistingKey = false;
  let testResult: { success: boolean; message: string } | null = null;
  let saving = false;
  let testing = false;

  const API_URL = browser ? import.meta.env.PUBLIC_API_URL || 'http://localhost:3000' : '';

  const providers = [
    { id: 'openai', name: 'OpenAI', models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
    { id: 'anthropic', name: 'Anthropic', models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
    { id: 'gemini', name: 'Google Gemini', models: ['gemini-pro', 'gemini-1.5-pro'] },
    { id: 'deepseek', name: 'DeepSeek', models: ['deepseek-coder', 'deepseek-chat'] },
    { id: 'groq', name: 'Groq', models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
    { id: 'ollama', name: 'Ollama (Local)', models: ['codellama', 'llama3', 'mistral'] },
  ];

  $: currentProvider = providers.find(p => p.id === aiSettings.provider) || providers[0];

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }

    // Load existing settings
    try {
      const res = await fetch(`${API_URL}/api/settings/ai`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && data.data) {
        aiSettings.provider = data.data.provider || 'openai';
        aiSettings.model = data.data.model || 'gpt-4-turbo';
        aiSettings.enableStreaming = data.data.enableStreaming ?? true;
        hasExistingKey = data.data.hasApiKey;
      }
    } catch (error) {
      console.error('Load settings error:', error);
    }
  });

  async function saveSettings() {
    saving = true;
    testResult = null;

    try {
      const res = await fetch(`${API_URL}/api/settings/ai`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: aiSettings.provider,
          model: aiSettings.model,
          enableStreaming: aiSettings.enableStreaming,
          ...(aiSettings.apiKey && { apiKey: aiSettings.apiKey }),
        }),
      });

      const data = await res.json();
      if (data.success) {
        testResult = { success: true, message: 'Settings saved successfully!' };
        hasExistingKey = true;
        aiSettings.apiKey = '';
      } else {
        testResult = { success: false, message: data.error?.message || 'Failed to save' };
      }
    } catch (error) {
      testResult = { success: false, message: 'Failed to save settings' };
    } finally {
      saving = false;
    }
  }

  async function testApiKey() {
    if (!aiSettings.apiKey && !hasExistingKey) {
      testResult = { success: false, message: 'Please enter an API key' };
      return;
    }

    testing = true;
    testResult = null;

    try {
      const res = await fetch(`${API_URL}/api/settings/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          provider: aiSettings.provider,
          apiKey: aiSettings.apiKey || 'existing',
        }),
      });

      const data = await res.json();
      testResult = {
        success: data.success,
        message: data.success ? 'API key is valid!' : data.error?.message || 'Invalid API key',
      };
    } catch (error) {
      testResult = { success: false, message: 'Failed to test API key' };
    } finally {
      testing = false;
    }
  }
</script>

<svelte:head>
  <title>Settings - CodeGravity AI</title>
</svelte:head>

<div class="settings-page">
  <nav class="navbar">
    <a href="/dashboard" class="logo pixel-text glow-cyan">░▒▓ CODEGRAVITY ▓▒░</a>
    <h1 class="page-title pixel-text">SETTINGS</h1>
    <div></div>
  </nav>

  <div class="settings-content">
    <aside class="settings-sidebar">
      <button 
        class="sidebar-item" 
        class:active={activeTab === 'ai'}
        on:click={() => activeTab = 'ai'}
      >
        🤖 AI Provider
      </button>
      <button 
        class="sidebar-item"
        class:active={activeTab === 'editor'}
        on:click={() => activeTab = 'editor'}
      >
        📝 Editor
      </button>
      <button 
        class="sidebar-item"
        class:active={activeTab === 'account'}
        on:click={() => activeTab = 'account'}
      >
        👤 Account
      </button>
    </aside>

    <main class="settings-main">
      {#if activeTab === 'ai'}
        <div class="settings-section card">
          <h2 class="pixel-text section-title">AI PROVIDER SETTINGS</h2>
          
          <div class="form-group">
            <label class="retro-text">Provider</label>
            <select class="input" bind:value={aiSettings.provider}>
              {#each providers as provider}
                <option value={provider.id}>{provider.name}</option>
              {/each}
            </select>
          </div>

          <div class="form-group">
            <label class="retro-text">
              API Key
              {#if hasExistingKey}
                <span class="key-status glow-green">✓ Key saved</span>
              {/if}
            </label>
            <input 
              type="password"
              class="input"
              placeholder={hasExistingKey ? '••••••••••••••••' : 'Enter your API key'}
              bind:value={aiSettings.apiKey}
            />
            <p class="hint">Your API key is encrypted before storage</p>
          </div>

          <div class="form-group">
            <label class="retro-text">Model</label>
            <select class="input" bind:value={aiSettings.model}>
              {#each currentProvider.models as model}
                <option value={model}>{model}</option>
              {/each}
            </select>
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={aiSettings.enableStreaming} />
              <span class="retro-text">Enable streaming responses</span>
            </label>
          </div>

          {#if testResult}
            <div class="result-box" class:success={testResult.success} class:error={!testResult.success}>
              {testResult.success ? '✅' : '❌'} {testResult.message}
            </div>
          {/if}

          <div class="button-group">
            <button class="btn" on:click={testApiKey} disabled={testing}>
              {testing ? 'Testing...' : 'Test API Key'}
            </button>
            <button class="btn btn-primary" on:click={saveSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          <div class="api-links">
            <h3 class="pixel-text">GET API KEYS</h3>
            <ul class="retro-text">
              <li><a href="https://platform.openai.com/api-keys" target="_blank">OpenAI →</a></li>
              <li><a href="https://console.anthropic.com/" target="_blank">Anthropic →</a></li>
              <li><a href="https://aistudio.google.com/app/apikey" target="_blank">Google Gemini →</a></li>
              <li><a href="https://platform.deepseek.com/" target="_blank">DeepSeek →</a></li>
              <li><a href="https://console.groq.com/keys" target="_blank">Groq →</a></li>
            </ul>
          </div>
        </div>
      {:else if activeTab === 'editor'}
        <div class="settings-section card">
          <h2 class="pixel-text section-title">EDITOR SETTINGS</h2>
          <p class="retro-text">Coming soon...</p>
        </div>
      {:else if activeTab === 'account'}
        <div class="settings-section card">
          <h2 class="pixel-text section-title">ACCOUNT</h2>
          
          {#if $auth.user}
            <div class="account-info">
              <img 
                src={$auth.user.avatarUrl || '/default-avatar.png'} 
                alt="Avatar"
                class="avatar-large"
              />
              <div class="account-details">
                <h3 class="retro-text">{$auth.user.name}</h3>
                <p class="retro-text email">{$auth.user.email}</p>
                <p class="retro-text github">@{$auth.user.githubUsername}</p>
              </div>
            </div>

            <div class="button-group">
              <button class="btn btn-danger" on:click={() => auth.logout()}>
                Logout
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </main>
  </div>
</div>

<style>
  .settings-page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-deep);
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: var(--bg-primary);
    border-bottom: 2px solid var(--border-primary);
  }

  .logo {
    font-size: 0.7rem;
    text-decoration: none;
  }

  .page-title {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .settings-content {
    display: flex;
    flex: 1;
  }

  .settings-sidebar {
    width: 220px;
    background: var(--bg-primary);
    border-right: 2px solid var(--border-primary);
    padding: 1rem;
    flex-shrink: 0;
  }

  .sidebar-item {
    display: block;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-family: var(--font-retro);
    font-size: 1.1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 0.25rem;
  }

  .sidebar-item:hover,
  .sidebar-item.active {
    background: var(--bg-surface);
    color: var(--neon-cyan);
  }

  .settings-main {
    flex: 1;
    padding: 2rem;
    max-width: 700px;
  }

  .settings-section {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 0.7rem;
    color: var(--neon-cyan);
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }

  .key-status {
    font-size: 0.85rem;
  }

  .hint {
    font-family: var(--font-retro);
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .checkbox-group {
    margin-top: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-label input {
    width: 18px;
    height: 18px;
  }

  .result-box {
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    font-family: var(--font-retro);
    border: 1px solid;
  }

  .result-box.success {
    background: rgba(0, 255, 65, 0.1);
    border-color: var(--neon-green);
    color: var(--neon-green);
  }

  .result-box.error {
    background: rgba(255, 68, 68, 0.1);
    border-color: var(--neon-red);
    color: var(--neon-red);
  }

  .button-group {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .api-links {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border-primary);
  }

  .api-links h3 {
    font-size: 0.55rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
  }

  .api-links ul {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .api-links a {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .api-links a:hover {
    color: var(--neon-cyan);
  }

  .account-info {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .avatar-large {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    border: 2px solid var(--border-primary);
  }

  .account-details h3 {
    font-size: 1.3rem;
    color: var(--text-primary);
  }

  .account-details .email {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .account-details .github {
    color: var(--neon-cyan);
    font-size: 1rem;
  }

  .btn-danger {
    background: var(--neon-red);
    color: white;
    border-color: var(--neon-red);
  }
</style>
