<script lang="ts">
  // Import any necessary components or styles
  import { onMount } from 'svelte';
  import { runMigrations } from '$lib/db';

  // Run database migrations during app initialization
  onMount(() => {
    try {
      if (typeof window !== 'undefined') {
        // Only run on client-side
        runMigrations();
      }
    } catch (error) {
      console.error('Error running migrations:', error);
    }
  });
</script>

<div class="app">
  <header>
    <nav>
      <div class="logo">
        <a href="/">Japanese Learning Toolkit</a>
      </div>
      <ul class="nav-links">
        <li><a href="/">Home</a></li>
        <li><a href="/sentences">Sentences</a></li>
        <li><a href="/settings">Settings</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <slot />
  </main>

  <footer>
    <p>© {new Date().getFullYear()} Japanese Learning Toolkit</p>
  </footer>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Noto Sans JP', 'Noto Sans', sans-serif;
    color: #333;
    line-height: 1.6;
    background-color: #f9f9f9;
  }

  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  header {
    background-color: #4a6fa5;
    color: white;
    padding: 0.5rem 1rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
  }

  .logo a {
    color: white;
    font-size: 1.4rem;
    font-weight: bold;
    text-decoration: none;
  }

  .nav-links {
    display: flex;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nav-links li {
    margin-left: 1.5rem;
  }

  .nav-links a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    padding: 0.5rem 0;
    transition: color 0.2s;
  }

  .nav-links a:hover {
    color: #c9e6ff;
  }

  main {
    flex: 1;
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    padding: 1.5rem 1rem;
    box-sizing: border-box;
  }

  footer {
    background-color: #333;
    color: white;
    text-align: center;
    padding: 0.75rem;
    margin-top: auto;
  }

  @media (max-width: 768px) {
    nav {
      flex-direction: column;
      padding: 0.75rem 0;
    }

    .nav-links {
      margin-top: 0.75rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .nav-links li {
      margin: 0.4rem;
    }
    
    main {
      padding: 0.75rem 0.5rem;
    }
  }
</style> 