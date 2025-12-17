<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  onMount(() => {
    if ($auth.user) {
      goto('/dashboard');
    }
  });
</script>

<svelte:head>
  <title>CodeGravity AI - AI-Powered IDE in Your Browser</title>
</svelte:head>

<div class="landing">
  <!-- Hero Section -->
  <header class="hero">
    <nav class="navbar">
      <div class="logo pixel-text glow-cyan">
        ░▒▓ CODEGRAVITY AI ▓▒░
      </div>
      <button class="btn btn-primary" on:click={() => auth.loginWithGitHub()}>
        🐙 Login with GitHub
      </button>
    </nav>

    <div class="hero-content">
      <pre class="ascii-logo glow-green">
╔══════════════════════════════════════════════════════════════╗
║     ██████╗ ██████╗ ██████╗ ███████╗                        ║
║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝                        ║
║    ██║     ██║   ██║██║  ██║█████╗                          ║
║    ██║     ██║   ██║██║  ██║██╔══╝                          ║
║    ╚██████╗╚██████╔╝██████╔╝███████╗                        ║
║     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝  GRAVITY AI            ║
╚══════════════════════════════════════════════════════════════╝
      </pre>

      <h1 class="hero-title retro-text">
        🎮 AI-Powered IDE in Your Browser 🎮
      </h1>

      <p class="hero-subtitle">
        Code, Build, and Deploy with AI assistance. 
        Monaco Editor + WebContainers + Multi-Provider AI.
      </p>

      <button class="btn btn-primary btn-large" on:click={() => auth.loginWithGitHub()}>
        ▶▶▶ START CODING NOW ▶▶▶
      </button>
    </div>
  </header>

  <!-- Features Section -->
  <section class="features">
    <div class="feature-grid">
      <div class="feature-card card">
        <div class="feature-icon">🔧</div>
        <h3 class="pixel-text">MONACO EDITOR</h3>
        <p class="retro-text">Full-featured code editor with IntelliSense, syntax highlighting, and more.</p>
      </div>

      <div class="feature-card card">
        <div class="feature-icon">🤖</div>
        <h3 class="pixel-text">AI ASSIST</h3>
        <p class="retro-text">OpenAI, Anthropic, Gemini, DeepSeek, Groq - Bring Your Own Key.</p>
      </div>

      <div class="feature-card card">
        <div class="feature-icon">⚡</div>
        <h3 class="pixel-text">WEBCONTAINER</h3>
        <p class="retro-text">Run Node.js in your browser. No server required.</p>
      </div>

      <div class="feature-card card">
        <div class="feature-icon">🐙</div>
        <h3 class="pixel-text">GITHUB SYNC</h3>
        <p class="retro-text">Push and pull directly to your GitHub repositories.</p>
      </div>

      <div class="feature-card card">
        <div class="feature-icon">📝</div>
        <h3 class="pixel-text">CMD+K EDIT</h3>
        <p class="retro-text">Inline AI code editing with diff preview and accept/reject.</p>
      </div>

      <div class="feature-card card">
        <div class="feature-icon">🎨</div>
        <h3 class="pixel-text">PIXEL THEME</h3>
        <p class="retro-text">Retro pixel art aesthetic for that nostalgic coding vibe.</p>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <p class="retro-text">Made with 💜 and ☕ | CodeGravity AI © 2024</p>
  </footer>
</div>

<style>
  .landing {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: var(--bg-primary);
    border-bottom: 2px solid var(--border-primary);
  }

  .logo {
    font-size: 0.8rem;
  }

  .hero {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .hero-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
  }

  .ascii-logo {
    font-family: var(--font-code);
    font-size: 0.6rem;
    line-height: 1.2;
    margin-bottom: 2rem;
    animation: flicker 3s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    .ascii-logo {
      font-size: 0.35rem;
    }
  }

  .hero-title {
    font-size: 2rem;
    margin-bottom: 1rem;
    color: var(--neon-cyan);
  }

  .hero-subtitle {
    font-family: var(--font-retro);
    font-size: 1.3rem;
    color: var(--text-secondary);
    max-width: 600px;
    margin-bottom: 2rem;
  }

  .btn-large {
    font-size: 0.9rem;
    padding: 1rem 2rem;
  }

  .features {
    padding: 4rem 2rem;
    background: var(--bg-primary);
    border-top: 2px solid var(--border-primary);
  }

  .feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .feature-card {
    text-align: center;
  }

  .feature-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .feature-card h3 {
    font-size: 0.7rem;
    color: var(--neon-cyan);
    margin-bottom: 0.75rem;
  }

  .feature-card p {
    color: var(--text-secondary);
  }

  .footer {
    padding: 2rem;
    text-align: center;
    background: var(--bg-deep);
    border-top: 2px solid var(--border-primary);
  }

  .footer p {
    color: var(--text-muted);
  }

  @keyframes flicker {
    0%, 100% { opacity: 1; }
    92% { opacity: 1; }
    93% { opacity: 0.8; }
    94% { opacity: 1; }
    95% { opacity: 0.9; }
    96% { opacity: 1; }
  }
</style>
