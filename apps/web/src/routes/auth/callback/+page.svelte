<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { auth } from '$lib/stores/auth';

  onMount(async () => {
    const token = $page.url.searchParams.get('token');
    
    if (token) {
      // Store token in cookie (done by server) and check session
      await auth.checkSession();
      goto('/dashboard');
    } else {
      // No token, something went wrong
      goto('/login?error=no_token');
    }
  });
</script>

<div class="callback">
  <div class="loading-container">
    <pre class="ascii-loading glow-cyan">
╔════════════════════════════════════════╗
║  ░▒▓ AUTHENTICATING... ▓▒░             ║
║                                        ║
║     ████████████░░░░░░░░░░  60%        ║
║                                        ║
║  Connecting to GitHub...               ║
╚════════════════════════════════════════╝
    </pre>
    <p class="retro-text">Please wait...</p>
  </div>
</div>

<style>
  .callback {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-deep);
  }

  .loading-container {
    text-align: center;
  }

  .ascii-loading {
    font-family: var(--font-code);
    font-size: 0.7rem;
    line-height: 1.3;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .loading-container p {
    margin-top: 1rem;
    color: var(--text-secondary);
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
</style>
