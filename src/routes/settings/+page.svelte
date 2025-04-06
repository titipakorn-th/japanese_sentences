<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  
  // Set up local storage keys
  const OPENAI_KEY_STORAGE = 'japanese_app_openai_api_key';
  
  // State variables
  let openaiApiKey = '';
  let isOpenAITestLoading = false;
  let testOpenAIResult: { success: boolean; message: string } | null = null;
  let showApiKey = false;
  
  // Load API keys from localStorage on mount
  onMount(() => {
    if (browser) {
      openaiApiKey = localStorage.getItem(OPENAI_KEY_STORAGE) || '';
    }
  });
  
  // Function to save API key to localStorage
  function saveOpenAIKey() {
    if (browser && openaiApiKey) {
      localStorage.setItem(OPENAI_KEY_STORAGE, openaiApiKey);
      alert('OpenAI API key saved successfully!');
    }
  }
  
  // Function to clear API key from localStorage
  function clearOpenAIKey() {
    if (browser) {
      localStorage.removeItem(OPENAI_KEY_STORAGE);
      openaiApiKey = '';
      alert('OpenAI API key cleared successfully!');
    }
  }
  
  // Function to test OpenAI API key
  async function testOpenAIKey() {
    if (!openaiApiKey) {
      testOpenAIResult = {
        success: false,
        message: 'Please enter an API key first.'
      };
      return;
    }
    
    isOpenAITestLoading = true;
    testOpenAIResult = null;
    
    try {
      const response = await fetch('/api/furigana/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: '日本語の勉強',
          apiKey: openaiApiKey
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.furigana && data.furigana.length > 0) {
        testOpenAIResult = {
          success: true,
          message: 'API key works! Generated furigana: ' + 
            data.furigana.map((f: { text: string; reading: string }) => `${f.text}(${f.reading})`).join(', ')
        };
      } else {
        testOpenAIResult = {
          success: false,
          message: data.error || 'Failed to generate furigana.'
        };
      }
    } catch (error) {
      testOpenAIResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      isOpenAITestLoading = false;
    }
  }
  
  // Toggle API key visibility
  function toggleApiKeyVisibility() {
    showApiKey = !showApiKey;
  }
</script>

<div class="settings-page">
  <h1>Application Settings</h1>
  
  <section class="settings-section">
    <h2>LLM API Configuration</h2>
    <div class="section-content">
      <p class="description">
        This application uses the OpenAI API for furigana generation.
        You need to provide your API key to enable this functionality.
      </p>
      
      <div class="api-key-section">
        <h3>OpenAI API Key</h3>
        <div class="input-group">
          <input 
            type={showApiKey ? "text" : "password"} 
            bind:value={openaiApiKey} 
            placeholder="Enter your OpenAI API key"
            class="api-key-input"
          />
          <button type="button" class="btn-secondary" on:click={toggleApiKeyVisibility}>
            {showApiKey ? "Hide" : "Show"}
          </button>
        </div>
        
        <div class="button-group">
          <button type="button" class="btn-primary" on:click={saveOpenAIKey}>
            Save API Key
          </button>
          <button type="button" class="btn-secondary" on:click={clearOpenAIKey}>
            Clear API Key
          </button>
          <button 
            type="button" 
            class="btn-secondary" 
            on:click={testOpenAIKey}
            disabled={isOpenAITestLoading}
          >
            {#if isOpenAITestLoading}
              Testing...
            {:else}
              Test API Key
            {/if}
          </button>
        </div>
        
        {#if testOpenAIResult}
          <div class="test-result" class:success={testOpenAIResult.success} class:error={!testOpenAIResult.success}>
            <p>{testOpenAIResult.message}</p>
          </div>
        {/if}
        
        <div class="notice">
          <p>
            <strong>Note:</strong> This API key is stored only in your browser's local storage and is not sent to our servers.
            It is used directly from your browser when making API requests to OpenAI.
          </p>
        </div>
      </div>
    </div>
  </section>
  
  <section class="settings-section">
    <h2>Server Configuration</h2>
    <div class="section-content">
      <p>
        The application uses environment variables for server-side API integration.
        If you're running this application yourself, you'll need to configure these in your .env file.
      </p>
      
      <div class="env-vars">
        <h3>Required Environment Variables</h3>
        <ul>
          <li><code>OPENAI_API_KEY</code> - Required for server-side furigana generation</li>
        </ul>
      </div>
    </div>
  </section>
</div>

<style>
  .settings-page {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem 1rem;
  }
  
  h1 {
    font-size: 2rem;
    margin-bottom: 2rem;
    color: #333;
  }
  
  .settings-section {
    margin-bottom: 3rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }
  
  .settings-section h2 {
    background-color: #f5f5f5;
    padding: 1rem;
    margin: 0;
    font-size: 1.5rem;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .section-content {
    padding: 1.5rem;
  }
  
  .description {
    margin-bottom: 1.5rem;
    color: #555;
    line-height: 1.5;
  }
  
  .api-key-section {
    background-color: #f9f9f9;
    border-radius: 6px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  
  .api-key-section h3 {
    margin-top: 0;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }
  
  .input-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .api-key-input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .button-group {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }
  
  .btn-primary, .btn-secondary {
    padding: 0.75rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .btn-primary {
    background-color: #4a6fa5;
    color: white;
  }
  
  .btn-primary:hover {
    background-color: #3a5a8c;
  }
  
  .btn-secondary {
    background-color: #e0e0e0;
    color: #333;
  }
  
  .btn-secondary:hover {
    background-color: #d0d0d0;
  }
  
  .btn-primary:disabled, .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .test-result {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 4px;
    font-size: 0.9rem;
  }
  
  .success {
    background-color: #e7f6e7;
    color: #2e7d32;
    border: 1px solid #c8e6c9;
  }
  
  .error {
    background-color: #ffebee;
    color: #c62828;
    border: 1px solid #ffcdd2;
  }
  
  .notice {
    margin-top: 1.5rem;
    padding: 1rem;
    background-color: #fff9c4;
    border-radius: 4px;
    font-size: 0.9rem;
    border: 1px solid #fff59d;
  }
  
  .env-vars {
    background-color: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    margin-top: 1rem;
  }
  
  .env-vars h3 {
    margin-top: 0;
    font-size: 1.1rem;
  }
  
  .env-vars ul {
    padding-left: 1.5rem;
  }
  
  .env-vars code {
    background-color: #e0e0e0;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: monospace;
  }
</style> 