<script lang="ts">
  import '$lib/styles/theme.css';
  import { onMount } from 'svelte';
  import { auth } from '$lib/stores/auth';
  
  onMount(() => {
    // Check session on mount
    auth.checkSession();
  });
</script>

<slot />

<style>
  :global(body) {
    overflow-x: hidden;
  }
</style>
