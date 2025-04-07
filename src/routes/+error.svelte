<script lang="ts">
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  
  // Function to safely check if stack exists and get it
  function getErrorStack(error: unknown): string | null {
    if (error && typeof error === 'object' && 'stack' in error && typeof error.stack === 'string') {
      return error.stack;
    }
    return null;
  }
  
  // Get the stack trace if available
  $: stackTrace = getErrorStack($page.error);
</script>

<svelte:head>
  <title>Japanese Learning Toolkit - Error {$page.status}</title>
</svelte:head>

<div class="error-container">
  <h1>Error {$page.status}</h1>
  
  <p class="message">{$page.error?.message || 'Something went wrong'}</p>
  
  {#if stackTrace && import.meta.env.DEV}
    <details>
      <summary>Stack trace (development only)</summary>
      <pre>{stackTrace}</pre>
    </details>
  {/if}
  
  <div class="actions">
    <a href="{base}/" class="button">Go to Home</a>
    <button class="button secondary" onclick={() => window.location.reload()}>
      Refresh Page
    </button>
  </div>
</div>

<style>
  .error-container {
    max-width: 800px;
    margin: 4rem auto;
    padding: 2rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    text-align: center;
  }
  
  h1 {
    font-size: 2.5rem;
    color: #e74c3c;
    margin-bottom: 1rem;
  }
  
  .message {
    font-size: 1.2rem;
    color: #444;
    margin-bottom: 2rem;
  }
  
  details {
    margin: 1.5rem 0;
    padding: 1rem;
    background-color: #f8f8f8;
    border-radius: 4px;
    text-align: left;
  }
  
  summary {
    cursor: pointer;
    padding: 0.5rem 0;
    font-weight: 500;
    color: #666;
  }
  
  pre {
    background-color: #f1f1f1;
    padding: 1rem;
    overflow-x: auto;
    border-radius: 4px;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }
  
  .actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
  }
  
  .button {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
    transition: background-color 0.2s;
  }
  
  .button:hover {
    background-color: #2980b9;
  }
  
  .button.secondary {
    background-color: #95a5a6;
  }
  
  .button.secondary:hover {
    background-color: #7f8c8d;
  }
</style> 