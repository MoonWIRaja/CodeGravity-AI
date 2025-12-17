<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth, isAuthenticated, isLoading } from '$lib/stores/auth';
  import { projects, type Project } from '$lib/stores/projects';

  let search = '';
  let filter: 'all' | 'favorites' | 'recent' = 'all';
  let showNewModal = false;
  let newProjectName = '';
  let newProjectTemplate = 'blank';

  $: filteredProjects = $projects.filter(p => {
    if (search) {
      const s = search.toLowerCase();
      if (!p.name.toLowerCase().includes(s) && !p.description?.toLowerCase().includes(s)) {
        return false;
      }
    }
    if (filter === 'favorites') return p.isFavorite;
    if (filter === 'recent') return p.lastOpenedAt;
    return true;
  });

  onMount(async () => {
    if (!$isLoading && !$isAuthenticated) {
      goto('/login');
      return;
    }
    
    await projects.load();
  });

  async function createProject() {
    if (!newProjectName.trim()) return;
    
    const project = await projects.create({
      name: newProjectName,
      template: newProjectTemplate,
    });
    
    if (project) {
      showNewModal = false;
      newProjectName = '';
      goto(`/editor/${project.id}`);
    }
  }

  async function deleteProject(id: string) {
    if (confirm('Are you sure you want to delete this project?')) {
      await projects.delete(id);
    }
  }

  function formatDate(date: string | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
</script>

<svelte:head>
  <title>Dashboard - CodeGravity AI</title>
</svelte:head>

{#if $isLoading}
  <div class="loading">
    <p class="retro-text glow-cyan">Loading...</p>
  </div>
{:else if $auth.user}
  <div class="dashboard">
    <!-- Navbar -->
    <nav class="navbar">
      <div class="nav-left">
        <span class="logo pixel-text glow-cyan">░▒▓ CODEGRAVITY ▓▒░</span>
      </div>
      <div class="nav-center">
        <input 
          type="text"
          class="input search-input"
          placeholder="🔍 Search projects..."
          bind:value={search}
        />
      </div>
      <div class="nav-right">
        <a href="/settings" class="nav-btn">⚙️</a>
        <div class="user-info">
          <img 
            src={$auth.user.avatarUrl || '/default-avatar.png'} 
            alt={$auth.user.name || 'User'}
            class="avatar"
          />
          <span class="retro-text">@{$auth.user.githubUsername || $auth.user.name}</span>
        </div>
        <button class="btn btn-ghost" on:click={() => auth.logout()}>
          Logout
        </button>
      </div>
    </nav>

    <div class="dashboard-content">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="sidebar-section">
          <button 
            class="sidebar-item" 
            class:active={filter === 'all'}
            on:click={() => filter = 'all'}
          >
            📁 All Projects
          </button>
          <button 
            class="sidebar-item"
            class:active={filter === 'favorites'}
            on:click={() => filter = 'favorites'}
          >
            ⭐ Favorites
          </button>
          <button 
            class="sidebar-item"
            class:active={filter === 'recent'}
            on:click={() => filter = 'recent'}
          >
            🕐 Recent
          </button>
        </div>

        <div class="sidebar-section">
          <h3 class="pixel-text sidebar-title">TEMPLATES</h3>
          <button class="sidebar-item" on:click={() => { showNewModal = true; newProjectTemplate = 'svelte'; }}>
            🟠 SvelteKit
          </button>
          <button class="sidebar-item" on:click={() => { showNewModal = true; newProjectTemplate = 'react'; }}>
            ⚛️ React
          </button>
          <button class="sidebar-item" on:click={() => { showNewModal = true; newProjectTemplate = 'vue'; }}>
            💚 Vue
          </button>
          <button class="sidebar-item" on:click={() => { showNewModal = true; newProjectTemplate = 'node'; }}>
            💚 Node.js
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <div class="content-header">
          <h1 class="pixel-text">MY PROJECTS</h1>
          <button class="btn btn-primary" on:click={() => showNewModal = true}>
            + NEW PROJECT
          </button>
        </div>

        <div class="project-grid">
          <!-- Create New Card -->
          <button class="project-card create-card" on:click={() => showNewModal = true}>
            <div class="create-icon">+</div>
            <span class="retro-text">Create New</span>
          </button>

          <!-- Project Cards -->
          {#each filteredProjects as project}
            <div class="project-card card">
              <div class="project-header">
                <button 
                  class="fav-btn"
                  on:click|stopPropagation={() => projects.toggleFavorite(project.id)}
                >
                  {project.isFavorite ? '⭐' : '☆'}
                </button>
                <button 
                  class="delete-btn"
                  on:click|stopPropagation={() => deleteProject(project.id)}
                >
                  🗑️
                </button>
              </div>
              <a href="/editor/{project.id}" class="project-link">
                <div class="project-preview">
                  <span class="preview-icon">
                    {project.template === 'svelte' ? '🟠' : 
                     project.template === 'react' ? '⚛️' : 
                     project.template === 'vue' ? '💚' : 
                     project.template === 'node' ? '💚' : '📁'}
                  </span>
                </div>
                <h3 class="project-name">{project.name}</h3>
                <p class="project-meta retro-text">
                  {project.template || 'Blank'} • {formatDate(project.updatedAt)}
                </p>
              </a>
            </div>
          {/each}
        </div>
      </main>
    </div>
  </div>

  <!-- New Project Modal -->
  {#if showNewModal}
    <div class="modal-overlay" on:click={() => showNewModal = false}>
      <div class="modal card" on:click|stopPropagation>
        <h2 class="pixel-text modal-title">NEW PROJECT</h2>
        
        <div class="form-group">
          <label class="retro-text">Project Name</label>
          <input 
            type="text"
            class="input"
            placeholder="my-awesome-project"
            bind:value={newProjectName}
            on:keydown={(e) => e.key === 'Enter' && createProject()}
          />
        </div>

        <div class="form-group">
          <label class="retro-text">Template</label>
          <select class="input" bind:value={newProjectTemplate}>
            <option value="blank">Blank</option>
            <option value="svelte">SvelteKit</option>
            <option value="react">React + Vite</option>
            <option value="vue">Vue 3</option>
            <option value="node">Node.js</option>
          </select>
        </div>

        <div class="modal-actions">
          <button class="btn btn-ghost" on:click={() => showNewModal = false}>
            Cancel
          </button>
          <button class="btn btn-primary" on:click={createProject}>
            Create Project
          </button>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .loading {
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dashboard {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-deep);
  }

  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.5rem;
    background: var(--bg-primary);
    border-bottom: 2px solid var(--border-primary);
    gap: 1rem;
  }

  .nav-left, .nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .logo {
    font-size: 0.7rem;
  }

  .nav-center {
    flex: 1;
    max-width: 400px;
  }

  .search-input {
    padding: 0.5rem 1rem;
    font-size: 1rem;
  }

  .nav-btn {
    font-size: 1.2rem;
    padding: 0.5rem;
    text-decoration: none;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid var(--border-primary);
  }

  .dashboard-content {
    display: flex;
    flex: 1;
  }

  .sidebar {
    width: 220px;
    background: var(--bg-primary);
    border-right: 2px solid var(--border-primary);
    padding: 1rem;
    flex-shrink: 0;
  }

  .sidebar-section {
    margin-bottom: 1.5rem;
  }

  .sidebar-title {
    font-size: 0.6rem;
    color: var(--text-muted);
    margin-bottom: 0.75rem;
    padding: 0 0.5rem;
  }

  .sidebar-item {
    display: block;
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: transparent;
    border: none;
    color: var(--text-secondary);
    font-family: var(--font-retro);
    font-size: 1.1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .sidebar-item:hover,
  .sidebar-item.active {
    background: var(--bg-surface);
    color: var(--neon-cyan);
  }

  .main-content {
    flex: 1;
    padding: 1.5rem;
    overflow-y: auto;
  }

  .content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .content-header h1 {
    font-size: 0.8rem;
    color: var(--neon-cyan);
  }

  .project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .project-card {
    position: relative;
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .create-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 150px;
    background: var(--bg-surface);
    border: 2px dashed var(--border-primary);
    cursor: pointer;
    box-shadow: none;
  }

  .create-card:hover {
    border-color: var(--neon-cyan);
    box-shadow: var(--shadow-glow-cyan);
  }

  .create-icon {
    font-size: 2rem;
    color: var(--text-muted);
    margin-bottom: 0.5rem;
  }

  .project-header {
    position: absolute;
    top: 0.5rem;
    left: 0.5rem;
    right: 0.5rem;
    display: flex;
    justify-content: space-between;
  }

  .fav-btn, .delete-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    opacity: 0.6;
    transition: opacity 0.2s;
  }

  .fav-btn:hover, .delete-btn:hover {
    opacity: 1;
  }

  .project-link {
    display: block;
    text-decoration: none;
    color: inherit;
    margin-top: 1rem;
  }

  .project-preview {
    height: 80px;
    background: var(--bg-deep);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 0.75rem;
    border: 1px solid var(--border-primary);
  }

  .preview-icon {
    font-size: 2rem;
  }

  .project-name {
    font-family: var(--font-retro);
    font-size: 1.2rem;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }

  .project-meta {
    font-size: 0.9rem;
    color: var(--text-muted);
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    width: 100%;
    max-width: 400px;
  }

  .modal-title {
    font-size: 0.8rem;
    color: var(--neon-cyan);
    margin-bottom: 1.5rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
</style>
