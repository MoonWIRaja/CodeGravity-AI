<script lang="ts">
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let error = '';

  onMount(() => {
    error = $page.url.searchParams.get('error') || '';
    
    if ($auth.user) {
      goto('/dashboard');
    }
  });
</script>

<svelte:head>
  <title>Login - CodeGravity AI</title>
</svelte:head>

<div class="login-page">
  <div class="login-container">
    <pre class="ascii-logo glow-cyan">
╔══════════════════════════════════════╗
║  ░▒▓ CODEGRAVITY AI ▓▒░             ║
╚══════════════════════════════════════╝
    </pre>

    <div class="login-card card">
      <h1 class="pixel-text login-title">LOGIN</h1>
      
      {#if error}
        <div class="error-box">
          <span class="glow-pink">⚠️ {error === 'oauth_failed' ? 'GitHub authentication failed' : error}</span>
        </div>
      {/if}

      <p class="retro-text login-subtitle">
        Sign in with your GitHub account to start coding
      </p>

      <button class="btn btn-primary btn-full" on:click={() => auth.loginWithGitHub()}>
        <span class="github-icon">🐙</span>
        Continue with GitHub
      </button>

      <div class="divider">
        <span class="retro-text">━━━━━━━━━━━━━━━━━━━━━━</span>
      </div>

      <p class="info-text retro-text">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>

      <a href="/" class="back-link retro-text">← Back to Home</a>
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-deep);
    background-image: 
      radial-gradient(circle at 30% 30%, rgba(0, 217, 255, 0.05) 0%, transparent 50%),
      radial-gradient(circle at 70% 70%, rgba(255, 0, 128, 0.05) 0%, transparent 50%);
  }

  .login-container {
    text-align: center;
    padding: 2rem;
  }

  .ascii-logo {
    font-family: var(--font-code);
    font-size: 0.7rem;
    line-height: 1.3;
    margin-bottom: 2rem;
  }

  .login-card {
    max-width: 400px;
    margin: 0 auto;
    text-align: center;
  }

  .login-title {
    font-size: 1rem;
    margin-bottom: 1rem;
    color: var(--neon-cyan);
  }

  .login-subtitle {
    color: var(--text-secondary);
    margin-bottom: 2rem;
    font-size: 1.2rem;
  }

  .btn-full {
    width: 100%;
    margin-bottom: 1.5rem;
  }

  .github-icon {
    font-size: 1.2rem;
  }

  .error-box {
    background: rgba(255, 68, 68, 0.1);
    border: 1px solid var(--neon-red);
    padding: 0.75rem;
    margin-bottom: 1rem;
    font-family: var(--font-retro);
  }

  .divider {
    margin: 1.5rem 0;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .info-text {
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: 1.5rem;
  }

  .back-link {
    color: var(--text-secondary);
    font-size: 1rem;
  }

  .back-link:hover {
    color: var(--neon-cyan);
  }
</style>
